package app.mdviewy.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.*;
import android.graphics.Typeface;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

public final class EditorActivity extends Activity {
    private static final int OPEN = 1, CREATE = 2, HTML = 3, BACKUP = 4;
    private static final int LIMIT = 4 * 1024 * 1024;
    private static final String BASE = "https://mdviewy.invalid/";
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SharedPreferences draft;
    private EditText editor;
    private WebView reader;
    private LinearLayout actions, page;
    private LinearLayout modeBar, findBar;
    private Button readTab, editTab, splitTab, saveButton;
    private EditText query;
    private TextView hits;
    private TextView filename, fileState;
    private Uri document, pendingView;
    private boolean viewConfirmed;
    private AlertDialog replaceDialog;
    private String original = "", name = "Untitled.md", mode = "Edit";
    private String deferredSource;
    private boolean loadingEditor, copyOnSave;
    private boolean loaded, busy, dirty;
    private final Runnable update = () -> { persist(); render(); };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        draft = getSharedPreferences("workspace", MODE_PRIVATE);
        document = draft.contains("uri") ? Uri.parse(draft.getString("uri", "")) : null;
        original = draft.getString("original", "");
        name = draft.getString("name", name);
        dirty = draft.getBoolean("dirty", false);
        mode = draft.getString("mode", mode);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        root.setBackgroundColor(getColor(R.color.paper));
        actions = new LinearLayout(this);
        actions.setGravity(Gravity.CENTER_VERTICAL);
        actions.setPadding(dp(4), 0, dp(4), 0);
        root.addView(actions);
        icon(actions, "Open", R.drawable.ic_open).setOnClickListener(v -> confirmOpen());
        LinearLayout identity = new LinearLayout(this);
        identity.setOrientation(LinearLayout.VERTICAL);
        identity.setPadding(dp(4), dp(6), dp(4), dp(6));
        filename = new TextView(this);
        filename.setTextSize(15);
        filename.setTextColor(getColor(R.color.ink));
        filename.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        filename.setSingleLine();
        filename.setEllipsize(TextUtils.TruncateAt.MIDDLE);
        fileState = new TextView(this);
        fileState.setTextSize(12);
        fileState.setTextColor(getColor(R.color.secondary));
        identity.addView(filename);
        identity.addView(fileState);
        actions.addView(identity, new LinearLayout.LayoutParams(0, -2, 1));
        icon(actions, "Find", R.drawable.ic_search).setOnClickListener(v -> openFind());
        ImageButton more = icon(actions, "More", R.drawable.ic_more);
        more.setOnClickListener(v -> menu(more));
        divider(root);
        findBar = new LinearLayout(this);
        findBar.setGravity(Gravity.CENTER_VERTICAL);
        findBar.setPadding(dp(14), 0, dp(4), 0);
        query = new EditText(this);
        query.setSingleLine();
        query.setHint("Find in document");
        query.setImeOptions(android.view.inputmethod.EditorInfo.IME_ACTION_SEARCH);
        findBar.addView(query, new LinearLayout.LayoutParams(0, -2, 1));
        hits = new TextView(this);
        hits.setTextColor(getColor(R.color.secondary));
        hits.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        findBar.addView(hits);
        icon(findBar, "Next match", R.drawable.ic_next).setOnClickListener(v -> reader.findNext(true));
        icon(findBar, "Close search", R.drawable.ic_close).setOnClickListener(v -> closeFind());
        root.addView(findBar);
        findBar.setVisibility(View.GONE);
        page = new LinearLayout(this);
        root.addView(page, new LinearLayout.LayoutParams(-1, 0, 1));
        editor = new EditText(this);
        editor.setGravity(Gravity.TOP | Gravity.START);
        editor.setTypeface(Typeface.MONOSPACE);
        editor.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        editor.setContentDescription("Markdown source");
        editor.setHint("Write Markdown");
        editor.setSaveEnabled(false);
        deferredSource = draft.getString("text", "");
        copyOnSave = draft.getBoolean("copyOnSave", false);
        editor.setBreakStrategy(android.text.Layout.BREAK_STRATEGY_SIMPLE);
        page.addView(editor, new LinearLayout.LayoutParams(0, -1, 1));
        editor.setBackgroundColor(getColor(R.color.paper));
        editor.setTextColor(getColor(R.color.ink));
        editor.setHintTextColor(getColor(R.color.secondary));
        editor.setPadding(dp(20), dp(20), dp(20), dp(24));
        editor.setTextSize(16);
        editor.setTypeface(Typeface.MONOSPACE);
        editor.setLineSpacing(dp(3), 1f);
        reader = new WebView(this);
        reader.setBackgroundColor(getColor(R.color.paper));
        page.addView(reader, new LinearLayout.LayoutParams(0, -1, 1));
        reader.getSettings().setJavaScriptEnabled(true);
        reader.getSettings().setAllowFileAccess(false);
        reader.getSettings().setAllowContentAccess(false);
        reader.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri url = req.getUrl();
                String path = url.getPath();
                if (url.toString().startsWith(BASE) && Arrays.asList("/reader.html", "/reader.js", "/marked.js", "/purify.js").contains(path)) {
                    try { return new WebResourceResponse(path.endsWith(".html") ? "text/html" : "application/javascript", "UTF-8", getAssets().open(path.substring(1))); }
                    catch (IOException ignored) { }
                }
                return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return !(BASE.concat("reader.html").equals(req.getUrl().buildUpon().fragment(null).build().toString()));
            }
            @Override public void onPageFinished(WebView view, String url) { loaded = true; render(); }
        });
        reader.setFindListener((index, count, complete) -> {
            if (complete && findBar.getVisibility() == View.VISIBLE)
                hits.setText(query.length() == 0 ? "" : count == 0 ? "No matches" : (index + 1) + "/" + count);
        });
        query.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            public void onTextChanged(CharSequence s, int start, int before, int count) { findMatches(); }
            public void afterTextChanged(Editable s) {}
        });
        query.setOnEditorActionListener((v, id, event) -> { reader.findNext(true); return true; });
        divider(root);
        modeBar = new LinearLayout(this);
        modeBar.setGravity(Gravity.CENTER_VERTICAL);
        modeBar.setPadding(dp(8), 0, dp(4), 0);
        root.addView(modeBar);
        readTab = tab("Read");
        editTab = tab("Edit");
        splitTab = tab("Split");
        modeBar.addView(new View(this), new LinearLayout.LayoutParams(0, 1, 1));
        icon(modeBar, "Outline", R.drawable.ic_outline).setOnClickListener(v -> outline());
        saveButton = textAction("Save");
        modeBar.addView(saveButton);
        saveButton.setOnClickListener(v -> { if (document == null || copyOnSave) picker(CREATE); else save(document, false); });
        reader.loadUrl(BASE + "reader.html");
        editor.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (loadingEditor) return;
                dirty = true;
                handler.removeCallbacks(update);
                handler.postDelayed(update, 300);
            }
            public void afterTextChanged(Editable s) {}
        });
        setContentView(root);
        layoutMode();
        if (state == null) handleView(getIntent());
        else if (state.containsKey("pendingView")) {
            pendingView = Uri.parse(state.getString("pendingView"));
            viewConfirmed = state.getBoolean("viewConfirmed");
            continueView();
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleView(intent);
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        if (pendingView != null) {
            state.putString("pendingView", pendingView.toString());
            state.putBoolean("viewConfirmed", viewConfirmed);
        }
    }

    private void handleView(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return;
        Uri uri = intent.getData();
        if (uri == null || !"content".equals(uri.getScheme())) return;
        if (busy) { toast("Another file operation is in progress. Open the file again."); return; }
        if (replaceDialog != null) replaceDialog.dismiss();
        pendingView = uri;
        viewConfirmed = !dirty;
        continueView();
    }

    private void continueView() {
        if (viewConfirmed) { open(pendingView, true); return; }
        replaceDialog = new AlertDialog.Builder(this).setMessage("Replace your unsaved draft with this document?")
                .setNegativeButton("Keep draft", (dialog, button) -> pendingView = null)
                .setOnCancelListener(dialog -> pendingView = null)
                .setPositiveButton("Open document", (dialog, button) -> {
                    viewConfirmed = true;
                    open(pendingView, true);
                }).show();
    }

    private int dp(float value) {
        return Math.round(getResources().getDisplayMetrics().density * value);
    }

    private void updateHeading() {
        filename.setText(name);
        saveButton.setText(copyOnSave ? "Save a copy" : "Save");
        saveButton.setVisibility(dirty || document == null ? View.VISIBLE : View.GONE);
        fileState.setVisibility(document != null && !dirty ? View.GONE : View.VISIBLE);
        fileState.setText(document == null ? "Local draft" : dirty ? "Unsaved edits" : "Saved");
    }

    private void divider(LinearLayout parent) {
        View line = new View(this);
        line.setBackgroundColor(getColor(R.color.subtle));
        parent.addView(line, new LinearLayout.LayoutParams(-1, dp(1)));
    }

    private ImageButton icon(LinearLayout parent, String label, int asset) {
        ImageButton button = new ImageButton(this);
        button.setImageResource(asset);
        button.setContentDescription(label);
        button.setTooltipText(label);
        android.util.TypedValue ripple = new android.util.TypedValue();
        getTheme().resolveAttribute(android.R.attr.selectableItemBackgroundBorderless, ripple, true);
        button.setBackgroundResource(ripple.resourceId);
        parent.addView(button, new LinearLayout.LayoutParams(dp(48), dp(48)));
        return button;
    }

    private Button textAction(String label) {
        Button button = new Button(this, null, android.R.attr.borderlessButtonStyle);
        button.setAllCaps(false);
        button.setMinWidth(dp(48));
        button.setMinimumWidth(dp(48));
        button.setMinHeight(dp(48));
        button.setPadding(dp(9), 0, dp(9), 0);
        button.setText(label);
        button.setTextColor(getColor(R.color.accent));
        return button;
    }

    private Button tab(String label) {
        Button button = textAction(label);
        modeBar.addView(button);
        button.setOnClickListener(v -> {
            closeFind();
            mode = label;
            layoutMode();
            persist();
        });
        return button;
    }

    private void openFind() {
        if (mode.equals("Edit")) mode = "Read";
        layoutMode();
        findBar.setVisibility(View.VISIBLE);
        query.requestFocus();
        ((android.view.inputmethod.InputMethodManager)getSystemService(INPUT_METHOD_SERVICE))
                .showSoftInput(query, android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);
    }

    private void findMatches() {
        if (query.length() == 0) { reader.clearMatches(); hits.setText(""); }
        else reader.findAllAsync(query.getText().toString());
    }

    private void closeFind() {
        if (findBar.getVisibility() != View.VISIBLE) return;
        ((android.view.inputmethod.InputMethodManager)getSystemService(INPUT_METHOD_SERVICE))
                .hideSoftInputFromWindow(query.getWindowToken(), 0);
        query.setText("");
        findBar.setVisibility(View.GONE);
    }

    private void outline() {
        if (!loaded) return;
        closeFind();
        if (mode.equals("Edit")) mode = "Read";
        layoutMode();
        reader.evaluateJavascript("documentOutline()", result -> {
            if (isDestroyed() || isFinishing()) return;
            try {
                JSONArray list = new JSONArray(result);
                if (list.length() == 0) { toast("No headings in this document"); return; }
                String[] titles = new String[list.length()], ids = new String[list.length()];
                for (int i = 0; i < list.length(); i++) {
                    JSONObject entry = list.getJSONObject(i);
                    titles[i] = entry.getString("title");
                    ids[i] = entry.getString("id");
                }
                new AlertDialog.Builder(this).setTitle("Document outline").setItems(titles, (d,i) ->
                    reader.post(() -> {
                        reader.requestFocus();
                        reader.evaluateJavascript("focusHeading(" + JSONObject.quote(ids[i]) + ")", null);
                    })).show();
            } catch (org.json.JSONException e) { error("Could not read document headings."); }
        });
    }

    private void layoutMode() {
        updateHeading();
        if (mode.equals("Split") && getResources().getConfiguration().screenWidthDp < 680) mode = "Edit";
        if (!mode.equals("Read") && deferredSource != null) {
            loadingEditor = true;
            editor.setText(deferredSource);
            loadingEditor = false;
            deferredSource = null;
        }
        editor.setVisibility(mode.equals("Read") ? View.GONE : View.VISIBLE);
        reader.setVisibility(mode.equals("Edit") ? View.GONE : View.VISIBLE);
        splitTab.setVisibility(getResources().getConfiguration().screenWidthDp >= 680 ? View.VISIBLE : View.GONE);
        for (Button tab : new Button[]{readTab, editTab, splitTab}) {
            boolean selected = mode.contentEquals(tab.getText());
            tab.setSelected(selected);
            tab.setTypeface(Typeface.DEFAULT, selected ? Typeface.BOLD : Typeface.NORMAL);
            tab.setPaintFlags(selected ? tab.getPaintFlags() | android.graphics.Paint.UNDERLINE_TEXT_FLAG
                    : tab.getPaintFlags() & ~android.graphics.Paint.UNDERLINE_TEXT_FLAG);
            tab.setTextColor(getColor(selected ? R.color.accent : R.color.secondary));
        }
        render();
    }

    private String markdown() {
        return deferredSource == null ? editor.getText().toString() : deferredSource;
    }

    private void render() {
        if (loaded && reader.getVisibility() == View.VISIBLE)
            reader.evaluateJavascript("renderDocument(" + JSONObject.quote(markdown()) + ")", null);
    }

    private void menu(View anchor) {
        PopupMenu menu = new PopupMenu(this, anchor);
        for (String item : new String[]{"New document", "Save as", "Export HTML", "Print / PDF", "Insert task", "Insert link", "Insert table"})
            menu.getMenu().add(item);
        if (backup().getBaseFile().exists()) menu.getMenu().add("Export last backup");
        menu.setOnMenuItemClickListener(item -> {
            String label = item.getTitle().toString();
            switch (label) {
                case "New document":
                    if (dirty) new AlertDialog.Builder(this).setMessage("Discard unsaved edits and start a new document?")
                            .setNegativeButton("Cancel", null).setPositiveButton("Discard", (d,w) -> newDocument()).show();
                    else newDocument();
                    break;
                case "Export last backup": picker(BACKUP); break;
                case "Save as": picker(CREATE); break;
                case "Export HTML": picker(HTML); break;
                case "Print / PDF":
                    if (loaded) {
                        mode = "Read"; layoutMode();
                        reader.evaluateJavascript("document.body.offsetHeight", result ->
                            ((android.print.PrintManager)getSystemService(PRINT_SERVICE)).print(name, reader.createPrintDocumentAdapter(name), null));
                    }
                    break;
                default:
                    mode = "Edit"; layoutMode();
                    int a = Math.max(0, editor.getSelectionStart()), b = Math.max(0, editor.getSelectionEnd());
                    String snippet = label.endsWith("task") ? "- [ ] Task" : label.endsWith("link") ? "[Link](https://example.com)" : "| A | B |\n|---|---|\n| 1 | 2 |";
                    editor.getText().replace(Math.min(a,b), Math.max(a,b), snippet);
            }
            return true;
        });
        menu.show();
    }

    private void newDocument() {
        closeFind();
        document = null;
        original = "";
        name = "Untitled.md";
        deferredSource = "";
        copyOnSave = false;
        dirty = false;
        mode = "Edit";
        layoutMode();
        persist();
    }

    private void confirmOpen() {
        if (!dirty) { picker(OPEN); return; }
        new AlertDialog.Builder(this).setMessage("Replace your unsaved draft when another file opens?")
                .setNegativeButton("Cancel", null).setPositiveButton("Choose file", (d,w) -> picker(OPEN)).show();
    }

    private void picker(int request) {
        Intent i = new Intent(request == OPEN ? Intent.ACTION_OPEN_DOCUMENT : Intent.ACTION_CREATE_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType(request == OPEN ? "*/*" : request == HTML ? "text/html" : "text/markdown");
        if (request != OPEN) i.putExtra(Intent.EXTRA_TITLE, request == BACKUP ? "mdviewy-backup.md" : request == HTML ? name.replaceFirst("(?i)\\.(md|markdown)$","") + ".html" : name);
        startActivityForResult(i, request);
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (result != RESULT_OK || data == null || data.getData() == null) return;
        Uri uri = data.getData();
        if (request == BACKUP) {
            runIO(() -> { write(uri, backup().readFully()); return () -> toast("Backup exported"); });
        } else if (request == HTML) {
            if (!loaded) { error("Reader is still loading."); return; }
            reader.evaluateJavascript("renderDocument(" + JSONObject.quote(markdown()) + "); exportDocument()", value -> {
                try {
                    Object html = new JSONArray("[" + value + "]").get(0);
                    if (!(html instanceof String)) throw new IOException("HTML export failed");
                    runIO(() -> { write(uri, ((String)html).getBytes(StandardCharsets.UTF_8)); return () -> toast("Exported"); });
                } catch (Exception e) { error(e.getMessage()); }
            });
        } else {
            try { getContentResolver().takePersistableUriPermission(uri, data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION)); }
            catch (SecurityException ignored) { }
            if (request == OPEN) open(uri, (data.getFlags() & Intent.FLAG_GRANT_WRITE_URI_PERMISSION) == 0); else save(uri, true);
        }
    }

    private interface Job { Runnable run() throws Exception; }
    private void enableActions(boolean enabled) {
        editor.setEnabled(enabled);
        for (LinearLayout bar : new LinearLayout[]{actions, modeBar, findBar}) for (int i = 0; i < bar.getChildCount(); i++) {
            View action = bar.getChildAt(i);
            action.setEnabled(enabled);
            action.setAlpha(enabled ? 1f : .5f);
        }
    }

    private void runIO(Job job) {
        if (busy) return;
        busy = true;
        enableActions(false);
        io.execute(() -> {
            Runnable result;
            try { result = job.run(); }
            catch (Exception e) { result = () -> error(e.getMessage()); }
            Runnable finish = result;
            runOnUiThread(() -> {
                if (isDestroyed()) return;
                busy = false;
                pendingView = null;
                enableActions(true);
                finish.run();
            });
        });
    }

    private byte[] read(Uri uri) throws IOException {
        try (InputStream in = getContentResolver().openInputStream(uri); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (in == null) throw new IOException("Cannot open file");
            byte[] buffer = new byte[8192];
            int n;
            while ((n = in.read(buffer)) != -1) {
                if (out.size() + n > LIMIT) throw new IOException("This editor opens files up to 4 MiB.");
                out.write(buffer, 0, n);
            }
            return out.toByteArray();
        }
    }

    private String title(Uri uri) {
        try (android.database.Cursor c = getContentResolver().query(uri, new String[]{android.provider.OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst() && c.getString(0) != null) return c.getString(0);
        } catch (RuntimeException ignored) { }
        return "Document.md";
    }

    private String digest(byte[] bytes) throws Exception {
        return android.util.Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(bytes), android.util.Base64.NO_WRAP);
    }

    private void open(Uri uri, boolean saveAsCopy) {
        runIO(() -> {
            byte[] bytes = read(uri);
            String source = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
            String hash = digest(bytes), filename = title(uri);
            return () -> {
                document = uri; original = hash; name = filename;
                handler.removeCallbacks(update);
                closeFind(); deferredSource = source; copyOnSave = saveAsCopy; dirty = false; mode = "Read"; layoutMode(); persist();
            };
        });
    }

    private void write(Uri uri, byte[] bytes) throws IOException {
        try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
            if (out == null) throw new IOException("Cannot write file");
            out.write(bytes);
        }
    }

    private android.util.AtomicFile backup() {
        return new android.util.AtomicFile(new File(getFilesDir(), "previous-markdown"));
    }

    private void backupBeforeWrite(byte[] previous) throws IOException {
        android.util.AtomicFile file = backup();
        FileOutputStream out = file.startWrite();
        try {
            out.write(previous);
            out.getFD().sync();
            file.finishWrite(out);
        } catch (IOException e) {
            file.failWrite(out);
            throw e;
        }
    }

    @Override public void onConfigurationChanged(android.content.res.Configuration config) {
        super.onConfigurationChanged(config);
        layoutMode();
    }

    private void save(Uri uri, boolean create) {
        byte[] bytes = markdown().getBytes(StandardCharsets.UTF_8);
        String expected = original;
        if (bytes.length > LIMIT) { error("This editor saves Markdown up to 4 MiB."); return; }
        runIO(() -> {
            String hash = digest(bytes);
            if (!create) {
                byte[] previous = read(uri);
                String actual = digest(previous);
                boolean ownWrite = uri.toString().equals(draft.getString("pendingUri", ""))
                        && actual.equals(draft.getString("pendingHash", ""));
                if (!actual.equals(expected) && !ownWrite)
                    throw new IOException("The file changed outside mdviewy. Use Save as to keep both versions.");
                backupBeforeWrite(previous);
            }
            if (!draft.edit().putString("pendingUri", uri.toString()).putString("pendingHash", hash).commit())
                throw new IOException("Cannot record the save. The original has been kept.");
            try {
                write(uri, bytes);
                if (!Arrays.equals(bytes, read(uri))) throw new IOException("File contents differ after saving.");
            } catch (IOException e) {
                throw new IOException(create ? "Save failed. Your draft is kept." :
                    "Save failed. Use Save as for your draft or Export last backup for the previous contents.", e);
            }
            String filename = title(uri);
            return () -> { document = uri; original = hash; name = filename; dirty = false; copyOnSave = false; persist(); toast("Saved"); };
        });
    }

    private void persist() {
        updateHeading();
        SharedPreferences.Editor prefs = draft.edit().putString("text", markdown()).putBoolean("copyOnSave", copyOnSave).putString("original", original)
                .putString("name", name).putBoolean("dirty", dirty).putString("mode", mode);
        if (document == null) prefs.remove("uri"); else prefs.putString("uri", document.toString());
        prefs.apply();
    }
    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_SHORT).show(); }
    private void error(String text) { new AlertDialog.Builder(this).setTitle("Document error").setMessage(text).setPositiveButton("OK", null).show(); }
    @Override protected void onPause() { super.onPause(); persist(); }
    @Override protected void onDestroy() { handler.removeCallbacks(update); io.shutdown(); reader.destroy(); super.onDestroy(); }
}

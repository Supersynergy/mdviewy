"""Exercise Android's Markdown resolver and read-only attachment workflow on a test emulator."""
import re
import tempfile
from pathlib import Path
from uuid import uuid4

from document_flow import adb, label, package, replace, tap, wait_for

run = "mdviewy-view-" + uuid4().hex[:10]
folder = "Download/" + run


def open_attachment(part):
    uri = attachments[part]
    args = ["-a", "android.intent.action.VIEW", "-d", uri, "-t", "text/markdown", "-p", package]
    resolved = adb("shell", "cmd", "package", "resolve-activity", "--brief", *args)
    assert package + "/.EditorActivity" in resolved, resolved
    result = adb("shell", "am", "start", "-W", "--grant-read-uri-permission", *args)
    assert "Error:" not in result, result


attachments = {}
collection = "content://media/external_primary/downloads"
for part in ("First", "Second"):
    relative = f"{folder}/{part}/"
    adb("shell", "content", "insert", "--uri", collection, "--bind", "_display_name:s:Notes.md",
        "--bind", "relative_path:s:" + relative, "--bind", "mime_type:s:text/markdown")
    rows = adb("shell", "content", "query", "--uri", collection, "--projection", "_id:relative_path")
    item = next(row for row in rows.splitlines() if row.endswith("relative_path=" + relative))
    uri = collection + "/" + re.search(r"_id=(\d+)", item).group(1)
    with tempfile.TemporaryDirectory() as temp:
        fixture = Path(temp) / "Notes.md"
        fixture.write_text(f"# {part}\n", encoding="utf-8")
        adb("push", str(fixture), "/sdcard/" + relative + "Notes.md")
    assert adb("shell", "content", "read", "--uri", uri) == f"# {part}"
    attachments[part] = uri

open_attachment("First")
wait_for(label("First"))
open_attachment("Second")
wait_for(label("Second"))
tap(label("Edit"))
tap(lambda n: n["class"] == "android.widget.EditText")
replace("LocalEdit")
wait_for(lambda n: n["class"] == "android.widget.EditText" and n["text"] == "LocalEdit")
open_attachment("First")
tap(label("Keep draft"))
wait_for(lambda n: n["class"] == "android.widget.EditText" and n["text"] == "LocalEdit")
tap(label("Save a copy"))
def copy_name(n):
    return n["package"].endswith(".documentsui") and n["class"] == "android.widget.EditText"

tap(copy_name)
replace(run + ".md")
wait_for(lambda n: copy_name(n) and n["text"] == run + ".md")
tap(lambda n: n["resource-id"].endswith(":id/button1") or n["text"] == "SAVE")
wait_for(label("Open"))
assert adb("shell", "cat", "/sdcard/Download/" + run + ".md") == "LocalEdit"
assert adb("shell", "content", "read", "--uri", attachments["Second"]) == "# Second"
open_attachment("First")
wait_for(label("First"))
print("PASS: Android MIME resolution, same-name URIs, preserved dirty draft and separate saved copy")

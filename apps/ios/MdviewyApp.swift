import SwiftUI
import WebKit

@main
struct MdviewyApp: App {
    var body: some Scene {
        DocumentGroup(newDocument: MarkdownDocument()) { file in
            Workspace(document: file.$document, fileURL: file.fileURL)
        }
    }
}

private enum Mode: String, CaseIterable {
    case read = "Read", edit = "Edit", split = "Split"
}

private struct OutlineEntry: Identifiable {
    let id: String
    let title: String
}

private struct SharedFile: Identifiable {
    let url: URL
    var id: URL { url }
}

private struct ShareSheet: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [url], applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

private struct Workspace: View {
    @Binding var document: MarkdownDocument
    let fileURL: URL?
    @StateObject private var page = ReaderPage()
    @State private var mode = Mode.read
    @State private var selection: TextSelection?
    @State private var shared: SharedFile?
    @State private var temporaryFolder: URL?
    @State private var headings: [OutlineEntry] = []
    @State private var showingOutline = false
    @State private var pendingHeading: String?
    @State private var search = ""
    @State private var finding = false
    @State private var searchResult = ""
    @FocusState private var editing: Bool

    var body: some View {
        GeometryReader { geometry in
            let wide = geometry.size.width >= 680
            VStack(spacing: 0) {
                if finding {
                    HStack {
                        TextField("Find in reader", text: $search).onSubmit(findNext)
                        Text(searchResult).font(.caption)
                        Button("Next", action: findNext).disabled(search.isEmpty || !page.ready)
                    }.padding(.horizontal)
                }
                HStack(spacing: 0) {
                    if mode != .read {
                        TextEditor(text: $document.text, selection: $selection)
                            .font(.system(.body, design: .monospaced)).focused($editing)
                            .padding(.horizontal, 12)
                            .autocorrectionDisabled().textInputAutocapitalization(.never)
                            .accessibilityLabel("Markdown source")
                    }
                    if mode == .split { Divider() }
                    if mode != .edit { Reader(page: page) }
                }
                Divider()
                HStack {
                    Picker("View", selection: $mode) {
                        ForEach(Mode.allCases.filter { wide || $0 != .split }, id: \.self) { Text($0.rawValue) }
                    }.pickerStyle(.segmented).frame(maxWidth: 270)
                    Spacer()
                    Button("Outline", systemImage: "list.bullet.indent", action: openOutline)
                        .labelStyle(.iconOnly).frame(minWidth: 44, minHeight: 44).disabled(!page.ready)
                }.padding(.horizontal)
            }
            .onChange(of: wide) { _, expanded in if !expanded && mode == .split { mode = .edit } }
        }
        .onChange(of: document.text, initial: true) { _, value in page.update(value) }
        .toolbar {
            if mode != .read {
                Menu("Insert", systemImage: "plus") {
                    Button("Heading") { insert("## Heading") }
                    Button("Link") { insert("[Link](https://example.com)") }
                    Button("Task") { insert("- [ ] Task") }
                    Button("Divider") { insert("\n---\n") }
                    Button("Table") { insert("| Column | Value |\n| --- | --- |\n| A | B |") }
                }
            }
            Menu("Document actions", systemImage: "ellipsis.circle") {
                Button("Find in reader") {
                    if mode == .edit { mode = .read }
                    finding.toggle()
                }
                Button("Share HTML") { export(false) }.disabled(!page.ready)
                Button("Share PDF") { export(true) }.disabled(!page.ready || mode == .edit)
            }
        }
        .sheet(isPresented: $showingOutline, onDismiss: focusSelectedHeading) {
            NavigationStack {
                List(headings) { entry in
                    Button(entry.title) {
                        pendingHeading = entry.id
                        showingOutline = false
                    }
                }.overlay {
                    if headings.isEmpty { Text("No headings in this document").foregroundStyle(.secondary) }
                }.navigationTitle("Document outline")
                .toolbar { Button("Done") { showingOutline = false } }
            }.presentationDetents([.medium, .large])
        }
        .sheet(item: $shared, onDismiss: {
            if let folder = temporaryFolder { try? FileManager.default.removeItem(at: folder) }
            temporaryFolder = nil
        }) { ShareSheet(url: $0.url) }
        .alert("Document error", isPresented: Binding(get: { page.error != nil }, set: { if !$0 { page.error = nil } })) {
            Button("OK") { page.error = nil }
        } message: { Text(page.error ?? "") }
    }

    private func focusSelectedHeading() {
        guard let id = pendingHeading else { return }
        pendingHeading = nil
        Task { @MainActor in
            do {
                _ = try await page.web.callAsyncJavaScript("return focusHeading(id)",
                    arguments: ["id": id], in: nil, contentWorld: .page)
            } catch { page.error = error.localizedDescription }
        }
    }

    private func openOutline() {
        if mode == .edit { mode = .read }
        Task { @MainActor in
            do {
                let result = try await page.web.evaluateJavaScript("documentOutline()")
                headings = (result as? [[String: String]] ?? []).compactMap {
                    guard let id = $0["id"], let title = $0["title"] else { return nil }
                    return OutlineEntry(id: id, title: title)
                }
                showingOutline = true
            } catch { page.error = error.localizedDescription }
        }
    }

    private func findNext() {
        let query = search
        guard !query.isEmpty else { return }
        page.web.find(query, configuration: WKFindConfiguration()) { match in
            if query == search { searchResult = match.matchFound ? "" : "No match" }
        }
    }

    private func insert(_ snippet: String) {
        var source = document.text
        let range: Range<String.Index>
        if let selection, case .selection(let selected) = selection.indices { range = selected }
        else { range = source.endIndex..<source.endIndex }
        let offset = source[..<range.lowerBound].utf16.count + snippet.utf16.count
        source.replaceSubrange(range, with: snippet)
        document.text = source
        selection = TextSelection(insertionPoint: String.Index(utf16Offset: offset, in: source))
        editing = true
    }

    private func export(_ pdf: Bool) {
        Task { @MainActor in
            do {
                let url = try await page.export(pdf: pdf, name: fileURL?.deletingPathExtension().lastPathComponent ?? "Untitled")
                temporaryFolder = url.deletingLastPathComponent()
                shared = SharedFile(url: url)
            } catch { page.error = error.localizedDescription }
        }
    }
}

import SwiftUI
import WebKit

@MainActor
final class ReaderPage: NSObject, ObservableObject, WKNavigationDelegate {
    let web = WKWebView()
    @Published var error: String?
    @Published var ready = false
    private var latest = ""
    private var loaded = false
    private var version = 0

    override init() {
        super.init()
        web.navigationDelegate = self
        guard let page = Bundle.main.url(forResource: "reader", withExtension: "html") else {
            error = "The reader resources are missing."
            return
        }
        web.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let page = Bundle.main.url(forResource: "reader", withExtension: "html")
        guard let url = action.request.url, let page else {
            decisionHandler(.cancel)
            return
        }
        if url == page && action.navigationType == .other {
            decisionHandler(.allow)
        } else if url.isFileURL && url.path == page.path && url.fragment != nil {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
            if action.navigationType == .linkActivated,
               ["https", "http", "mailto"].contains(url.scheme?.lowercased() ?? "") {
                UIApplication.shared.open(url)
            }
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loaded = true
        render()
    }

    func update(_ text: String) {
        guard latest != text else { return }
        latest = text
        render()
    }

    private func render() {
        guard loaded else { return }
        version += 1
        let ticket = version
        ready = false
        web.callAsyncJavaScript("renderDocument(source);", arguments: ["source": latest], in: nil, in: .page) { result in
            guard ticket == self.version else { return }
            switch result {
            case .success: self.ready = true
            case .failure(let problem): self.error = problem.localizedDescription
            }
        }
    }

    func export(pdf: Bool, name: String) async throws -> URL {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let url = folder.appendingPathComponent(name).appendingPathExtension(pdf ? "pdf" : "html")
        let data: Data
        if pdf {
            let config = WKPDFConfiguration()
            config.rect = CGRect(origin: .zero, size: web.scrollView.contentSize)
            data = try await web.pdf(configuration: config)
        } else {
            guard let html = try await web.evaluateJavaScript("exportDocument()") as? String else {
                throw CocoaError(.fileWriteUnknown)
            }
            data = Data(html.utf8)
        }
        try data.write(to: url, options: .atomic)
        return url
    }
}

struct Reader: UIViewRepresentable {
    let page: ReaderPage
    func makeUIView(context: Context) -> WKWebView { page.web }
    func updateUIView(_ view: WKWebView, context: Context) {}
}

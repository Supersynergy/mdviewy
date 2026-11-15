import AppKit
import WebKit

@MainActor
final class Smoke: NSObject, WKNavigationDelegate {
    let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 390, height: 700))
    func run(_ url: URL) {
        web.navigationDelegate = self
        web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        Task { @MainActor in
            do {
                let source = "# Prüfen\n\n# Prüfen\n\n- [x] erledigt\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n![offline](https://example.invalid/image)"
                let ok = try await web.callAsyncJavaScript("""
                    renderDocument(source);
                    const page = new DOMParser().parseFromString(exportDocument(), 'text/html');
                    return !!page.querySelector('h1#prüfen') && !!page.querySelector('h1#prüfen-1')
                      && !!page.querySelector('input:checked:disabled') && !!page.querySelector('td')
                      && !page.querySelector('script,img') && page.body.textContent.includes('offline');
                    """, arguments: ["source": source], in: nil, contentWorld: .page)
                guard (ok as? Bool) == true else { throw CocoaError(.validationMissingMandatoryProperty) }
                let pdf = try await web.pdf()
                guard pdf.starts(with: Data("%PDF-".utf8)) else { throw CocoaError(.fileReadCorruptFile) }
                print("PASS WebKit: GFM, heading anchors, offline image policy, self-contained HTML and PDF")
                exit(0)
            } catch { print(error); exit(1) }
        }
    }
}
@main
struct SmokeMain {
    @MainActor static func main() {
        let app = NSApplication.shared
        let smoke = Smoke()
        smoke.run(URL(fileURLWithPath: CommandLine.arguments[1]))
        withExtendedLifetime(smoke) { app.run() }
    }
}

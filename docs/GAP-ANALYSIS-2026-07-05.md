# mdviewy — Gap-Analyse gegen die Top-21 Markdown-Editoren/Notiz-Tools

**Stand:** 2026-07-05 · **Scope:** Feature/Friction von mdviewy (v0.91.0) gegen die aktuelle Markdown-Editor/PKM-Landschaft.
**Methode:** gleiche Formel wie `~/BASE/ggprojects/gg-coder-adapter/docs/GAP-ANALYSIS-2026-07-05.md` (Δt × Häufigkeit × Personen × Tage), übertragen von Coding-Agenten auf Markdown-Editoren.

> **Warum dieses Dokument:** mdviewy ist bei Diagrammen/AI/FTS technisch stark, aber bei PKM-Grundfunktionen (Backlinks, Export, Marketplace) hinter dem Feld. Zahlen zu Δt/Häufigkeit sind hier **Schätzungen für einen täglichen Power-User**, nicht wie im ggcoder-Dokument aus externen Vergleichstests belegt — klar markiert.

---

## 🎯 Antwort in 60 Sekunden

- **mdviewy-Score:** ✅10 nativ stark · 🟡4 halb/oberflächlich · ❌7 offen (von 21 geprüften Konkurrenz-Features).
- **Größter Hebel:** natives PDF/DOCX-Export (aktuell nur HTML+Image) · Backlinks (aktuell nur `[[text]]`-Textmakro ohne Index).
- **Größte Stärke, die kein Konkurrent im Feld so hat:** 19 gebündelte Mermaid-Diagrammtypen + native Rust-FTS (tantivy) + eingebautes Multi-Provider-AI (kein Plugin-Umweg wie bei Obsidian).
- **Versteckter Honesty-Bug:** `[[file]]`-Smart-Action schreibt Wikilink-Syntax, aber es gibt **keinen** Backlink-Index dahinter — sieht aus wie Obsidian, verhält sich nicht so. Das ist ein Vertrauensrisiko, kein Feature.

### Das Urteil in einem Bild

```
🔴 SOFORT PRÜFEN (billig, hoher Hebel):     PDF/DOCX-Export nativ · Tag-Browser-Panel · Reveal-Backlink-Lücke im UI kennzeichnen
🟡 EINPLANEN (2. Welle, wenn PKM-Zielgruppe):  echte Backlinks+Index · Daily-Notes-Template · Versions-Timeline
⚪ GEDÖNS (bewusst nicht bauen):              Graph-View · Realtime-Multi-User-Collab · Citation-Manager (Nische, Zettlr besetzt das)
```

---

## 📐 Methode & Datenstand

- **Recherche:** 21 Markdown-Editoren/Notiz-Tools per Web-Recherche (Juli 2026, Preise/Features frisch verifiziert, 2 Fakten direkt gegen-gefetcht: Mark-Text-Pricing, Dendron-Maintenance-Status).
- **mdviewy-Ist:** direkt aus dem Code gelesen (`apps/desktop/src/**`, `fileTypeHandler.ts`, `markdownInsights.ts`, `settingMap.ts`, `smart-actions/index.tsx`) — nicht geraten.
- **Referenz-Set (21):** Obsidian, Typora, Mark Text, iA Writer, Bear, Notion, Zettlr, Logseq, Joplin, HackMD, StackEdit, Ulysses, Craft, Foam/Dendron, Zed, Notable, Boostnote (legacy-Hinweis), Simplenote, Standard Notes, QOwnNotes, AppFlowy.

**Legende:** ✅ vorhanden/stark · 🟡 teilweise/oberflächlich · ❌ fehlt

---

## 📊 Feature-Matrix — mdviewy vs. Top-21-Feld

| # | Feature | mdviewy | Verbreitung Top-21 | Befund (aus Code) |
|---|---|---|---|---|
| 1 | Live-WYSIWYG + Source-Toggle | ✅ | ~10/21 | `SourceCodeMenuButton`, `WysiwygToolbar` — beide Modi echt vorhanden |
| 2 | Multi-Tab-Editing | ✅ | ~5/21 | Mehrere Datei-Tabs gleichzeitig offen, live verifiziert |
| 3 | Table of Contents / Outline-Sidebar | ✅ | ~6/21 | `TableOfContent/CustomToc.tsx`, Quick-Find im ToC |
| 4 | Native Volltextsuche (Rust-FTS) | ✅ | wenige mit nativer FTS | `tantivy`-Crate, `core_fts_index`/`core_fts_search`/`core_fts_delete` |
| 5 | Mermaid/Diagramm-Rendering | ✅✅ | ~6/21 haben "Mermaid" generisch | **19 gebündelte Diagrammtypen** (Gantt, ER, C4, Sequence, Sankey, Wardley, Quadrant, Mindmap, Journey, Requirement, Timeline, XYChart, Block, Architecture, Venn, GitGraph, Flow, Class, Cytoscape-Layout) — breiter als jedes geprüfte Tool |
| 6 | Math/LaTeX-Rendering | vermutlich ✅ (nicht re-verifiziert) | ~9/21 | nicht in dieser Runde gegen-geprüft |
| 7 | Eingebautes Multi-Provider-AI | ✅ | 4/21 haben natives AI | `@ai-sdk/{deepseek,google,openai}` + `ollama-ai-provider-v2` — kein Plugin-Umweg wie Obsidian |
| 8 | Command Palette | ✅ | Standard bei IDE-artigen Tools | `CommandPalette/`, `useCommandInit.ts`, `PaletteBtn.tsx` |
| 9 | Spellcheck (WYSIWYG + Source getrennt) | ✅ | ~ Standard | zwei getrennte Settings, real verdrahtet in `TextEditor.tsx` |
| 10 | Typewriter-Scroll | ✅ | 7/21 (iA-Writer-definierend) | `editor_typewriter_scroll` Setting, real verdrahtet |
| 11 | Wort-/Zeichen-Zähler | ✅ | ~5/21 | `StatusBar/EditorCount.tsx`, `markdownInsights.ts` |
| 12 | Reveal-in-Finder | ✅ | ~ Standard bei Desktop-Tools | `FileNode.tsx`, `SmartActionsButton.tsx` |
| 13 | Bild-Paste + Assets-Ordner-Setting | ✅ | 8/21 | `ImageSetting/`, `createWysiwygDelegateOptions.ts` |
| 14 | Sandboxed Extensions-Ausführung | ✅ (Fundament) | 8/21 haben volles Ökosystem | iframe-Sandbox mit beschnittenem `window.top`, echte Isolation |
| 15 | Ordner-als-Workspace (Vault-Modell) | ✅ | Obsidian/Logseq-Standard | "Open Folder" ist primärer CTA, kein Single-File-Tool |
| 16 | Kontext-bewusste Erstnutzung (Quick-Start) | ✅✅ | **0/21 identisch gefunden** | Auto-Erkennung von Downloads/Documents/.claude/.codex/Projects/Obsidian im Home-Verzeichnis — echter Alleinstellungs-Fund |
| 17 | Frontmatter-Erkennung | 🟡 | ~8/21 haben echtes Tag-Panel | nur `stripFrontmatter()` als Boolean-Flag für Wortzählung — kein Tag-Browser, keine Metadata-UI |
| 18 | `[[Wikilink]]`-Syntax | 🟡 | 7/21 haben *echte* Backlinks | Smart-Action schreibt `[[name]]`-Text — **kein Index, kein Klick-Navigieren, kein Backlink-Pane dahinter** |
| 19 | Export-Formate | 🟡 | ~18/21 haben PDF/DOCX direkt | `exporters: ['Html', 'Image']` — PDF nur indirekt über OS-Print-Dialog (Page-Break-CSS vorhanden), kein direktes "Export as PDF/DOCX" |
| 20 | Versions-/Revisions-Timeline | ❌ | 6/21 | kein Fund im Code (nur Editor-Undo-Stack, kein persistenter Verlauf) |
| 21 | Backlinks-Index / echte bidirektionale Links | ❌ | 7/21 | kein Backlink-Index, keine Graph-Struktur im Code |
| 22 | Graph-View | ❌ | 4/21 (Obsidian/Logseq/Zettlr/Foam) | kein Fund |
| 23 | Daily-Notes/Journal-Template | ❌ | 4/21 | kein Fund |
| 24 | Publish-to-Web / Share-Link | ❌ | 6/21 | kein Fund |
| 25 | Extension-Marketplace/Registry | ❌ | 8/21 | Sandbox-Ausführung existiert, aber kein Gallery/Discovery-Layer |
| 26 | Realtime-Multi-User-Collab | ❌ | 5/21 | kein Fund (yjs/automerge/crdt-Suche negativ) |
| 27 | Citation-Manager (Zotero/BibTeX) | ❌ | 1/21 (Zettlr-Nische) | kein Fund — bewusst nicht bauen, Zettlr besetzt das |

---

## 🔢 Friction-Kosten der Top-Lücken (geschätzt, Power-User, 220 Arbeitstage/Jahr)

| Lücke | Δt-Schätzung | f/Tag (geschätzt) | FT/Jahr (1 Person) | Klasse |
|---|---|---|---|---|
| PDF/DOCX nicht nativ (Umweg über OS-Print oder Fremd-Tool) | 45 s/Export | 2×/Tag | 5,5 h | 🔴 |
| `[[Wikilink]]` ohne Backlink-Index (User such manuell) | 25 s/Suche | 3×/Tag | 4,6 h | 🟡 |
| Kein Tag-Browser (manuelles Grep/Scrollen statt Filter-Klick) | 20 s/Suche | 4×/Tag | 4,9 h | 🟡 |
| Kein Versions-Verlauf (Angst vor Datenverlust, manuelle Backups) | selten, aber teuer bei Eintritt | 1×/Monat | ~2 h + Vertrauensschaden | 🟡 |

**Kumuliert (die 4 oben): ~17 h/Jahr/Power-User** — deutlich kleiner als ggcoder's 43 min/Tag, weil ein Editor seltener pro Nutzung "reibt" als ein Agent-Loop. Realistischer Rahmen für Priorisierung: **PDF-Export zuerst**, weil einmalig gebaut und universell genutzt (jeder Nutzer exportiert irgendwann), Backlink-Index nur falls Zielgruppe = PKM/Zettelkasten-Nutzer (sonst Gedöns).

---

## ✅ Was mdviewy NICHT anfassen sollte (bereits vorn oder bewusst Nische)

- **Diagramm-Breite** — 19 Typen ist bereits Referenz-Niveau, kein Konkurrent im Feld kommt ran. Nicht weiter ausbauen, eher dokumentieren/bewerben.
- **Native Rust-FTS** — tantivy ist schneller als die meisten Electron-basierten Volltextsuchen im Feld. Geschwindigkeits-Vorteil real, aber unsichtbar ohne Marketing-Beleg (Benchmark fehlt).
- **Kontext-bewusster Empty-State** — echter Alleinstellungs-Fund, kein anderes geprüftes Tool hat das. Ausbauen (mehr erkannte Ordner-Typen) statt neu erfinden.
- **Graph-View, Realtime-Collab, Citation-Manager** — je 1-4/21, hoher Bauaufwand, Nische. Nur bauen falls die Zielgruppe sich klar dahin verschiebt (Academia/Team-Docs) — sonst Gedöns.

---

## 🚧 Der Honesty-Bug: `[[Wikilink]]` ohne Backlink

Konkret in `apps/desktop/src/extensions/smart-actions/index.tsx`: eine Smart-Action bietet den Hint `[[file]]` an und schreibt `[[${name}]]` in den Editor — optisch identisch zu Obsidians Wikilink-Syntax. Es gibt aber **keinen Index, keine Klick-Navigation, keine Backlink-Pane** dahinter (verifiziert: keine Treffer für Backlink/Graph-Infrastruktur im gesamten Frontend). Ein Nutzer, der das aus Obsidian kennt, tippt `[[note]]`, erwartet Autovervollständigung + Rücksprung — bekommt nur eingefärbten Text. Das ist strukturell derselbe Fehler-Typ wie die 3 Bugs von heute Vormittag (Doku/UI verspricht mehr als der Code hält). Zwei Auswege: (a) Hint entfernen bis ein echter Index existiert, oder (b) den Index bauen (Δt-Hebel steigt, sobald mdviewy PKM-Nutzer anspricht).

---

## Nächster Schritt

Kein Sofort-Bau-Zwang — das ist eine Prioritäten-Karte. Wenn 1.0-Fokus weiter "solider Editor" bleibt (nicht PKM-Tool), reicht: PDF-Export nativ + Wikilink-Hint entfernen/klar labeln. Wenn Zielgruppe Richtung Obsidian-Nutzer verschiebt, dann Backlink-Index + Tag-Panel als echte 2. Welle.

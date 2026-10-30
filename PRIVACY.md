# Datenschutz

Stand: 30. Oktober 2026

**Kurz:** Schnell lesen sammelt keine Daten, sendet nichts und baut keine Netzwerkverbindung auf. Der Text, den du liest, verlässt deinen Browser nicht.

## Was gespeichert wird

Die Erweiterung speichert nur deine Leser-Einstellungen:

- Tempo (Wörter pro Minute)
- Wörter pro Einblendung
- Schriftgröße
- Hell/Dunkel

Sie liegen in `chrome.storage.local` auf deinem Rechner. Die Standalone-App (`app/index.html`) speichert dieselben Einstellungen und den zuletzt eingefügten Text in `localStorage` deines Browsers. Es gibt keinen Server, kein Konto, keine Statistik und kein Tracking.

## Berechtigungen der Erweiterung

| Berechtigung | Wofür |
|---|---|
| `activeTab` | Nach deinem Klick auf Symbol, Kontextmenü oder Tastenkürzel darf die Erweiterung den Text des aktuellen Tabs lesen. Nur dieses eine Mal, nur in diesem Tab. |
| `scripting` | Damit fügt die Erweiterung den Leser in diesen Tab ein. |
| `contextMenus` | Für den Eintrag „Schnell lesen“ im Rechtsklick-Menü. |
| `storage` | Für die Einstellungen oben. |
| Zugriff auf `https://www.linkedin.com/*` | Damit der Knopf „Schnell lesen“ an jedem LinkedIn-Beitrag erscheint. Die Erweiterung liest dabei nur den Text des Beitrags, den du anklickst. |

## Fragen

Öffne ein Issue im Repository: <https://github.com/apa-git/schneller-lesen/issues>

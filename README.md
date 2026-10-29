# Schnell lesen

Text Wort für Wort an einer festen Stelle lesen (RSVP). Ein Buchstabe pro Wort ist rot markiert und steht immer auf derselben Achse. Kerben über und unter der Zeile zeigen auf diesen Buchstaben. Das Auge springt nicht mehr, deshalb liest du schneller.

Es gibt zwei Wege:

| Teil | Wofür | Ort |
|---|---|---|
| App | Text einfügen und lesen, offline | `app/index.html` |
| Chrome-Erweiterung | markierten Text oder den Artikel einer Seite lesen | `extension/` |

## App

Öffne `app/index.html` per Doppelklick im Browser. Füge Text ein (⌘V) und klicke **Lesen starten**. Mit ⌘↩ startest du direkt aus dem Textfeld.

## Erweiterung installieren (einmalig)

1. Öffne `chrome://extensions` in Chrome, Edge, Brave oder Arc.
2. Schalte oben rechts den **Entwicklermodus** ein.
3. Klicke **Entpackte Erweiterung laden** und wähle den Ordner `extension/`.
4. Hefte das Symbol über das Puzzleteil an die Symbolleiste.

Wenn du Dateien in `core/` geändert hast, führe `sh build.sh` aus und klicke in `chrome://extensions` bei der Erweiterung auf ↻.

## Erweiterung benutzen

- **Auswahl lesen:** Text markieren, dann Rechtsklick und **Schnell lesen**.
- **Seite lesen:** Ohne Auswahl auf das Symbol klicken oder Alt+Shift+R drücken. Gelesen wird der Hauptartikel der Seite.
- **LinkedIn-Feed:** Ohne Auswahl wird der Beitrag in Bildschirmmitte gelesen. „…mehr“ wird vorher aufgeklappt.

Das Tastenkürzel änderst du unter `chrome://extensions/shortcuts`.

Auf `chrome://`-Seiten, im Chrome Web Store und im PDF-Viewer darf keine Erweiterung laufen. Dort zeigt das Symbol kurz ein rotes „!“.

## Bedienung im Leser

| Taste | Wirkung |
|---|---|
| Leertaste oder Klick ins Lesefeld | Start/Pause |
| ← / → | Satz zurück/vor |
| ↑ / ↓ | ±25 Wörter pro Minute |
| Esc | Schließen |

- Wenn du pausierst, erscheint der aktuelle Satz. Ein Klick auf ein Wort springt dorthin.
- Ein Klick in den Fortschrittsbalken springt an diese Stelle.
- Außerdem wählbar sind 1–3 Wörter pro Einblendung, die Schriftgröße und Hell/Dunkel.

Die Einstellungen bleiben gespeichert. Für die App liegen sie im Browser, für die Erweiterung in `chrome.storage`.

### Tempo

300 WPM ist ein guter Start. Erhöhe in 25er-Schritten, solange du den Inhalt noch wiedergeben kannst. An Satzzeichen pausiert der Leser automatisch:

- Komma ×1,5
- Satzende ×2,2
- Absatz ×2,8

Lange Wörter und Zahlen bekommen ×1,3. Wörter über 13 Zeichen werden getrennt.

## Aufbau

```
core/            Lese-Kern (einzige Quelle) + Tests
app/             index.template.html → build.sh → index.html (Kern eingebettet)
extension/       Manifest V3, background.js, content.js, Kopie des Kerns
tools/           Icon-Generator, Testseite für content.js
build.sh         verteilt core/ an app/ und extension/
```

- Tests: `node --test core/rsvp.test.js`
- Testseite für die Erweiterung ohne Installation: `python3 -m http.server 8932` im Projektordner starten, dann `http://127.0.0.1:8932/tools/testseite.html` öffnen und in der Konsole `testOpen()` aufrufen.

## Bekannte Grenzen

- LinkedIn ändert seine Seitenstruktur regelmäßig. Findet die Erweiterung den Beitrag nicht, markiere den Text und lies über das Kontextmenü.
- Safari wird nicht unterstützt. Dafür bräuchte es einen Xcode-Wrapper.

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

1. Gib in Chrome in die Adresszeile `chrome://extensions` ein und drück ↩.
2. Schalte oben rechts den Schalter **Entwicklermodus** ein. Danach erscheint links oben eine Knopfleiste.
3. Klicke **Entpackte Erweiterung laden**. Wähle im Dialog den Ordner `Schnells Lesen/extension` und klicke **Auswählen**. Alternativ ziehst du den Ordner `extension` aus dem Finder in das Chrome-Fenster.
4. Die Karte „Schnell lesen 1.1.0“ erscheint. Klicke oben rechts in Chrome auf das Puzzleteil und dann auf die Stecknadel neben „Schnell lesen“. Damit liegt das Symbol dauerhaft in der Leiste.
5. Lade offene LinkedIn-Tabs einmal neu (⌘R).

Wenn du Dateien in `core/` geändert hast, führe `sh build.sh` aus und klicke in `chrome://extensions` bei der Erweiterung auf ↻.

## Erweiterung benutzen

- **Auswahl lesen:** Text markieren, dann Rechtsklick und **Schnell lesen**.
- **Seite lesen:** Ohne Auswahl auf das Symbol klicken oder Alt+Shift+R drücken. Gelesen wird der Hauptartikel der Seite.
- **LinkedIn:** Jeder Beitrag mit Text hat direkt unter dem Text einen rot umrandeten Knopf **⚡ Schnell lesen**. Ein Klick liest genau diesen Beitrag, auch wenn er mit „… mehr“ gekürzt ist. Das Symbol ohne Auswahl liest den Beitrag in Bildschirmmitte.

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

- LinkedIn ändert seine Seitenstruktur regelmäßig. Die Knöpfe hängen an den Anker-Attributen in `extension/linkedin.js` (Stand Oktober 2026). Fehlen die Knöpfe plötzlich, markiere den Text und lies über das Kontextmenü. Die Anker müssen dann angepasst werden. Die Testseite dafür ist `tools/testseite-linkedin.html`.
- Die Erweiterung läuft auf `linkedin.com` dauerhaft mit, damit die Knöpfe erscheinen. Auf allen anderen Seiten läuft sie erst nach deinem Klick.
- Safari wird nicht unterstützt. Dafür bräuchte es einen Xcode-Wrapper.

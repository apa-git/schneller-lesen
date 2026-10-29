#!/bin/sh
# Verteilt den Lese-Kern aus core/ an App und Erweiterung.
#   app/index.html        ← app/index.template.html mit eingebettetem rsvp.js/rsvp.css
#   extension/rsvp.js|css ← Kopie aus core/
set -eu
cd "$(dirname "$0")"

cp core/rsvp.js core/rsvp.css extension/

node -e '
const fs = require("fs");
const tpl = fs.readFileSync("app/index.template.html", "utf8");
const js = fs.readFileSync("core/rsvp.js", "utf8");
const css = fs.readFileSync("core/rsvp.css", "utf8");
const out = tpl
  .replace("/*@@RSVP_CSS@@*/", () => css)
  .replace("/*@@RSVP_JS@@*/", () => js.replace(/<\/script/gi, "<\\/script"));
fs.writeFileSync("app/index.html", out);
'
echo "Fertig: app/index.html und extension/rsvp.* aktualisiert."

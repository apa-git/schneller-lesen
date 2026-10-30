#!/bin/sh
# Baut die Erweiterung als ZIP für GitHub-Releases:
#   dist/schnell-lesen-<version>.zip  (manifest.json liegt im Wurzelverzeichnis)
set -eu
cd "$(dirname "$0")/.."

sh build.sh
version=$(node -p 'require("./extension/manifest.json").version')
out="dist/schnell-lesen-$version.zip"

mkdir -p dist
rm -f "$out"
(cd extension && zip -q -r -X "../$out" . -x '.DS_Store' '*/.DS_Store')
echo "Fertig: $out"

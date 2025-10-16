#!/bin/bash

# Build script for E2E Prompt Builder extension

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

MANIFEST="manifest.json"
DIST_DIR="dist"

if [[ ! -f "${MANIFEST}" ]]; then
  echo "Error: ${MANIFEST} not found in ${SCRIPT_DIR}."
  exit 1
fi

VERSION="$(python3 -c 'import json,sys; print(json.load(open("manifest.json"))["version"])')"
ZIP_NAME="e2e-prompt-builder-v${VERSION}.zip"

echo "=== Building E2E Prompt Builder v${VERSION} ==="

# Clean dist directory
rm -rf "${DIST_DIR}"
mkdir -p "${DIST_DIR}"

# Copy required files
echo "Copying files..."
cp "${MANIFEST}" "${DIST_DIR}/"
cp "background.js" "${DIST_DIR}/"
cp "contentScript.js" "${DIST_DIR}/"
cp "options.html" "${DIST_DIR}/"
cp "options.js" "${DIST_DIR}/"
cp -R "icons" "${DIST_DIR}/"

# Create ZIP
echo "Creating ZIP archive..."
pushd "${DIST_DIR}" >/dev/null
zip -rq "../${ZIP_NAME}" ./*
popd >/dev/null

# Show summary
echo ""
echo "✓ Build complete!"
echo "  Version: ${VERSION}"
echo "  Output: ${ZIP_NAME}"
echo "  Size: $(du -h "${ZIP_NAME}" | cut -f1)"
echo ""
echo "Files included:"
find "${DIST_DIR}" -mindepth 1 -print | sort

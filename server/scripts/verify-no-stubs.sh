#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Checking server routes for forbidden stub patterns..."
if grep -rE 'stub:\s*true|yjs-stub' routes lib index.js collab.js 2>/dev/null | grep -v node_modules; then
  echo "FAIL: stub markers found in production server code."
  exit 1
fi

echo "Checking for HTTP 501 in routes..."
if grep -rE 'status\(501\)|\.status\(501\)' routes 2>/dev/null | grep -v node_modules; then
  echo "FAIL: HTTP 501 in routes (remove or implement)."
  exit 1
fi

echo "OK: no stub markers or 501 routes detected."

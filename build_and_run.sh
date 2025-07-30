#!/usr/bin/env bash
# Build the production bundle and serve it locally on port 3001.
# Usage: ./build_and_run.sh

set -euo pipefail

# 1. Build optimized assets (outputs to dist/)
echo "⏳ Building…"
npm run build

echo "✅ Build complete. Starting preview server on port 3001…"

# 2. Serve the built files on port 3001
npm run preview -- --port 3001 --host --strictPort

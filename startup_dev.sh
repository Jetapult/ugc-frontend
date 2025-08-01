#!/usr/bin/env bash
# Simple helper to launch the Vite dev server on port 3001.
# Usage: ./startup_dev.sh

# Fail on first error
set -euo pipefail

# Launch Vite on port 3001, bind to all interfaces, and fail if the port is taken.
npm run dev -- --port 3001 --host --strictPort

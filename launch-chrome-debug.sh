#!/usr/bin/env bash
# Hyperion Chrome Debug Launcher (macOS / Linux)
# Port: 9222

echo "=========================================================="
echo "  HYPERION — Starting Chrome in Remote Debugging Mode (9222)"
echo "=========================================================="

# Find Chrome binary
CHROME_BIN=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
    for candidate in google-chrome google-chrome-stable chromium chromium-browser; do
        if command -v "$candidate" >/dev/null 2>&1; then
            CHROME_BIN="$candidate"
            break
        fi
    done
fi

if [[ -z "$CHROME_BIN" ]]; then
    echo "Error: Google Chrome or Chromium not found on system."
    exit 1
fi

PROFILE_DIR="${HOME}/.hyperion/chrome_profile"
mkdir -p "$PROFILE_DIR"

echo "Chrome Binary: $CHROME_BIN"
echo "Profile Dir:   $PROFILE_DIR"
echo "CDP Port:      9222"

"$CHROME_BIN" \
    --remote-debugging-port=9222 \
    --user-data-dir="$PROFILE_DIR" \
    --no-first-run \
    --no-default-browser-check \
    "https://www.google.com" &

sleep 2
echo "Chrome started successfully on port 9222."

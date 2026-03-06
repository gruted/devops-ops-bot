#!/usr/bin/env bash
set -euo pipefail

# devops-ops-bot installer
# Usage: curl -fsSL https://raw.githubusercontent.com/gruted/devops-ops-bot/main/install.sh | bash

REPO="gruted/devops-ops-bot"
INSTALL_DIR="${DEVOPS_WATCH_DIR:-$HOME/.devops-watch}"
BIN_DIR="${DEVOPS_WATCH_BIN:-$HOME/.local/bin}"

echo "Installing devops-ops-bot..."

# Check for Node.js
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is required (v18+). Install from https://nodejs.org"
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Error: Node.js v18+ required (found $(node -v))"
  exit 1
fi

# Clone or update
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Updating existing install..."
  cd "$INSTALL_DIR" && git pull --quiet
else
  echo "Cloning from GitHub..."
  git clone --depth 1 "https://github.com/$REPO.git" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Install deps
npm install --omit=dev --quiet 2>/dev/null

# Create wrapper script
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/devops-watch" << 'WRAPPER'
#!/usr/bin/env bash
exec node "$HOME/.devops-watch/bin/devops-watch.js" "$@"
WRAPPER
chmod +x "$BIN_DIR/devops-watch"

# Check PATH
if ! echo "$PATH" | tr ':' '\n' | grep -q "$(realpath "$BIN_DIR")"; then
  echo ""
  echo "Add to your shell profile:"
  echo "  export PATH=\"$BIN_DIR:\$PATH\""
fi

echo ""
echo "✅ Installed! Run:"
echo "  devops-watch check"
echo ""
echo "Set up cron (every 5 min):"
echo "  devops-watch cron-example --every-min 5"
echo ""
echo "Docs: https://github.com/$REPO"

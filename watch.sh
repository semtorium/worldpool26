#!/bin/bash
# ABS WorldPool — Auto Sync & Deploy (Polling Mode)
# WSL'de çalıştır: bash /mnt/c/Users/semto/OneDrive/Masaüstü/absworldpool/AbsWorldPool/watch.sh

SOURCE="/mnt/c/Users/semto/OneDrive/Masaüstü/absworldpool/AbsWorldPool/frontend"
TARGET="/root/abs-frontend"
INTERVAL=5

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}"
echo "  ⚽ ABS WorldPool — Auto Deploy Watcher"
echo "  Polling every ${INTERVAL}s for changes..."
echo "  Press Ctrl+C to stop."
echo -e "  ────────────────────────────────────${NC}\n"

LAST_HASH=""

while true; do
  # Windows NTFS mount'u için find + checksum ile değişiklik tespiti
  CURRENT_HASH=$(find "$SOURCE" \
    -not -path "*/node_modules/*" \
    -not -path "*/.next/*" \
    -not -path "*/.git/*" \
    -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.css" -o -name "*.json" \) \
    -printf '%T@ %p\n' 2>/dev/null | sort | md5sum | cut -d' ' -f1)

  if [ "$CURRENT_HASH" != "$LAST_HASH" ] && [ -n "$CURRENT_HASH" ]; then
    LAST_HASH="$CURRENT_HASH"

    if [ -n "$LAST_HASH" ]; then
      echo -e "${YELLOW}🔄 Change detected — syncing...${NC}"

      rsync -a --delete \
        --exclude='node_modules/' \
        --exclude='.next/' \
        --exclude='.git/' \
        "$SOURCE/" "$TARGET/"

      cd "$TARGET" || exit

      if ! git diff --quiet HEAD 2>/dev/null || [ -n "$(git status --short)" ]; then
        TIMESTAMP=$(date '+%H:%M:%S')
        git add -A
        git commit -m "auto $TIMESTAMP" --quiet
        if git push origin main -u --quiet 2>&1; then
          echo -e "${GREEN}✅ Pushed at $TIMESTAMP → Vercel deploying...${NC}"
        else
          echo -e "${YELLOW}⚠️  Push failed${NC}"
          git push --set-upstream origin main
        fi
      else
        echo -e "${CYAN}↩  No git changes.${NC}"
      fi
    fi
  fi

  sleep $INTERVAL
done

#!/usr/bin/env bash
set -euo pipefail
git pull
if [ ! -f package-lock.json ]; then
  echo "package-lock.json missing — restoring"
  DEL=$(git rev-list -n 1 HEAD -- package-lock.json)
  git checkout "$DEL^" -- package-lock.json
  git commit -m "Restore package-lock.json (AI Studio drops it on sync)"
  git push
fi
npm install
npm test

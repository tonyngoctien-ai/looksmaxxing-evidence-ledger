#!/bin/sh
# one command during the timer: rebuild + publish
set -e
node src/verify.mjs || exit 1
node src/build.mjs
git add -A && git commit -qm "${1:-content: update ledger}" && git push -q origin main
echo "shipped -> https://tonyngoctien-ai.github.io/looksmaxxing-evidence-ledger/"

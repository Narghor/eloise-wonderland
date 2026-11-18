S="$(cd "$(dirname "$0")" && pwd)"
cd "$S" && /c/Users/Flo/Eloise-Wonderland/node_modules/.bin/esbuild board.ts --bundle --format=iife --minify --outfile=board.js --log-level=warning && node -e "
const fs=require('fs');const js=fs.readFileSync('board.js','utf8').replace(/<\/script/g,'<\\/script');
const page=fs.readFileSync('page.html','utf8');fs.writeFileSync('lot3-board.html',page.replace('/*BOARD*/',()=>js));
fs.writeFileSync('preview.html','<!doctype html><html><head><meta charset=utf-8><meta name=viewport content=\"width=device-width\"></head><body>'+fs.readFileSync('lot3-board.html','utf8')+'</body></html>');"

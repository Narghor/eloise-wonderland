@echo off
rem Double-click: starts the local server and opens the site in the browser.
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run dev -- --open

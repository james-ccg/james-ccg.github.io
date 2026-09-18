@echo off
REM Keeps the homepage's Steam status up to date from this PC.
REM Leave this window open; close it to stop. One small check every 10
REM minutes, and a push only when the status changes.
title Steam status - james-ccg.github.io
cd /d "%~dp0.."
node tools\publish-steam-status.mjs --watch=10m
pause

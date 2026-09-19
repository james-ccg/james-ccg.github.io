@echo off
REM Keeps the homepage's Steam status up to date from this PC.
REM Leave this window open; close it to stop. One small check every 3
REM minutes, and a push only when the status changes.
REM
REM It starts minimised on purpose: a window appearing takes focus, and
REM that is enough to pull a fullscreen game out. Nothing else is started
REM while it runs - the push goes over HTTPS, not through git.
REM
REM It does not have to run all the time. When it is not running the page
REM counts up from the last moment Steam was seen - "on Steam 3h 12m ago" -
REM exactly like Steam's own "Last Online", so nothing goes stale or wrong.
if not "%~1"=="/started" (
	start "Steam status - james-ccg.github.io" /min "%~f0" /started
	exit /b
)
title Steam status - james-ccg.github.io
cd /d "%~dp0.."
node tools\publish-steam-status.mjs --watch=3m
pause

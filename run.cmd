@echo off
rem Starts the FundiLink API (and the website at /app/) from a fresh clone.
rem Usage:  run.cmd     (Mac/Linux/Git Bash: ./run.sh)
cd /d "%~dp0server"
if not exist .env (
  echo No server\.env yet. Copy server\.env.example to server\.env and fill in your values ^(see README^).
  exit /b 1
)
if not exist node_modules (
  echo Installing server packages ^(first run only^)...
  call npm.cmd install
)
node index.js

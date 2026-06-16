@echo off
echo Installing Camel Radar packages
echo.
echo npm ci

cd %~dp0

call npm ci

pause

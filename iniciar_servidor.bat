@echo off
title Sistema CAST - Servidor Local y Red
color 0b
echo ========================================================
echo       INICIANDO SISTEMA CAST CNS (MySQL + Express)
echo ========================================================
echo.
cd /d "%~dp0"
node server.js
pause

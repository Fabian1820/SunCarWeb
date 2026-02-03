@echo off
echo Limpiando cache de Next.js...
rmdir /s /q .next 2>nul
echo Cache de Next.js limpiado.

echo.
echo Limpiando node_modules/.cache...
rmdir /s /q node_modules\.cache 2>nul
echo Cache de node_modules limpiado.

echo.
echo Reconstruyendo la aplicacion...
call npm run build

echo.
echo Listo! La aplicacion ha sido reconstruida con la version correcta.
echo Por favor, pide a los usuarios que:
echo 1. Cierren completamente el navegador
echo 2. Abran de nuevo y presionen Ctrl+Shift+R para forzar recarga
echo 3. O limpien el cache del navegador manualmente
pause

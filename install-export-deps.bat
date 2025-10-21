@echo off
echo ========================================
echo Instalando dependencias de exportacion
echo ========================================
echo.

cd /d "%~dp0"

echo Instalando jspdf, jspdf-autotable y xlsx...
echo.

npm install jspdf jspdf-autotable xlsx

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Instalacion completada exitosamente!
    echo ========================================
    echo.
    echo Las siguientes dependencias fueron instaladas:
    echo - jspdf: Generacion de archivos PDF
    echo - jspdf-autotable: Tablas en PDF
    echo - xlsx: Generacion de archivos Excel
    echo.
    echo Ya puedes usar la funcionalidad de exportacion
    echo en el modulo de Recursos Humanos.
    echo.
    echo Ejecuta 'npm run dev' para iniciar el servidor.
) else (
    echo.
    echo ========================================
    echo Error durante la instalacion
    echo ========================================
    echo.
    echo Por favor, intenta manualmente:
    echo npm install jspdf jspdf-autotable xlsx
)

echo.
pause

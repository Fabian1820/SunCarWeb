#!/bin/bash

echo "🧹 Limpiando cache de Next.js..."
rm -rf .next
echo "✅ Cache de Next.js limpiado."

echo ""
echo "🧹 Limpiando node_modules/.cache..."
rm -rf node_modules/.cache
echo "✅ Cache de node_modules limpiado."

echo ""
echo "🔄 Los cambios se aplicarán en el próximo inicio del servidor de desarrollo."
echo ""
echo "💡 Para aplicar los cambios:"
echo "   1. Detén el servidor de desarrollo (Ctrl+C)"
echo "   2. Ejecuta: npm run dev"
echo "   3. Recarga el navegador con Cmd+Shift+R"
echo ""

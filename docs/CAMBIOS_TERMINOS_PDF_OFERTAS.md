# Cambios: Términos y Condiciones en PDF de Ofertas

## Resumen
Se agregaron los términos y condiciones al final de los PDFs de exportación de ofertas confeccionadas.

## Archivos Modificados

### 1. `lib/services/feats/terminos-service.ts` (NUEVO)
Servicio para obtener y procesar términos y condiciones:
- `obtenerTerminosActivos()`: Obtiene los términos activos desde el backend
- `htmlToPlainText()`: Convierte HTML a texto plano para el PDF
- `parseTerminosHTML()`: Parsea el HTML a estructura de secciones

### 2. `lib/export-service.ts`
**Cambios:**
- Agregado parámetro `terminosCondiciones?: string` a la interfaz `ExportOptions`
- Agregada sección de términos y condiciones antes del pie de página
- Agregada función `htmlToPlainText()` para convertir HTML a texto
- Los términos se agregan en una nueva página con:
  - Título centrado "TÉRMINOS Y CONDICIONES"
  - Texto formateado con párrafos justificados
  - Detección automática de títulos (texto corto en mayúsculas o que termina con :)
  - Manejo automático de saltos de página

### 3. `components/feats/ofertas/ofertas-confeccionadas-view.tsx`
**Cambios:**
- Agregado estado `terminosCondiciones` para almacenar el texto
- Agregado `useEffect` para cargar términos al montar el componente
- Modificada función `generarOpcionesExportacion()` para incluir términos en las 3 opciones:
  - Exportación Completa
  - Exportación Sin Precios
  - Exportación Cliente con Precios

## Flujo de Funcionamiento

1. **Carga Inicial**: Al abrir la vista de ofertas confeccionadas, se cargan los términos desde el backend
2. **Generación de PDF**: Al exportar una oferta, los términos se incluyen automáticamente
3. **Renderizado**: Los términos aparecen en una nueva página al final del PDF, antes del pie de página

## Estructura del PDF

```
┌─────────────────────────────────────┐
│  Página 1: Encabezado y Datos       │
│  - Logo                             │
│  - Información del cliente/lead     │
│  - Componentes principales          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Página 2-N: Tabla de Materiales    │
│  - Items por sección                │
│  - Precios y márgenes               │
│  - Totales                          │
│  - Información de pago              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Página N+1: TÉRMINOS Y CONDICIONES │
│                                     │
│  TÉRMINOS Y CONDICIONES             │
│  ─────────────────────────────────  │
│                                     │
│  [Texto de términos formateado]     │
│  - Títulos en negrita               │
│  - Párrafos justificados            │
│  - Saltos de página automáticos     │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Pie de Página (todas las páginas)  │
│  SUNCAR SRL | Página X de Y         │
└─────────────────────────────────────┘
```

## Características

### ✅ Implementado
- Carga automática de términos al abrir la vista
- Inclusión en las 3 opciones de exportación (Completo, Sin Precios, Cliente con Precios)
- Nueva página dedicada para términos
- Formato profesional con títulos y párrafos
- Conversión automática de HTML a texto plano
- Manejo de saltos de página automáticos
- Detección de títulos (mayúsculas o terminados en :)
- Texto justificado para mejor presentación

### 📝 Formato del Texto
- **Títulos**: Negrita, tamaño 10pt, color negro
- **Párrafos**: Normal, tamaño 9pt, color gris oscuro, justificado
- **Espaciado**: 4-6pt entre líneas, separación entre párrafos
- **Márgenes**: 12mm laterales

### 🔄 Manejo de Errores
- Si no se pueden cargar los términos, el PDF se genera sin ellos
- No bloquea la exportación si falta el texto
- Logs en consola para debugging

## Endpoint Utilizado

```
GET /api/terminos-condiciones/activo
```

**Response esperado:**
```json
{
  "success": true,
  "message": "Términos y condiciones obtenidos",
  "data": {
    "id": "698287670e410fe1648bcebf",
    "texto": "<div class=\"terminos-condiciones\">...</div>",
    "fecha_creacion": "2026-02-03T23:40:23.986Z",
    "fecha_actualizacion": "2026-02-03T23:40:23.986Z",
    "version": 1,
    "activo": true
  }
}
```

## Ejemplo de Uso

```typescript
// Los términos se cargan automáticamente
useEffect(() => {
  const cargarTerminos = async () => {
    const response = await fetch(`${API_BASE_URL}/api/terminos-condiciones/activo`)
    const result = await response.json()
    if (result.success && result.data) {
      setTerminosCondiciones(result.data.texto)
    }
  }
  cargarTerminos()
}, [])

// Se incluyen automáticamente en la exportación
const exportOptions = {
  // ... otras opciones
  terminosCondiciones: terminosCondiciones || undefined
}
```

## Notas Técnicas

### Conversión HTML a Texto
- Se eliminan todas las etiquetas HTML
- Se preservan saltos de línea (`<br>`, `</p>`, `</h>`)
- Se convierten entidades HTML (`&nbsp;`, `&amp;`, etc.)
- Los emojis 🔹 se convierten a bullets •

### Detección de Títulos
Un párrafo se considera título si:
- Tiene menos de 50 caracteres Y
- Está completamente en mayúsculas O termina con ":"

### Saltos de Página
- Se verifica el espacio disponible antes de cada párrafo
- Si quedan menos de 30mm, se crea una nueva página
- Los títulos siempre empiezan en la misma página que su contenido

## Testing

Para probar:
1. Ir a "Ver Ofertas Confeccionadas"
2. Hacer clic en el botón de exportar de cualquier oferta
3. Seleccionar materiales y tipo de exportación
4. Exportar a PDF
5. Verificar que la última página contiene los términos y condiciones

## Futuras Mejoras

- [ ] Caché de términos para evitar múltiples peticiones
- [ ] Vista previa de términos antes de exportar
- [ ] Opción para incluir/excluir términos en la exportación
- [ ] Soporte para múltiples idiomas
- [ ] Formato HTML mejorado en el PDF (negrita, listas, etc.)

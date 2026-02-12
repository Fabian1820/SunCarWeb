# ✅ Diseño Definitivo - Modal Asignar Ofertas

## 🎨 Diseño Final Implementado

### Visualización Híbrida: Detalle + Resumen

Cada oferta muestra:
1. **Componentes principales** (Inversor, Batería, Panel) → Con nombre completo del material con mayor cantidad
2. **Componentes secundarios** (Cables, Canalización) → Solo la mayor cantidad

```
┌──────────────────────────────────────────────────────────┐
│ [Foto]  OF-20250206-001                      [Asignar]   │
│  80x80  Sistema Solar Residencial 10kW                   │
│         $15,000.00  |  Margen: 25.0%                     │
│                                                           │
│         🔌 2x Inversor Felicity Solar 5.0kW              │
│         ⚡ 4x Batería Felicity Solar 5.12kWh 51.2V       │
│         ☀️ 14x Panel Evo Solar 590W Monocristalino       │
│         ──────────────────────────────────────           │
│         🔵 2 Cable AC    🟣 3 Cable DC    📦 5 Canaliz.  │
└──────────────────────────────────────────────────────────┘
```

## 📊 Lógica de Visualización

### Para Cada Categoría:
Se muestra el **material con la mayor cantidad** de esa categoría.

**Ejemplo:**
Si en la categoría "Inversor" hay:
- 2x Inversor Felicity 5kW
- 1x Inversor Growatt 3kW

Se mostrará: `🔌 2x Inversor Felicity 5kW` (porque 2 > 1)

### Secciones Principales (Con Nombre Completo)
- 🔌 **Inversor** → Muestra cantidad + descripción completa
- ⚡ **Batería** → Muestra cantidad + descripción completa
- ☀️ **Panel** → Muestra cantidad + descripción completa

### Secciones Secundarias (Solo Cantidad)
- 🔵 **Cable AC** → Solo muestra la mayor cantidad
- 🟣 **Cable DC** → Solo muestra la mayor cantidad
- 📦 **Canalización** → Solo muestra la mayor cantidad

## 🔍 Detección por Campo `seccion`

La función busca en el campo `seccion` de cada item:

```typescript
const seccion = item.seccion?.toLowerCase() || ''

// Valores esperados en la BD:
- 'inversor' o 'inversores'
- 'bateria' o 'baterias' o 'batería' o 'baterías'
- 'panel' o 'paneles'
- 'cableado_ac'
- 'cableado_dc'
- 'canalizacion' o 'canalización'
```

## 📐 Layout Detallado

```
┌────────────────────────────────────────────────────────────┐
│  🔍 [Buscar por nombre, número o precio...]                │
│                                                             │
│  6 ofertas disponibles                                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ┌────┐  OF-001                          ┌──────┐    │ │
│  │ │Foto│  Sistema Solar 10kW              │Asig- │    │ │
│  │ │80px│  $15,000  |  25%                 │nar   │    │ │
│  │ └────┘                                   └──────┘    │ │
│  │                                                       │ │
│  │  🔌 2x Inversor Felicity Solar 5.0kW                 │ │
│  │  ⚡ 4x Batería Felicity Solar 5.12kWh 51.2V          │ │
│  │  ☀️ 14x Panel Evo Solar 590W Monocristalino          │ │
│  │  ─────────────────────────────────────────           │ │
│  │  🔵 2 Cable AC   🟣 3 Cable DC   📦 5 Canaliz.       │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## 🎯 Ejemplos Reales

### Oferta Completa
```
[Foto] OF-20250206-001                    [Asignar]
       Sistema Solar Residencial 10kW
       $15,000.00  |  Margen: 25.0%
       
       🔌 2x Inversor Felicity Solar 5.0kW
       ⚡ 4x Batería Felicity Solar 5.12kWh 51.2V
       ☀️ 14x Panel Evo Solar 590W Monocristalino
       ──────────────────────────────────────
       🔵 2 Cable AC   🟣 3 Cable DC   📦 5 Canaliz.
```

### Oferta Sin Baterías (On-Grid)
```
[Foto] OF-20250206-002                    [Asignar]
       Sistema On-Grid 5kW
       $5,500.00  |  Margen: 20.0%
       
       🔌 1x Inversor Growatt 5kW On-Grid
       ☀️ 10x Panel JA Solar 550W
       ──────────────────────────────────────
       🔵 1 Cable AC   🟣 2 Cable DC
```

### Oferta Básica
```
[Foto] OF-20250206-003                    [Asignar]
       Kit Solar Básico
       $3,000.00  |  Margen: 18.0%
       
       🔌 1x Inversor Growatt 3kW
       ☀️ 6x Panel Trina Solar 450W
```

## 🔧 Implementación Técnica

### Función Principal
```typescript
const getCategoryMaxItems = (oferta: OfertaConfeccion) => {
  const maxItems = {
    inversor: null,
    bateria: null,
    panel: null,
    cableadoAC: null,
    cableadoDC: null,
    canalizacion: null,
  }

  oferta.items?.forEach((item) => {
    const seccion = item.seccion?.toLowerCase() || ''
    const itemData = { cantidad: item.cantidad, descripcion: item.descripcion }
    
    if (seccion === 'inversor' || seccion === 'inversores') {
      // Guardar solo si es el de mayor cantidad
      if (!maxItems.inversor || item.cantidad > maxItems.inversor.cantidad) {
        maxItems.inversor = itemData
      }
    }
    // ... más categorías
  })

  return maxItems
}
```

### Renderizado Diferenciado

**Componentes Principales (con descripción):**
```typescript
{maxItems.inversor && (
  <div className="flex items-start gap-1.5 text-gray-700">
    <Zap className="h-3 w-3 text-orange-500" />
    <span className="font-medium">{maxItems.inversor.cantidad}x</span>
    <span className="line-clamp-1">{maxItems.inversor.descripcion}</span>
  </div>
)}
```

**Componentes Secundarios (solo cantidad):**
```typescript
{maxItems.cableadoAC && (
  <div className="flex items-center gap-1">
    <Cable className="h-2.5 w-2.5 text-blue-500" />
    <span className="font-medium">{maxItems.cableadoAC.cantidad}</span>
    <span className="text-gray-500">Cable AC</span>
  </div>
)}
```

## 📊 Jerarquía Visual

### Nivel 1: Componentes Principales
- **Tamaño texto:** 12px
- **Iconos:** 12px
- **Formato:** `cantidad + "x" + descripción completa`
- **Layout:** Vertical (cada uno en su línea)
- **Truncado:** `line-clamp-1` (1 línea máximo)

### Nivel 2: Componentes Secundarios
- **Tamaño texto:** 11px
- **Iconos:** 10px
- **Formato:** `cantidad + etiqueta`
- **Layout:** Horizontal (grid 3 columnas)
- **Separador:** Línea divisoria arriba

## 🎨 Colores y Estilos

| Categoría | Icono | Color | Tamaño Icono | Tamaño Texto |
|-----------|-------|-------|--------------|--------------|
| Inversor | ⚡ Zap | Naranja `#f97316` | 12px | 12px |
| Batería | 🔋 Battery | Verde `#22c55e` | 12px | 12px |
| Panel | ☀️ Sun | Amarillo `#eab308` | 12px | 12px |
| Cable AC | 🔌 Cable | Azul `#3b82f6` | 10px | 11px |
| Cable DC | 🔌 Cable | Púrpura `#a855f7` | 10px | 11px |
| Canalización | 📦 Boxes | Gris `#6b7280` | 10px | 11px |

## ✅ Ventajas del Diseño

| Aspecto | Beneficio |
|---------|-----------|
| **Información Clave** | Muestra el componente más importante de cada categoría |
| **Nombres Completos** | Inversores y baterías con descripción completa |
| **Compacto** | Cables y canalización solo con cantidad |
| **Jerarquía Clara** | Principales destacados, secundarios discretos |
| **Fácil Comparación** | Se ve rápidamente qué incluye cada oferta |
| **Profesional** | Balance entre detalle y simplicidad |

## 🧪 Casos de Prueba

### Caso 1: Múltiples Inversores
**Items:**
- 2x Inversor Felicity 5kW
- 1x Inversor Growatt 3kW

**Resultado:**
```
🔌 2x Inversor Felicity 5kW
```
✅ Muestra el de mayor cantidad (2 > 1)

### Caso 2: Múltiples Cables DC
**Items:**
- 3x Cable DC 4mm² 50m
- 2x Cable DC 6mm² 30m

**Resultado:**
```
🟣 3 Cable DC
```
✅ Muestra solo la mayor cantidad (3 > 2)

### Caso 3: Sin Baterías
**Items:**
- 1x Inversor On-Grid
- 10x Panel

**Resultado:**
```
🔌 1x Inversor On-Grid
☀️ 10x Panel
```
✅ No muestra sección de baterías

## 📝 Notas Importantes

1. **Truncado Inteligente:** Los nombres de inversores, baterías y paneles se truncan a 1 línea con `line-clamp-1`

2. **Solo Mayor Cantidad:** Si hay múltiples materiales en una categoría, solo se muestra el que tiene mayor cantidad

3. **Separador Visual:** Línea divisoria entre componentes principales y secundarios

4. **Grid Responsive:** Los componentes secundarios se organizan en grid de 3 columnas

5. **Detección Flexible:** Acepta variaciones en el nombre de la sección (con/sin tilde, singular/plural)

## 🔄 Comparación de Versiones

### ❌ Versión Anterior
```
🔌 2 Inversor    ⚡ 4 Batería    ☀️ 14 Panel
🔵 2 Cable AC    🟣 3 Cable DC   📦 5 Canaliz.
```
Problema: No se veía qué modelo de inversor o batería

### ✅ Versión Actual
```
🔌 2x Inversor Felicity Solar 5.0kW
⚡ 4x Batería Felicity Solar 5.12kWh 51.2V
☀️ 14x Panel Evo Solar 590W Monocristalino
──────────────────────────────────────
🔵 2 Cable AC    🟣 3 Cable DC    📦 5 Canaliz.
```
Solución: Nombres completos para componentes principales, cantidades para secundarios

---

**Archivo:** `components/feats/ofertas/asignar-oferta-generica-dialog.tsx`
**Estado:** ✅ Implementado y optimizado
**Fecha:** 2025-02-06
**Versión:** 4.0 (Definitiva - Híbrida)

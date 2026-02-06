# Mejoras de Diseño - Modal Asignar Ofertas

## 🎨 Cambios Implementados

### 1. Buscador Integrado
- Campo de búsqueda en la parte superior del modal
- Búsqueda en tiempo real por:
  - Nombre de la oferta
  - Nombre completo
  - Número de oferta
  - Precio
- Contador de resultados filtrados

### 2. Diseño Compacto por Filas

Cada oferta ahora se muestra en una fila horizontal compacta con:

#### Estructura Visual
```
┌─────────────────────────────────────────────────────────────┐
│ [Foto]  Nombre + Info + Categorías              [Asignar]   │
│  80x80  • Número: OF-20250206-001                            │
│         • Nombre: I-2x5kW, B-4x5.12kWh...                    │
│         • Precio: $15,000  |  Margen: 25%                    │
│         • 🔌2 Inv. ⚡4 Bat. ☀️12 Pan.                        │
│         • 🔵2 AC  🟣3 DC  📦5 Canal.                         │
└─────────────────────────────────────────────────────────────┘
```

#### Componentes de cada fila:

**A. Foto (80x80px)**
- Imagen de portada de la oferta
- Placeholder con icono si no hay foto
- Borde redondeado

**B. Información Principal**
- Número de oferta (pequeño, monospace)
- Nombre de la oferta (1 línea, truncado)
- Precio final (grande, naranja)
- Margen comercial (verde)

**C. Categorías con Iconos**
Grid de 3 columnas con iconos de colores:
- 🔌 **Inversor** (naranja) - Zap icon
- ⚡ **Batería** (verde) - Battery icon
- ☀️ **Panel** (amarillo) - Sun icon
- 🔵 **Cableado AC** (azul) - Cable icon
- 🟣 **Cableado DC** (púrpura) - Cable icon
- 📦 **Canalización** (gris) - Boxes icon

Solo se muestran las categorías que tienen cantidad > 0

**D. Botón Asignar**
- Vertical, altura completa de la fila
- Icono + texto "Asignar"
- Estado de carga cuando se está asignando

### 3. Características Visuales

#### Tamaños y Espaciado
- **Altura de fila:** ~100px (compacta)
- **Foto:** 80x80px
- **Gap entre elementos:** 12px
- **Padding de card:** 12px
- **Texto principal:** 14px
- **Texto secundario:** 12px
- **Iconos de categoría:** 12px
- **Cantidades:** 10-12px

#### Colores
- **Precio:** `text-orange-600` (#ea580c)
- **Margen:** `text-green-600` (#16a34a)
- **Hover card:** `border-orange-300`
- **Iconos:**
  - Inversor: `text-orange-500`
  - Batería: `text-green-500`
  - Panel: `text-yellow-500`
  - AC: `text-blue-500`
  - DC: `text-purple-500`
  - Canalización: `text-gray-500`

#### Interactividad
- Hover en card: sombra + borde naranja
- Scroll en lista de ofertas (max-height: 60vh)
- Búsqueda en tiempo real
- Loading states

## 📊 Comparación Antes/Después

### Antes
- ❌ Sin buscador
- ❌ Diseño vertical expandido
- ❌ Mucho espacio desperdiciado
- ❌ Lista de items completa (verbose)
- ❌ Difícil comparar ofertas
- ❌ ~200px por oferta

### Después
- ✅ Buscador integrado
- ✅ Diseño horizontal compacto
- ✅ Uso eficiente del espacio
- ✅ Resumen visual con iconos
- ✅ Fácil escaneo y comparación
- ✅ ~100px por oferta (50% más compacto)

## 🎯 Beneficios

1. **Más ofertas visibles:** Se pueden ver el doble de ofertas sin scroll
2. **Búsqueda rápida:** Encuentra ofertas por nombre o precio
3. **Comparación visual:** Iconos de colores facilitan comparar componentes
4. **Menos clutter:** Solo información esencial
5. **Mejor UX:** Diseño limpio y profesional

## 🔧 Implementación Técnica

### Nuevas Funciones

#### 1. Contador de Categorías
```typescript
const getCategoryCounts = (oferta: OfertaConfeccion) => {
  const counts: Record<string, number> = {
    inversor: 0,
    bateria: 0,
    panel: 0,
    'cableado ac': 0,
    'cableado dc': 0,
    canalizacion: 0,
  }

  oferta.items?.forEach((item) => {
    const categoria = item.categoria?.toLowerCase() || ''
    // Lógica de conteo por categoría
  })

  return counts
}
```

#### 2. Filtrado de Búsqueda
```typescript
const ofertasFiltradas = useMemo(() => {
  if (!searchQuery.trim()) return ofertas

  const query = searchQuery.toLowerCase()
  return ofertas.filter((oferta) => {
    return (
      oferta.nombre?.toLowerCase().includes(query) ||
      oferta.nombre_completo?.toLowerCase().includes(query) ||
      oferta.numero_oferta?.toLowerCase().includes(query) ||
      oferta.precio_final.toString().includes(query)
    )
  })
}, [ofertas, searchQuery])
```

### Nuevos Imports
```typescript
import { Input } from "@/components/shared/atom/input"
import { Search, Image as ImageIcon, Zap, Battery, Sun, Cable, Boxes } from "lucide-react"
import Image from "next/image"
```

### Estado Adicional
```typescript
const [searchQuery, setSearchQuery] = useState("")
```

## 📱 Responsive

El diseño es responsive:
- **Desktop:** Foto 80x80, grid de 3 columnas para categorías
- **Tablet:** Mantiene estructura horizontal
- **Mobile:** Podría ajustarse a diseño vertical si es necesario

## 🧪 Testing

### Casos a Probar

1. **Búsqueda**
   - [ ] Buscar por nombre
   - [ ] Buscar por número de oferta
   - [ ] Buscar por precio
   - [ ] Limpiar búsqueda

2. **Visualización**
   - [ ] Ofertas con foto
   - [ ] Ofertas sin foto (placeholder)
   - [ ] Ofertas con todas las categorías
   - [ ] Ofertas con solo algunas categorías
   - [ ] Scroll en lista larga

3. **Interacción**
   - [ ] Hover en cards
   - [ ] Click en asignar
   - [ ] Estado de carga
   - [ ] Cerrar modal

4. **Edge Cases**
   - [ ] Sin ofertas disponibles
   - [ ] Búsqueda sin resultados
   - [ ] Ofertas sin items
   - [ ] Precios muy grandes/pequeños

## 🎨 Ejemplo Visual

### Oferta Completa
```
┌──────────────────────────────────────────────────────────┐
│ ┌────┐  OF-20250206-001                        ┌──────┐ │
│ │    │  Sistema Solar 10kW                     │      │ │
│ │Foto│  Precio Final: $15,000  |  Margen: 25% │Asig- │ │
│ │    │  🔌2 Inv.  ⚡4 Bat.  ☀️12 Pan.          │nar   │ │
│ └────┘  🔵2 AC    🟣3 DC    📦5 Canal.         └──────┘ │
└──────────────────────────────────────────────────────────┘
```

### Oferta Mínima
```
┌──────────────────────────────────────────────────────────┐
│ ┌────┐  OF-20250206-002                        ┌──────┐ │
│ │ 📷 │  Oferta Básica                          │      │ │
│ │    │  Precio Final: $5,000   |  Margen: 20% │Asig- │ │
│ └────┘  🔌1 Inv.  ☀️6 Pan.                     │nar   │ │
│                                                 └──────┘ │
└──────────────────────────────────────────────────────────┘
```

## 📝 Notas de Implementación

### Categorización Inteligente
El sistema detecta categorías por palabras clave en el nombre:
- "inversor" → Inversor
- "bateria" o "batería" → Batería
- "panel" → Panel
- "cableado ac" o "cable ac" → Cableado AC
- "cableado dc" o "cable dc" → Cableado DC
- "canalizacion" o "canalización" → Canalización

### Optimizaciones
- `useMemo` para filtrado de búsqueda
- Lazy loading de imágenes con Next.js Image
- Scroll virtual si hay muchas ofertas (futuro)

## 🔄 Próximas Mejoras (Opcional)

1. **Filtros Avanzados**
   - Por rango de precio
   - Por categorías específicas
   - Por almacén

2. **Ordenamiento**
   - Por precio (asc/desc)
   - Por margen
   - Por fecha de creación

3. **Vista Previa**
   - Tooltip con más detalles al hover
   - Modal de vista previa completa

4. **Favoritos**
   - Marcar ofertas favoritas
   - Filtro de favoritos

---

**Archivo modificado:** `components/feats/ofertas/asignar-oferta-generica-dialog.tsx`
**Fecha:** 2025-02-06
**Estado:** ✅ Implementado

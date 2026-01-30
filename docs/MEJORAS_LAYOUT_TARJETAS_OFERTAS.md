# 🎨 Mejoras de Layout: Tarjetas de Ofertas Confeccionadas

## 📋 Cambios Implementados

Se optimizó el layout de las tarjetas de ofertas confeccionadas para mejorar la alineación y consistencia visual.

## ✅ Mejoras Aplicadas

### 1. Altura Fija del Contenedor Principal

**Antes:**
```tsx
<div className="p-4 space-y-3">
  {/* Contenido con altura variable */}
</div>
```

**Después:**
```tsx
<div className="p-4 flex flex-col h-[180px]">
  {/* Contenido con altura fija de 180px */}
</div>
```

**Beneficio:** Todas las tarjetas tienen la misma altura de contenido, independientemente del texto.

---

### 2. Título con Altura Fija

**Antes:**
```tsx
<h3 className="font-semibold text-base text-slate-900 line-clamp-2 min-h-[48px]">
  {oferta.nombre}
</h3>
```

**Después:**
```tsx
<h3 className="font-semibold text-base text-slate-900 line-clamp-2 h-[48px] mb-3">
  {oferta.nombre}
</h3>
```

**Cambios:**
- `min-h-[48px]` → `h-[48px]` (altura fija en lugar de mínima)
- Agregado `mb-3` (margen inferior consistente)

**Beneficio:** El título siempre ocupa el mismo espacio (2 líneas máximo).

---

### 3. Sección de Contacto con Flex-1

**Antes:**
```tsx
<div className="space-y-2">
  <div className="flex items-center gap-2 text-sm text-slate-600">
    {/* Nombre del contacto */}
  </div>
  {oferta.nombre_lead_sin_agregar && (
    <div className="flex items-center gap-1.5 ml-9">
      {/* Badge */}
    </div>
  )}
</div>
```

**Después:**
```tsx
<div className="flex-1 space-y-1.5 min-h-0">
  <div className="flex items-center gap-2 text-sm text-slate-600">
    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
      {/* Icono */}
    </div>
    <span className="truncate">
      {/* Nombre del contacto */}
    </span>
  </div>
  
  {oferta.nombre_lead_sin_agregar && (
    <div className="flex items-center gap-2 pl-9">
      {/* Badge alineado */}
    </div>
  )}
</div>
```

**Cambios:**
- Agregado `flex-1` (ocupa espacio disponible)
- Agregado `min-h-0` (permite que el contenido se ajuste)
- `space-y-2` → `space-y-1.5` (espaciado más compacto)
- Agregado `flex-shrink-0` al icono (no se encoge)
- `ml-9` → `pl-9` (padding en lugar de margin para mejor alineación)
- `gap-1.5` → `gap-2` (espaciado consistente)

**Beneficio:** La sección de contacto se expande para llenar el espacio disponible.

---

### 4. Badge Alineado con el Nombre

**Antes:**
```tsx
<div className="flex items-center gap-1.5 ml-9">
  <Badge>Lead pendiente de agregar</Badge>
</div>
```

**Después:**
```tsx
<div className="flex items-center gap-2 pl-9">
  <Badge>Lead pendiente de agregar</Badge>
</div>
```

**Cambios:**
- `ml-9` → `pl-9` (padding izquierdo de 36px = ancho del icono + gap)
- `gap-1.5` → `gap-2` (consistente con la fila del nombre)

**Beneficio:** El badge está perfectamente alineado verticalmente con el nombre del contacto.

---

### 5. Botones con mt-auto

**Antes:**
```tsx
<div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2">
  {/* Botones */}
</div>
```

**Después:**
```tsx
<div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 mt-auto">
  {/* Botones */}
</div>
```

**Cambios:**
- Agregado `mt-auto` (empuja los botones al fondo)

**Beneficio:** Los botones siempre están en la misma posición en todas las tarjetas.

---

## 🎨 Resultado Visual

### Antes (Desalineado)

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ Oferta Solar            │  │ Oferta Solar Residencial│
│ Residencial             │  │ con Baterías de Litio   │
│                         │  │                         │
│ 👤 Pedro López          │  │ 👤 María García         │
│    [⚠️ Lead pendiente]  │  │                         │
│                         │  │                         │
│ [Exportar] [Ver]        │  │                         │
└─────────────────────────┘  │ [Exportar] [Ver]        │
                             └─────────────────────────┘
                             ↑ Botones desalineados
```

### Después (Alineado)

```
┌─────────────────────────┐  ┌─────────────────────────┐
│ Oferta Solar            │  │ Oferta Solar Residencial│
│ Residencial             │  │ con Baterías de Litio   │
│                         │  │                         │
│ 👤 Pedro López          │  │ 👤 María García         │
│    [⚠️ Lead pendiente]  │  │                         │
│                         │  │                         │
│ [Exportar] [Ver]        │  │ [Exportar] [Ver]        │
└─────────────────────────┘  └─────────────────────────┘
↑ Botones alineados          ↑ Botones alineados
```

---

## 📐 Estructura de Alturas

```
┌─────────────────────────────────┐
│ Imagen: 192px (h-48)            │
├─────────────────────────────────┤
│ Contenido: 180px (h-[180px])    │
│ ┌─────────────────────────────┐ │
│ │ Título: 48px (h-[48px])     │ │
│ ├─────────────────────────────┤ │
│ │ Contacto: flex-1            │ │
│ │ - Nombre: auto              │ │
│ │ - Badge: auto (si existe)   │ │
│ ├─────────────────────────────┤ │
│ │ Botones: auto + mt-auto     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

Total: 192px + 180px + padding = ~388px por tarjeta
```

---

## 🎯 Alineación del Badge

### Cálculo del Padding

```
Icono: 28px (h-7 w-7)
Gap: 8px (gap-2)
Total: 36px

pl-9 = 36px (9 × 4px)
```

### Resultado

```
👤 Pedro López
   [⚠️ Lead pendiente de agregar]
   ↑
   36px de padding izquierdo
   (alineado con el inicio del texto)
```

---

## 🔍 Comparación Detallada

### Tarjeta con Lead Sin Agregar

**Antes:**
```
┌─────────────────────────────────┐
│ [Imagen - 192px]                │
├─────────────────────────────────┤
│ Oferta Solar Residencial        │ ← Altura variable
│                                 │
│ 👤 Pedro López                  │
│         [⚠️ Lead pendiente]     │ ← Desalineado
│                                 │
│                                 │ ← Espacio variable
│ [Exportar] [✏️] [Ver detalle]   │ ← Posición variable
└─────────────────────────────────┘
```

**Después:**
```
┌─────────────────────────────────┐
│ [Imagen - 192px]                │
├─────────────────────────────────┤
│ Oferta Solar Residencial        │ ← 48px fijos
│                                 │
│ 👤 Pedro López                  │
│    [⚠️ Lead pendiente]          │ ← Alineado (pl-9)
│                                 │ ← flex-1
│ [Exportar] [✏️] [Ver detalle]   │ ← mt-auto (siempre abajo)
└─────────────────────────────────┘
   ↑ 180px fijos
```

### Tarjeta sin Lead Sin Agregar

**Antes:**
```
┌─────────────────────────────────┐
│ [Imagen - 192px]                │
├─────────────────────────────────┤
│ Oferta Solar Residencial        │
│                                 │
│ 👤 María García                 │
│                                 │
│                                 │
│                                 │ ← Más espacio
│ [Exportar] [✏️] [Ver detalle]   │ ← Posición diferente
└─────────────────────────────────┘
```

**Después:**
```
┌─────────────────────────────────┐
│ [Imagen - 192px]                │
├─────────────────────────────────┤
│ Oferta Solar Residencial        │ ← 48px fijos
│                                 │
│ 👤 María García                 │
│                                 │
│                                 │ ← flex-1 (más espacio)
│ [Exportar] [✏️] [Ver detalle]   │ ← mt-auto (misma posición)
└─────────────────────────────────┘
   ↑ 180px fijos
```

---

## ✅ Beneficios

### 1. Consistencia Visual
- ✅ Todas las tarjetas tienen la misma altura
- ✅ Los botones siempre están en la misma posición
- ✅ El título siempre ocupa el mismo espacio

### 2. Mejor Alineación
- ✅ El badge está perfectamente alineado con el nombre
- ✅ El icono no se encoge (flex-shrink-0)
- ✅ El texto se trunca correctamente

### 3. Experiencia de Usuario
- ✅ Más fácil escanear visualmente las tarjetas
- ✅ Los botones son más fáciles de encontrar
- ✅ El layout es más predecible

### 4. Responsive
- ✅ El contenido se adapta al espacio disponible
- ✅ El texto largo se trunca con ellipsis
- ✅ Los badges se ajustan automáticamente

---

## 🧪 Testing

### Verificar Alineación

1. **Crear ofertas con diferentes longitudes de título:**
   - Título corto: "Oferta Solar"
   - Título largo: "Oferta Solar Residencial con Baterías de Litio y Paneles de Alta Eficiencia"

2. **Crear ofertas con y sin lead sin agregar:**
   - Con lead sin agregar: Verificar que el badge esté alineado
   - Sin lead sin agregar: Verificar que los botones estén en la misma posición

3. **Verificar en diferentes tamaños de pantalla:**
   - Desktop: Grid de 3-4 columnas
   - Tablet: Grid de 2 columnas
   - Mobile: Grid de 1 columna

### Checklist

- [ ] Todas las tarjetas tienen la misma altura
- [ ] Los títulos ocupan exactamente 2 líneas (o menos)
- [ ] Los botones están alineados horizontalmente
- [ ] El badge está alineado con el nombre del contacto
- [ ] El icono de usuario no se encoge
- [ ] El texto largo se trunca con "..."

---

## 📝 Código Completo

```tsx
<div className="p-4 flex flex-col h-[180px]">
  {/* Título - altura fija */}
  <h3 className="font-semibold text-base text-slate-900 line-clamp-2 h-[48px] mb-3">
    {oferta.nombre}
  </h3>

  {/* Sección de contacto - flex-1 para ocupar espacio disponible */}
  <div className="flex-1 space-y-1.5 min-h-0">
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
        <User className="h-4 w-4 text-slate-600" />
      </div>
      <span className="truncate">
        {/* Nombre del contacto */}
      </span>
    </div>
    
    {/* Indicador de Lead Sin Agregar - alineado con el nombre */}
    {oferta.nombre_lead_sin_agregar && (
      <div className="flex items-center gap-2 pl-9">
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs px-2 py-0.5">
          <span className="mr-1">⚠️</span>
          Lead pendiente de agregar
        </Badge>
      </div>
    )}
  </div>

  {/* Botones - siempre en la misma posición */}
  <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 mt-auto">
    {/* Botones */}
  </div>
</div>
```

---

## 📚 Referencias

- Archivo modificado: `components/feats/ofertas/ofertas-confeccionadas-view.tsx`
- Líneas modificadas: ~985-1025
- Clases Tailwind utilizadas:
  - `flex flex-col` - Layout flexbox vertical
  - `h-[180px]` - Altura fija del contenedor
  - `h-[48px]` - Altura fija del título
  - `flex-1` - Ocupa espacio disponible
  - `min-h-0` - Permite que el contenido se ajuste
  - `flex-shrink-0` - No permite que el elemento se encoja
  - `mt-auto` - Empuja el elemento al fondo
  - `pl-9` - Padding izquierdo de 36px
  - `truncate` - Trunca el texto con ellipsis

---

**Fecha de implementación:** 30 de enero de 2026  
**Estado:** ✅ Completado  
**Probado:** ⏳ Pendiente de pruebas visuales

# 🎨 Indicador Visual: Lead Sin Agregar en Ofertas Confeccionadas

## 📋 Resumen

Se agregaron indicadores visuales en las tarjetas de ofertas confeccionadas para identificar fácilmente cuáles tienen un "lead sin agregar" (contacto pendiente de registrar en el sistema).

## 🎯 Problema

Las ofertas con `nombre_lead_sin_agregar` representan contactos que aún no están registrados como leads o clientes en el sistema. Era difícil identificar visualmente cuáles ofertas tenían este tipo de contacto pendiente.

## ✅ Solución Implementada

Se agregaron **3 indicadores visuales** en diferentes ubicaciones:

### 1. Badge en la Imagen de la Tarjeta (Más Visible)

**Ubicación:** Esquina superior izquierda de la imagen de portada

**Apariencia:**
```
┌─────────────────────────────────┐
│ [En Revisión] [⚠️ Lead pendiente]│
│                                 │
│        [Imagen de Oferta]       │
│                                 │
└─────────────────────────────────┘
```

**Código:**
```tsx
<div className="absolute top-3 left-3 flex flex-wrap gap-2">
  <Badge className={estadoBadge.className}>{estadoBadge.label}</Badge>
  {oferta.nombre_lead_sin_agregar && (
    <Badge className="bg-amber-500 text-white border-amber-600 shadow-md">
      <span className="mr-1">⚠️</span>
      Lead pendiente
    </Badge>
  )}
</div>
```

**Características:**
- Color: Ámbar/Naranja (`bg-amber-500`)
- Icono: ⚠️ (advertencia)
- Texto: "Lead pendiente"
- Sombra para destacar sobre la imagen

---

### 2. Badge Debajo del Nombre del Contacto

**Ubicación:** Debajo del nombre del contacto en la tarjeta

**Apariencia:**
```
┌─────────────────────────────────┐
│ Oferta Solar Residencial        │
│                                 │
│ 👤 Pedro López                  │
│    [⚠️ Lead pendiente de agregar]│
│                                 │
│ [Exportar] [✏️] [Ver detalle]   │
└─────────────────────────────────┘
```

**Código:**
```tsx
<div className="space-y-2">
  <div className="flex items-center gap-2 text-sm text-slate-600">
    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center">
      <User className="h-4 w-4 text-slate-600" />
    </div>
    <span className="truncate">
      {oferta.nombre_lead_sin_agregar || /* otros contactos */}
    </span>
  </div>
  
  {/* Indicador de Lead Sin Agregar */}
  {oferta.nombre_lead_sin_agregar && (
    <div className="flex items-center gap-1.5 ml-9">
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs px-2 py-0.5">
        <span className="mr-1">⚠️</span>
        Lead pendiente de agregar
      </Badge>
    </div>
  )}
</div>
```

**Características:**
- Color: Ámbar claro (`bg-amber-100`)
- Texto: Ámbar oscuro (`text-amber-800`)
- Icono: ⚠️
- Texto: "Lead pendiente de agregar"
- Tamaño: Pequeño (`text-xs`)

---

### 3. Alerta en el Diálogo de Detalle

**Ubicación:** Sección de "Información del contacto" en el diálogo de detalle

**Apariencia:**
```
┌─────────────────────────────────────────┐
│ Información del contacto                │
│                                         │
│ Tipo: Lead (sin agregar)                │
│ Nombre: Pedro López                     │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚠️ Lead pendiente de agregar        │ │
│ │                                     │ │
│ │ Este contacto aún no está           │ │
│ │ registrado en el sistema. Considera │ │
│ │ agregarlo como lead o cliente para  │ │
│ │ un mejor seguimiento.               │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Código:**
```tsx
if (ofertaSeleccionada.nombre_lead_sin_agregar) {
  return (
    <div className="space-y-3">
      <div className="space-y-2 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Tipo</span>
          <span className="font-semibold text-slate-900">Lead (sin agregar)</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Nombre</span>
          <span className="font-semibold text-slate-900">
            {ofertaSeleccionada.nombre_lead_sin_agregar}
          </span>
        </div>
      </div>
      
      {/* Alerta de Lead Sin Agregar */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-amber-600 text-lg">⚠️</span>
          <div className="flex-1 text-xs text-amber-800">
            <p className="font-semibold mb-1">Lead pendiente de agregar</p>
            <p className="text-amber-700">
              Este contacto aún no está registrado en el sistema. 
              Considera agregarlo como lead o cliente para un mejor seguimiento.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Características:**
- Fondo: Ámbar muy claro (`bg-amber-50`)
- Borde: Ámbar (`border-amber-200`)
- Icono grande: ⚠️
- Título: "Lead pendiente de agregar"
- Descripción explicativa
- Redondeado (`rounded-lg`)

---

## 🎨 Paleta de Colores

### Colores Utilizados

```css
/* Badge en imagen (más visible) */
bg-amber-500      /* Fondo: #F59E0B */
text-white        /* Texto: #FFFFFF */
border-amber-600  /* Borde: #D97706 */

/* Badge debajo del nombre */
bg-amber-100      /* Fondo: #FEF3C7 */
text-amber-800    /* Texto: #92400E */
border-amber-200  /* Borde: #FDE68A */

/* Alerta en detalle */
bg-amber-50       /* Fondo: #FFFBEB */
border-amber-200  /* Borde: #FDE68A */
text-amber-600    /* Icono: #D97706 */
text-amber-800    /* Título: #92400E */
text-amber-700    /* Descripción: #B45309 */
```

### Jerarquía Visual

1. **Más visible:** Badge en la imagen (amber-500, blanco)
2. **Medio:** Badge debajo del nombre (amber-100, amber-800)
3. **Informativo:** Alerta en detalle (amber-50, con descripción)

---

## 📊 Comparación: Antes vs Después

### ❌ Antes

```
┌─────────────────────────────────┐
│ [En Revisión]                   │
│                                 │
│        [Imagen de Oferta]       │
│                                 │
│ Oferta Solar Residencial        │
│ 👤 Pedro López                  │
│                                 │
│ [Exportar] [✏️] [Ver detalle]   │
└─────────────────────────────────┘
```

**Problema:** No hay forma de saber que "Pedro López" es un lead sin agregar.

### ✅ Después

```
┌─────────────────────────────────┐
│ [En Revisión] [⚠️ Lead pendiente]│ ← Nuevo badge
│                                 │
│        [Imagen de Oferta]       │
│                                 │
│ Oferta Solar Residencial        │
│ 👤 Pedro López                  │
│    [⚠️ Lead pendiente de agregar]│ ← Nuevo badge
│                                 │
│ [Exportar] [✏️] [Ver detalle]   │
└─────────────────────────────────┘
```

**Solución:** Dos indicadores visuales claros que alertan sobre el lead pendiente.

---

## 🔍 Casos de Uso

### Caso 1: Oferta con Cliente Registrado

```tsx
{
  "tipo_oferta": "personalizada",
  "cliente_numero": "CLI-2024-001",
  "cliente_nombre": "Juan Pérez"
}
```

**Resultado:** NO se muestra ningún indicador de advertencia.

---

### Caso 2: Oferta con Lead Registrado

```tsx
{
  "tipo_oferta": "personalizada",
  "lead_id": "507f1f77bcf86cd799439011",
  "lead_nombre": "María García"
}
```

**Resultado:** NO se muestra ningún indicador de advertencia.

---

### Caso 3: Oferta con Lead Sin Agregar

```tsx
{
  "tipo_oferta": "personalizada",
  "nombre_lead_sin_agregar": "Pedro López"
}
```

**Resultado:** ✅ Se muestran los 3 indicadores:
1. Badge en la imagen: "⚠️ Lead pendiente"
2. Badge debajo del nombre: "⚠️ Lead pendiente de agregar"
3. Alerta en detalle con descripción completa

---

## 🎯 Beneficios

### Para el Usuario

1. **Identificación rápida:** Sabe de inmediato qué ofertas tienen leads pendientes
2. **Priorización:** Puede priorizar agregar esos leads al sistema
3. **Seguimiento:** Mejor control de contactos no registrados
4. **Visibilidad:** Múltiples indicadores en diferentes ubicaciones

### Para el Sistema

1. **Consistencia:** Indicadores visuales coherentes en toda la interfaz
2. **Accesibilidad:** Uso de iconos y colores para mejor comprensión
3. **Escalabilidad:** Fácil de mantener y extender

---

## 🧪 Testing

### Verificar Indicadores

1. Crear una oferta con "lead sin agregar"
2. Ir a la vista de ofertas confeccionadas
3. Verificar que aparece el badge "⚠️ Lead pendiente" en la imagen
4. Verificar que aparece el badge debajo del nombre del contacto
5. Abrir el detalle de la oferta
6. Verificar que aparece la alerta con descripción completa

### Verificar Ausencia de Indicadores

1. Crear una oferta con cliente registrado
2. Verificar que NO aparecen los indicadores
3. Crear una oferta con lead registrado
4. Verificar que NO aparecen los indicadores

---

## 📝 Notas Técnicas

### Condición de Renderizado

```tsx
{oferta.nombre_lead_sin_agregar && (
  // Renderizar indicador
)}
```

Solo se muestra si:
- ✅ `nombre_lead_sin_agregar` existe
- ✅ `nombre_lead_sin_agregar` no es null
- ✅ `nombre_lead_sin_agregar` no es undefined
- ✅ `nombre_lead_sin_agregar` no es string vacío

### Prioridad de Contactos

El sistema muestra contactos en este orden:
1. `nombre_lead_sin_agregar` (con indicadores)
2. `lead_id` (lead registrado)
3. `cliente_numero` (cliente registrado)

---

## 🚀 Próximos Pasos

### Posibles Mejoras

1. **Botón de acción rápida:** Agregar botón "Agregar Lead" directamente en la tarjeta
2. **Contador:** Mostrar cuántas ofertas tienen leads pendientes
3. **Filtro:** Agregar filtro para ver solo ofertas con leads pendientes
4. **Notificaciones:** Alertar cuando hay muchos leads pendientes
5. **Conversión automática:** Sugerir convertir lead sin agregar a lead registrado

---

## 📚 Referencias

- Archivo modificado: `components/feats/ofertas/ofertas-confeccionadas-view.tsx`
- Líneas modificadas: 
  - Badge en imagen: ~970
  - Badge debajo del nombre: ~985-995
  - Alerta en detalle: ~1115-1135
- Colores: Tailwind CSS Amber palette
- Iconos: Emoji ⚠️ (U+26A0)

---

**Fecha de implementación:** 30 de enero de 2026  
**Estado:** ✅ Completado  
**Probado:** ⏳ Pendiente de pruebas visuales

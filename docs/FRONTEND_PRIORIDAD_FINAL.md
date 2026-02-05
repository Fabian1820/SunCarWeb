# Frontend: Campo Prioridad (3 Niveles)

## 📋 Resumen

Sistema de prioridades simplificado con **3 niveles** y lógica automática.

---

## 🎨 Valores de Prioridad

| Valor | Color | Hex | Descripción |
|-------|-------|-----|-------------|
| `"Alta"` | 🔴 Rojo | `#EF4444` | Fuentes especiales (Fernando, Kelly, Ale, Andy) |
| `"Media"` | 🟠 Naranja | `#F97316` | Asignación manual |
| `"Baja"` | 🔵 Azul | `#3B82F6` | Valor por defecto |

---

## 🎯 Reglas Automáticas

### Prioridad ALTA (🔴)
**Fuentes especiales:**
- Fernando
- Kelly
- Ale
- Andy

→ **Siempre** tienen prioridad "Alta" automáticamente

### Prioridad BAJA (🔵)
**Por defecto** para todos los demás casos

### Prioridad MEDIA (🟠)
**Asignación manual** - El usuario puede asignarla cuando lo considere necesario

---

## 💻 Implementación Frontend

### 1. TypeScript Interface

```typescript
interface Lead {
  id: string;
  nombre: string;
  telefono: string;
  estado: string;
  fuente?: string;
  prioridad?: "Alta" | "Media" | "Baja"; // ← 3 valores
  // ... otros campos
}

interface Cliente {
  numero: string;
  nombre: string;
  direccion: string;
  fuente?: string;
  prioridad?: "Alta" | "Media" | "Baja"; // ← 3 valores
  // ... otros campos
}
```

---

### 2. Colores

```typescript
const PRIORIDAD_CONFIG = {
  Alta: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    hex: "#EF4444",
    icon: "🔴"
  },
  Media: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
    hex: "#F97316",
    icon: "🟠"
  },
  Baja: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
    hex: "#3B82F6",
    icon: "🔵"
  }
};
```

---

### 3. Componente Badge

```tsx
// PriorityBadge.tsx
interface Props {
  prioridad?: "Alta" | "Media" | "Baja";
}

export const PriorityBadge = ({ prioridad = "Baja" }: Props) => {
  const config = {
    Alta: "bg-red-100 text-red-800 border-red-300",
    Media: "bg-orange-100 text-orange-800 border-orange-300",
    Baja: "bg-blue-100 text-blue-800 border-blue-300"
  };

  const icons = {
    Alta: "🔴",
    Media: "🟠",
    Baja: "🔵"
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${config[prioridad]}`}>
      <span>{icons[prioridad]}</span>
      <span>{prioridad}</span>
    </span>
  );
};
```

---

### 4. Select de Prioridad

```tsx
// PrioritySelect.tsx
interface Props {
  value?: "Alta" | "Media" | "Baja";
  onChange: (value: "Alta" | "Media" | "Baja") => void;
}

export const PrioritySelect = ({ value = "Baja", onChange }: Props) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Prioridad
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as any)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      >
        <option value="Alta">🔴 Alta</option>
        <option value="Media">🟠 Media</option>
        <option value="Baja">🔵 Baja</option>
      </select>
      <p className="text-xs text-gray-500 mt-1">
        💡 Se asigna "Alta" automáticamente si la fuente es Fernando, Kelly, Ale o Andy
      </p>
    </div>
  );
};
```

---

### 5. Filtro por Prioridad

```tsx
// PriorityFilter.tsx
const [filtro, setFiltro] = useState<"Alta" | "Media" | "Baja" | null>(null);

// Filtrar leads
const leadsFiltrados = filtro
  ? leads.filter(lead => lead.prioridad === filtro)
  : leads;

// UI
<div className="flex gap-2">
  <button
    onClick={() => setFiltro(null)}
    className={`px-4 py-2 rounded ${filtro === null ? "bg-gray-600 text-white" : "bg-gray-100"}`}
  >
    Todas
  </button>
  <button
    onClick={() => setFiltro("Alta")}
    className={`px-4 py-2 rounded ${filtro === "Alta" ? "bg-red-600 text-white" : "bg-gray-100"}`}
  >
    🔴 Alta
  </button>
  <button
    onClick={() => setFiltro("Media")}
    className={`px-4 py-2 rounded ${filtro === "Media" ? "bg-orange-600 text-white" : "bg-gray-100"}`}
  >
    🟠 Media
  </button>
  <button
    onClick={() => setFiltro("Baja")}
    className={`px-4 py-2 rounded ${filtro === "Baja" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
  >
    🔵 Baja
  </button>
</div>
```

---

### 6. Ordenamiento

```typescript
// Ordenar por prioridad (Alta primero)
const prioridadOrder = { Alta: 3, Media: 2, Baja: 1 };

const leadsOrdenados = [...leads].sort((a, b) => {
  const prioA = prioridadOrder[a.prioridad || "Baja"];
  const prioB = prioridadOrder[b.prioridad || "Baja"];
  return prioB - prioA; // Descendente: Alta primero
});
```

---

### 7. Tabla con Prioridad

```tsx
// LeadsTable.tsx
<table className="min-w-full">
  <thead>
    <tr>
      <th>Prioridad</th>
      <th>Nombre</th>
      <th>Teléfono</th>
      <th>Estado</th>
      <th>Fuente</th>
    </tr>
  </thead>
  <tbody>
    {leads.map((lead) => (
      <tr key={lead.id}>
        <td>
          <PriorityBadge prioridad={lead.prioridad} />
        </td>
        <td>{lead.nombre}</td>
        <td>{lead.telefono}</td>
        <td>{lead.estado}</td>
        <td>{lead.fuente || '-'}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

### 8. Estadísticas

```tsx
// PriorityStats.tsx
interface Props {
  leads: Lead[];
}

export const PriorityStats = ({ leads }: Props) => {
  const stats = {
    Alta: leads.filter(l => l.prioridad === "Alta").length,
    Media: leads.filter(l => l.prioridad === "Media").length,
    Baja: leads.filter(l => l.prioridad === "Baja").length
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <div className="text-2xl font-bold text-red-600">{stats.Alta}</div>
        <div className="text-sm text-red-600">🔴 Alta</div>
      </div>
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <div className="text-2xl font-bold text-orange-600">{stats.Media}</div>
        <div className="text-sm text-orange-600">🟠 Media</div>
      </div>
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="text-2xl font-bold text-blue-600">{stats.Baja}</div>
        <div className="text-sm text-blue-600">🔵 Baja</div>
      </div>
    </div>
  );
};
```

---

## 📊 Endpoints

Todos los endpoints de leads y clientes incluyen el campo `prioridad`:

### Crear Lead
```typescript
POST /api/leads
{
  "nombre": "Juan Pérez",
  "telefono": "53123456",
  "estado": "Nuevo",
  "fecha_contacto": "05/02/2026",
  "fuente": "Fernando",  // → Prioridad "Alta" automática
  "prioridad": "Media"   // Opcional, se sobrescribe si fuente es especial
}
```

### Listar Leads
```typescript
GET /api/leads
// Retorna: [{ ..., prioridad: "Alta" }, { ..., prioridad: "Baja" }, ...]
```

### Actualizar Prioridad
```typescript
PATCH /api/leads/{id}
{
  "prioridad": "Media"  // Cambiar manualmente
}
```

---

## ⚠️ Notas Importantes

1. **Prioridad "Alta" es automática** para fuentes especiales (Fernando, Kelly, Ale, Andy)
2. **Valor por defecto:** "Baja"
3. **"Media" es manual:** El usuario debe asignarla explícitamente
4. **Case-sensitive:** Los valores deben ser exactamente "Alta", "Media", "Baja"
5. **Fuentes especiales:** Siempre mantienen prioridad "Alta", incluso si se intenta cambiar

---

## ✅ Checklist de Implementación

- [ ] Actualizar interfaces TypeScript (3 valores: Alta, Media, Baja)
- [ ] Actualizar colores (Rojo, Naranja, Azul)
- [ ] Crear/actualizar componente `PriorityBadge`
- [ ] Crear/actualizar componente `PrioritySelect`
- [ ] Agregar en formularios de crear/editar leads
- [ ] Agregar en formularios de crear/editar clientes
- [ ] Mostrar en tablas de leads
- [ ] Mostrar en tablas de clientes
- [ ] Implementar filtros por prioridad
- [ ] Implementar ordenamiento por prioridad
- [ ] Agregar estadísticas por prioridad
- [ ] Probar con datos reales

---

## 🎨 Paleta de Colores CSS

```css
/* Alta - Rojo */
--priority-high-bg: #FEE2E2;        /* bg-red-100 */
--priority-high-text: #991B1B;      /* text-red-800 */
--priority-high-border: #FCA5A5;    /* border-red-300 */
--priority-high-main: #EF4444;      /* red-500 */

/* Media - Naranja */
--priority-medium-bg: #FFEDD5;      /* bg-orange-100 */
--priority-medium-text: #9A3412;    /* text-orange-800 */
--priority-medium-border: #FDBA74;  /* border-orange-300 */
--priority-medium-main: #F97316;    /* orange-500 */

/* Baja - Azul */
--priority-low-bg: #DBEAFE;         /* bg-blue-100 */
--priority-low-text: #1E40AF;       /* text-blue-800 */
--priority-low-border: #93C5FD;     /* border-blue-300 */
--priority-low-main: #3B82F6;       /* blue-500 */
```

---

## 🎯 Ejemplo Visual

```
┌─────────────────────────────────────────────────┐
│ Filtros: [Todas] [🔴 Alta] [🟠 Media] [🔵 Baja]│
├──────────┬──────────────┬──────────┬───────────┤
│ Prioridad│ Nombre       │ Teléfono │ Fuente    │
├──────────┼──────────────┼──────────┼───────────┤
│ 🔴 Alta  │ Juan Pérez   │ 53123456 │ Fernando  │
│ 🟠 Media │ María García │ 53654321 │ Web       │
│ 🔵 Baja  │ Pedro López  │ 53789012 │ Email     │
└──────────┴──────────────┴──────────┴───────────┘

Estadísticas:
┌─────────┬─────────┬─────────┐
│ 🔴 Alta │ 🟠 Media│ 🔵 Baja │
│   35    │   50    │   724   │
└─────────┴─────────┴─────────┘
```

---

**Fecha:** 05/02/2026  
**Versión:** 3.0 (Simplificado a 3 niveles)  
**Estado:** ✅ Listo para implementar

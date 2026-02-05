# Frontend: Campo Prioridad en Leads y Clientes

## 📋 Resumen

Se agregó el campo **`prioridad`** en Leads y Clientes para clasificar su importancia.

**Valores:** `"Baja"`, `"Media"`, `"Alta"`  
**Default:** `"Media"`  
**Colores:** 🔵 Azul (Baja), 🟠 Naranja (Media), 🔴 Rojo (Alta)

---

## 🎯 Regla Automática

Cuando la **fuente** es alguna de estas, la prioridad se asigna automáticamente como **"Alta"**:
- Fernando
- Kelly
- Ale
- Andy

---

## 💻 Implementación

### 1. TypeScript Interface

```typescript
interface Lead {
  id: string;
  nombre: string;
  telefono: string;
  estado: string;
  fuente?: string;
  prioridad?: "Baja" | "Media" | "Alta"; // ← Nuevo campo
  // ... otros campos
}

interface Cliente {
  numero: string;
  nombre: string;
  telefono?: string;
  direccion: string;
  fuente?: string;
  prioridad?: "Baja" | "Media" | "Alta"; // ← Nuevo campo
  // ... otros campos
}
```

---

### 2. Colores (Tailwind CSS)

```typescript
const PRIORIDAD_CONFIG = {
  Baja: {
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: "🔵"
  },
  Media: {
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: "🟠"
  },
  Alta: {
    color: "bg-red-100 text-red-800 border-red-300",
    icon: "🔴"
  }
};
```

---

### 3. Componente Badge

```tsx
// PriorityBadge.tsx
interface Props {
  prioridad?: "Baja" | "Media" | "Alta";
}

export const PriorityBadge = ({ prioridad = "Media" }: Props) => {
  const config = {
    Baja: "bg-blue-100 text-blue-800 border-blue-300",
    Media: "bg-orange-100 text-orange-800 border-orange-300",
    Alta: "bg-red-100 text-red-800 border-red-300"
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${config[prioridad]}`}>
      {prioridad}
    </span>
  );
};
```

**Uso:**
```tsx
<PriorityBadge prioridad={lead.prioridad} />
```

---

### 4. Select de Prioridad

```tsx
// PrioritySelect.tsx
interface Props {
  value?: "Baja" | "Media" | "Alta";
  onChange: (value: "Baja" | "Media" | "Alta") => void;
}

export const PrioritySelect = ({ value = "Media", onChange }: Props) => {
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
        <option value="Baja">🔵 Baja</option>
        <option value="Media">🟠 Media</option>
        <option value="Alta">🔴 Alta</option>
      </select>
      <p className="text-xs text-gray-500 mt-1">
        💡 Se asigna "Alta" automáticamente si la fuente es Fernando, Kelly, Ale o Andy
      </p>
    </div>
  );
};
```

**Uso:**
```tsx
<PrioritySelect
  value={formData.prioridad}
  onChange={(value) => setFormData({ ...formData, prioridad: value })}
/>
```

---

### 5. En Tablas

```tsx
// LeadsTable.tsx
<table>
  <thead>
    <tr>
      <th>Prioridad</th>
      <th>Nombre</th>
      <th>Teléfono</th>
      <th>Estado</th>
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
      </tr>
    ))}
  </tbody>
</table>
```

---

### 6. Filtro por Prioridad

```tsx
// Filtros.tsx
const [filtro, setFiltro] = useState<"Baja" | "Media" | "Alta" | null>(null);

// Filtrar leads
const leadsFiltrados = filtro
  ? leads.filter(lead => lead.prioridad === filtro)
  : leads;

// UI
<div className="flex gap-2">
  <button
    onClick={() => setFiltro(null)}
    className={filtro === null ? "bg-blue-600 text-white" : "bg-gray-100"}
  >
    Todas
  </button>
  <button
    onClick={() => setFiltro("Alta")}
    className={filtro === "Alta" ? "bg-red-600 text-white" : "bg-gray-100"}
  >
    🔴 Alta
  </button>
  <button
    onClick={() => setFiltro("Media")}
    className={filtro === "Media" ? "bg-orange-600 text-white" : "bg-gray-100"}
  >
    🟠 Media
  </button>
  <button
    onClick={() => setFiltro("Baja")}
    className={filtro === "Baja" ? "bg-blue-600 text-white" : "bg-gray-100"}
  >
    🔵 Baja
  </button>
</div>
```

---

### 7. Ordenar por Prioridad

```typescript
// Ordenar leads por prioridad (Alta primero)
const prioridadOrder = { Alta: 3, Media: 2, Baja: 1 };

const leadsOrdenados = [...leads].sort((a, b) => {
  const prioA = prioridadOrder[a.prioridad || "Media"];
  const prioB = prioridadOrder[b.prioridad || "Media"];
  return prioB - prioA; // Descendente
});
```

---

### 8. Formulario Completo

```tsx
// CreateLeadForm.tsx
const [formData, setFormData] = useState({
  nombre: "",
  telefono: "",
  estado: "Nuevo",
  fecha_contacto: new Date().toISOString().split('T')[0],
  fuente: "",
  prioridad: "Media" as "Baja" | "Media" | "Alta"
});

// Asignar prioridad automática cuando cambia la fuente
useEffect(() => {
  const fuentesAlta = ["Fernando", "Kelly", "Ale", "Andy"];
  if (fuentesAlta.includes(formData.fuente)) {
    setFormData(prev => ({ ...prev, prioridad: "Alta" }));
  }
}, [formData.fuente]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(formData)
  });
  
  if (response.ok) {
    // Lead creado exitosamente
  }
};

return (
  <form onSubmit={handleSubmit}>
    {/* Nombre */}
    <input
      type="text"
      value={formData.nombre}
      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
      required
    />

    {/* Teléfono */}
    <input
      type="tel"
      value={formData.telefono}
      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
      required
    />

    {/* Fuente */}
    <select
      value={formData.fuente}
      onChange={(e) => setFormData({ ...formData, fuente: e.target.value })}
    >
      <option value="">Seleccionar...</option>
      <option value="Fernando">Fernando</option>
      <option value="Kelly">Kelly</option>
      <option value="Ale">Ale</option>
      <option value="Andy">Andy</option>
      <option value="Web">Web</option>
      <option value="Email">Email</option>
    </select>

    {/* Prioridad */}
    <PrioritySelect
      value={formData.prioridad}
      onChange={(value) => setFormData({ ...formData, prioridad: value })}
    />

    <button type="submit">Crear Lead</button>
  </form>
);
```

---

## 📊 Endpoints

Todos los endpoints de leads y clientes ahora incluyen el campo `prioridad`:

### Leads
```typescript
// GET /api/leads
const leads = await fetch("/api/leads").then(r => r.json());
// Retorna: [{ ..., prioridad: "Alta" }, ...]

// POST /api/leads
await fetch("/api/leads", {
  method: "POST",
  body: JSON.stringify({
    nombre: "Juan",
    telefono: "53123456",
    estado: "Nuevo",
    fecha_contacto: "05/02/2026",
    prioridad: "Media" // Opcional
  })
});

// PUT /api/leads/{id}
await fetch(`/api/leads/${id}`, {
  method: "PUT",
  body: JSON.stringify({
    prioridad: "Alta"
  })
});
```

### Clientes
```typescript
// GET /api/clientes
const clientes = await fetch("/api/clientes").then(r => r.json());
// Retorna: [{ ..., prioridad: "Media" }, ...]

// POST /api/clientes
await fetch("/api/clientes", {
  method: "POST",
  body: JSON.stringify({
    numero: "TEST001",
    nombre: "María",
    direccion: "Calle 123",
    prioridad: "Baja" // Opcional
  })
});
```

---

## ✅ Checklist de Implementación

- [ ] Agregar campo `prioridad` en interfaces TypeScript
- [ ] Crear componente `PriorityBadge`
- [ ] Crear componente `PrioritySelect`
- [ ] Agregar campo en formulario de crear lead
- [ ] Agregar campo en formulario de editar lead
- [ ] Agregar campo en formulario de crear cliente
- [ ] Agregar campo en formulario de editar cliente
- [ ] Mostrar badge en tabla de leads
- [ ] Mostrar badge en tabla de clientes
- [ ] Implementar filtro por prioridad
- [ ] Implementar ordenamiento por prioridad
- [ ] Actualizar select de fuentes (usar "Ale" en lugar de "Alexander")

---

## 🎨 Ejemplo Visual

```
┌─────────────────────────────────────────────────┐
│ Crear Nuevo Lead                                │
├─────────────────────────────────────────────────┤
│ Nombre: [Juan Pérez                          ] │
│ Teléfono: [53123456                          ] │
│ Fuente: [Fernando ▼                          ] │
│ Prioridad: [🔴 Alta ▼                        ] │
│   💡 Se asigna "Alta" automáticamente          │
│      si la fuente es Fernando, Kelly,          │
│      Ale o Andy                                 │
│                                                 │
│              [ Crear Lead ]                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Filtros: [Todas] [🔴 Alta] [🟠 Media] [🔵 Baja]│
├──────────┬──────────────┬──────────┬───────────┤
│ Prioridad│ Nombre       │ Teléfono │ Estado    │
├──────────┼──────────────┼──────────┼───────────┤
│ 🔴 Alta  │ Juan Pérez   │ 53123456 │ Nuevo     │
│ 🟠 Media │ María García │ 53654321 │ Contacto  │
│ 🔵 Baja  │ Pedro López  │ 53789012 │ Seguim.   │
└──────────┴──────────────┴──────────┴───────────┘
```

---

## 🚀 Inicio Rápido

1. **Copiar componentes:**
   - `PriorityBadge.tsx`
   - `PrioritySelect.tsx`

2. **Actualizar interfaces:**
   ```typescript
   prioridad?: "Baja" | "Media" | "Alta";
   ```

3. **Agregar en formularios:**
   ```tsx
   <PrioritySelect value={prioridad} onChange={setPrioridad} />
   ```

4. **Mostrar en tablas:**
   ```tsx
   <PriorityBadge prioridad={lead.prioridad} />
   ```

5. **Actualizar select de fuentes:**
   - Cambiar "Alexander" por "Ale"

---

## 📝 Notas Importantes

1. **Valor por defecto:** Si no se especifica, el backend asigna `"Media"`
2. **Case-sensitive:** Los valores deben ser exactamente `"Baja"`, `"Media"`, `"Alta"`
3. **Fuentes especiales:** Fernando, Kelly, Ale, Andy → Prioridad "Alta" automática
4. **Opcional:** El campo es opcional en el frontend, el backend lo maneja

---

**Documentación completa:** `CAMPO_PRIORIDAD_LEADS_CLIENTES.md`  
**Ejemplos visuales:** `EJEMPLO_VISUAL_PRIORIDAD_FRONTEND.md`

# Cambios en Frontend - Ver y Editar Ofertas

## ✅ Cambios Implementados

### 1. Componente: `ofertas-confeccionadas-view.tsx`

#### Nuevas Importaciones
```typescript
import { LeadService } from "@/lib/services/feats/leads/lead-service"
```

#### Nuevos Estados
```typescript
const [leads, setLeads] = useState<any[]>([])
```

#### Nueva Carga de Datos
```typescript
const loadLeads = async () => {
  try {
    const data = await LeadService.getLeads()
    setLeads(Array.isArray(data) ? data : [])
  } catch (error) {
    setLeads([])
  }
}
```

#### Nuevo Mapa de Leads
```typescript
const leadPorId = useMemo(() => {
  const map = new Map<string, any>()
  leads.forEach((lead) => {
    if (lead.id) {
      map.set(lead.id, lead)
    }
  })
  return map
}, [leads])
```

#### Búsqueda Mejorada
Ahora la búsqueda incluye:
- ✅ Nombre de oferta
- ✅ Nombre de cliente
- ✅ Nombre de lead sin agregar
- ✅ Nombre de lead (desde oferta)
- ✅ Nombre completo de lead (desde mapa cargado)
- ✅ Teléfono de lead
- ✅ Email de lead

```typescript
const ofertasFiltradas = useMemo(() => {
  if (!searchQuery.trim()) return ofertas
  const query = searchQuery.trim().toLowerCase()
  return ofertas.filter((oferta) => {
    // Buscar en nombre de oferta
    if (oferta.nombre.toLowerCase().includes(query)) return true
    
    // Buscar en nombre de cliente
    if (oferta.cliente_nombre?.toLowerCase().includes(query)) return true
    
    // Buscar en nombre de lead sin agregar
    if (oferta.nombre_lead_sin_agregar?.toLowerCase().includes(query)) return true
    
    // Buscar en nombre de lead
    if (oferta.lead_nombre?.toLowerCase().includes(query)) return true
    
    // Buscar en lead cargado
    if (oferta.lead_id) {
      const lead = leadPorId.get(oferta.lead_id)
      if (lead?.nombre_completo?.toLowerCase().includes(query)) return true
      if (lead?.nombre?.toLowerCase().includes(query)) return true
      if (lead?.telefono?.toLowerCase().includes(query)) return true
      if (lead?.email?.toLowerCase().includes(query)) return true
    }
    
    return false
  })
}, [ofertas, searchQuery, leadPorId])
```

#### Visualización en Tarjetas
Prioridad de visualización del contacto:
1. Lead sin agregar
2. Lead (desde mapa cargado)
3. Lead (desde oferta)
4. Cliente (desde mapa)
5. Cliente (desde oferta)
6. "Contacto no asignado"

```typescript
<span className="truncate">
  {oferta.tipo === "personalizada"
    ? (oferta.nombre_lead_sin_agregar ||
        (oferta.lead_id && leadPorId.get(oferta.lead_id)?.nombre_completo) ||
        (oferta.lead_id && leadPorId.get(oferta.lead_id)?.nombre) ||
        oferta.lead_nombre ||
        oferta.cliente_nombre ||
        clienteNombrePorOferta.get(oferta.cliente_id || "") ||
        clienteNombrePorOferta.get(oferta.cliente_numero || "") ||
        "Contacto no asignado")
    : "Oferta Genérica"}
</span>
```

#### Vista de Detalle Mejorada
La sección de "Información del contacto" ahora muestra:

**Para Lead sin agregar:**
- Tipo: "Lead (sin agregar)"
- Nombre

**Para Lead:**
- Tipo: "Lead"
- Nombre (prioriza lead cargado > lead de oferta)
- Teléfono (si está disponible en lead cargado)
- Email (si está disponible en lead cargado)
- Provincia (si está disponible en lead cargado)
- ID (si no hay teléfono)

**Para Cliente:**
- Tipo: "Cliente"
- Nombre
- CI
- Teléfono
- Dirección

```typescript
{(() => {
  // Prioridad: lead sin agregar > lead > cliente
  if (ofertaSeleccionada.nombre_lead_sin_agregar) {
    return (
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
    )
  }
  
  if (ofertaSeleccionada.lead_id || ofertaSeleccionada.lead_nombre) {
    const lead = leadPorId.get(ofertaSeleccionada.lead_id || "")
    return (
      <div className="space-y-2 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Tipo</span>
          <span className="font-semibold text-slate-900">Lead</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Nombre</span>
          <span className="font-semibold text-slate-900">
            {lead?.nombre_completo || lead?.nombre || ofertaSeleccionada.lead_nombre || "--"}
          </span>
        </div>
        {(lead?.telefono || ofertaSeleccionada.lead_id) && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{lead?.telefono ? "Teléfono" : "ID"}</span>
            <span className="font-semibold text-slate-900">
              {lead?.telefono || ofertaSeleccionada.lead_id}
            </span>
          </div>
        )}
        {lead?.email && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Email</span>
            <span className="font-semibold text-slate-900">
              {lead.email}
            </span>
          </div>
        )}
        {lead?.provincia && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Provincia</span>
            <span className="font-semibold text-slate-900">
              {lead.provincia}
            </span>
          </div>
        )}
      </div>
    )
  }
  
  // ... código para cliente ...
})()}
```

---

## 📋 Resumen de Mejoras

### Funcionalidad Agregada
1. ✅ Carga de leads desde el servicio
2. ✅ Mapa de leads por ID para acceso rápido
3. ✅ Búsqueda mejorada que incluye todos los campos de leads
4. ✅ Visualización correcta del nombre del contacto en tarjetas
5. ✅ Vista de detalle completa con información de leads
6. ✅ Priorización correcta: lead sin agregar > lead > cliente

### Experiencia de Usuario
- **Búsqueda más potente:** Ahora puedes buscar ofertas por nombre, teléfono o email del lead
- **Información completa:** La vista de detalle muestra toda la información disponible del lead
- **Consistencia:** El mismo formato de visualización para clientes y leads
- **Claridad:** Se indica claramente el tipo de contacto (Cliente, Lead, Lead sin agregar)

---

## 🧪 Testing Recomendado

### Casos de Prueba

1. **Oferta con Lead sin agregar:**
   - ✅ Verificar que se muestra el nombre en la tarjeta
   - ✅ Verificar que se muestra "Lead (sin agregar)" en el detalle
   - ✅ Verificar que la búsqueda funciona con el nombre

2. **Oferta con Lead existente:**
   - ✅ Verificar que se carga la información completa del lead
   - ✅ Verificar que se muestra el nombre completo en la tarjeta
   - ✅ Verificar que el detalle muestra teléfono, email y provincia
   - ✅ Verificar que la búsqueda funciona con todos los campos

3. **Oferta con Cliente:**
   - ✅ Verificar que sigue funcionando como antes
   - ✅ Verificar que se muestra "Cliente" en el detalle

4. **Búsqueda:**
   - ✅ Buscar por nombre de oferta
   - ✅ Buscar por nombre de cliente
   - ✅ Buscar por nombre de lead
   - ✅ Buscar por teléfono de lead
   - ✅ Buscar por email de lead

5. **Edición:**
   - ✅ Verificar que se puede editar oferta con lead sin agregar
   - ✅ Verificar que se puede editar oferta con lead existente
   - ✅ Verificar que se puede cambiar el tipo de contacto

---

## 🔄 Compatibilidad con Backend

El componente está preparado para recibir del backend:

```typescript
interface OfertaConfeccion {
  // ... otros campos ...
  
  // Contacto - solo uno debe estar presente
  cliente_id?: string
  cliente_numero?: string
  cliente_nombre?: string
  lead_id?: string
  lead_nombre?: string
  nombre_lead_sin_agregar?: string
}
```

El hook `use-ofertas-confeccion.ts` ya normaliza estos campos correctamente.

---

## 📝 Notas Adicionales

### Dependencias
- `LeadService` debe estar implementado y funcional
- El endpoint `/leads` debe retornar la lista de leads

### Performance
- Los leads se cargan una sola vez al montar el componente
- Se usa `useMemo` para los mapas de búsqueda
- La búsqueda es eficiente incluso con muchas ofertas

### Mantenibilidad
- Código bien estructurado y comentado
- Prioridades claras en la visualización
- Fácil de extender para agregar más campos

---

**Última actualización:** 30 de enero de 2026

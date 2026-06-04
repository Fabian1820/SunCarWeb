# 🎯 Análisis de Optimizaciones - SunCarAdmin

## Problemas Identificados

Se cargan listas enormes del backend **SOLO para buscar un elemento específico o extraer un subconjunto de datos**. Esto se puede optimizar creando **endpoints especializados** en el backend que devuelvan solo lo necesario.

---

## 1. 🏭 **MATERIALES - Búsqueda y Carga**

### Problema Actual
- **Archivo**: `lib/services/feats/materials/material-service.ts:124`
- **Método**: `getAllMaterials()`
- **Qué hace**: Llama a `/productos/` que devuelve **TODOS los productos y TODOS sus materiales** (miles de registros)
- **Por qué**: Se usa en componentes para autocompletado y búsqueda de materiales

### Dónde se Carga
1. **Módulo de Materiales** (`app/materiales/page.tsx`) - Para listar y filtrar
2. **Diálogos de Ofertas** - Para buscar materiales específicos
3. **Componentes de búsqueda** - Para autocompletado

### Solución Propuesta
```typescript
// ✅ NUEVO ENDPOINT: /productos/search?q=bateria&limit=20
// Devuelve solo materiales que coincidan con el término

static async searchMaterials(query: string, limit = 20): Promise<Material[]> {
  const response = await apiRequest<{ data: Material[] }>(
    `/productos/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return response.data || [];
}

// ✅ NUEVO ENDPOINT: /productos/categorias
// Devuelve solo lista de categorías sin materiales

static async getCategorias(): Promise<string[]> {
  const response = await apiRequest<{ data: string[] }>(`/productos/categorias`);
  return response.data || [];
}

// ✅ NUEVO ENDPOINT: /productos/{categoria}/materiales?limit=100&skip=0
// Carga materiales por categoría con paginación

static async getMaterialsPorCategoria(
  categoria: string, 
  limit = 100, 
  skip = 0
): Promise<{ materiales: Material[], total: number }> {
  const response = await apiRequest<any>(
    `/productos/${encodeURIComponent(categoria)}/materiales?limit=${limit}&skip=${skip}`
  );
  return { materiales: response.data || [], total: response.total || 0 };
}
```

### Impacto
- **Reducción de datos**: ~95% en transferencia de red
- **Velocidad**: Carga instantánea en diálogos de búsqueda
- **UX**: Autocompletado responsivo sin cargar miles de items

---

## 2. 👥 **TRABAJADORES - Búsqueda y Filtros**

### Problema Actual
- **Archivo**: `app/trabajadores/page.tsx` y `hooks/use-brigadas-trabajadores.ts`
- **Qué hace**: Carga **TODOS los trabajadores** para:
  - Filtrar por nombre
  - Buscar por CI
  - Asignar a brigadas
  - Convertir a jefe
- **Impacto**: Con cientos de trabajadores, carga ~50KB+ de JSON

### Dónde se Carga
1. **Página de Trabajadores** - Para listar todos
2. **Módulo de Brigadas** - Para seleccionar trabajadores a asignar
3. **Diálogos de asignación** - Para buscar y seleccionar

### Solución Propuesta
```typescript
// ✅ NUEVO ENDPOINT: /trabajadores/buscar?q=juan&tipo=brigadista&limit=20
// Devuelve trabajadores que coincidan sin cargar toda la lista

static async buscarTrabajadores(query: string, tipo?: string, limit = 20) {
  const params = new URLSearchParams();
  params.append('q', query);
  if (tipo) params.append('tipo', tipo);
  params.append('limit', limit.toString());
  
  return await apiRequest<{ data: Trabajador[] }>(
    `/trabajadores/buscar?${params}`
  );
}

// ✅ NUEVO ENDPOINT: /trabajadores/por-ci/{CI}
// Búsqueda directa por CI (exacta)

static async getTrabajadorPorCI(ci: string) {
  return await apiRequest<{ data: Trabajador }>(
    `/trabajadores/ci/${encodeURIComponent(ci)}`
  );
}

// ✅ NUEVO ENDPOINT: /trabajadores/activos?skip=0&limit=100
// Solo trabajadores activos con paginación

static async getTrabajadoresActivos(skip = 0, limit = 100) {
  return await apiRequest<{ data: Trabajador[], total: number }>(
    `/trabajadores/activos?skip=${skip}&limit=${limit}`
  );
}

// ✅ NUEVO ENDPOINT: /trabajadores/brigadistas
// Solo trabajadores marcados como brigadistas

static async getTrabajadoresBrigadistas() {
  return await apiRequest<{ data: Trabajador[] }>(`/trabajadores/brigadistas`);
}
```

### Dónde Cambiar
- `hooks/use-brigadas-trabajadores.ts` - Reemplazar carga total
- `components/feats/brigade/AsignarBrigadaForm.tsx` - Agregar búsqueda
- `components/feats/worker/trabajadores-table.tsx` - Implementar búsqueda remota

### Impacto
- **Reducción de datos**: ~80-90%
- **Velocidad**: Búsqueda instantánea en diálogos
- **Escalabilidad**: Funciona con miles de trabajadores sin problemas

---

## 3. 🎯 **LEADS - Comerciales y Fuentes**

### Problema Actual
- **Archivo**: `hooks/use-leads.ts:135-138`
- **Qué hace**: Carga **TODOS los leads** solo para extraer lista de comerciales únicos
- **Líneas**: Se busca `availableComerciales` iterando sobre todos los leads

### Dónde se Carga
1. **Página de Leads** - Para filtro de comerciales
2. **Diálogos de creación** - Para seleccionar comercial
3. **Cada cambio de lead** - Se vuelve a extraer la lista

### Solución Propuesta
```typescript
// ✅ NUEVO ENDPOINT: /leads/comerciales
// Devuelve solo lista de comerciales únicos

static async getComerciales(): Promise<string[]> {
  const response = await apiRequest<{ data: string[] }>(`/leads/comerciales`);
  return response.data || [];
}

// ✅ NUEVO ENDPOINT: /leads/fuentes
// Devuelve solo lista de fuentes únicas

static async getFuentes(): Promise<string[]> {
  const response = await apiRequest<{ data: string[] }>(`/leads/fuentes`);
  return response.data || [];
}

// ✅ NUEVO ENDPOINT: /leads/provincias-municipios
// Devuelve estructura de provincias con municipios

static async getProvinciasYMunicipios() {
  return await apiRequest<{
    data: { 
      provincias: Array<{ codigo: string; nombre: string }>,
      municipios: Record<string, Array<{ codigo: string; nombre: string }>>
    }
  }>(`/leads/provincias-municipios`);
}
```

### Cambios en Frontend
- `hooks/use-leads.ts` - Reemplazar extracción manual con endpoint
- `components/feats/leads/create-lead-dialog.tsx` - Usar nuevo endpoint para provincias
- `app/leads/page.tsx` - Cargar comerciales una sola vez

### Impacto
- **Reducción de datos**: ~70-80% en carga inicial de leads
- **Velocidad**: Filtros disponibles instantáneamente
- **Mantenimiento**: Una única fuente de verdad para comerciales

---

## 4. 👨‍💼 **CLIENTES - Fuentes y Comerciales**

### Problema Actual
- **Archivo**: `app/clientes/page.tsx:150`
- **Qué hace**: Carga todos los clientes para extraer fuentes únicas
- **Similar al problema de Leads**

### Solución Propuesta
```typescript
// ✅ NUEVO ENDPOINT: /clientes/fuentes
// Devuelve solo lista de fuentes únicas

static async getFuentes(): Promise<string[]> {
  const response = await apiRequest<{ data: string[] }>(`/clientes/fuentes`);
  return response.data || [];
}

// ✅ NUEVO ENDPOINT: /clientes/comerciales
// Devuelve solo comerciales que tienen clientes asignados

static async getComerciales(): Promise<string[]> {
  const response = await apiRequest<{ data: string[] }>(`/clientes/comerciales`);
  return response.data || [];
}

// ✅ NUEVO ENDPOINT: /clientes/buscar?q=juan&limit=20
// Búsqueda por nombre o teléfono

static async buscarClientes(query: string, limit = 20) {
  return await apiRequest<{ data: Cliente[] }>(
    `/clientes/buscar?q=${encodeURIComponent(query)}&limit=${limit}`
  );
}
```

### Impacto
- **Reducción de datos**: ~75-85%
- **Escalabilidad**: Funciona con miles de clientes
- **Filtros rápidos**: No necesita cargar toda la lista

---

## 5. 📋 **RECURSOS HUMANOS - Cargos y Deptos**

### Problema Actual
- **Archivo**: `app/recursos-humanos/page.tsx:100-102`
- **Qué hace**: Carga todas las sedes y departamentos **en paralelo** y después se filtran
- **Por qué**: Se usan para dropdowns

### Solución Propuesta
```typescript
// Esto ya funciona bien, pero verificar:
// - Si realmente se necesitan TODAS las sedes/deptos o si se pueden paginar
// - Si se cargan más de 100-200 registros, considerar carga lazy

// ✅ MANTENER: Carga actual si < 200 registros total
// ✅ OPTIMIZAR: Si > 200 registros, implementar búsqueda

static async buscarSedes(query: string) {
  return await apiRequest<{ data: Sede[] }>(
    `/sedes/buscar?q=${encodeURIComponent(query)}`
  );
}
```

### Estado
- ✅ Generalmente OK (pocos registros)
- ⚠️ Revisar si crece

---

## 6. 🎁 **OFERTAS - Selección de Materiales**

### Problema Actual
- **Archivo**: Diálogos de búsqueda de ofertas
- **Qué hace**: Carga todos los productos/materiales para autocompletado
- **Referencia**: Ver sección "Materiales" (#1)

### Solución
Implementar el endpoint `/productos/search` propuesto en la sección #1

---

## 7. 📦 **INVENTARIO - Stock y Movimientos**

### Revisar
- Verificar si se cargan todos los movimientos de inventario
- Si hay > 1000 registros, paginar
- Considerar índices en backend para búsquedas frecuentes

---

## 📊 Resumen de Impacto

| Módulo | Datos Actuales | Reducción Potencial | Prioridad |
|--------|---|---|---|
| Materiales | ~500+ items | 95% | 🔴 CRÍTICA |
| Trabajadores | ~200-500 items | 85% | 🔴 CRÍTICA |
| Leads (Comerciales) | Todos los leads | 75% | 🟠 ALTA |
| Clientes (Fuentes) | Todos los clientes | 80% | 🟠 ALTA |
| Provincias/Municipios | Cargados en múltiples diálogos | 70% | 🟡 MEDIA |

---

## 🚀 Plan de Implementación

### Fase 1 (CRÍTICA) - 1-2 semanas
1. ✅ `/productos/search` - Búsqueda de materiales
2. ✅ `/trabajadores/buscar` - Búsqueda de trabajadores
3. ✅ `/trabajadores/brigadistas` - Lista optimizada

**Cambios en Frontend:**
- `MaterialService.searchMaterials()` nuevo
- `TrabajadorService.buscarTrabajadores()` nuevo
- Actualizar `useMaterials` hook
- Actualizar `use-brigadas-trabajadores` hook

### Fase 2 (ALTA) - 1-2 semanas
4. ✅ `/leads/comerciales` - Lista de comerciales únicos
5. ✅ `/clientes/fuentes` - Lista de fuentes únicos
6. ✅ `/leads/provincias-municipios` - Centralizar datos geográficos

**Cambios en Frontend:**
- `LeadService.getComerciales()` nuevo
- `ClienteService.getFuentes()` nuevo
- Actualizar diálogos de leads/clientes

### Fase 3 (MEDIA) - Después
7. Paginación en Inventario
8. Optimización de Recursos Humanos si crece

---

## 💡 Notas Adicionales

### Caching Recomendado
Estos datos pueden cachearse **por sesión** sin problemas:
- Lista de comerciales (cada 1 hora)
- Lista de fuentes (cada 1 hora)
- Lista de categorías (cada 4 horas)
- Provincias/municipios (cada 24 horas)

### En el Backend
Asegurarse de que estos endpoints tengan **índices apropiados**:
```javascript
// MongoDB - Índices recomendados
db.trabajadores.createIndex({ "nombre": "text", "activo": 1 })
db.leads.createIndex({ "comercial": 1 })
db.clientes.createIndex({ "fuente": 1 })
db.productos.createIndex({ "categoria": 1, "materiales.codigo": "text" })
```

---

## ❓ Preguntas para Validar

1. **Materiales**: ¿Cuántos productos y materiales hay en total? Si > 5000, priorizar optimización
2. **Trabajadores**: ¿Cuántos trabajadores activos hay? Si > 500, la búsqueda es crítica
3. **Leads**: ¿Cuántos leads hay en total? ¿Se cargan todos o con paginación?
4. **Performance**: ¿Hay quejas de lentitud al abrir diálogos?

---

**Última actualización**: 2026-05-06

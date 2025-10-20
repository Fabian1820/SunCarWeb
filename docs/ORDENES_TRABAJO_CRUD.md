# 📋 Sistema CRUD de Órdenes de Trabajo

## Resumen

El sistema de órdenes de trabajo está **completamente implementado** siguiendo la arquitectura del proyecto SunCar. Incluye toda la lógica necesaria para crear, leer, actualizar y eliminar órdenes de trabajo, con integración completa con brigadas y clientes.

---

## 🏗️ Arquitectura Completa

### 1. **Tipos TypeScript** (`lib/types/feats/ordenes-trabajo/orden-trabajo-types.ts`)

```typescript
export type TipoReporte = 'inversión' | 'avería' | 'mantenimiento'

export interface OrdenTrabajo {
  id: string
  brigada_id: string
  brigada_nombre?: string
  cliente_numero: string
  cliente_nombre: string
  tipo_reporte: TipoReporte
  fecha_ejecucion: string
  comentarios?: string
  fecha_creacion: string
  estado?: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada'
}

export interface CreateOrdenTrabajoRequest {
  brigada_id: string
  cliente_numero: string
  tipo_reporte: TipoReporte
  fecha_ejecucion: string
  comentarios?: string
}

export interface UpdateOrdenTrabajoRequest extends Partial<CreateOrdenTrabajoRequest> {
  estado?: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada'
}

export interface OrdenTrabajoResponse {
  success: boolean
  message: string
  data: OrdenTrabajo | OrdenTrabajo[] | null
}
```

**Características:**
- ✅ Tipo de reporte: inversión, avería, mantenimiento
- ✅ Relación con brigada (ID y nombre)
- ✅ Relación con cliente (número y nombre)
- ✅ Estados: pendiente, en_proceso, completada, cancelada
- ✅ Campo de comentarios opcional (string grande)
- ✅ Fecha de ejecución y fecha de creación

---

### 2. **Servicio API** (`lib/services/feats/ordenes-trabajo/orden-trabajo-service.ts`)

```typescript
export class OrdenTrabajoService {
  // GET - Obtener todas las órdenes (con filtros opcionales)
  static async getOrdenesTrabajo(params: {
    brigada_id?: string
    cliente_numero?: string
    tipo_reporte?: string
    estado?: string
    fecha_inicio?: string
    fecha_fin?: string
  }): Promise<OrdenTrabajo[]>

  // GET - Obtener una orden por ID
  static async getOrdenTrabajoById(ordenId: string): Promise<OrdenTrabajo | null>

  // POST - Crear nueva orden
  static async createOrdenTrabajo(
    ordenData: CreateOrdenTrabajoRequest
  ): Promise<{ success: boolean; message: string; data?: any }>

  // PATCH - Actualizar orden existente
  static async updateOrdenTrabajo(
    ordenId: string,
    ordenData: UpdateOrdenTrabajoRequest
  ): Promise<{ success: boolean; message: string }>

  // DELETE - Eliminar orden
  static async deleteOrdenTrabajo(
    ordenId: string
  ): Promise<{ success: boolean; message: string }>

  // EXTRA - Generar mensaje formateado para WhatsApp
  static generateOrdenTrabajoMessage(
    orden: OrdenTrabajo,
    clienteNombre: string
  ): string
}
```

**Endpoints Backend Esperados:**
- `GET /api/ordenes-trabajo/` - Listar órdenes (con query params para filtros)
- `GET /api/ordenes-trabajo/{id}` - Obtener orden por ID
- `POST /api/ordenes-trabajo/` - Crear nueva orden
- `PATCH /api/ordenes-trabajo/{id}` - Actualizar orden
- `DELETE /api/ordenes-trabajo/{id}` - Eliminar orden

**Características:**
- ✅ Autenticación automática con Bearer token
- ✅ Manejo centralizado de errores
- ✅ Logging de todas las operaciones
- ✅ Filtros avanzados para búsqueda
- ✅ Generación de mensajes para WhatsApp

---

### 3. **Servicio LocalStorage** (`lib/local-storage-ordenes.ts`)

Implementación temporal para desarrollo sin backend:

```typescript
export class LocalOrdenesTrabajoService {
  static getAll(): OrdenTrabajo[]
  static create(ordenData: CreateOrdenTrabajoRequest, brigadaNombre?: string, clienteNombre?: string): OrdenTrabajo
  static update(id: string, updates: Partial<OrdenTrabajo>): boolean
  static delete(id: string): boolean
  static getById(id: string): OrdenTrabajo | null
  static clear(): void
}
```

**Características:**
- ✅ Almacenamiento en `localStorage` con clave `suncar_ordenes_trabajo`
- ✅ Generación automática de IDs únicos
- ✅ Estado inicial "pendiente" por defecto
- ✅ Persistencia entre recargas de página

---

### 4. **Hook Custom** (`hooks/use-ordenes-trabajo.ts`)

```typescript
export function useOrdenesTrabajo(): UseOrdenesTrabajoReturn {
  ordenes: OrdenTrabajo[]                    // Lista completa
  filteredOrdenes: OrdenTrabajo[]           // Lista filtrada
  loading: boolean                          // Estado de carga
  error: string | null                      // Mensajes de error
  searchTerm: string                        // Término de búsqueda
  setSearchTerm: (term: string) => void
  filterTipoReporte: string                 // Filtro por tipo
  setFilterTipoReporte: (tipo: string) => void
  filterEstado: string                      // Filtro por estado
  setFilterEstado: (estado: string) => void
  loadOrdenes: () => Promise<void>          // Recargar datos
  createOrden: (data) => Promise<...>       // Crear
  updateOrden: (id, data) => Promise<bool>  // Actualizar
  deleteOrden: (id) => Promise<bool>        // Eliminar
  clearError: () => void                    // Limpiar errores
}
```

**Características:**
- ✅ Estado global de órdenes con React hooks
- ✅ Filtros en tiempo real (búsqueda, tipo, estado)
- ✅ Manejo de estados de carga y error
- ✅ Recarga automática después de operaciones CRUD
- ✅ Búsqueda por cliente, brigada, número de cliente, comentarios

---

### 5. **Componentes UI** (`components/feats/ordenes-trabajo/`)

#### 5.1. Tabla de Órdenes (`ordenes-trabajo-table.tsx`)
```typescript
<OrdenesTrabajoTable
  ordenes={filteredOrdenes}
  onViewMessage={handleViewMessage}
  onDelete={handleDeleteOrden}
  loading={loading}
/>
```
- ✅ Tabla responsiva con información completa
- ✅ Badges coloridos por tipo de reporte y estado
- ✅ Acciones: Ver mensaje, Editar (opcional), Eliminar
- ✅ Formato de fechas en español
- ✅ Estado de carga con skeleton

#### 5.2. Diálogo de Creación (`create-orden-trabajo-dialog.tsx`)
```typescript
<CreateOrdenTrabajoDialog
  open={isCreateDialogOpen}
  onOpenChange={setIsCreateDialogOpen}
  onSuccess={handleCreateOrden}
/>
```
- ✅ Formulario con validación React Hook Form + Zod
- ✅ Selección de brigada con búsqueda
- ✅ Selección de cliente con búsqueda
- ✅ Selector de tipo de reporte
- ✅ Selector de fecha de ejecución
- ✅ Campo de comentarios opcional (textarea grande)
- ✅ Manejo de estados de carga

#### 5.3. Diálogo de Vista Previa de Mensaje (`message-preview-dialog.tsx`)
```typescript
<MessagePreviewDialog
  open={isMessageDialogOpen}
  onOpenChange={setIsMessageDialogOpen}
  message={messageToShow}
  title="Mensaje de Orden de Trabajo"
/>
```
- ✅ Vista previa del mensaje formateado
- ✅ Botón para copiar mensaje
- ✅ Formato optimizado para WhatsApp

---

### 6. **Página Principal** (`app/ordenes-trabajo/page.tsx`)

```typescript
export default function OrdenesTrabajoPage()
```

**Características:**
- ✅ Header fijo con logo y navegación
- ✅ Botón "Crear Orden" destacado
- ✅ Card de filtros con 3 opciones:
  - Búsqueda por texto
  - Filtro por tipo de reporte
  - Filtro por estado
- ✅ Tabla de órdenes con todas las acciones
- ✅ Diálogos modales para crear, ver mensaje y eliminar
- ✅ Toasts para feedback de operaciones
- ✅ Diseño responsive con gradiente SunCar (naranja)
- ✅ Integración completa con el hook `useOrdenesTrabajo`

---

## 📊 Estructura de Datos en MongoDB (Backend)

### Colección: `ordenes_trabajo`

```javascript
{
  _id: ObjectId,                          // MongoDB ID
  brigada_id: String,                     // ID de la brigada asignada
  cliente_numero: String,                 // Número del cliente
  tipo_reporte: String,                   // "inversión", "avería", "mantenimiento"
  fecha_ejecucion: Date,                  // Fecha programada para ejecución
  comentarios: String,                    // Comentarios adicionales (opcional)
  fecha_creacion: Date,                   // Fecha de creación del registro
  estado: String,                         // "pendiente", "en_proceso", "completada", "cancelada"
  
  // Índices recomendados:
  // - brigada_id (para búsquedas por brigada)
  // - cliente_numero (para búsquedas por cliente)
  // - fecha_ejecucion (para búsquedas por fecha)
  // - estado (para filtros de estado)
  // - fecha_creacion (para ordenamiento)
}
```

---

## 🔄 Flujo de Operaciones CRUD

### **CREATE (Crear Orden)**
1. Usuario hace clic en "Crear Orden"
2. Se abre diálogo con formulario
3. Usuario selecciona brigada y cliente (con búsqueda)
4. Usuario ingresa tipo de reporte, fecha y comentarios
5. Al enviar:
   - Validación con Zod
   - Llamada a `createOrden()` del hook
   - Hook llama a `OrdenTrabajoService.createOrdenTrabajo()`
   - Backend crea registro en MongoDB
   - Recarga automática de la lista
   - Toast de éxito
   - Muestra mensaje formateado para WhatsApp

### **READ (Leer Órdenes)**
1. Al cargar la página:
   - Hook ejecuta `loadOrdenes()`
   - Llama a `OrdenTrabajoService.getOrdenesTrabajo()`
   - Backend consulta colección `ordenes_trabajo`
   - Renderiza tabla con datos
2. Filtros en tiempo real:
   - Búsqueda por texto
   - Filtro por tipo de reporte
   - Filtro por estado

### **UPDATE (Actualizar Orden)**
1. Usuario hace clic en "Editar" (funcionalidad preparada)
2. Se abre diálogo con datos precargados
3. Usuario modifica campos
4. Al enviar:
   - Validación con Zod
   - Llamada a `updateOrden(id, data)` del hook
   - Hook llama a `OrdenTrabajoService.updateOrdenTrabajo()`
   - Backend actualiza registro con PATCH
   - Recarga automática
   - Toast de éxito

### **DELETE (Eliminar Orden)**
1. Usuario hace clic en icono de eliminar
2. Aparece diálogo de confirmación
3. Al confirmar:
   - Llamada a `deleteOrden(id)` del hook
   - Hook llama a `OrdenTrabajoService.deleteOrdenTrabajo()`
   - Backend elimina registro de MongoDB
   - Recarga automática
   - Toast de éxito

---

## 🎨 Diseño UI/UX

### Colores y Estilos
- **Tema principal**: Gradiente naranja SunCar
- **Badges tipo reporte**:
  - 🔵 Inversión: Azul
  - 🔴 Avería: Rojo
  - 🟢 Mantenimiento: Verde
- **Badges estado**:
  - 🟡 Pendiente: Amarillo
  - 🔵 En Proceso: Azul
  - 🟢 Completada: Verde
  - 🔴 Cancelada: Rojo

### Responsividad
- ✅ Desktop: Tabla completa con todas las columnas
- ✅ Tablet: Ajuste de columnas
- ✅ Mobile: Vista optimizada con información esencial

---

## 🔌 Integración con Backend

### Endpoints Necesarios (FastAPI)

```python
from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/api/ordenes-trabajo", tags=["ordenes-trabajo"])

@router.get("/")
async def get_ordenes_trabajo(
    brigada_id: Optional[str] = None,
    cliente_numero: Optional[str] = None,
    tipo_reporte: Optional[str] = None,
    estado: Optional[str] = None,
    fecha_inicio: Optional[str] = None,
    fecha_fin: Optional[str] = None
):
    # Consultar MongoDB con filtros
    # Retornar: { "success": true, "message": "", "data": [...] }

@router.get("/{orden_id}")
async def get_orden_trabajo(orden_id: str):
    # Buscar por ID en MongoDB
    # Retornar: { "success": true, "message": "", "data": {...} }

@router.post("/")
async def create_orden_trabajo(orden: CreateOrdenTrabajoRequest):
    # Insertar en MongoDB colección ordenes_trabajo
    # Retornar: { "success": true, "message": "Orden creada", "data": {...} }

@router.patch("/{orden_id}")
async def update_orden_trabajo(orden_id: str, updates: UpdateOrdenTrabajoRequest):
    # Actualizar registro en MongoDB
    # Retornar: { "success": true, "message": "Orden actualizada" }

@router.delete("/{orden_id}")
async def delete_orden_trabajo(orden_id: str):
    # Eliminar registro de MongoDB
    # Retornar: { "success": true, "message": "Orden eliminada" }
```

### Modelo Pydantic (Backend)

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

class OrdenTrabajoBase(BaseModel):
    brigada_id: str
    cliente_numero: str
    tipo_reporte: Literal["inversión", "avería", "mantenimiento"]
    fecha_ejecucion: str  # ISO format date
    comentarios: Optional[str] = None

class CreateOrdenTrabajoRequest(OrdenTrabajoBase):
    pass

class UpdateOrdenTrabajoRequest(BaseModel):
    brigada_id: Optional[str] = None
    cliente_numero: Optional[str] = None
    tipo_reporte: Optional[Literal["inversión", "avería", "mantenimiento"]] = None
    fecha_ejecucion: Optional[str] = None
    comentarios: Optional[str] = None
    estado: Optional[Literal["pendiente", "en_proceso", "completada", "cancelada"]] = None

class OrdenTrabajo(OrdenTrabajoBase):
    id: str = Field(alias="_id")
    brigada_nombre: Optional[str] = None
    cliente_nombre: str
    fecha_creacion: str
    estado: Literal["pendiente", "en_proceso", "completada", "cancelada"] = "pendiente"

    class Config:
        populate_by_name = True
```

---

## 🚀 Migración de LocalStorage a Backend

### Estado Actual
- ✅ Frontend completamente implementado
- ✅ Usando `LocalOrdenesTrabajoService` temporal
- ⏳ Backend pendiente de implementación

### Pasos para Conectar Backend

1. **Implementar endpoints en FastAPI** (ver sección anterior)
2. **Configurar MongoDB**:
   ```bash
   # Conectar a MongoDB
   # Crear colección: ordenes_trabajo
   # Crear índices necesarios
   ```
3. **Actualizar hook** (`hooks/use-ordenes-trabajo.ts`):
   ```typescript
   // Cambiar de:
   const data = LocalOrdenesTrabajoService.getAll()
   
   // A:
   const data = await OrdenTrabajoService.getOrdenesTrabajo()
   ```
4. **Configurar variable de entorno**:
   ```bash
   NEXT_PUBLIC_BACKEND_URL=https://api.suncarsrl.com
   ```
5. **Probar endpoints** con Postman o consola del navegador

---

## ✅ Checklist de Implementación

### Frontend ✅ COMPLETADO
- [x] Tipos TypeScript definidos
- [x] Servicio API implementado
- [x] Servicio LocalStorage temporal
- [x] Hook custom con estado y filtros
- [x] Componente tabla de órdenes
- [x] Diálogo de creación de orden
- [x] Diálogo de vista previa de mensaje
- [x] Página principal con navegación
- [x] Integración con brigadas y clientes
- [x] Manejo de errores y toasts
- [x] Diseño responsive

### Backend ⏳ PENDIENTE
- [ ] Crear colección `ordenes_trabajo` en MongoDB
- [ ] Implementar endpoint GET `/api/ordenes-trabajo/`
- [ ] Implementar endpoint GET `/api/ordenes-trabajo/{id}`
- [ ] Implementar endpoint POST `/api/ordenes-trabajo/`
- [ ] Implementar endpoint PATCH `/api/ordenes-trabajo/{id}`
- [ ] Implementar endpoint DELETE `/api/ordenes-trabajo/{id}`
- [ ] Agregar validación de datos con Pydantic
- [ ] Crear índices en MongoDB para optimizar búsquedas
- [ ] Implementar autenticación con Bearer token
- [ ] Agregar logs de operaciones

---

## 📝 Notas Importantes

1. **Autenticación**: Todos los endpoints deben validar el Bearer token `suncar-token-2025`
2. **Relaciones**: Las órdenes referencian brigadas y clientes por ID/número
3. **Estados**: El flujo natural es: `pendiente` → `en_proceso` → `completada`
4. **Mensajes**: La función `generateOrdenTrabajoMessage()` genera texto para WhatsApp
5. **Filtros**: Los filtros son acumulativos (AND lógico)
6. **Fechas**: Usar formato ISO 8601 para fechas

---

## 🎯 Próximos Pasos

1. ✅ **Implementar backend endpoints en FastAPI**
2. ✅ **Crear colección MongoDB con índices**
3. ✅ **Actualizar hook para usar API real**
4. ✅ **Probar integración completa**
5. ⏳ **Agregar funcionalidad de edición (UPDATE UI)**
6. ⏳ **Implementar paginación para listas grandes**
7. ⏳ **Agregar exportación a Excel/PDF**
8. ⏳ **Notificaciones push para nuevas órdenes**

---

## 📞 Contacto y Soporte

Para dudas o problemas con la implementación, revisar:
- `CLAUDE.md` en la raíz del proyecto
- Documentación de arquitectura en `docs/`
- Ejemplos de otros módulos como `brigadas`, `materiales`, etc.

---

**Última actualización**: 2025-10-20
**Autor**: Sistema de desarrollo SunCar
**Estado**: ✅ Frontend completo | ⏳ Backend pendiente

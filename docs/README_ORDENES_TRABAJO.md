# 🚀 Guía Rápida: Implementación CRUD Órdenes de Trabajo

Esta guía resume la implementación completa del sistema de órdenes de trabajo para SunCar.

---

## 📊 ¿Qué se ha implementado?

### ✅ Frontend (Next.js + TypeScript) - COMPLETADO
- **Tipos TypeScript**: Definiciones completas en `lib/types/feats/ordenes-trabajo/`
- **Servicio API**: Cliente HTTP con autenticación en `lib/services/feats/ordenes-trabajo/`
- **Hook personalizado**: Estado y lógica de negocio en `hooks/use-ordenes-trabajo.ts`
- **Componentes UI**: Tabla, diálogos y formularios en `components/feats/ordenes-trabajo/`
- **Página completa**: Interfaz de usuario en `app/ordenes-trabajo/page.tsx`
- **LocalStorage temporal**: Servicio de desarrollo en `lib/local-storage-ordenes.ts`

### ⏳ Backend (FastAPI + MongoDB) - POR IMPLEMENTAR
- **Modelos Pydantic**: Código completo en `docs/BACKEND_ORDENES_TRABAJO.md`
- **Endpoints REST**: 5 endpoints CRUD documentados
- **Colección MongoDB**: Estructura y índices definidos
- **Script de inicialización**: `docs/init_ordenes_trabajo_mongodb.py`

---

## 🎯 Estructura de Datos

### Modelo de Orden de Trabajo

```typescript
{
  id: string,                          // ID único
  brigada_id: string,                  // ID de la brigada asignada
  brigada_nombre: string,              // Nombre de la brigada
  cliente_numero: string,              // Número del cliente
  cliente_nombre: string,              // Nombre del cliente
  tipo_reporte: string,                // "inversión" | "avería" | "mantenimiento"
  fecha_ejecucion: string,             // Fecha programada (ISO format)
  comentarios?: string,                // Comentarios opcionales (campo grande)
  fecha_creacion: string,              // Fecha de creación del registro
  estado: string                       // "pendiente" | "en_proceso" | "completada" | "cancelada"
}
```

---

## 🔌 Endpoints API

### GET `/api/ordenes-trabajo/`
Obtener lista de órdenes con filtros opcionales.

**Query params:**
- `brigada_id` (opcional)
- `cliente_numero` (opcional)
- `tipo_reporte` (opcional)
- `estado` (opcional)
- `fecha_inicio` (opcional)
- `fecha_fin` (opcional)

**Response:**
```json
{
  "success": true,
  "message": "Se encontraron 15 órdenes de trabajo",
  "data": [...]
}
```

---

### GET `/api/ordenes-trabajo/{id}`
Obtener una orden específica por ID.

**Response:**
```json
{
  "success": true,
  "message": "Orden de trabajo encontrada",
  "data": {
    "id": "65a1b2c...",
    "brigada_id": "...",
    "cliente_numero": "12345",
    ...
  }
}
```

---

### POST `/api/ordenes-trabajo/`
Crear nueva orden de trabajo.

**Request body:**
```json
{
  "brigada_id": "brigada001",
  "cliente_numero": "CLI001",
  "tipo_reporte": "inversión",
  "fecha_ejecucion": "2025-11-01T10:00:00",
  "comentarios": "Instalación de panel solar"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orden de trabajo creada correctamente",
  "data": { ... }
}
```

---

### PATCH `/api/ordenes-trabajo/{id}`
Actualizar orden existente.

**Request body (todos los campos opcionales):**
```json
{
  "estado": "completada",
  "comentarios": "Trabajo finalizado"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orden de trabajo actualizada correctamente"
}
```

---

### DELETE `/api/ordenes-trabajo/{id}`
Eliminar orden de trabajo.

**Response:**
```json
{
  "success": true,
  "message": "Orden de trabajo eliminada correctamente"
}
```

---

## 📁 Archivos Principales

### Frontend
```
lib/
├── types/feats/ordenes-trabajo/
│   └── orden-trabajo-types.ts          ✅ Tipos TypeScript
├── services/feats/ordenes-trabajo/
│   └── orden-trabajo-service.ts        ✅ Cliente API
└── local-storage-ordenes.ts            ✅ Servicio temporal

hooks/
└── use-ordenes-trabajo.ts              ✅ Hook con estado

components/feats/ordenes-trabajo/
├── ordenes-trabajo-table.tsx           ✅ Tabla principal
├── create-orden-trabajo-dialog.tsx     ✅ Formulario de creación
└── message-preview-dialog.tsx          ✅ Vista previa de mensaje

app/ordenes-trabajo/
└── page.tsx                            ✅ Página principal
```

### Backend (por implementar)
```
backend/
├── app/
│   ├── models/
│   │   └── orden_trabajo.py            ⏳ Modelos Pydantic
│   ├── routes/
│   │   └── ordenes_trabajo.py          ⏳ Endpoints FastAPI
│   └── main.py                         ⏳ App principal
└── init_ordenes_trabajo.py             ⏳ Script de inicialización
```

---

## 🚀 Pasos para Desplegar

### 1. Implementar Backend

```bash
# 1. Copiar código del archivo docs/BACKEND_ORDENES_TRABAJO.md
# 2. Crear archivos en la estructura del backend

# 3. Instalar dependencias
pip install fastapi pymongo motor python-dotenv

# 4. Configurar variables de entorno
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=suncar
AUTH_TOKEN=suncar-token-2025

# 5. Inicializar colección MongoDB
python docs/init_ordenes_trabajo_mongodb.py

# 6. Iniciar servidor
uvicorn app.main:app --reload --port 8000
```

---

### 2. Conectar Frontend con Backend

**Editar:** `hooks/use-ordenes-trabajo.ts`

```typescript
// Línea 36-39: CAMBIAR DE:
const data = LocalOrdenesTrabajoService.getAll()
console.log('📦 Órdenes de trabajo desde localStorage:', data)

// A:
const data = await OrdenTrabajoService.getOrdenesTrabajo()
console.log('📦 Órdenes de trabajo desde API:', data)
```

**Línea 84: CAMBIAR DE:**
```typescript
const nuevaOrden = LocalOrdenesTrabajoService.create(data, brigadaNombre, clienteNombre)
```
**A:**
```typescript
const response = await OrdenTrabajoService.createOrdenTrabajo(data)
```

**Línea 102: CAMBIAR DE:**
```typescript
const success = LocalOrdenesTrabajoService.update(id, data)
```
**A:**
```typescript
const response = await OrdenTrabajoService.updateOrdenTrabajo(id, data)
const success = response.success
```

**Línea 122: CAMBIAR DE:**
```typescript
const success = LocalOrdenesTrabajoService.delete(id)
```
**A:**
```typescript
const response = await OrdenTrabajoService.deleteOrdenTrabajo(id)
const success = response.success
```

---

### 3. Configurar Variables de Entorno

```bash
# En el frontend (.env.local)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# O para producción:
NEXT_PUBLIC_BACKEND_URL=https://api.suncarsrl.com
```

---

### 4. Probar Integración

```bash
# 1. Iniciar backend
cd backend
uvicorn app.main:app --reload

# 2. Iniciar frontend
cd SunCarWeb
npm run dev

# 3. Abrir navegador
http://localhost:3000/ordenes-trabajo

# 4. Verificar operaciones CRUD
- Crear nueva orden
- Listar órdenes
- Filtrar por tipo/estado
- Ver mensaje de WhatsApp
- Eliminar orden
```

---

## 🧪 Testing

### Probar Backend con cURL

```bash
# Crear orden
curl -X POST "http://localhost:8000/api/ordenes-trabajo/" \
  -H "Authorization: Bearer suncar-token-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "brigada_id": "brigada001",
    "cliente_numero": "CLI001",
    "tipo_reporte": "inversión",
    "fecha_ejecucion": "2025-11-01T10:00:00",
    "comentarios": "Instalación de panel solar"
  }'

# Listar órdenes
curl -X GET "http://localhost:8000/api/ordenes-trabajo/" \
  -H "Authorization: Bearer suncar-token-2025"

# Filtrar por estado
curl -X GET "http://localhost:8000/api/ordenes-trabajo/?estado=pendiente" \
  -H "Authorization: Bearer suncar-token-2025"
```

---

## 📱 Características de la UI

### Filtros Disponibles
1. **Búsqueda por texto**: Cliente, brigada, número de cliente, comentarios
2. **Filtro por tipo**: Inversión, Avería, Mantenimiento
3. **Filtro por estado**: Pendiente, En Proceso, Completada, Cancelada

### Acciones Disponibles
1. **Crear Orden**: Formulario completo con validación
2. **Ver Mensaje**: Vista previa del mensaje para WhatsApp
3. **Eliminar Orden**: Con confirmación
4. **Editar Orden**: (Funcionalidad preparada, pendiente de UI)

### Información Mostrada
- ID de la orden
- Brigada asignada
- Cliente (nombre y número)
- Tipo de reporte (con badge colorido)
- Estado (con badge colorido)
- Fecha de ejecución
- Comentarios (truncados si son largos)
- Acciones (botones de acción)

---

## 🎨 Colores y Badges

### Tipo de Reporte
- 🔵 **Inversión**: Azul
- 🔴 **Avería**: Rojo
- 🟢 **Mantenimiento**: Verde

### Estado
- 🟡 **Pendiente**: Amarillo
- 🔵 **En Proceso**: Azul
- 🟢 **Completada**: Verde
- 🔴 **Cancelada**: Rojo

---

## 📚 Documentación Completa

Para más detalles, consulta:

1. **`docs/ORDENES_TRABAJO_CRUD.md`**: Documentación completa del sistema
2. **`docs/BACKEND_ORDENES_TRABAJO.md`**: Código completo del backend
3. **`docs/init_ordenes_trabajo_mongodb.py`**: Script de inicialización
4. **`CLAUDE.md`**: Instrucciones generales del proyecto

---

## 🤝 Soporte

Si tienes dudas o problemas:

1. Revisa los logs en la consola del navegador
2. Revisa los logs del servidor FastAPI
3. Verifica que MongoDB esté corriendo
4. Verifica que las variables de entorno estén configuradas
5. Comprueba que el token de autenticación sea correcto

---

## ✨ Resumen Final

- ✅ **Frontend**: 100% completo y funcional
- ✅ **Tipos**: TypeScript completo
- ✅ **Servicios**: API client implementado
- ✅ **UI**: Componentes y página terminados
- ✅ **Documentación**: Completa y detallada
- ⏳ **Backend**: Código completo, pendiente de despliegue
- ⏳ **MongoDB**: Estructura definida, pendiente de creación

**Estado**: Listo para implementar backend y conectar con la base de datos.

---

**Última actualización**: 2025-10-20  
**Versión**: 1.0.0

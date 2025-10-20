# Implementación CRUD de Órdenes de Trabajo

## Resumen de la Implementación

Se ha creado toda la estructura necesaria para gestionar órdenes de trabajo siguiendo la arquitectura limpia del proyecto SunCar.

## Estructura de la Orden de Trabajo

Una orden de trabajo contiene:
- **brigada**: Brigada asignada (con líder e integrantes)
- **cliente**: Cliente asociado
- **tipo_reporte**: Tipo de reporte (inversion, averia, mantenimiento)
- **fecha**: Fecha de la orden de trabajo
- **comentarios**: Comentarios opcionales

## Archivos Creados

### 1. Capa de Dominio
- **`domain/entities/orden_trabajo.py`**: Entidad OrdenTrabajo con validación Pydantic

### 2. Capa de Infraestructura
- **`infrastucture/repositories/orden_trabajo_repository.py`**: Repositorio con métodos CRUD
  - `create()`: Crea nueva orden
  - `get_by_id()`: Obtiene por ID
  - `get_all()`: Obtiene todas
  - `get_by_brigada()`: Filtra por brigada
  - `get_by_cliente()`: Filtra por cliente
  - `update()`: Actualiza orden
  - `delete()`: Elimina orden
  - Métodos auxiliares para mapear brigadas y clientes completos

### 3. Capa de Aplicación
- **`application/services/orden_trabajo_service.py`**: Servicio con lógica de negocio
  - Métodos async para todas las operaciones CRUD

### 4. Capa de Presentación

#### Schemas Request
- **`presentation/schemas/requests/OrdenTrabajoRequest.py`**:
  - `OrdenTrabajoCreateRequest`: Para crear orden
  - `OrdenTrabajoUpdateRequest`: Para actualizar orden
  - Validaciones de campos obligatorios y tipos de reporte

#### Schemas Response
- **`presentation/schemas/responses/ordenes_trabajo_responses.py`**:
  - `OrdenTrabajoResponse`: Respuesta individual
  - `OrdenTrabajoListResponse`: Lista de órdenes
  - `OrdenTrabajoCreateResponse`: Respuesta de creación

- **`presentation/schemas/responses/brigadas_responses.py`** (actualizado):
  - Agregado `TrabajadorResponse` y `BrigadaResponse` para composición

- **`presentation/schemas/responses/clientes_responses.py`** (actualizado):
  - Agregado `ClienteResponse` para composición

#### Router
- **`presentation/routers/ordenes_trabajo_router.py`**: Endpoints REST
  - `POST /api/ordenes-trabajo/`: Crear orden
  - `GET /api/ordenes-trabajo/`: Listar todas (con filtros opcionales)
  - `GET /api/ordenes-trabajo/{orden_id}`: Obtener por ID
  - `PUT /api/ordenes-trabajo/{orden_id}`: Actualizar orden
  - `DELETE /api/ordenes-trabajo/{orden_id}`: Eliminar orden

### 5. Configuración
- **`infrastucture/dependencies.py`** (actualizado):
  - Agregado repositorio y servicio singleton
  - Funciones de dependencia para FastAPI

- **`main.py`** (actualizado):
  - Registrado router en `/api/ordenes-trabajo`
  - Tag "Órdenes de Trabajo"

### 6. Tests
- **`test/test_ordenes_trabajo.http`**: Archivo de pruebas HTTP

## Características Implementadas

### Validaciones
- Campos obligatorios no vacíos
- Tipos de reporte válidos: inversion, averia, mantenimiento
- Verificación de existencia de brigada y cliente antes de crear/actualizar

### Filtros
- Por brigada (usando CI del líder)
- Por cliente (usando número de cliente)

### Manejo de Errores
- 404 cuando no se encuentra orden, brigada o cliente
- 500 para errores internos
- Validación de entrada con mensajes descriptivos

### Relaciones
- Obtiene datos completos de brigada desde la view `brigadas_completas`
- Obtiene datos completos de cliente desde la colección `clientes`
- Maneja correctamente las relaciones entre entidades

## Colección MongoDB

**Nombre**: `ordenes_trabajo`

**Estructura de documentos**:
```json
{
  "_id": ObjectId,
  "brigada_lider_ci": "string",
  "cliente_numero": "string",
  "tipo_reporte": "string",
  "fecha": ISODate,
  "comentarios": "string"
}
```

## Endpoints Disponibles

1. **POST /api/ordenes-trabajo/**
   - Crear nueva orden de trabajo
   - Requiere: brigada_lider_ci, cliente_numero, tipo_reporte, fecha
   - Opcional: comentarios

2. **GET /api/ordenes-trabajo/**
   - Listar todas las órdenes
   - Query params opcionales: `brigada_lider_ci`, `cliente_numero`

3. **GET /api/ordenes-trabajo/{orden_id}**
   - Obtener orden específica

4. **PUT /api/ordenes-trabajo/{orden_id}**
   - Actualizar orden (campos opcionales)

5. **DELETE /api/ordenes-trabajo/{orden_id}**
   - Eliminar orden

## Uso

### Crear orden:
```bash
POST /api/ordenes-trabajo/
{
  "brigada_lider_ci": "12345678",
  "cliente_numero": "CLI-001",
  "tipo_reporte": "mantenimiento",
  "fecha": "2024-01-15T08:00:00",
  "comentarios": "Mantenimiento preventivo"
}
```

### Listar con filtro:
```bash
GET /api/ordenes-trabajo/?brigada_lider_ci=12345678
```

### Actualizar:
```bash
PUT /api/ordenes-trabajo/{id}
{
  "tipo_reporte": "averia",
  "comentarios": "Cambio a avería"
}
```

## Próximos Pasos

1. Ejecutar el servidor: `python main.py`
2. Probar endpoints con el archivo `test/test_ordenes_trabajo.http`
3. Verificar que la colección `ordenes_trabajo` se crea automáticamente en MongoDB
4. Asegurarse de tener brigadas y clientes existentes para crear órdenes

## Notas

- Los datos se almacenan con referencias (CI de líder y número de cliente)
- Al consultar, se obtienen los objetos completos desde sus colecciones
- Sigue el patrón de arquitectura limpia del proyecto
- Compatible con el sistema de autenticación existente (Bearer token)

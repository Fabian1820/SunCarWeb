# API de Brigadas - Documentación Completa

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [Arquitectura de Brigadas](#arquitectura-de-brigadas)
4. [Endpoints de Gestión de Brigadas](#endpoints-de-gestión-de-brigadas)
5. [Endpoints de Gestión de Integrantes](#endpoints-de-gestión-de-integrantes)
6. [Códigos de Estado](#códigos-de-estado)
7. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Descripción General

La API de Brigadas gestiona los equipos de trabajo de SunCar, permitiendo:

- **Gestión de Brigadas**: CRUD completo de brigadas con líderes e integrantes
- **Gestión de Integrantes**: Agregar, eliminar y actualizar miembros de brigadas
- **Consultas Avanzadas**: Búsqueda de brigadas por líder o integrantes
- **Vista Optimizada**: Uso de MongoDB Views para datos denormalizados y consultas eficientes

**Base URL**: `http://localhost:8000/api/brigadas`

---

## Modelo de Datos

### Entidad Brigada

```typescript
interface Brigada {
  id?: string;                  // ID de la brigada (opcional)
  lider_ci?: string;            // CI del líder de la brigada
  lider: Trabajador;            // Objeto completo del líder
  integrantes: Trabajador[];    // Array de integrantes completos
}
```

### Entidad Trabajador (dentro de Brigada)

```typescript
interface Trabajador {
  id: string;                   // ID del trabajador
  CI: string;                   // Cédula de identidad
  nombre: string;               // Nombre completo
  tiene_contraseña: boolean;    // Indica si tiene contraseña
  cargo?: string;               // Cargo del trabajador
  salario_fijo?: number;        // Salario base
  porcentaje_fijo_estimulo?: number;
  porcentaje_variable_estimulo?: number;
  is_brigadista?: boolean;
  alimentacion?: number;
  dias_trabajables?: number;
  dias_no_trabajados?: number[];
}
```

### Request Models

#### BrigadaRequest
```typescript
interface BrigadaRequest {
  lider: TeamMember;            // Líder de la brigada (requerido)
  integrantes: TeamMember[];    // Integrantes de la brigada (requerido)
}
```

#### TeamMember
```typescript
interface TeamMember {
  nombre: string;               // Nombre del miembro (requerido)
  CI: string;                   // Cédula de identidad (requerido)
}
```

---

## Arquitectura de Brigadas

### Colecciones de Base de Datos

#### Colección Base: `brigadas`
Almacena la estructura básica de las brigadas con referencias a trabajadores:

```json
{
  "_id": ObjectId,
  "lider": "12345678",          // CI del líder
  "integrantes": [              // Array de CIs de integrantes
    "87654321",
    "11223344"
  ]
}
```

#### Vista: `brigadas_completas`
Vista MongoDB que desnormaliza los datos para consultas eficientes:

```json
{
  "_id": ObjectId,
  "lider_ci": "12345678",
  "lider": {                    // Datos completos del líder
    "_id": ObjectId,
    "CI": "12345678",
    "nombre": "Juan Pérez",
    "contraseña": "hashed",
    "cargo": "Jefe de Brigada",
    // ... otros campos
  },
  "integrantes": [              // Array de objetos completos
    {
      "_id": ObjectId,
      "CI": "87654321",
      "nombre": "María García",
      // ... otros campos
    }
  ]
}
```

### Pipeline de Agregación de la Vista

La vista `brigadas_completas` se crea mediante el siguiente pipeline:

```javascript
[
  {
    $lookup: {
      from: "trabajadores",
      localField: "lider",
      foreignField: "CI",
      as: "lider"
    }
  },
  {
    $unwind: {
      path: "$lider",
      preserveNullAndEmptyArrays: false
    }
  },
  {
    $lookup: {
      from: "trabajadores",
      localField: "integrantes",
      foreignField: "CI",
      as: "integrantes"
    }
  },
  {
    $addFields: {
      lider_ci: "$lider.CI"
    }
  }
]
```

### Ventajas de la Vista

1. **Performance**: Una sola consulta obtiene todos los datos necesarios
2. **Consistencia**: Los datos de trabajadores siempre están actualizados
3. **Simplicidad**: El código de aplicación es más simple y legible
4. **Escalabilidad**: MongoDB optimiza internamente la vista

---

## Endpoints de Gestión de Brigadas

### 1. Listar Todas las Brigadas

Obtiene todas las brigadas con sus líderes e integrantes completos. Soporta búsqueda opcional.

**Endpoint**: `GET /api/brigadas/`

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters** (opcionales):
- `search` (string): Filtra brigadas por nombre del líder o integrantes (case-insensitive)

**Ejemplo sin búsqueda**:
```
GET /api/brigadas/
```

**Ejemplo con búsqueda**:
```
GET /api/brigadas/?search=Juan
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Todas las brigadas obtenidas exitosamente",
  "data": [
    {
      "id": "672d85a1f8e9c3b2a1d4e5f6",
      "lider_ci": "12345678",
      "lider": {
        "id": "672d85a1f8e9c3b2a1d4e5f1",
        "CI": "12345678",
        "nombre": "Juan Pérez García",
        "tiene_contraseña": true,
        "cargo": "Jefe de Brigada",
        "salario_fijo": 6000
      },
      "integrantes": [
        {
          "id": "672d85a1f8e9c3b2a1d4e5f2",
          "CI": "87654321",
          "nombre": "María García López",
          "tiene_contraseña": false,
          "cargo": "Técnico",
          "salario_fijo": 5000
        },
        {
          "id": "672d85a1f8e9c3b2a1d4e5f3",
          "CI": "11223344",
          "nombre": "Carlos Martínez",
          "tiene_contraseña": false,
          "cargo": "Técnico",
          "salario_fijo": 5000
        }
      ]
    }
  ]
}
```

**Respuesta con Búsqueda (200)**:
```json
{
  "success": true,
  "message": "Brigadas filtradas obtenidas exitosamente",
  "data": [
    // Brigadas que contienen "Juan" en el nombre del líder o integrantes
  ]
}
```

**Respuesta de Error (500)**:
```json
{
  "detail": "Error interno del servidor: [mensaje]"
}
```

---

### 2. Obtener Brigada Específica

Obtiene los detalles completos de una brigada específica por el CI de su líder.

**Endpoint**: `GET /api/brigadas/{brigada_id}`

**Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `brigada_id` (string): CI del líder de la brigada

**Ejemplo**:
```
GET /api/brigadas/12345678
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Brigada obtenida exitosamente",
  "data": {
    "id": "672d85a1f8e9c3b2a1d4e5f6",
    "lider_ci": "12345678",
    "lider": {
      "id": "672d85a1f8e9c3b2a1d4e5f1",
      "CI": "12345678",
      "nombre": "Juan Pérez García",
      "tiene_contraseña": true,
      "cargo": "Jefe de Brigada"
    },
    "integrantes": [
      {
        "id": "672d85a1f8e9c3b2a1d4e5f2",
        "CI": "87654321",
        "nombre": "María García López",
        "tiene_contraseña": false
      }
    ]
  }
}
```

**Respuesta de Error (200 - brigada no encontrada)**:
```json
{
  "success": false,
  "message": "Brigada no encontrada",
  "data": null
}
```

**Respuesta de Error (500)**:
```json
{
  "detail": "Error interno del servidor: [mensaje]"
}
```

---

### 3. Crear Brigada

Crea una nueva brigada con un líder y una lista de integrantes.

**Endpoint**: `POST /api/brigadas/`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body Request**:
```json
{
  "lider": {
    "nombre": "Juan Pérez García",
    "CI": "12345678"
  },
  "integrantes": [
    {
      "nombre": "María García López",
      "CI": "87654321"
    },
    {
      "nombre": "Carlos Martínez",
      "CI": "11223344"
    }
  ]
}
```

**Validaciones**:
- El nombre del líder no puede estar vacío
- El CI del líder debe contener solo números y guiones
- Los integrantes no pueden tener CIs duplicados
- El líder no puede estar en la lista de integrantes

**Respuesta Exitosa (201)**:
```json
{
  "success": true,
  "message": "Brigada creada exitosamente",
  "brigada_id": "672d85a1f8e9c3b2a1d4e5f6"
}
```

**Respuesta de Error (422 - Validación)**:
```json
{
  "detail": [
    {
      "loc": ["body", "lider", "nombre"],
      "msg": "El nombre no puede estar vacío",
      "type": "value_error"
    }
  ]
}
```

**Respuesta de Error (500)**:
```json
{
  "detail": "Error interno del servidor: [mensaje]"
}
```

**Notas**:
- Los trabajadores (líder e integrantes) deben existir previamente en la colección `trabajadores`
- Si el líder no tiene contraseña, considerar asignarle una
- Se recomienda usar el endpoint de trabajadores para crear jefes de brigada con brigada incluida

---

### 4. Actualizar Brigada

Actualiza una brigada existente, permitiendo cambiar el líder y/o los integrantes.

**Endpoint**: `PUT /api/brigadas/{brigada_id}`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters**:
- `brigada_id` (string): ID de la brigada (ObjectId de MongoDB)

**Body Request**:
```json
{
  "lider": {
    "nombre": "Juan Pérez García",
    "CI": "12345678"
  },
  "integrantes": [
    {
      "nombre": "María García López",
      "CI": "87654321"
    },
    {
      "nombre": "Pedro Rodríguez",
      "CI": "99887766"
    }
  ]
}
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Brigada actualizada exitosamente"
}
```

**Respuesta de Error (200 - sin cambios)**:
```json
{
  "success": false,
  "message": "Brigada no encontrada o sin cambios"
}
```

**Respuesta de Error (500)**:
```json
{
  "detail": "Error interno del servidor: [mensaje]"
}
```

**Notas**:
- Esta operación reemplaza completamente la lista de integrantes
- Para agregar o eliminar integrantes individuales, usar los endpoints específicos
- El líder debe existir en la colección de trabajadores

---

### 5. Eliminar Brigada

Elimina completamente una brigada del sistema usando el CI del líder.

**Endpoint**: `DELETE /api/brigadas/{lider_ci}`

**Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `lider_ci` (string): CI del líder de la brigada

**Ejemplo**:
```
DELETE /api/brigadas/12345678
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Brigada eliminada exitosamente"
}
```

**Respuesta de Error (200 - no encontrada)**:
```json
{
  "success": false,
  "message": "Brigada no encontrada"
}
```

**Respuesta de Error (500)**:
```json
{
  "detail": "Error interno del servidor: [mensaje]"
}
```

**Notas**:
- Esta operación es irreversible
- Los trabajadores (líder e integrantes) permanecen en el sistema
- Solo se elimina la relación de brigada

---

## Endpoints de Gestión de Integrantes

### 6. Agregar Trabajador a Brigada

Agrega un trabajador existente a una brigada como integrante.

**Endpoint**: `POST /api/brigadas/{brigada_id}/trabajadores`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters**:
- `brigada_id` (string): ID de la brigada (ObjectId o CI del líder)

**Body Request**:
```json
{
  "nombre": "Pedro Rodríguez",
  "CI": "99887766"
}
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Trabajador agregado a la brigada exitosamente"
}
```

**Respuesta de Error (200)**:
```json
{
  "success": false,
  "message": "Brigada no encontrada o trabajador ya es integrante"
}
```

**Respuesta de Error (500)**:
```json
{
  "detail": "Error interno del servidor: [mensaje]"
}
```

**Notas**:
- El trabajador debe existir previamente en la colección `trabajadores`
- Si el trabajador ya es integrante, la operación falla
- Usa `$addToSet` en MongoDB para evitar duplicados

---

### 7. Eliminar Trabajador de Brigada

Elimina un trabajador específico de una brigada usando el CI del líder.

**Endpoint**: `DELETE /api/brigadas/{lider_ci}/trabajadores/{trabajador_ci}`

**Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `lider_ci` (string): CI del líder de la brigada
- `trabajador_ci` (string): CI del trabajador a eliminar

**Ejemplo**:
```
DELETE /api/brigadas/12345678/trabajadores/87654321
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Trabajador eliminado de la brigada exitosamente"
}
```

**Respuesta de Error (200)**:
```json
{
  "success": false,
  "message": "Brigada o trabajador no encontrado"
}
```

**Respuesta de Error (500)**:
```json
{
  "detail": "Error interno del servidor: [mensaje]"
}
```

**Notas**:
- El trabajador se elimina solo de la brigada, no del sistema
- Si el trabajador no es integrante de la brigada, la operación falla
- No se puede eliminar al líder usando este endpoint

---

### 8. Actualizar Datos de Trabajador

Actualiza el nombre de un trabajador en el sistema (afecta a todas las brigadas donde participa).

**Endpoint**: `PUT /api/brigadas/{brigada_id}/trabajadores/{trabajador_ci}`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters**:
- `brigada_id` (string): ID de la brigada (no se usa en la lógica actual)
- `trabajador_ci` (string): CI del trabajador a actualizar

**Body Request**:
```json
{
  "nombre": "María García Rodríguez",
  "CI": "87654321"
}
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Trabajador actualizado exitosamente"
}
```

**Respuesta de Error (200)**:
```json
{
  "success": false,
  "message": "Trabajador no encontrado o sin cambios"
}
```

**Respuesta de Error (500)**:
```json
{
  "detail": "Error interno del servidor: [mensaje]"
}
```

**Notas**:
- Esta operación actualiza el trabajador en la colección `trabajadores`
- El cambio se refleja automáticamente en todas las brigadas donde participa
- Por la vista `brigadas_completas`, los cambios son inmediatos

---

## Códigos de Estado

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa |
| 201 | Brigada creada exitosamente |
| 404 | Recurso no encontrado |
| 422 | Error de validación de datos |
| 500 | Error interno del servidor |

---

## Ejemplos de Uso

### Flujo Completo: Crear una Brigada desde Cero

```bash
# 1. Crear trabajadores primero (líder e integrantes)
curl -X POST "http://localhost:8000/api/trabajadores/" \
  -H "Content-Type: application/json" \
  -d '{
    "ci": "12345678",
    "nombre": "Juan Pérez García",
    "contrasena": "password123"
  }'

curl -X POST "http://localhost:8000/api/trabajadores/" \
  -H "Content-Type: application/json" \
  -d '{
    "ci": "87654321",
    "nombre": "María García López"
  }'

curl -X POST "http://localhost:8000/api/trabajadores/" \
  -H "Content-Type: application/json" \
  -d '{
    "ci": "11223344",
    "nombre": "Carlos Martínez"
  }'

# 2. Crear la brigada
curl -X POST "http://localhost:8000/api/brigadas/" \
  -H "Content-Type: application/json" \
  -d '{
    "lider": {
      "nombre": "Juan Pérez García",
      "CI": "12345678"
    },
    "integrantes": [
      {
        "nombre": "María García López",
        "CI": "87654321"
      },
      {
        "nombre": "Carlos Martínez",
        "CI": "11223344"
      }
    ]
  }'
```

### Flujo Simplificado: Usar Endpoint de Trabajadores

```bash
# Crear jefe de brigada y brigada en un solo paso
curl -X POST "http://localhost:8000/api/trabajadores/jefes_brigada" \
  -H "Content-Type: application/json" \
  -d '{
    "ci": "12345678",
    "nombre": "Juan Pérez García",
    "contrasena": "password123",
    "integrantes": ["87654321", "11223344"]
  }'
```

### Gestión de Integrantes

```bash
# Agregar nuevo integrante
curl -X POST "http://localhost:8000/api/brigadas/12345678/trabajadores" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Pedro Rodríguez",
    "CI": "99887766"
  }'

# Eliminar integrante
curl -X DELETE "http://localhost:8000/api/brigadas/12345678/trabajadores/87654321"

# Actualizar nombre de integrante
curl -X PUT "http://localhost:8000/api/brigadas/12345678/trabajadores/11223344" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Carlos Martínez Pérez",
    "CI": "11223344"
  }'
```

### Consultas y Búsquedas

```bash
# Listar todas las brigadas
curl -X GET "http://localhost:8000/api/brigadas/"

# Buscar brigadas que contengan "Juan"
curl -X GET "http://localhost:8000/api/brigadas/?search=Juan"

# Obtener brigada específica
curl -X GET "http://localhost:8000/api/brigadas/12345678"
```

### Actualización y Eliminación

```bash
# Actualizar brigada (cambiar integrantes)
curl -X PUT "http://localhost:8000/api/brigadas/672d85a1f8e9c3b2a1d4e5f6" \
  -H "Content-Type: application/json" \
  -d '{
    "lider": {
      "nombre": "Juan Pérez García",
      "CI": "12345678"
    },
    "integrantes": [
      {
        "nombre": "Pedro Rodríguez",
        "CI": "99887766"
      }
    ]
  }'

# Eliminar brigada
curl -X DELETE "http://localhost:8000/api/brigadas/12345678"
```

---

## Integración con Reportes

Las brigadas se utilizan extensivamente en el módulo de reportes:

### Estructura de Brigada en Reportes

```json
{
  "brigada": {
    "lider": {
      "nombre": "Juan Pérez García",
      "CI": "12345678"
    },
    "integrantes": [
      {
        "nombre": "María García López",
        "CI": "87654321"
      }
    ]
  }
}
```

### Tipos de Reportes que Usan Brigadas

1. **Reportes de Inversión**: Proyectos de instalación y construcción
2. **Reportes de Mantenimiento**: Mantenimiento preventivo y correctivo
3. **Reportes de Averías**: Reparaciones de emergencia

### Cálculo de Horas Trabajadas

Las horas trabajadas de cada miembro de la brigada se calculan desde los reportes:

```javascript
// Consulta de agregación
const pipeline = [
  {
    $match: {
      "fecha_hora.fecha": { $gte: fecha_inicio, $lte: fecha_fin },
      $or: [
        { "brigada.lider.CI": ci },
        { "brigada.integrantes.CI": ci }
      ]
    }
  },
  {
    $addFields: {
      horas_trabajadas: {
        $divide: [
          {
            $subtract: [
              hora_fin_en_minutos,
              hora_inicio_en_minutos
            ]
          },
          60
        ]
      }
    }
  },
  {
    $group: {
      _id: null,
      total_horas: { $sum: "$horas_trabajadas" }
    }
  }
];
```

---

## Validaciones y Reglas de Negocio

### Validaciones de Entrada

#### Líder
- **nombre**: No puede estar vacío, mínimo 3 caracteres
- **CI**: Debe contener solo números y guiones, formato: `\d{11}` o con guiones

#### Integrantes
- **nombre**: No puede estar vacío para cada integrante
- **CI**: Único dentro de la brigada, no puede ser el CI del líder
- **Array**: Puede estar vacío, pero si tiene elementos, deben ser válidos

### Reglas de Negocio

1. **Unicidad de Líder**: Una persona solo puede ser líder de una brigada a la vez
2. **Existencia Previa**: Todos los trabajadores (líder e integrantes) deben existir en la colección `trabajadores`
3. **Contraseña de Líder**: Los líderes de brigada deben tener contraseña asignada
4. **No Duplicados**: Un trabajador no puede aparecer múltiples veces en los integrantes
5. **Líder no es Integrante**: El líder no puede estar en la lista de integrantes
6. **Brigada Mínima**: Una brigada debe tener al menos un líder (integrantes pueden ser 0)

### Restricciones de Base de Datos

1. **Colección `brigadas`**:
   - Campo `lider` es requerido
   - Campo `integrantes` es un array (puede estar vacío)

2. **Vista `brigadas_completas`**:
   - Solo muestra brigadas con líder existente en `trabajadores`
   - Si un integrante no existe, simplemente no aparece en el array

---

## Operaciones Avanzadas

### Consulta de Brigadas por Integrante

Para encontrar todas las brigadas donde un trabajador es integrante:

```typescript
// Endpoint interno (no expuesto en API REST)
brigada_repo.get_brigadas_by_integrante_ci(integrante_ci: string)
```

**Implementación**:
```javascript
collection.find({ "integrantes.CI": integrante_ci })
```

### Uso de ObjectId vs CI del Líder

La API acepta dos tipos de identificadores para brigadas:

1. **ObjectId de MongoDB**: ID único de la brigada en la colección base
2. **CI del Líder**: Identificador alternativo más natural para el negocio

**Ejemplo de manejo dual**:
```python
# En add_trabajador del repository
try:
    obj_id = ObjectId(brigada_id)
    result = collection.update_one({"_id": obj_id}, {"$addToSet": {"integrantes": trabajador_ci}})
    if result.modified_count > 0:
        return True
except (InvalidId, TypeError):
    pass

# Si no es ObjectId válido, buscar por lider_ci
result = collection.update_one({"lider": brigada_id}, {"$addToSet": {"integrantes": trabajador_ci}})
return result.modified_count > 0
```

---

## Performance y Optimización

### Índices Recomendados

```javascript
// Colección brigadas
db.brigadas.createIndex({ "lider": 1 }, { unique: true })
db.brigadas.createIndex({ "integrantes": 1 })

// Colección trabajadores (relacionada)
db.trabajadores.createIndex({ "CI": 1 }, { unique: true })
db.trabajadores.createIndex({ "nombre": 1 })
```

### Estrategias de Caché

1. **Vista Materializada**: La vista `brigadas_completas` actúa como caché denormalizado
2. **Consultas Frecuentes**: Cachear resultado de `get_all_brigadas()` en Redis
3. **Invalidación**: Limpiar caché al crear, actualizar o eliminar brigadas

### Consideraciones de Escalabilidad

1. **Límite de Integrantes**: Considerar limitar el tamaño del array `integrantes`
2. **Paginación**: Para sistemas con muchas brigadas, implementar paginación
3. **Proyección**: Limitar campos devueltos en listados grandes

---

## Migración y Mantenimiento

### Crear Vista brigadas_completas

```javascript
db.createView(
  "brigadas_completas",
  "brigadas",
  [
    {
      $lookup: {
        from: "trabajadores",
        localField: "lider",
        foreignField: "CI",
        as: "lider"
      }
    },
    {
      $unwind: {
        path: "$lider",
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $lookup: {
        from: "trabajadores",
        localField: "integrantes",
        foreignField: "CI",
        as: "integrantes"
      }
    },
    {
      $addFields: {
        lider_ci: "$lider.CI"
      }
    }
  ]
);
```

### Actualizar Vista

Si se necesita modificar la vista:

```javascript
// 1. Eliminar vista existente
db.brigadas_completas.drop();

// 2. Recrear con nuevo pipeline
db.createView("brigadas_completas", "brigadas", [...nuevo_pipeline]);
```

---

## Troubleshooting

### Problema: Brigada no aparece en listado

**Causa**: El líder no existe en la colección `trabajadores`

**Solución**:
```bash
# Verificar que el líder existe
db.trabajadores.findOne({ "CI": "12345678" })

# Si no existe, crear el trabajador primero
```

### Problema: Integrante no aparece en brigada

**Causa**: El CI del integrante no coincide con ningún trabajador

**Solución**:
```bash
# Verificar integrantes en colección base
db.brigadas.findOne({ "lider": "12345678" })

# Verificar que todos los integrantes existen
db.trabajadores.find({ "CI": { $in: ["87654321", "11223344"] } })
```

### Problema: Error al agregar trabajador

**Causa**: El trabajador ya es integrante de la brigada

**Solución**:
```bash
# Verificar si ya es integrante
db.brigadas.findOne({
  "lider": "12345678",
  "integrantes": "87654321"
})

# Si ya existe, el endpoint devolverá error correcto
```

---

## Integración con Otros Módulos

### Trabajadores
- Dependencia fuerte: Todas las operaciones de brigadas requieren trabajadores existentes
- Ver [Documentación de Trabajadores](./trabajadores_api.md)

### Reportes
- Las brigadas son entidades embebidas en reportes de actividades
- Ver [Documentación de Reportes](./reportes_clientes_api.md)

### Autenticación
- Los líderes de brigada pueden autenticarse usando CI y contraseña
- Ver [Documentación de Autenticación](./auth_api.md)

---

## Mejoras Futuras

### Funcionalidades Sugeridas

1. **Historial de Brigadas**: Tracking de cambios en composición de brigadas
2. **Brigadas Temporales**: Brigadas creadas para tareas específicas con fecha de expiración
3. **Especialización**: Tipos de brigada (eléctrica, plomería, general, etc.)
4. **Capacidad**: Límite máximo de integrantes por brigada
5. **Estado**: Estados de brigada (activa, inactiva, en misión, etc.)
6. **Métricas**: Estadísticas de rendimiento por brigada
7. **Geolocalización**: Ubicación actual de brigadas en campo

### Optimizaciones Técnicas

1. **Caché de Redis**: Para brigadas consultadas frecuentemente
2. **GraphQL**: Permitir consultas más flexibles de relaciones
3. **WebSockets**: Notificaciones en tiempo real de cambios en brigadas
4. **Soft Delete**: Mantener historial de brigadas eliminadas

---

## Notas Importantes

1. **Autenticación**: Todos los endpoints requieren Bearer Token
2. **Permisos**: Algunos endpoints pueden requerir rol de administrador
3. **Transacciones**: Considerar implementar transacciones para operaciones multi-colección
4. **Auditoría**: No hay tracking de cambios actualmente
5. **Consistencia**: La vista asegura consistencia eventual, no inmediata

---

## Soporte y Contacto

Para más información o reportar problemas:
- Consultar documentación del proyecto
- Contactar al equipo de desarrollo de SunCar Backend
- Revisar logs en caso de errores 500

**Última actualización**: Octubre 2025

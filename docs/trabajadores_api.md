# API de Trabajadores - Documentación Completa

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [Endpoints de Gestión de Trabajadores](#endpoints-de-gestión-de-trabajadores)
4. [Endpoints de Recursos Humanos](#endpoints-de-recursos-humanos)
5. [Endpoints de Seguimiento de Horas](#endpoints-de-seguimiento-de-horas)
6. [Códigos de Estado](#códigos-de-estado)
7. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Descripción General

La API de Trabajadores proporciona funcionalidades completas para la gestión del personal de SunCar, incluyendo:

- **Gestión de Trabajadores**: CRUD completo de trabajadores
- **Gestión de Contraseñas**: Asignación y eliminación de contraseñas para trabajadores
- **Recursos Humanos**: Gestión de datos de nómina y cálculo salarial
- **Seguimiento de Horas**: Consulta de horas trabajadas por trabajador y rangos de fechas
- **Jefes de Brigada**: Promoción de trabajadores a jefes de brigada

**Base URL**: `http://localhost:8000/api/trabajadores`

---

## Modelo de Datos

### Entidad Trabajador

```typescript
interface Trabajador {
  id?: string;                              // ID generado por MongoDB (opcional)
  CI: string;                               // Cédula de identidad (único, requerido)
  nombre: string;                           // Nombre completo (requerido)
  tiene_contraseña?: boolean;               // Indica si tiene contraseña configurada
  cargo?: string;                           // Cargo o posición (default: "no definido")
  salario_fijo?: number;                    // Salario base mensual (default: 0)
  porcentaje_fijo_estimulo?: number;        // % fijo de estímulo (default: 0.0)
  porcentaje_variable_estimulo?: number;    // % variable de estímulo (default: 0.0)
  is_brigadista?: boolean;                  // Indica si es brigadista (default: false)
  alimentacion?: number;                    // Monto de alimentación (default: 0)
  dias_trabajables?: number;                // Días trabajables en el mes (default: 0)
  dias_no_trabajados?: number[];            // Array de días no trabajados (default: [])
}
```

### Notas sobre Campos

- **CI**: Identificador único del trabajador, debe contener solo números y guiones
- **tiene_contraseña**: Campo calculado automáticamente, no se envía en requests
- **cargo**: Puede ser "Técnico", "Administrativo", "Jefe de Brigada", "Supervisor", etc.
- **dias_trabajables**: Típicamente 24-26 días por mes
- **dias_no_trabajados**: Array de números de días del mes (1-31) en que el trabajador no asistió

---

## Endpoints de Gestión de Trabajadores

### 1. Listar Todos los Trabajadores

Obtiene la lista completa de trabajadores registrados en el sistema.

**Endpoint**: `GET /api/trabajadores/`

**Headers**:
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Trabajadores obtenidos exitosamente",
  "data": [
    {
      "id": "672d85a1f8e9c3b2a1d4e5f6",
      "CI": "02091968281",
      "nombre": "Genier Marquéz del Toro",
      "tiene_contraseña": true,
      "cargo": "Técnico",
      "salario_fijo": 5000,
      "porcentaje_fijo_estimulo": 10,
      "porcentaje_variable_estimulo": 15,
      "is_brigadista": true,
      "alimentacion": 500,
      "dias_trabajables": 24,
      "dias_no_trabajados": [5, 12, 19]
    }
  ]
}
```

---

### 2. Crear Trabajador

Crea un nuevo trabajador en el sistema. Opcionalmente se puede asignar una contraseña.

**Endpoint**: `POST /api/trabajadores/`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body Request**:
```json
{
  "ci": "12345678",
  "nombre": "Juan Pérez García",
  "contrasena": "password123"  // Opcional
}
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Trabajador creado exitosamente",
  "trabajador_id": "672d85a1f8e9c3b2a1d4e5f6"
}
```

**Respuesta de Error (500)**:
```json
{
  "detail": "Error al crear trabajador: [mensaje de error]"
}
```

---

### 3. Buscar Trabajadores por Nombre

Realiza una búsqueda case-insensitive de trabajadores por nombre.

**Endpoint**: `GET /api/trabajadores/buscar`

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `nombre` (requerido): String de búsqueda

**Ejemplo**: `GET /api/trabajadores/buscar?nombre=Juan`

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Búsqueda completada exitosamente",
  "data": [
    {
      "id": "672d85a1f8e9c3b2a1d4e5f6",
      "CI": "12345678",
      "nombre": "Juan Pérez García",
      "tiene_contraseña": true,
      "cargo": "Técnico",
      "salario_fijo": 5000
    }
  ]
}
```

---

### 4. Actualizar Datos del Trabajador

Actualiza el nombre y opcionalmente el CI de un trabajador existente.

**Endpoint**: `PUT /api/trabajadores/{ci}`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters**:
- `ci`: Cédula de identidad actual del trabajador

**Body Request**:
```json
{
  "nombre": "Juan Pérez Martínez",
  "nuevo_ci": "87654321"  // Opcional
}
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Trabajador con CI 12345678 actualizado exitosamente."
}
```

**Respuesta de Error (404)**:
```json
{
  "detail": "Trabajador con CI 12345678 no encontrado."
}
```

---

### 5. Eliminar Trabajador

Elimina completamente un trabajador del sistema. Esta acción es irreversible.

**Endpoint**: `DELETE /api/trabajadores/{ci}`

**Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `ci`: Cédula de identidad del trabajador a eliminar

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Trabajador con CI 12345678 eliminado exitosamente."
}
```

**Respuesta de Error (404)**:
```json
{
  "detail": "Trabajador con CI 12345678 no encontrado."
}
```

**Notas**:
- Esta operación elimina el trabajador permanentemente
- Si solo deseas removerlo de una brigada, usa el endpoint de brigadas

---

### 6. Eliminar Contraseña del Trabajador

Remueve la contraseña de un trabajador, convirtiéndolo en trabajador regular (no jefe de brigada).

**Endpoint**: `DELETE /api/trabajadores/{ci}/contrasena`

**Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `ci`: Cédula de identidad del trabajador

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Contraseña eliminada para el trabajador con CI 12345678."
}
```

**Respuesta de Error (404)**:
```json
{
  "detail": "Trabajador con CI 12345678 no encontrado o ya no tiene contraseña."
}
```

---

## Endpoints de Recursos Humanos

### 7. Actualizar Datos de RRHH

Actualiza los datos de recursos humanos y nómina de un trabajador. Todos los campos son opcionales.

**Endpoint**: `PUT /api/trabajadores/{ci}/rrhh`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters**:
- `ci`: Cédula de identidad del trabajador

**Body Request** (todos los campos son opcionales):
```json
{
  "cargo": "Jefe de Brigada",
  "salario_fijo": 6000,
  "porcentaje_fijo_estimulo": 15,
  "porcentaje_variable_estimulo": 20,
  "alimentacion": 600,
  "dias_trabajables": 24,
  "dias_no_trabajados": [1, 8, 15, 22]
}
```

**Descripción de Campos**:

| Campo | Tipo | Rango | Descripción |
|-------|------|-------|-------------|
| `cargo` | string | - | Cargo o posición del trabajador |
| `salario_fijo` | integer | >= 0 | Salario base mensual en CUP |
| `porcentaje_fijo_estimulo` | integer | 0-100 | Porcentaje fijo de estímulo sobre salario |
| `porcentaje_variable_estimulo` | integer | 0-100 | Porcentaje variable según desempeño |
| `alimentacion` | integer | >= 0 | Monto mensual de alimentación |
| `dias_trabajables` | integer | 1-31 | Días hábiles en el mes |
| `dias_no_trabajados` | array[integer] | 1-31 | Días específicos no trabajados |

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Datos de RRHH actualizados para el trabajador con CI 02091968281."
}
```

**Respuesta de Error (404)**:
```json
{
  "detail": "Trabajador con CI 02091968281 no encontrado o sin cambios."
}
```

**Ejemplo de Uso - Actualizar solo días no trabajados**:
```bash
curl -X PUT "http://localhost:8000/api/trabajadores/02091968281/rrhh" \
  -H "Content-Type: application/json" \
  -d '{
    "dias_no_trabajados": [3, 10, 17, 24]
  }'
```

---

## Endpoints de Seguimiento de Horas

### 8. Obtener Horas Trabajadas por CI

Calcula el total de horas trabajadas por un trabajador específico en un rango de fechas.

**Endpoint**: `GET /api/trabajadores/horas-trabajadas/{ci}`

**Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `ci`: Cédula de identidad del trabajador

**Query Parameters**:
- `fecha_inicio` (requerido): Fecha de inicio del rango (formato: YYYY-MM-DD)
- `fecha_fin` (requerido): Fecha de fin del rango (formato: YYYY-MM-DD)

**Ejemplo**:
```
GET /api/trabajadores/horas-trabajadas/12345678?fecha_inicio=2024-01-01&fecha_fin=2024-01-31
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Horas trabajadas obtenidas correctamente para CI 12345678",
  "data": {
    "ci": "12345678",
    "fecha_inicio": "2024-01-01",
    "fecha_fin": "2024-01-31",
    "total_horas": 168.5
  }
}
```

**Respuesta de Error (200)**:
```json
{
  "success": false,
  "message": "Error obteniendo horas trabajadas: [mensaje de error]",
  "data": {}
}
```

**Notas**:
- El cálculo incluye actividades donde el trabajador aparece como líder o integrante de brigada
- Las horas se calculan desde reportes de inversión, mantenimiento y averías
- El resultado se redondea a 2 decimales

---

### 9. Obtener Horas Trabajadas de Todos los Trabajadores

Obtiene un resumen de horas trabajadas de todos los trabajadores en un rango de fechas, ordenado por horas trabajadas (mayor a menor).

**Endpoint**: `GET /api/trabajadores/horas-trabajadas-todos`

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `fecha_inicio` (requerido): Fecha de inicio (formato: YYYY-MM-DD)
- `fecha_fin` (requerido): Fecha de fin (formato: YYYY-MM-DD)

**Ejemplo**:
```
GET /api/trabajadores/horas-trabajadas-todos?fecha_inicio=2024-01-01&fecha_fin=2024-01-31
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Horas trabajadas de todos los trabajadores obtenidas correctamente",
  "data": {
    "fecha_inicio": "2024-01-01",
    "fecha_fin": "2024-01-31",
    "total_trabajadores": 11,
    "trabajadores": [
      {
        "ci": "02091968281",
        "nombre": "Genier Marquéz del Toro",
        "total_horas": 192.0
      },
      {
        "ci": "03081460604",
        "nombre": "Ashley Alvarez Villiers",
        "total_horas": 176.5
      }
    ]
  }
}
```

**Respuesta de Error (200)**:
```json
{
  "success": false,
  "message": "Error obteniendo horas trabajadas de todos los trabajadores: [mensaje]",
  "data": {}
}
```

---

## Endpoints de Jefes de Brigada

### 10. Crear Jefe de Brigada

Crea un nuevo trabajador como jefe de brigada con integrantes opcionales. Si se proporcionan integrantes, también se crea la brigada.

**Endpoint**: `POST /api/trabajadores/jefes_brigada`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body Request**:
```json
{
  "ci": "12345678",
  "nombre": "Juan Pérez García",
  "contrasena": "password123",
  "integrantes": ["87654321", "11223344"]  // Opcional: CIs de integrantes
}
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Jefe de brigada creado exitosamente",
  "trabajador_id": "672d85a1f8e9c3b2a1d4e5f6"
}
```

**Respuesta de Error (500)**:
```json
{
  "detail": "Error al crear jefe de brigada: [mensaje]"
}
```

**Notas**:
- Si el trabajador ya existe, se actualiza su nombre y contraseña
- Si se proporcionan integrantes, se crea o actualiza la brigada asociada
- La contraseña es obligatoria para jefes de brigada

---

### 11. Convertir Trabajador a Jefe de Brigada

Convierte un trabajador existente en jefe de brigada, asignándole contraseña y opcionalmente creando su brigada.

**Endpoint**: `POST /api/trabajadores/{ci}/convertir_jefe`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters**:
- `ci`: Cédula de identidad del trabajador

**Body Request**:
```json
{
  "contrasena": "password123",
  "integrantes": ["87654321", "11223344"]  // Opcional
}
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Trabajador convertido a jefe de brigada exitosamente"
}
```

**Respuesta de Error (200)**:
```json
{
  "success": false,
  "message": "Trabajador no encontrado o ya es jefe de brigada"
}
```

---

### 12. Asignar Trabajador a Brigada

Crea un trabajador y lo asigna automáticamente a una brigada existente.

**Endpoint**: `POST /api/trabajadores/asignar_brigada`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body Request**:
```json
{
  "ci": "12345678",
  "nombre": "Juan Pérez García",
  "brigada_id": "lider_ci_123",
  "contrasena": "password123"  // Opcional
}
```

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Trabajador creado y asignado a brigada exitosamente"
}
```

**Respuesta de Error (200)**:
```json
{
  "success": false,
  "message": "Brigada no encontrada o trabajador ya existe"
}
```

---

### 13. Eliminar Trabajador de Brigada

Remueve un trabajador de una brigada específica sin eliminarlo del sistema.

**Endpoint**: `DELETE /api/trabajadores/{ci}/brigada/{brigada_id}`

**Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
- `ci`: Cédula de identidad del trabajador
- `brigada_id`: ID de la brigada (CI del líder o ObjectId)

**Respuesta Exitosa (200)**:
```json
{
  "success": true,
  "message": "Trabajador con CI 12345678 eliminado de la brigada exitosamente."
}
```

**Respuesta de Error (404)**:
```json
{
  "detail": "Trabajador o brigada no encontrados."
}
```

---

## Códigos de Estado

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa |
| 201 | Recurso creado exitosamente |
| 404 | Recurso no encontrado |
| 422 | Error de validación de datos |
| 500 | Error interno del servidor |

---

## Ejemplos de Uso

### Flujo Completo: Crear y Configurar un Trabajador

```bash
# 1. Crear el trabajador
curl -X POST "http://localhost:8000/api/trabajadores/" \
  -H "Content-Type: application/json" \
  -d '{
    "ci": "02091968281",
    "nombre": "Genier Marquéz del Toro"
  }'

# 2. Configurar datos de RRHH
curl -X PUT "http://localhost:8000/api/trabajadores/02091968281/rrhh" \
  -H "Content-Type: application/json" \
  -d '{
    "cargo": "Técnico",
    "salario_fijo": 5000,
    "porcentaje_fijo_estimulo": 10,
    "porcentaje_variable_estimulo": 15,
    "alimentacion": 500,
    "dias_trabajables": 24,
    "dias_no_trabajados": []
  }'
```

### Flujo: Crear Jefe de Brigada con Equipo

```bash
# Crear jefe de brigada con integrantes en un solo paso
curl -X POST "http://localhost:8000/api/trabajadores/jefes_brigada" \
  -H "Content-Type: application/json" \
  -d '{
    "ci": "12345678",
    "nombre": "Juan Pérez García",
    "contrasena": "password123",
    "integrantes": ["87654321", "11223344", "99887766"]
  }'
```

### Flujo: Gestión Mensual de Asistencia

```bash
# Actualizar días no trabajados durante el mes
curl -X PUT "http://localhost:8000/api/trabajadores/02091968281/rrhh" \
  -H "Content-Type: application/json" \
  -d '{
    "dias_no_trabajados": [5, 12, 19, 26]
  }'
```

### Flujo: Consulta de Horas Trabajadas

```bash
# Obtener horas de un trabajador específico
curl -X GET "http://localhost:8000/api/trabajadores/horas-trabajadas/02091968281?fecha_inicio=2024-01-01&fecha_fin=2024-01-31"

# Obtener resumen de todos los trabajadores
curl -X GET "http://localhost:8000/api/trabajadores/horas-trabajadas-todos?fecha_inicio=2024-01-01&fecha_fin=2024-01-31"
```

---

## Cálculo de Nómina

### Fórmula de Cálculo

Con los datos obtenidos de un trabajador, la nómina se calcula de la siguiente manera:

```javascript
// Datos del trabajador
const trabajador = {
  salario_fijo: 5000,
  porcentaje_fijo_estimulo: 10,
  porcentaje_variable_estimulo: 15,
  alimentacion: 500,
  dias_trabajables: 24,
  dias_no_trabajados: [5, 12, 19]  // 3 días
};

const ingreso_mensual_empresa = 150000;
const total_trabajadores = 11;

// 1. Calcular días efectivamente trabajados
const dias_trabajados = trabajador.dias_trabajables - trabajador.dias_no_trabajados.length;
// Resultado: 24 - 3 = 21 días

// 2. Calcular salario proporcional
const salario_proporcional = (trabajador.salario_fijo / trabajador.dias_trabajables) * dias_trabajados;
// Resultado: (5000 / 24) * 21 = 4375 CUP

// 3. Calcular estímulo fijo
const estimulo_fijo = salario_proporcional * (trabajador.porcentaje_fijo_estimulo / 100);
// Resultado: 4375 * 0.10 = 437.5 CUP

// 4. Calcular estímulo variable
const estimulo_variable = (ingreso_mensual_empresa * (trabajador.porcentaje_variable_estimulo / 100)) / total_trabajadores;
// Resultado: (150000 * 0.15) / 11 = 2045.45 CUP

// 5. Calcular total
const total_nomina = salario_proporcional + estimulo_fijo + estimulo_variable + trabajador.alimentacion;
// Resultado: 4375 + 437.5 + 2045.45 + 500 = 7357.95 CUP
```

---

## Validaciones y Reglas de Negocio

### Validaciones de CI
- Debe ser única en el sistema
- Debe contener solo números y guiones
- No puede estar vacía

### Validaciones de Nombre
- No puede estar vacío
- Debe tener al menos 3 caracteres

### Validaciones de RRHH
- `salario_fijo`: Debe ser >= 0
- `porcentaje_fijo_estimulo`: Debe estar entre 0 y 100
- `porcentaje_variable_estimulo`: Debe estar entre 0 y 100
- `alimentacion`: Debe ser >= 0
- `dias_trabajables`: Debe estar entre 1 y 31
- `dias_no_trabajados`: Cada elemento debe estar entre 1 y 31

### Reglas de Negocio
1. Un trabajador debe tener CI y nombre obligatoriamente
2. Los jefes de brigada deben tener contraseña
3. Los días no trabajados no pueden exceder los días trabajables
4. El campo `tiene_contraseña` se calcula automáticamente
5. Los trabajadores eliminados se remueven permanentemente de la base de datos
6. Al eliminar la contraseña de un jefe de brigada, se debe considerar el impacto en su brigada

---

## Base de Datos

### Colección: `trabajadores`

**Índices**:
- `CI`: único
- `nombre`: búsqueda de texto

**Vista relacionada**: `trabajadores_con_ingreso`
- Combina datos de trabajadores con el último ingreso mensual de la empresa
- Utilizada para cálculos de nómina

---

## Integración con Otros Módulos

### Brigadas
- Los trabajadores pueden ser líderes o integrantes de brigadas
- Ver [Documentación de Brigadas](./brigadas_api.md)

### Reportes
- Las horas trabajadas se calculan desde los reportes de actividades
- Ver [Documentación de Reportes](./reportes_clientes_api.md)

### Ingreso Mensual
- El ingreso mensual de la empresa se usa para calcular estímulos variables
- Ver [Documentación de Recursos Humanos](./recursos_humanos_api.md)

---

## Notas Importantes

1. **Autenticación**: Todos los endpoints requieren autenticación mediante Bearer Token
2. **Permisos**: Algunos endpoints pueden requerir permisos de administrador o RRHH
3. **Contraseñas**: Las contraseñas se almacenan en texto plano (considerar implementar hashing)
4. **Soft Delete**: Actualmente no existe soft delete, las eliminaciones son permanentes
5. **Auditoría**: No hay tracking de cambios en los datos de trabajadores

---

## Soporte y Contacto

Para más información, consultar la documentación del proyecto o contactar al equipo de desarrollo de SunCar Backend.

**Última actualización**: Octubre 2025

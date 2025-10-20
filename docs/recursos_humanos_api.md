# API de Recursos Humanos - Documentación

Esta documentación describe los endpoints relacionados con la gestión de recursos humanos en el sistema SunCar Backend.

## Tabla de Contenidos

1. [Obtener Datos de Recursos Humanos](#obtener-datos-de-recursos-humanos)
2. [Actualizar Datos de RRHH de un Trabajador](#actualizar-datos-de-rrhh-de-un-trabajador)
3. [Gestión de Ingreso Mensual](#gestión-de-ingreso-mensual)
   - [Listar Todos los Ingresos](#listar-todos-los-ingresos)
   - [Obtener Último Ingreso](#obtener-último-ingreso)
   - [Obtener Ingreso por ID](#obtener-ingreso-por-id)
   - [Crear Ingreso Mensual](#crear-ingreso-mensual)
   - [Actualizar Ingreso Mensual](#actualizar-ingreso-mensual)
   - [Eliminar Ingreso Mensual](#eliminar-ingreso-mensual)

---

## Obtener Datos de Recursos Humanos

Obtiene la información consolidada de recursos humanos, incluyendo todos los trabajadores con sus datos de nómina y el último ingreso mensual de la empresa.

### Endpoint

```
GET /api/recursos-humanos/
```

### Headers

```
Authorization: Bearer <token>
```

### Response

**Status Code:** `200 OK`

```json
{
  "trabajadores": [
    {
      "CI": "02091968281",
      "nombre": "Genier Marquéz del Toro",
      "cargo": "Técnico",
      "salario_fijo": 5000,
      "porcentaje_fijo_estimulo": 10,
      "porcentaje_variable_estimulo": 15,
      "alimentacion": 500,
      "dias_trabajables": 26,
      "dias_no_trabajados": [5, 12, 19]
    },
    {
      "CI": "03081460604",
      "nombre": "Ashley Alvarez Villiers",
      "cargo": "Administrativo",
      "salario_fijo": 4500,
      "porcentaje_fijo_estimulo": 10,
      "porcentaje_variable_estimulo": 10,
      "alimentacion": 500,
      "dias_trabajables": 26,
      "dias_no_trabajados": []
    }
  ],
  "ultimo_ingreso_mensual": {
    "id": "68f12694844aabfb6353f91b",
    "mes": 10,
    "anio": 2025,
    "monto": 150000.00,
    "moneda": "CUP"
  }
}
```

### Descripción de Campos

#### Trabajadores

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `CI` | string | Cédula de identidad del trabajador |
| `nombre` | string | Nombre completo del trabajador |
| `cargo` | string | Cargo o posición del trabajador |
| `salario_fijo` | integer | Salario base mensual en CUP |
| `porcentaje_fijo_estimulo` | integer | Porcentaje fijo de estímulo sobre el salario |
| `porcentaje_variable_estimulo` | integer | Porcentaje variable de estímulo según desempeño |
| `alimentacion` | integer | Monto asignado para alimentación |
| `dias_trabajables` | integer | Total de días trabajables en el mes |
| `dias_no_trabajados` | array[integer] | Array con los días del mes que no trabajó (1-31) |

#### Último Ingreso Mensual

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | ID único del registro |
| `mes` | integer | Mes del ingreso (1-12) |
| `anio` | integer | Año del ingreso |
| `monto` | float | Monto total del ingreso mensual |
| `moneda` | string | Moneda del ingreso (CUP, USD, EUR) |

### Casos de Uso

- Generar reportes de nómina mensual
- Calcular costos de personal
- Visualizar datos consolidados de RRHH
- Planificar presupuestos basados en ingresos y gastos de personal

---

## Actualizar Datos de RRHH de un Trabajador

Actualiza los datos de recursos humanos de un trabajador específico. Todos los campos son opcionales, solo se actualizarán los campos enviados.

### Endpoint

```
PUT /api/trabajadores/{ci}/rrhh
```

### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `ci` | string | Cédula de identidad del trabajador |

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

### Request Body

```json
{
  "cargo": "Jefe de Brigada",
  "salario_fijo": 6000,
  "porcentaje_fijo_estimulo": 15,
  "porcentaje_variable_estimulo": 20,
  "alimentacion": 600,
  "dias_trabajables": 26,
  "dias_no_trabajados": [1, 8, 15, 22, 29]
}
```

### Descripción de Campos (Todos Opcionales)

| Campo | Tipo | Rango/Formato | Descripción |
|-------|------|---------------|-------------|
| `cargo` | string | - | Cargo del trabajador |
| `salario_fijo` | integer | >= 0 | Salario base mensual |
| `porcentaje_fijo_estimulo` | integer | 0-100 | Porcentaje fijo de estímulo |
| `porcentaje_variable_estimulo` | integer | 0-100 | Porcentaje variable de estímulo |
| `alimentacion` | integer | >= 0 | Monto de alimentación |
| `dias_trabajables` | integer | 1-31 | Días trabajables en el mes |
| `dias_no_trabajados` | array[integer] | 1-31 | Días del mes no trabajados |

### Response

**Status Code:** `200 OK`

```json
{
  "success": true,
  "message": "Datos de RRHH actualizados para el trabajador con CI 02091968281."
}
```

### Errores

#### Trabajador no encontrado

**Status Code:** `404 Not Found`

```json
{
  "detail": "Trabajador con CI 02091968281 no encontrado o sin cambios."
}
```

#### Error del servidor

**Status Code:** `500 Internal Server Error`

```json
{
  "detail": "Error message"
}
```

### Ejemplo de Uso

#### Actualizar solo el cargo y salario

```bash
curl -X PUT "https://api.suncar.com/api/trabajadores/02091968281/rrhh" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cargo": "Supervisor",
    "salario_fijo": 7000
  }'
```

#### Actualizar días no trabajados

```bash
curl -X PUT "https://api.suncar.com/api/trabajadores/02091968281/rrhh" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "dias_no_trabajados": [3, 10, 17, 24, 31]
  }'
```

---

## Gestión de Ingreso Mensual

Los siguientes endpoints permiten gestionar los ingresos mensuales de la empresa.

### Listar Todos los Ingresos

Obtiene todos los ingresos mensuales registrados, ordenados por fecha de creación (más reciente primero).

#### Endpoint

```
GET /api/ingreso-mensual/
```

#### Headers

```
Authorization: Bearer <token>
```

#### Response

**Status Code:** `200 OK`

```json
[
  {
    "id": "68f12694844aabfb6353f91c",
    "mes": 11,
    "anio": 2025,
    "monto": 180000.00,
    "moneda": "CUP"
  },
  {
    "id": "68f12694844aabfb6353f91b",
    "mes": 10,
    "anio": 2025,
    "monto": 150000.00,
    "moneda": "CUP"
  }
]
```

---

### Obtener Último Ingreso

Obtiene el ingreso mensual más reciente registrado (por fecha de creación).

#### Endpoint

```
GET /api/ingreso-mensual/latest
```

#### Headers

```
Authorization: Bearer <token>
```

#### Response

**Status Code:** `200 OK`

```json
{
  "id": "68f12694844aabfb6353f91c",
  "mes": 11,
  "anio": 2025,
  "monto": 180000.00,
  "moneda": "CUP"
}
```

**Nota:** Si no hay ingresos registrados, devuelve `null`.

---

### Obtener Ingreso por ID

Obtiene un ingreso mensual específico por su ID.

#### Endpoint

```
GET /api/ingreso-mensual/{ingreso_id}
```

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `ingreso_id` | string | ID del ingreso mensual |

#### Headers

```
Authorization: Bearer <token>
```

#### Response

**Status Code:** `200 OK`

```json
{
  "id": "68f12694844aabfb6353f91b",
  "mes": 10,
  "anio": 2025,
  "monto": 150000.00,
  "moneda": "CUP"
}
```

#### Errores

**Status Code:** `404 Not Found`

```json
{
  "detail": "Ingreso mensual no encontrado"
}
```

---

### Crear Ingreso Mensual

Crea un nuevo registro de ingreso mensual.

#### Endpoint

```
POST /api/ingreso-mensual/
```

#### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request Body

```json
{
  "mes": 11,
  "anio": 2025,
  "monto": 180000.00,
  "moneda": "CUP"
}
```

#### Campos del Request

| Campo | Tipo | Requerido | Rango | Descripción |
|-------|------|-----------|-------|-------------|
| `mes` | integer | Sí | 1-12 | Mes del ingreso |
| `anio` | integer | Sí | >= 2000 | Año del ingreso |
| `monto` | float | Sí | >= 0 | Monto del ingreso |
| `moneda` | string | No (default: "CUP") | CUP, USD, EUR | Moneda del ingreso |

#### Response

**Status Code:** `200 OK`

```json
{
  "message": "Ingreso mensual creado exitosamente",
  "id": "68f12694844aabfb6353f91c"
}
```

#### Ejemplo

```bash
curl -X POST "https://api.suncar.com/api/ingreso-mensual/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mes": 11,
    "anio": 2025,
    "monto": 180000.00,
    "moneda": "CUP"
  }'
```

---

### Actualizar Ingreso Mensual

Actualiza un ingreso mensual existente. Todos los campos son opcionales.

#### Endpoint

```
PUT /api/ingreso-mensual/{ingreso_id}
```

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `ingreso_id` | string | ID del ingreso mensual a actualizar |

#### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Request Body

```json
{
  "mes": 11,
  "anio": 2025,
  "monto": 200000.00,
  "moneda": "USD"
}
```

#### Campos del Request (Todos Opcionales)

| Campo | Tipo | Rango | Descripción |
|-------|------|-------|-------------|
| `mes` | integer | 1-12 | Nuevo mes |
| `anio` | integer | >= 2000 | Nuevo año |
| `monto` | float | >= 0 | Nuevo monto |
| `moneda` | string | CUP, USD, EUR | Nueva moneda |

#### Response

**Status Code:** `200 OK`

```json
{
  "message": "Ingreso mensual actualizado exitosamente"
}
```

#### Errores

**Status Code:** `404 Not Found`

```json
{
  "detail": "Ingreso mensual no encontrado o sin cambios"
}
```

#### Ejemplo

```bash
curl -X PUT "https://api.suncar.com/api/ingreso-mensual/68f12694844aabfb6353f91c" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "monto": 200000.00
  }'
```

---

### Eliminar Ingreso Mensual

Elimina un ingreso mensual del sistema.

#### Endpoint

```
DELETE /api/ingreso-mensual/{ingreso_id}
```

#### Path Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `ingreso_id` | string | ID del ingreso mensual a eliminar |

#### Headers

```
Authorization: Bearer <token>
```

#### Response

**Status Code:** `200 OK`

```json
{
  "message": "Ingreso mensual eliminado exitosamente"
}
```

#### Errores

**Status Code:** `404 Not Found`

```json
{
  "detail": "Ingreso mensual no encontrado"
}
```

#### Ejemplo

```bash
curl -X DELETE "https://api.suncar.com/api/ingreso-mensual/68f12694844aabfb6353f91c" \
  -H "Authorization: Bearer <token>"
```

---

## Modelos de Datos

### Trabajador RRHH

```typescript
interface TrabajadorRRHH {
  CI: string;                      // Cédula de identidad
  nombre: string;                  // Nombre completo
  cargo: string;                   // Cargo o posición
  salario_fijo: number;            // Salario base mensual
  porcentaje_fijo_estimulo: number;        // % fijo de estímulo
  porcentaje_variable_estimulo: number;    // % variable de estímulo
  alimentacion: number;            // Monto de alimentación
  dias_trabajables: number;        // Días trabajables del mes
  dias_no_trabajados: number[];    // Array de días no trabajados
}
```

### Ingreso Mensual

```typescript
interface IngresoMensual {
  id: string;           // ID único
  mes: number;          // Mes (1-12)
  anio: number;         // Año (>= 2000)
  monto: number;        // Monto del ingreso (>= 0)
  moneda: string;       // Moneda: "CUP" | "USD" | "EUR"
}
```

---

## Flujo de Trabajo Recomendado

### Configuración Inicial de un Trabajador

1. Crear el trabajador (usando endpoints de trabajadores)
2. Actualizar sus datos de RRHH:
   ```
   PUT /api/trabajadores/{ci}/rrhh
   ```

### Gestión Mensual

1. Crear ingreso mensual al inicio del mes:
   ```
   POST /api/ingreso-mensual/
   ```

2. Actualizar días trabajables de cada trabajador:
   ```
   PUT /api/trabajadores/{ci}/rrhh
   {
     "dias_trabajables": 26
   }
   ```

3. Registrar ausencias (días no trabajados):
   ```
   PUT /api/trabajadores/{ci}/rrhh
   {
     "dias_no_trabajados": [5, 12, 19]
   }
   ```

4. Obtener resumen de RRHH para cálculos de nómina:
   ```
   GET /api/recursos-humanos/
   ```

### Cálculo de Nómina

Con los datos obtenidos de `/api/recursos-humanos/`, se puede calcular:

```javascript
// Ejemplo de cálculo
const trabajador = {
  salario_fijo: 5000,
  porcentaje_fijo_estimulo: 10,
  porcentaje_variable_estimulo: 15,
  alimentacion: 500,
  dias_trabajables: 26,
  dias_no_trabajados: [5, 12, 19] // 3 días
};

const ingreso_mensual = 150000;

// Días efectivamente trabajados
const dias_trabajados = trabajador.dias_trabajables - trabajador.dias_no_trabajados.length;

// Salario proporcional
const salario_proporcional = (trabajador.salario_fijo / trabajador.dias_trabajables) * dias_trabajados;

// Estímulos
const estimulo_fijo = salario_proporcional * (trabajador.porcentaje_fijo_estimulo / 100);
const estimulo_variable = (ingreso_mensual * (trabajador.porcentaje_variable_estimulo / 100)) / total_trabajadores;

// Total
const total = salario_proporcional + estimulo_fijo + estimulo_variable + trabajador.alimentacion;
```

---

## Notas Importantes

1. **Autenticación**: Todos los endpoints requieren autenticación mediante Bearer Token.

2. **Permisos**: Asegúrate de que el usuario tenga permisos de RRHH para acceder a estos endpoints.

3. **Validación**:
   - Los meses deben estar entre 1-12
   - Los años deben ser >= 2000
   - Los montos deben ser >= 0
   - Los días no trabajados deben estar entre 1-31

4. **Monedas Soportadas**: CUP (Peso Cubano), USD (Dólar), EUR (Euro)

5. **Días No Trabajados**: Es un array que contiene los números de los días del mes (1-31) en los que el trabajador no asistió.

6. **Ingreso Mensual**: Representa el ingreso total de la empresa para ese mes, usado para calcular estímulos variables.

---

## Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Operación exitosa |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

---

## Soporte

Para más información o soporte, contactar al equipo de desarrollo de SunCar Backend.

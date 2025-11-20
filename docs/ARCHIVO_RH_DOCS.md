# Documentación: Archivo de Nóminas (Recursos Humanos)

## 📋 Resumen

Sistema para guardar el historial mensual de nóminas de RH. Las nóminas son **inmutables** (no se pueden editar ni eliminar una vez guardadas).

Las nóminas están **vinculadas a ingresos mensuales** existentes. Cuando se crea una nómina, automáticamente se crea el siguiente ingreso mensual con monto 0.

---

## 🔗 Endpoints Nuevos

### Base URL: `/api/archivo-rh`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/archivo-rh` | Obtener historial completo |
| GET | `/api/archivo-rh/ultima` | Obtener última nómina |
| GET | `/api/archivo-rh/{mes}/{anio}` | Obtener nómina específica |
| GET | `/api/archivo-rh/anio/{anio}` | Nóminas de un año |
| POST | `/api/archivo-rh` | Crear nueva nómina |

---

## 🔄 Flujo Típico de Uso

### 1. Obtener datos actuales de trabajadores e ingresos

**Obtener trabajadores actuales:**
```http
GET /api/recursos-humanos
```

**Response:**
```json
{
  "trabajadores": [
    {
      "CI": "12345678901",
      "nombre": "Juan Pérez",
      "cargo": "Ingeniero",
      "salario_fijo": 5000,
      "porcentaje_fijo_estimulo": 10.0,
      "porcentaje_variable_estimulo": 5.0,
      "alimentacion": 500,
      "dias_trabajables": 22,
      "dias_no_trabajados": [1, 15]  // Array de días
    }
  ],
  "ultimo_ingreso_mensual": {
    "id": "67890abcdef1234567890123",
    "mes": 1,
    "anio": 2025,
    "monto": 150000.0,
    "moneda": "CUP"
  }
}
```

**Obtener lista de ingresos mensuales disponibles:**
```http
GET /api/ingreso-mensual/
```

**Response:**
```json
[
  {
    "id": "67890abcdef1234567890123",
    "mes": 1,
    "anio": 2025,
    "monto": 150000.0,
    "moneda": "CUP"
  },
  {
    "id": "56789abcdef1234567890122",
    "mes": 12,
    "anio": 2024,
    "monto": 140000.0,
    "moneda": "CUP"
  }
]
```

**Nota:** Los ingresos están ordenados por año y mes de forma descendente (más recientes primero). Este endpoint es crucial para que el frontend muestre un selector con los periodos disponibles para crear nóminas.

### 2. Calcular salarios en el frontend

Para cada trabajador:
```javascript
const diasEfectivos = trabajador.dias_trabajables - trabajador.dias_no_trabajados.length;
const salarioProporcional = trabajador.salario_fijo * (diasEfectivos / trabajador.dias_trabajables);
const estimuloFijo = salarioProporcional * (trabajador.porcentaje_fijo_estimulo / 100);
const estimuloVariable = salarioProporcional * (trabajador.porcentaje_variable_estimulo / 100);
const alimentacionProporcional = trabajador.alimentacion * (diasEfectivos / trabajador.dias_trabajables);
const salarioCalculado = salarioProporcional + estimuloFijo + estimuloVariable + alimentacionProporcional;
```

### 3. Guardar la nómina

```http
POST /api/archivo-rh
Content-Type: application/json
```

**Request Body:**
```json
{
  "ingreso_mensual_id": "67890abcdef1234567890123",
  "total_salario_fijo": 120000.0,        // Suma de todos los salarios_fijos
  "total_alimentacion": 15000.0,         // Suma de todas las alimentaciones
  "total_salario_calculado": 135000.0,   // Suma de todos los salarios_calculados
  "resetear_trabajadores": true,         // Opcional, por defecto true
  "crear_siguiente_ingreso": true,       // Opcional, por defecto true
  "trabajadores": [
    {
      "CI": "12345678901",
      "nombre": "Juan Pérez",
      "cargo": "Ingeniero",
      "porcentaje_fijo_estimulo": 10.0,
      "porcentaje_variable_estimulo": 5.0,
      "salario_fijo": 5000,
      "alimentacion": 500,
      "dias_trabajables": 22,
      "dias_no_trabajados": 2,           // CANTIDAD (no array)
      "salario_calculado": 5250.5        // Calculado en frontend
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "ingreso_mensual_id": "67890abcdef1234567890123",
  "mes": 1,
  "anio": 2025,
  "siguiente_ingreso_id": "78901abcdef1234567890124",
  "message": "Nómina creada exitosamente para 1/2025"
}
```

---

## 🔗 Integración con Ingresos Mensuales

### Flujo de Creación Automática

Cuando se crea una nómina con `crear_siguiente_ingreso: true` (por defecto):

1. Se guarda la nómina vinculada al `ingreso_mensual_id` proporcionado
2. El backend **automáticamente** calcula el siguiente mes/año:
   - Si mes actual es 12: siguiente es 1/(año+1)
   - Si mes actual es 1-11: siguiente es (mes+1)/año
3. Si no existe un ingreso para ese periodo, **lo crea automáticamente con monto 0**
4. Si ya existe, devuelve el ID del existente
5. El `siguiente_ingreso_id` se devuelve en la respuesta

### Validaciones del Ingreso Mensual

- ❌ El `ingreso_mensual_id` debe existir
- ❌ No se puede crear nómina duplicada para el mismo `ingreso_mensual_id`
- ❌ No se puede crear nómina duplicada para el mismo mes/año

---

## ⚠️ Diferencias Importantes

### Endpoint actual vs Nómina archivada

| Campo | `/api/recursos-humanos` | `/api/archivo-rh` (POST) |
|-------|------------------------|--------------------------|
| `dias_no_trabajados` | **Array** `[1, 15]` | **Number** `2` (cantidad) |
| Datos | Actuales (mutable) | Snapshot (inmutable) |
| Identificador | - | `ingreso_mensual_id` |

**Conversión necesaria:**
```javascript
// De RH actual a nómina
const trabajadorParaNomina = {
  ...trabajadorActual,
  dias_no_trabajados: trabajadorActual.dias_no_trabajados.length  // Array → Number
};
```

---

## 🔐 Comportamiento Automático

### Al guardar una nómina (`resetear_trabajadores: true`)

El backend **automáticamente** resetea en TODOS los trabajadores actuales:
- `dias_no_trabajados` → `[]`
- `porcentaje_variable_estimulo` → `0`

Esto prepara los datos para el siguiente mes.

### Al guardar una nómina (`crear_siguiente_ingreso: true`)

El backend **automáticamente**:
- Calcula el siguiente mes/año
- Verifica si existe un ingreso para ese periodo
- Si no existe, lo crea con `monto: 0` y `moneda: "CUP"`
- Devuelve el `siguiente_ingreso_id` en la respuesta

### Validaciones

- ❌ No se puede crear nómina duplicada (mismo ingreso_mensual_id)
- ❌ No se puede crear nómina duplicada (mismo mes/año)
- ❌ El ingreso_mensual_id debe existir
- ❌ No se puede editar nómina guardada
- ❌ No se puede eliminar nómina guardada

---

## 📊 Ejemplos de Consultas

### Ver historial completo
```http
GET /api/archivo-rh
```

**Response:**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "ingreso_mensual_id": "67890abcdef1234567890123",
    "mes": 1,
    "anio": 2025,
    "ingreso_mensual_monto": 150000.0,
    "total_salario_fijo": 120000.0,
    "total_alimentacion": 15000.0,
    "total_salario_calculado": 135000.0,
    "trabajadores": [...],
    "fecha_creacion": "2025-01-31T15:45:00"
  }
]
```

### Ver última nómina guardada
```http
GET /api/archivo-rh/ultima
```

### Ver nómina de enero 2025
```http
GET /api/archivo-rh/1/2025
```

### Ver todas las nóminas de 2025
```http
GET /api/archivo-rh/anio/2025
```

---

## 🔄 Integración con Endpoints Existentes

### Endpoints de Ingreso Mensual (Disponibles)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/ingreso-mensual/` | Obtener todos los ingresos (ordenados desc) |
| GET | `/api/ingreso-mensual/latest` | Obtener el último ingreso registrado |
| GET | `/api/ingreso-mensual/search?mes={mes}&anio={anio}` | Buscar ingreso por mes y año |
| GET | `/api/ingreso-mensual/{ingreso_id}` | Obtener ingreso por ID |
| POST | `/api/ingreso-mensual/` | Crear nuevo ingreso mensual |
| PUT | `/api/ingreso-mensual/{ingreso_id}` | Actualizar ingreso existente |
| DELETE | `/api/ingreso-mensual/{ingreso_id}` | Eliminar ingreso mensual |

**Ejemplo de uso para obtener ingresos disponibles:**
```http
GET /api/ingreso-mensual/
```

**Response:**
```json
[
  {
    "id": "67890abcdef1234567890123",
    "mes": 1,
    "anio": 2025,
    "monto": 150000.0,
    "moneda": "CUP"
  }
]
```

### Otros Endpoints Relacionados

| Endpoint | Uso |
|----------|-----|
| `GET /api/recursos-humanos` | Obtener datos actuales de trabajadores |
| `GET /api/recursos-humanos/estadisticas-por-cargo` | Estadísticas actuales por cargo |
| `PUT /api/trabajadores/{CI}` | Actualizar datos de trabajador |

### Flujo Completo Recomendado

1. **Usuario abre pantalla de nómina**
2. **Frontend obtiene ingresos mensuales disponibles:**
   - `GET /api/ingreso-mensual/` → Devuelve lista completa ordenada (más recientes primero)
   - El último ingreso de la lista es típicamente el periodo actual disponible
3. **Frontend obtiene datos actuales de trabajadores:**
   - `GET /api/recursos-humanos` → Devuelve todos los trabajadores con sus datos actuales
4. **Frontend muestra selector de periodos:**
   - Selector dropdown con formato: `Enero 2025 - $150,000 CUP`
   - Los periodos que ya tienen nómina guardada pueden mostrarse deshabilitados
5. **Usuario selecciona el ingreso mensual para crear la nómina**
6. **Usuario revisa/edita datos y frontend calcula salarios automáticamente**
7. **Frontend envía la nómina:**
   - `POST /api/archivo-rh` con el `ingreso_mensual_id` seleccionado
8. **Backend ejecuta automáticamente:**
   - ✓ Verifica que el ingreso exista (404 si no existe)
   - ✓ Verifica que no haya nómina duplicada (409 si ya existe)
   - ✓ Guarda la nómina inmutable
   - ✓ Crea automáticamente el siguiente ingreso mensual con monto 0
   - ✓ Resetea `dias_no_trabajados` y `porcentaje_variable_estimulo` en todos los trabajadores
9. **Frontend recibe respuesta con:**
   - `id`: ID de la nómina creada
   - `siguiente_ingreso_id`: ID del siguiente ingreso auto-creado
   - `mes`, `anio`: Periodo de la nómina
10. **Frontend muestra confirmación** y actualiza la interfaz

---

## 💡 Notas Adicionales

- **Ordenamiento**: Las nóminas se devuelven más recientes primero (desc por año y mes)
- **Fecha de creación**: Cada nómina guarda un timestamp `fecha_creacion` automáticamente
- **Colección MongoDB**: Se crea automáticamente como `archivo_rh`
- **Autenticación**: Los endpoints requieren JWT (excepto si se configuran como públicos)
- **Denormalización**: La nómina guarda `mes`, `anio` e `ingreso_mensual_monto` denormalizados para queries rápidas, aunque tiene `ingreso_mensual_id`
- **Ciclo automático**: Cada nómina creada prepara automáticamente el sistema para el siguiente mes

---

## 🐛 Errores Comunes

### 404 Not Found - Ingreso Mensual
```json
{
  "detail": "No existe un ingreso mensual con ID: 67890abcdef1234567890123"
}
```
**Solución**: Verificar que el `ingreso_mensual_id` proporcionado existe. Llamar a `GET /api/ingreso-mensual` para ver los IDs disponibles.

### 409 Conflict - Nómina Duplicada
```json
{
  "detail": "Ya existe una nómina registrada para 1/2025"
}
```
**Solución**: No se pueden crear nóminas duplicadas. Verificar si ya existe una nómina para ese ingreso mensual con `GET /api/archivo-rh/{mes}/{anio}`.

### 422 Validation Error
Campos requeridos faltantes o tipos incorrectos. Revisar el schema del request.

**Campos obligatorios en POST:**
- `ingreso_mensual_id` (string)
- `total_salario_fijo` (float)
- `total_alimentacion` (float)
- `total_salario_calculado` (float)
- `trabajadores` (array de objetos)

---

## 🎯 Ejemplo de Implementación Frontend

```javascript
// Helper para convertir número de mes a nombre
function getNombreMes(mes) {
  const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return meses[mes];
}

// 1. Obtener todos los ingresos mensuales disponibles (ordenados desc)
const ingresos = await fetch('/api/ingreso-mensual/').then(r => r.json());

// 2. Obtener trabajadores actuales
const rhData = await fetch('/api/recursos-humanos').then(r => r.json());

// 3. Verificar qué ingresos ya tienen nómina guardada (opcional)
const nominasExistentes = await fetch('/api/archivo-rh').then(r => r.json());
const ingresosConNomina = new Set(nominasExistentes.map(n => n.ingreso_mensual_id));

// 4. Mostrar selector con ingresos disponibles
// Los ingresos que ya tienen nómina pueden mostrarse deshabilitados
const ingresosDisponibles = ingresos.map(ing => ({
  ...ing,
  tiene_nomina: ingresosConNomina.has(ing.id),
  label: `${getNombreMes(ing.mes)} ${ing.anio} - $${ing.monto.toLocaleString()} ${ing.moneda}`
}));

// 5. Usuario selecciona un ingreso
const ingresoSeleccionado = ingresos[0]; // Por ejemplo, el más reciente

// 6. Calcular salarios
const trabajadoresConSalario = rhData.trabajadores.map(t => {
  const diasEfectivos = t.dias_trabajables - t.dias_no_trabajados.length;
  const salarioProporcional = t.salario_fijo * (diasEfectivos / t.dias_trabajables);
  const estimuloFijo = salarioProporcional * (t.porcentaje_fijo_estimulo / 100);
  const estimuloVariable = salarioProporcional * (t.porcentaje_variable_estimulo / 100);
  const alimentacionProporcional = t.alimentacion * (diasEfectivos / t.dias_trabajables);

  return {
    CI: t.CI,
    nombre: t.nombre,
    cargo: t.cargo,
    porcentaje_fijo_estimulo: t.porcentaje_fijo_estimulo,
    porcentaje_variable_estimulo: t.porcentaje_variable_estimulo,
    salario_fijo: t.salario_fijo,
    alimentacion: t.alimentacion,
    dias_trabajables: t.dias_trabajables,
    dias_no_trabajados: t.dias_no_trabajados.length, // Array → Number
    salario_calculado: salarioProporcional + estimuloFijo + estimuloVariable + alimentacionProporcional
  };
});

// 7. Calcular totales
const totales = trabajadoresConSalario.reduce((acc, t) => ({
  total_salario_fijo: acc.total_salario_fijo + t.salario_fijo,
  total_alimentacion: acc.total_alimentacion + t.alimentacion,
  total_salario_calculado: acc.total_salario_calculado + t.salario_calculado
}), { total_salario_fijo: 0, total_alimentacion: 0, total_salario_calculado: 0 });

// 8. Crear nómina
const response = await fetch('/api/archivo-rh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ingreso_mensual_id: ingresoSeleccionado.id,
    ...totales,
    trabajadores: trabajadoresConSalario,
    resetear_trabajadores: true,
    crear_siguiente_ingreso: true
  })
});

const result = await response.json();
console.log('Nómina creada:', result.id);
console.log('Siguiente ingreso creado:', result.siguiente_ingreso_id);
console.log('Periodo:', `${result.mes}/${result.anio}`);

// 9. Actualizar interfaz
// - Mostrar mensaje de éxito
// - Refrescar lista de nóminas
// - Opcionalmente, redirigir a vista del siguiente periodo usando result.siguiente_ingreso_id
```

---

## 📌 Consejos de Implementación

### Prevenir Duplicados en el Frontend

Para evitar que el usuario intente crear una nómina duplicada:

```javascript
// Al cargar la pantalla, obtener tanto ingresos como nóminas existentes
const [ingresos, nominas] = await Promise.all([
  fetch('/api/ingreso-mensual/').then(r => r.json()),
  fetch('/api/archivo-rh').then(r => r.json())
]);

// Crear un Set con los IDs de ingresos que ya tienen nómina
const ingresosConNomina = new Set(nominas.map(n => n.ingreso_mensual_id));

// Filtrar o deshabilitar ingresos que ya tienen nómina
const ingresosDisponibles = ingresos.filter(ing => !ingresosConNomina.has(ing.id));

// O mostrar todos pero marcar los que ya tienen nómina
const ingresosConEstado = ingresos.map(ing => ({
  ...ing,
  tiene_nomina: ingresosConNomina.has(ing.id),
  disabled: ingresosConNomina.has(ing.id)
}));
```

### Validación Antes de Enviar

```javascript
// Validar antes de enviar
if (trabajadoresConSalario.length === 0) {
  alert('Debe haber al menos un trabajador en la nómina');
  return;
}

if (totales.total_salario_calculado <= 0) {
  alert('El total calculado debe ser mayor a 0');
  return;
}

if (!ingresoSeleccionado?.id) {
  alert('Debe seleccionar un periodo (ingreso mensual)');
  return;
}
```

### Manejo de Errores

```javascript
try {
  const response = await fetch('/api/archivo-rh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nominaData)
  });

  if (!response.ok) {
    const error = await response.json();

    if (response.status === 404) {
      alert(`Error: ${error.detail}`); // Ingreso no encontrado
    } else if (response.status === 409) {
      alert('Ya existe una nómina para este periodo'); // Duplicado
    } else if (response.status === 422) {
      alert('Datos inválidos. Revisa los campos requeridos');
    } else {
      alert('Error al crear nómina');
    }
    return;
  }

  const result = await response.json();
  alert(`Nómina creada exitosamente para ${result.mes}/${result.anio}`);
  // Actualizar interfaz...

} catch (error) {
  console.error('Error de conexión:', error);
  alert('Error de conexión con el servidor');
}
```

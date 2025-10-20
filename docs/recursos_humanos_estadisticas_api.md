# API de Estadísticas por Cargo - Recursos Humanos

## Endpoint: Obtener Estadísticas por Cargo

### Request

```
GET /api/recursos-humanos/estadisticas-por-cargo
```

**Headers requeridos:**
```
Content-Type: application/json
```

**Parámetros:** Ninguno

---

## Response

### Status Code: `200 OK`

### Response Body

```json
{
  "cargos": [
    {
      "cargo": "string",
      "porcentaje_fijo_estimulo": 0.0,
      "porcentaje_variable_estimulo": 0.0,
      "salario_fijo": 0,
      "cantidad_personas": 0
    }
  ]
}
```

### Descripción de Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cargo` | `string` | Nombre del cargo o puesto de trabajo |
| `porcentaje_fijo_estimulo` | `float` | Porcentaje de estímulo fijo asignado al cargo (valores entre 0.0 y 100.0) |
| `porcentaje_variable_estimulo` | `float` | Porcentaje de estímulo variable asignado al cargo (valores entre 0.0 y 100.0) |
| `salario_fijo` | `integer` | Salario base mensual del cargo en la moneda local |
| `cantidad_personas` | `integer` | Número total de trabajadores que ocupan este cargo |

---

## Ejemplo de Uso

### Ejemplo de Request

```bash
curl -X GET "https://api.suncar.com/api/recursos-humanos/estadisticas-por-cargo" \
  -H "Content-Type: application/json"
```

### Ejemplo de Response

```json
{
  "cargos": [
    {
      "cargo": "Técnico de Mantenimiento",
      "porcentaje_fijo_estimulo": 15.5,
      "porcentaje_variable_estimulo": 10.0,
      "salario_fijo": 3500,
      "cantidad_personas": 12
    },
    {
      "cargo": "Supervisor",
      "porcentaje_fijo_estimulo": 20.0,
      "porcentaje_variable_estimulo": 15.0,
      "salario_fijo": 4500,
      "cantidad_personas": 5
    },
    {
      "cargo": "Asistente Administrativo",
      "porcentaje_fijo_estimulo": 10.0,
      "porcentaje_variable_estimulo": 5.0,
      "salario_fijo": 2800,
      "cantidad_personas": 3
    },
    {
      "cargo": "Gerente de Operaciones",
      "porcentaje_fijo_estimulo": 25.0,
      "porcentaje_variable_estimulo": 20.0,
      "salario_fijo": 6000,
      "cantidad_personas": 1
    }
  ]
}
```

---

## Comportamiento del Endpoint

### Ordenamiento
- Los cargos se devuelven **ordenados por cantidad de personas** (descendente)
- El cargo con más trabajadores aparecerá primero en la lista

### Agrupación
- El endpoint agrupa automáticamente a todos los trabajadores por su campo `cargo`
- Cuenta correctamente trabajadores con el mismo cargo
- Los valores de `porcentaje_fijo_estimulo`, `porcentaje_variable_estimulo` y `salario_fijo` son los asignados al cargo (toma el primer trabajador encontrado como referencia)

### Casos Especiales
- Si un trabajador no tiene cargo definido, se agrupa como `"no definido"`
- Los trabajadores sin datos de estímulo o salario tendrán valores en `0` o `0.0`

---

## Códigos de Error

| Status Code | Descripción |
|-------------|-------------|
| `500` | Error interno del servidor al obtener las estadísticas |

### Ejemplo de Error

```json
{
  "detail": "Error obteniendo estadísticas por cargo: [mensaje de error]"
}
```

---

## Caso de Uso

Este endpoint es útil para:

1. **Visualizar la distribución de cargos** en la empresa
2. **Analizar la estructura salarial** por cargo
3. **Generar reportes de recursos humanos** con estadísticas agregadas
4. **Comparar porcentajes de estímulo** entre diferentes cargos
5. **Identificar cargos con mayor cantidad de personal** para planificación

---

## Notas para el Frontend

### Manejo de Datos

```javascript
// Ejemplo de consumo con fetch
async function obtenerEstadisticasPorCargo() {
  try {
    const response = await fetch('https://api.suncar.com/api/recursos-humanos/estadisticas-por-cargo', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener estadísticas');
    }

    const data = await response.json();
    return data.cargos; // Array de estadísticas por cargo

  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Uso
const cargos = await obtenerEstadisticasPorCargo();
console.log(`Total de cargos diferentes: ${cargos.length}`);
console.log(`Cargo más común: ${cargos[0].cargo} con ${cargos[0].cantidad_personas} personas`);
```

### Visualización Recomendada

```javascript
// Ejemplo de visualización de los datos
function renderizarEstadisticas(cargos) {
  const totalTrabajadores = cargos.reduce((sum, cargo) => sum + cargo.cantidad_personas, 0);

  cargos.forEach(cargo => {
    const porcentajeDelTotal = ((cargo.cantidad_personas / totalTrabajadores) * 100).toFixed(1);

    console.log(`
      Cargo: ${cargo.cargo}
      Personas: ${cargo.cantidad_personas} (${porcentajeDelTotal}% del total)
      Salario base: $${cargo.salario_fijo}
      Estímulo fijo: ${cargo.porcentaje_fijo_estimulo}%
      Estímulo variable: ${cargo.porcentaje_variable_estimulo}%
      ───────────────────────────────────
    `);
  });
}
```

### Componente React (Ejemplo)

```jsx
import { useState, useEffect } from 'react';

function EstadisticasPorCargo() {
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/recursos-humanos/estadisticas-por-cargo');
        const data = await response.json();
        setCargos(data.cargos);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Cargando estadísticas...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="estadisticas-container">
      <h2>Estadísticas por Cargo</h2>
      <table>
        <thead>
          <tr>
            <th>Cargo</th>
            <th>Cantidad</th>
            <th>Salario Base</th>
            <th>Estímulo Fijo %</th>
            <th>Estímulo Variable %</th>
          </tr>
        </thead>
        <tbody>
          {cargos.map((cargo, index) => (
            <tr key={index}>
              <td>{cargo.cargo}</td>
              <td>{cargo.cantidad_personas}</td>
              <td>${cargo.salario_fijo}</td>
              <td>{cargo.porcentaje_fijo_estimulo}%</td>
              <td>{cargo.porcentaje_variable_estimulo}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EstadisticasPorCargo;
```

---

## Versión de la API
- **Base URL:** `/api/recursos-humanos`
- **Versión:** 1.0
- **Última actualización:** 2025-10-19

# API de Ingreso Mensual - Guía para Frontend

Esta documentación describe cómo consumir los endpoints de Ingreso Mensual desde un frontend.

## Base URL
```
/api/ingreso-mensual
```

---

## 📋 Endpoints Disponibles

### 1. Obtener todos los ingresos
**GET** `/api/ingreso-mensual/`

Obtiene todos los ingresos mensuales ordenados por año y mes (descendente).

#### Ejemplo de uso (JavaScript/Fetch):
```javascript
const obtenerTodosLosIngresos = async () => {
  try {
    const response = await fetch('/api/ingreso-mensual/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al obtener los ingresos');
    }
    
    const ingresos = await response.json();
    return ingresos;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

#### Respuesta exitosa (200):
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "mes": 12,
    "anio": 2024,
    "monto": 50000.0,
    "moneda": "CUP"
  },
  {
    "id": "507f1f77bcf86cd799439012",
    "mes": 11,
    "anio": 2024,
    "monto": 45000.0,
    "moneda": "CUP"
  }
]
```

---

### 2. Obtener el último ingreso registrado
**GET** `/api/ingreso-mensual/latest`

Obtiene el ingreso mensual más reciente.

#### Ejemplo de uso (JavaScript/Fetch):
```javascript
const obtenerUltimoIngreso = async () => {
  try {
    const response = await fetch('/api/ingreso-mensual/latest', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al obtener el último ingreso');
    }
    
    const ultimoIngreso = await response.json();
    return ultimoIngreso;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

#### Respuesta exitosa (200):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "mes": 12,
  "anio": 2024,
  "monto": 50000.0,
  "moneda": "CUP"
}
```

---

### 3. Obtener un ingreso por ID
**GET** `/api/ingreso-mensual/{ingreso_id}`

Obtiene un ingreso mensual específico por su ID.

#### Ejemplo de uso (JavaScript/Fetch):
```javascript
const obtenerIngresoPorId = async (ingresoId) => {
  try {
    const response = await fetch(`/api/ingreso-mensual/${ingresoId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Ingreso mensual no encontrado');
      }
      throw new Error('Error al obtener el ingreso');
    }
    
    const ingreso = await response.json();
    return ingreso;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

#### Respuesta exitosa (200):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "mes": 12,
  "anio": 2024,
  "monto": 50000.0,
  "moneda": "CUP"
}
```

#### Error (404):
```json
{
  "detail": "Ingreso mensual no encontrado"
}
```

---

### 4. Crear un nuevo ingreso mensual ✅
**POST** `/api/ingreso-mensual/`

Crea un nuevo ingreso mensual. **Validación importante**: No permite crear un ingreso si ya existe uno para el mismo mes y año.

#### Request Body:
```json
{
  "mes": 12,           // Requerido: 1-12
  "anio": 2024,        // Requerido: >= 2000
  "monto": 50000.0,    // Requerido: >= 0
  "moneda": "CUP"      // Opcional: por defecto "CUP"
}
```

#### Ejemplo de uso (JavaScript/Fetch):
```javascript
const crearIngreso = async (mes, anio, monto, moneda = 'CUP') => {
  try {
    const response = await fetch('/api/ingreso-mensual/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mes,
        anio,
        monto,
        moneda
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      // Error común: Ya existe un ingreso para ese mes/año
      throw new Error(error.detail || 'Error al crear el ingreso');
    }
    
    const resultado = await response.json();
    return resultado;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Uso:
crearIngreso(12, 2024, 50000.0, 'CUP')
  .then(resultado => console.log('Ingreso creado:', resultado))
  .catch(error => console.error('Error:', error.message));
```

#### Respuesta exitosa (200):
```json
{
  "message": "Ingreso mensual creado exitosamente",
  "id": "507f1f77bcf86cd799439011"
}
```

#### Error (400) - Ingreso duplicado:
```json
{
  "detail": "Error creando ingreso mensual: Ya existe un ingreso registrado para 12/2024"
}
```

#### Error (422) - Validación de datos:
```json
{
  "detail": [
    {
      "loc": ["body", "mes"],
      "msg": "ensure this value is greater than or equal to 1",
      "type": "value_error.number.not_ge"
    }
  ]
}
```

---

### 5. Actualizar un ingreso mensual existente ✅
**PUT** `/api/ingreso-mensual/{ingreso_id}`

Actualiza un ingreso mensual existente. **Validaciones importantes**:
- Verifica que el ingreso con el ID proporcionado exista
- Si se actualiza mes/año, verifica que no exista otro ingreso con esa fecha

#### Request Body (todos los campos son opcionales):
```json
{
  "mes": 11,           // Opcional: 1-12
  "anio": 2024,        // Opcional: >= 2000
  "monto": 48000.0,    // Opcional: >= 0
  "moneda": "USD"      // Opcional
}
```

#### Ejemplo de uso (JavaScript/Fetch):
```javascript
const actualizarIngreso = async (ingresoId, datosActualizacion) => {
  try {
    const response = await fetch(`/api/ingreso-mensual/${ingresoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosActualizacion)
    });
    
    if (!response.ok) {
      const error = await response.json();
      if (response.status === 404) {
        throw new Error('Ingreso mensual no encontrado o sin cambios');
      }
      // Error común: Ya existe otro ingreso para esa fecha
      throw new Error(error.detail || 'Error al actualizar el ingreso');
    }
    
    const resultado = await response.json();
    return resultado;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Ejemplo 1: Actualizar solo el monto
actualizarIngreso('507f1f77bcf86cd799439011', { monto: 48000.0 })
  .then(resultado => console.log('Ingreso actualizado:', resultado))
  .catch(error => console.error('Error:', error.message));

// Ejemplo 2: Actualizar mes y año
actualizarIngreso('507f1f77bcf86cd799439011', { mes: 11, anio: 2024 })
  .then(resultado => console.log('Ingreso actualizado:', resultado))
  .catch(error => console.error('Error:', error.message));

// Ejemplo 3: Actualizar múltiples campos
actualizarIngreso('507f1f77bcf86cd799439011', {
  mes: 11,
  anio: 2024,
  monto: 48000.0,
  moneda: 'USD'
})
  .then(resultado => console.log('Ingreso actualizado:', resultado))
  .catch(error => console.error('Error:', error.message));
```

#### Respuesta exitosa (200):
```json
{
  "message": "Ingreso mensual actualizado exitosamente"
}
```

#### Error (404):
```json
{
  "detail": "Ingreso mensual no encontrado o sin cambios"
}
```

#### Error (400) - El ingreso no existe:
```json
{
  "detail": "Error actualizando ingreso mensual: El ingreso con ID 507f1f77bcf86cd799439011 no existe"
}
```

#### Error (400) - Fecha duplicada:
```json
{
  "detail": "Error actualizando ingreso mensual: Ya existe otro ingreso registrado para 11/2024"
}
```

---

### 6. Eliminar un ingreso mensual
**DELETE** `/api/ingreso-mensual/{ingreso_id}`

Elimina un ingreso mensual existente.

#### Ejemplo de uso (JavaScript/Fetch):
```javascript
const eliminarIngreso = async (ingresoId) => {
  try {
    const response = await fetch(`/api/ingreso-mensual/${ingresoId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Ingreso mensual no encontrado');
      }
      throw new Error('Error al eliminar el ingreso');
    }
    
    const resultado = await response.json();
    return resultado;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Uso:
eliminarIngreso('507f1f77bcf86cd799439011')
  .then(resultado => console.log('Ingreso eliminado:', resultado))
  .catch(error => console.error('Error:', error.message));
```

#### Respuesta exitosa (200):
```json
{
  "message": "Ingreso mensual eliminado exitosamente"
}
```

#### Error (404):
```json
{
  "detail": "Ingreso mensual no encontrado"
}
```

---

## 🔍 Validaciones Implementadas

### Al Crear (POST):
✅ **Validación de duplicados**: No permite crear un ingreso si ya existe uno para el mismo mes y año.

**Ejemplo de manejo en frontend:**
```javascript
const manejarCreacionIngreso = async (formData) => {
  try {
    const resultado = await crearIngreso(
      formData.mes,
      formData.anio,
      formData.monto,
      formData.moneda
    );
    
    // Éxito
    alert('Ingreso creado exitosamente');
    return resultado;
    
  } catch (error) {
    // Manejar error de duplicado
    if (error.message.includes('Ya existe un ingreso')) {
      alert(`Ya existe un ingreso para ${formData.mes}/${formData.anio}. Por favor, actualiza el ingreso existente.`);
    } else {
      alert('Error al crear el ingreso: ' + error.message);
    }
  }
};
```

### Al Actualizar (PUT):
✅ **Validación de existencia**: Verifica que el ingreso con el ID existe.
✅ **Validación de duplicados**: Si se actualiza mes/año, verifica que no exista otro ingreso con esa fecha.

**Ejemplo de manejo en frontend:**
```javascript
const manejarActualizacionIngreso = async (ingresoId, datosActualizacion) => {
  try {
    const resultado = await actualizarIngreso(ingresoId, datosActualizacion);
    
    // Éxito
    alert('Ingreso actualizado exitosamente');
    return resultado;
    
  } catch (error) {
    // Manejar diferentes tipos de errores
    if (error.message.includes('no encontrado')) {
      alert('El ingreso que intentas actualizar no existe');
    } else if (error.message.includes('Ya existe otro ingreso')) {
      alert(`Ya existe un ingreso para la fecha destino. Elige otra fecha.`);
    } else {
      alert('Error al actualizar el ingreso: ' + error.message);
    }
  }
};
```

---

## 💡 Ejemplo Completo: Formulario React

```javascript
import React, { useState, useEffect } from 'react';

const IngresoMensualForm = () => {
  const [ingresos, setIngresos] = useState([]);
  const [formData, setFormData] = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    monto: '',
    moneda: 'CUP'
  });
  const [editandoId, setEditandoId] = useState(null);

  // Cargar todos los ingresos al montar el componente
  useEffect(() => {
    cargarIngresos();
  }, []);

  const cargarIngresos = async () => {
    try {
      const response = await fetch('/api/ingreso-mensual/');
      const data = await response.json();
      setIngresos(data);
    } catch (error) {
      console.error('Error al cargar ingresos:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editandoId) {
        // Actualizar ingreso existente
        await fetch(`/api/ingreso-mensual/${editandoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        alert('Ingreso actualizado exitosamente');
      } else {
        // Crear nuevo ingreso
        const response = await fetch('/api/ingreso-mensual/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail);
        }
        
        alert('Ingreso creado exitosamente');
      }
      
      // Recargar lista y resetear formulario
      cargarIngresos();
      resetFormulario();
      
    } catch (error) {
      if (error.message.includes('Ya existe un ingreso')) {
        alert(`Ya existe un ingreso para ${formData.mes}/${formData.anio}`);
      } else {
        alert('Error: ' + error.message);
      }
    }
  };

  const editarIngreso = (ingreso) => {
    setFormData({
      mes: ingreso.mes,
      anio: ingreso.anio,
      monto: ingreso.monto,
      moneda: ingreso.moneda
    });
    setEditandoId(ingreso.id);
  };

  const eliminarIngreso = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este ingreso?')) return;
    
    try {
      await fetch(`/api/ingreso-mensual/${id}`, { method: 'DELETE' });
      alert('Ingreso eliminado exitosamente');
      cargarIngresos();
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const resetFormulario = () => {
    setFormData({
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      monto: '',
      moneda: 'CUP'
    });
    setEditandoId(null);
  };

  return (
    <div>
      <h2>Gestión de Ingresos Mensuales</h2>
      
      <form onSubmit={handleSubmit}>
        <label>
          Mes:
          <select 
            value={formData.mes} 
            onChange={(e) => setFormData({...formData, mes: parseInt(e.target.value)})}
            required
          >
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={i+1}>{i+1}</option>
            ))}
          </select>
        </label>

        <label>
          Año:
          <input 
            type="number" 
            value={formData.anio}
            onChange={(e) => setFormData({...formData, anio: parseInt(e.target.value)})}
            min="2000"
            required
          />
        </label>

        <label>
          Monto:
          <input 
            type="number" 
            value={formData.monto}
            onChange={(e) => setFormData({...formData, monto: parseFloat(e.target.value)})}
            min="0"
            step="0.01"
            required
          />
        </label>

        <label>
          Moneda:
          <select 
            value={formData.moneda}
            onChange={(e) => setFormData({...formData, moneda: e.target.value})}
          >
            <option value="CUP">CUP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>

        <button type="submit">
          {editandoId ? 'Actualizar' : 'Crear'} Ingreso
        </button>
        
        {editandoId && (
          <button type="button" onClick={resetFormulario}>
            Cancelar Edición
          </button>
        )}
      </form>

      <h3>Lista de Ingresos</h3>
      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Año</th>
            <th>Monto</th>
            <th>Moneda</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ingresos.map(ingreso => (
            <tr key={ingreso.id}>
              <td>{ingreso.mes}</td>
              <td>{ingreso.anio}</td>
              <td>{ingreso.monto}</td>
              <td>{ingreso.moneda}</td>
              <td>
                <button onClick={() => editarIngreso(ingreso)}>Editar</button>
                <button onClick={() => eliminarIngreso(ingreso.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IngresoMensualForm;
```

---

## 📝 Notas Importantes

1. **Unicidad de mes/año**: El sistema garantiza que solo puede existir un ingreso por cada combinación de mes y año.

2. **Manejo de errores**: Siempre verifica el status de la respuesta y maneja los errores apropiadamente en el frontend.

3. **Validación de datos**: Los campos tienen validaciones:
   - `mes`: debe estar entre 1 y 12
   - `anio`: debe ser >= 2000
   - `monto`: debe ser >= 0

4. **Moneda por defecto**: Si no se especifica, la moneda será "CUP".

5. **IDs de MongoDB**: Los IDs devueltos son strings en formato ObjectId de MongoDB.

# Tiendas con Múltiples Almacenes

## Resumen

El sistema ahora permite que **una tienda pueda estar asociada a múltiples almacenes**, permitiendo mayor flexibilidad en la gestión de inventario y ventas.

## Cambios Implementados

### Modelo de Datos

**Antes:**
```python
class Tienda(BaseModel):
    almacen_id: str  # Solo un almacén
    almacen_nombre: Optional[str]
```

**Ahora:**
```python
class AlmacenInfo(BaseModel):
    id: str
    nombre: str

class Tienda(BaseModel):
    almacenes: List[AlmacenInfo]  # Múltiples almacenes
```

### Estructura en MongoDB

**Antes:**
```json
{
  "_id": "...",
  "nombre": "Tienda Centro",
  "codigo": "T001",
  "almacen_id": "507f1f77bcf86cd799439011",
  "almacen_nombre": "Almacén Principal"
}
```

**Ahora:**
```json
{
  "_id": "...",
  "nombre": "Tienda Centro",
  "codigo": "T001",
  "almacenes": [
    {
      "id": "507f1f77bcf86cd799439011",
      "nombre": "Almacén Principal"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "nombre": "Almacén Secundario"
    }
  ]
}
```

## API Endpoints

### 1. Crear Tienda con Múltiples Almacenes

```http
POST /api/tiendas/
Content-Type: application/json

{
  "nombre": "Tienda Centro",
  "codigo": "T001",
  "direccion": "Calle Principal 123",
  "telefono": "555-1234",
  "almacenes": [
    {
      "id": "507f1f77bcf86cd799439011",
      "nombre": "Almacén Principal"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "nombre": "Almacén Secundario"
    }
  ],
  "activo": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tienda creada exitosamente",
  "tienda_id": "507f1f77bcf86cd799439013"
}
```

### 2. Actualizar Almacenes de una Tienda

```http
PUT /api/tiendas/{tienda_id}
Content-Type: application/json

{
  "almacenes": [
    {
      "id": "507f1f77bcf86cd799439011",
      "nombre": "Almacén Principal"
    },
    {
      "id": "507f1f77bcf86cd799439014",
      "nombre": "Almacén Nuevo"
    }
  ]
}
```

### 3. Listar Tiendas

```http
GET /api/tiendas/
```

**Response:**
```json
{
  "success": true,
  "message": "Tiendas obtenidas exitosamente",
  "data": [
    {
      "id": "507f1f77bcf86cd799439013",
      "nombre": "Tienda Centro",
      "codigo": "T001",
      "direccion": "Calle Principal 123",
      "telefono": "555-1234",
      "almacenes": [
        {
          "id": "507f1f77bcf86cd799439011",
          "nombre": "Almacén Principal"
        },
        {
          "id": "507f1f77bcf86cd799439012",
          "nombre": "Almacén Secundario"
        }
      ],
      "activo": true
    }
  ]
}
```

## Ventas con Múltiples Almacenes

### Registrar Venta Especificando Almacén por Item

Ahora cada item de la venta debe especificar de qué almacén se descuenta:

```http
POST /api/inventario/ventas
Content-Type: application/json

{
  "tienda_id": "507f1f77bcf86cd799439013",
  "referencia": "VENTA-001",
  "items": [
    {
      "material_codigo": "INV-001",
      "cantidad": 2,
      "almacen_id": "507f1f77bcf86cd799439011"
    },
    {
      "material_codigo": "PAN-001",
      "cantidad": 5,
      "almacen_id": "507f1f77bcf86cd799439012"
    }
  ]
}
```

**Validaciones:**
- Cada `almacen_id` debe pertenecer a la tienda
- Si un almacén no está asociado a la tienda, se rechaza la venta
- El stock se descuenta del almacén especificado

**Response:**
```json
{
  "success": true,
  "message": "Venta registrada exitosamente",
  "movimiento_ids": ["mov1", "mov2"]
}
```

## Modelo de VentaItem Actualizado

```python
class VentaItem(BaseModel):
    material_codigo: str
    cantidad: float
    almacen_id: str  # ← Nuevo campo requerido
```

## Migración de Datos Existentes

Para migrar tiendas existentes al nuevo formato:

```bash
python migrate_tiendas_multiples_almacenes.py
```

El script:
1. Lee todas las tiendas con formato antiguo (`almacen_id`)
2. Convierte a formato nuevo (`almacenes: [{id, nombre}]`)
3. Elimina campos antiguos
4. Verifica la migración

## Ejemplo Frontend

### Crear Tienda con Selector de Almacenes

```jsx
import React, { useState, useEffect } from 'react';

const TiendaForm = () => {
  const [almacenesDisponibles, setAlmacenesDisponibles] = useState([]);
  const [almacenesSeleccionados, setAlmacenesSeleccionados] = useState([]);
  
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    direccion: '',
    telefono: '',
    activo: true
  });

  // Cargar almacenes disponibles
  useEffect(() => {
    fetch('/api/almacenes/')
      .then(res => res.json())
      .then(data => setAlmacenesDisponibles(data.data));
  }, []);

  const handleAlmacenToggle = (almacen) => {
    const existe = almacenesSeleccionados.find(a => a.id === almacen.id);
    
    if (existe) {
      setAlmacenesSeleccionados(
        almacenesSeleccionados.filter(a => a.id !== almacen.id)
      );
    } else {
      setAlmacenesSeleccionados([
        ...almacenesSeleccionados,
        { id: almacen.id, nombre: almacen.nombre }
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const tiendaData = {
      ...formData,
      almacenes: almacenesSeleccionados
    };
    
    const response = await fetch('/api/tiendas/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tiendaData)
    });
    
    if (response.ok) {
      alert('Tienda creada exitosamente');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Nombre"
        value={formData.nombre}
        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Código"
        value={formData.codigo}
        onChange={(e) => setFormData({...formData, codigo: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Dirección"
        value={formData.direccion}
        onChange={(e) => setFormData({...formData, direccion: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Teléfono"
        value={formData.telefono}
        onChange={(e) => setFormData({...formData, telefono: e.target.value})}
        required
      />
      
      <div className="almacenes-selector">
        <h3>Almacenes Asociados</h3>
        {almacenesDisponibles.map(almacen => (
          <label key={almacen.id}>
            <input
              type="checkbox"
              checked={almacenesSeleccionados.some(a => a.id === almacen.id)}
              onChange={() => handleAlmacenToggle(almacen)}
            />
            {almacen.nombre} ({almacen.codigo})
          </label>
        ))}
      </div>
      
      <button type="submit">Crear Tienda</button>
    </form>
  );
};
```

### Punto de Venta con Selector de Almacén

```jsx
const PuntoVenta = ({ tiendaId }) => {
  const [tienda, setTienda] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Cargar información de la tienda
    fetch(`/api/tiendas/${tiendaId}`)
      .then(res => res.json())
      .then(data => setTienda(data));
  }, [tiendaId]);

  const agregarItem = () => {
    setItems([
      ...items,
      {
        material_codigo: '',
        cantidad: 1,
        almacen_id: tienda?.almacenes[0]?.id || ''
      }
    ]);
  };

  const actualizarItem = (index, campo, valor) => {
    const nuevosItems = [...items];
    nuevosItems[index][campo] = valor;
    setItems(nuevosItems);
  };

  const registrarVenta = async () => {
    const venta = {
      tienda_id: tiendaId,
      referencia: `VENTA-${Date.now()}`,
      items: items
    };

    const response = await fetch('/api/inventario/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(venta)
    });

    if (response.ok) {
      alert('Venta registrada exitosamente');
      setItems([]);
    }
  };

  return (
    <div>
      <h2>Punto de Venta - {tienda?.nombre}</h2>
      
      <button onClick={agregarItem}>Agregar Item</button>
      
      {items.map((item, index) => (
        <div key={index} className="venta-item">
          <input
            type="text"
            placeholder="Código Material"
            value={item.material_codigo}
            onChange={(e) => actualizarItem(index, 'material_codigo', e.target.value)}
          />
          
          <input
            type="number"
            placeholder="Cantidad"
            value={item.cantidad}
            onChange={(e) => actualizarItem(index, 'cantidad', parseFloat(e.target.value))}
          />
          
          <select
            value={item.almacen_id}
            onChange={(e) => actualizarItem(index, 'almacen_id', e.target.value)}
          >
            <option value="">Seleccionar Almacén</option>
            {tienda?.almacenes.map(alm => (
              <option key={alm.id} value={alm.id}>
                {alm.nombre}
              </option>
            ))}
          </select>
        </div>
      ))}
      
      <button onClick={registrarVenta}>Registrar Venta</button>
    </div>
  );
};
```

## Ventajas del Nuevo Sistema

1. **Flexibilidad**: Una tienda puede vender desde múltiples almacenes
2. **Control**: Se especifica exactamente de qué almacén se descuenta cada item
3. **Trazabilidad**: Los movimientos registran el almacén origen
4. **Escalabilidad**: Fácil agregar o quitar almacenes de una tienda

## Consideraciones

- Cada item de venta debe especificar su `almacen_id`
- El almacén debe estar asociado a la tienda
- El stock se descuenta del almacén especificado
- Si una tienda no tiene almacenes, no puede registrar ventas

## Migración

**Importante**: Ejecuta el script de migración antes de usar el nuevo sistema:

```bash
python migrate_tiendas_multiples_almacenes.py
```

Esto convertirá todas las tiendas existentes al nuevo formato.

# Inventario y Tiendas API

## Entidades

### Almacen
```json
{
  "id": "string",
  "nombre": "string",
  "codigo": "string",
  "direccion": "string",
  "telefono": "string",
  "responsable": "string",
  "activo": true
}
```

### Tienda
```json
{
  "id": "string",
  "nombre": "string",
  "codigo": "string",
  "direccion": "string",
  "telefono": "string",
  "almacen_id": "string",
  "almacen_nombre": "string",
  "activo": true
}
```

### Movimiento
```json
{
  "id": "string",
  "tipo": "entrada|salida|transferencia|ajuste|venta",
  "material_codigo": "string",
  "cantidad": 5,
  "almacen_origen_id": "string",
  "almacen_destino_id": "string",
  "tienda_id": "string",
  "motivo": "string",
  "referencia": "string",
  "fecha": "2024-01-01T10:00:00",
  "usuario": "string"
}
```

### Stock
```json
{
  "almacen_id": "string",
  "almacen_nombre": "string",
  "material_codigo": "string",
  "material_descripcion": "string",
  "um": "string",
  "cantidad": 100,
  "actualizado_en": "2024-01-01T10:00:00"
}
```

---

## Almacenes

### GET /api/almacenes/
Lista todos los almacenes.

### POST /api/almacenes/
Crea un almacen.

Body:
```json
{
  "nombre": "Almacen Central",
  "codigo": "ALM-001",
  "direccion": "Av. Principal 123",
  "telefono": "70000000",
  "responsable": "Juan Perez",
  "activo": true
}
```

### PUT /api/almacenes/{id}
Actualiza un almacen.

### DELETE /api/almacenes/{id}
Elimina un almacen.

---

## Tiendas

### GET /api/tiendas/
Lista todas las tiendas.

### POST /api/tiendas/
Crea una tienda y la vincula a un almacen.

Body:
```json
{
  "nombre": "Sucursal Centro",
  "codigo": "TND-001",
  "direccion": "Av. Comercial 456",
  "telefono": "70000001",
  "almacen_id": "almacen_id",
  "activo": true
}
```

### PUT /api/tiendas/{id}
Actualiza una tienda.

### DELETE /api/tiendas/{id}
Elimina una tienda.

---

## Stock

### GET /api/inventario/stock
Devuelve el stock por almacen.

Query params:
- `almacen_id` (opcional)

---

## Movimientos

### GET /api/inventario/movimientos
Lista movimientos de inventario.

Query params:
- `tipo` (opcional)
- `almacen_id` (opcional)
- `tienda_id` (opcional)
- `material_codigo` (opcional)

### POST /api/inventario/movimientos
Crea un movimiento.

Body:
```json
{
  "tipo": "entrada",
  "material_codigo": "ACE001",
  "cantidad": 5,
  "almacen_origen_id": "almacen_id",
  "almacen_destino_id": "almacen_id",
  "tienda_id": "tienda_id",
  "motivo": "Recepcion",
  "referencia": "Factura 0001"
}
```

Notas:
- `tipo=transferencia` requiere `almacen_origen_id` y `almacen_destino_id` distintos.
- `tipo=venta` debe incluir `tienda_id`. El backend puede inferir el almacen por la tienda.
- Para `entrada`, `salida` y `ajuste`, se usa `almacen_origen_id`.

---

## Ventas (opcional)

### POST /api/inventario/ventas
Registra ventas con multiples items.

Body:
```json
{
  "tienda_id": "tienda_id",
  "referencia": "Factura 0002",
  "items": [
    { "material_codigo": "ACE001", "cantidad": 2 },
    { "material_codigo": "ACE002", "cantidad": 1 }
  ]
}
```

Notas:
- Cada item descuenta del almacen asociado a la tienda.
- El endpoint es opcional si se usa `tipo=venta` en movimientos.

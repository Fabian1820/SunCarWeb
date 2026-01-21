# Cambios Requeridos en el Backend - Cierre de Caja

## Campos Adicionales en SesionCaja

El frontend ahora espera que el backend incluya los siguientes campos en la respuesta de `SesionCaja`.

### Endpoint Afectado

**GET** `/caja/tiendas/{tienda_id}/sesion-activa`

### Campos Requeridos

```json
{
  "data": {
    "id": "uuid",
    "tienda_id": "uuid",
    "numero_sesion": "20260121-001",
    "fecha_apertura": "2026-01-21T08:00:00Z",
    "fecha_cierre": null,
    "efectivo_apertura": 100.00,
    "efectivo_cierre": null,
    "nota_apertura": null,
    "nota_cierre": null,
    "usuario_apertura": "usuario_id",
    "usuario_cierre": null,
    "estado": "abierta",
    "total_ventas": 2590.28,
    "total_efectivo": 1500.00,
    "total_tarjeta": 800.00,
    "total_transferencia": 290.28,
    "total_entradas": 150.00,      // <-- CAMPO REQUERIDO: Suma de todos los movimientos tipo "entrada"
    "total_salidas": 50.00,        // <-- CAMPO REQUERIDO: Suma de todos los movimientos tipo "salida"
    "cantidad_ordenes": 15,        // <-- CAMPO REQUERIDO: Cantidad de órdenes pagadas
    "movimientos_efectivo": [],
    "created_at": "2026-01-21T08:00:00Z",
    "updated_at": "2026-01-21T18:30:00Z"
  }
}
```

### Descripción de los Campos

#### 1. total_entradas (float, requerido)
- Suma de todos los movimientos de efectivo con `tipo = "entrada"` de la sesión actual
- Incluye todos los registros de la colección `movimientos_efectivo` donde:
  - `sesion_caja_id` = ID de la sesión actual
  - `tipo` = "entrada"
- Se usa para calcular el efectivo esperado en caja

#### 2. total_salidas (float, requerido)
- Suma de todos los movimientos de efectivo con `tipo = "salida"` de la sesión actual
- Incluye todos los registros de la colección `movimientos_efectivo` donde:
  - `sesion_caja_id` = ID de la sesión actual
  - `tipo` = "salida"
- Se usa para calcular el efectivo esperado en caja

#### 3. cantidad_ordenes (integer, opcional)
- Número total de órdenes con estado `pagada` en la sesión actual
- Se usa en el diálogo de cierre de caja para mostrar: "X órdenes: Y.YY $"
- Si no se envía, el frontend mostrará "0 órdenes"

### Cálculo del Efectivo Esperado

El frontend calcula el efectivo esperado de la siguiente manera:

```
Efectivo Esperado = efectivo_apertura + total_efectivo + total_entradas - total_salidas
```

Ejemplo:
```
Apertura: 400.00 $
Pagos en Efectivo: 2590.28 $
Entradas: 150.00 $ (suma de todos los movimientos tipo "entrada")
Salidas: 50.00 $ (suma de todos los movimientos tipo "salida")

Efectivo Esperado = 400 + 2590.28 + 150 - 50 = 3090.28 $
```

### Implementación Sugerida (Backend)

```python
# Al obtener la sesión activa, calcular los totales de movimientos
def obtener_sesion_activa(tienda_id: str):
    sesion = db.query(SesionCaja).filter(
        SesionCaja.tienda_id == tienda_id,
        SesionCaja.estado == "abierta"
    ).first()
    
    if sesion:
        # Calcular total de entradas
        total_entradas = db.query(func.sum(MovimientoEfectivo.monto)).filter(
            MovimientoEfectivo.sesion_caja_id == sesion.id,
            MovimientoEfectivo.tipo == "entrada"
        ).scalar() or 0.0
        
        # Calcular total de salidas
        total_salidas = db.query(func.sum(MovimientoEfectivo.monto)).filter(
            MovimientoEfectivo.sesion_caja_id == sesion.id,
            MovimientoEfectivo.tipo == "salida"
        ).scalar() or 0.0
        
        # Contar órdenes pagadas de esta sesión
        cantidad_ordenes = db.query(OrdenCompra).filter(
            OrdenCompra.sesion_caja_id == sesion.id,
            OrdenCompra.estado == "pagada"
        ).count()
        
        # Agregar al objeto de respuesta
        sesion_dict = sesion.to_dict()
        sesion_dict["total_entradas"] = total_entradas
        sesion_dict["total_salidas"] = total_salidas
        sesion_dict["cantidad_ordenes"] = cantidad_ordenes
        
        return sesion_dict
    
    return None
```

### Ejemplo con MongoDB (si usas MongoDB)

```python
from pymongo import MongoClient

def obtener_sesion_activa(tienda_id: str):
    sesion = db.sesiones_caja.find_one({
        "tienda_id": tienda_id,
        "estado": "abierta"
    })
    
    if sesion:
        # Calcular total de entradas
        pipeline_entradas = [
            {"$match": {
                "sesion_caja_id": sesion["_id"],
                "tipo": "entrada"
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$monto"}
            }}
        ]
        result_entradas = list(db.movimientos_efectivo.aggregate(pipeline_entradas))
        total_entradas = result_entradas[0]["total"] if result_entradas else 0.0
        
        # Calcular total de salidas
        pipeline_salidas = [
            {"$match": {
                "sesion_caja_id": sesion["_id"],
                "tipo": "salida"
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$monto"}
            }}
        ]
        result_salidas = list(db.movimientos_efectivo.aggregate(pipeline_salidas))
        total_salidas = result_salidas[0]["total"] if result_salidas else 0.0
        
        # Contar órdenes pagadas
        cantidad_ordenes = db.ordenes.count_documents({
            "sesion_caja_id": sesion["_id"],
            "estado": "pagada"
        })
        
        # Agregar campos calculados
        sesion["total_entradas"] = total_entradas
        sesion["total_salidas"] = total_salidas
        sesion["cantidad_ordenes"] = cantidad_ordenes
        
        return sesion
    
    return None
```

### Otros Endpoints que Deberían Incluir Estos Campos

1. **GET** `/caja/sesiones/{sesion_id}` - Obtener sesión específica
2. **GET** `/caja/sesiones` - Listar sesiones
3. **POST** `/caja/sesiones/{sesion_id}/cerrar` - Cerrar sesión (en la respuesta)
4. **POST** `/caja/sesiones/{sesion_id}/movimientos-efectivo` - Después de registrar un movimiento, devolver la sesión actualizada

### Impacto en el Frontend

Si el backend no envía estos campos:
- ❌ `total_entradas` y `total_salidas`: El cálculo del efectivo esperado será incorrecto
- ⚠️ `cantidad_ordenes`: Mostrará "0 órdenes" en el encabezado del cierre de caja
- ⚠️ El total de ventas se mostrará correctamente (usa `total_ventas`)

### Prioridad

**ALTA** - Los campos `total_entradas` y `total_salidas` son críticos para el correcto funcionamiento del cierre de caja. Sin ellos, el cálculo del efectivo esperado será incorrecto y causará confusión al usuario.

## Verificación

Para verificar que el backend está enviando los campos correctamente:

1. Abrir la consola del navegador (F12)
2. Ir a la pestaña "Network"
3. Abrir una sesión de caja
4. Registrar un movimiento de entrada o salida
5. Buscar la petición a `/caja/tiendas/{tienda_id}/sesion-activa`
6. Verificar que la respuesta incluya `total_entradas`, `total_salidas` y `cantidad_ordenes`

```javascript
// Ejemplo de respuesta esperada
{
  "data": {
    // ... otros campos
    "total_entradas": 150.00,
    "total_salidas": 50.00,
    "cantidad_ordenes": 15,
    // ... más campos
  }
}
```

### Caso de Prueba

1. Abrir sesión con 400.00 $ de apertura
2. Registrar entrada de 100.00 $ con motivo "me lo dieron"
3. Verificar que `total_entradas` = 100.00
4. Registrar salida de 30.00 $ con motivo "compra de insumos"
5. Verificar que `total_salidas` = 30.00
6. Realizar venta de 2590.28 $ en efectivo
7. Verificar que `total_efectivo` = 2590.28
8. En el cierre de caja, el efectivo esperado debe ser: 400 + 2590.28 + 100 - 30 = 3060.28 $

## Problema Actual Detectado

Se detectó que existe un movimiento en la base de datos:
```json
{
  "_id": "6970ee5b6260e012f7f58339",
  "sesion_caja_id": "696fc7bacf7de946ba8ed704",
  "tipo": "entrada",
  "monto": 100,
  "motivo": "me lo dieron",
  "fecha": "2026-01-21T15:18:51.125+00:00",
  "usuario": "Yanisbe Hurtado Jiménez"
}
```

Pero este movimiento NO está siendo incluido en el campo `total_entradas` de la sesión. Esto indica que el backend no está calculando correctamente estos totales.

**Acción requerida**: El backend debe sumar todos los movimientos de la sesión y devolver los campos `total_entradas` y `total_salidas` en la respuesta de la sesión.

# Resumen: Backend para Editar Ofertas

## Lo que necesitas implementar

### 1. Endpoint Principal
```
PUT /ofertas/confeccion/{oferta_id}
```

### 2. Request Body
El mismo formato que usas en el POST de creación (todos los campos de la oferta)

### 3. Response
```json
{
  "success": true,
  "message": "Oferta actualizada exitosamente",
  "data": {
    "id": "string",
    "numero_oferta": "string",
    "nombre_automatico": "string",
    ...
  }
}
```

## Lógica Crítica: Manejo de Stock

### Escenario 1: Oferta NO reservada → NO reservada
- ✅ Solo actualizar datos
- ❌ No tocar stock

### Escenario 2: Oferta NO reservada → Reservada
- ✅ Validar stock disponible
- ✅ Descontar stock (reservar)

### Escenario 3: Oferta Reservada → NO reservada
- ✅ Devolver stock al almacén

### Escenario 4: Oferta Reservada → Reservada (con cambios)
- ✅ Devolver stock anterior
- ✅ Validar nuevo stock disponible
- ✅ Reservar nuevo stock

## Pasos de Implementación

```python
1. Buscar oferta por ID
   ↓
2. Validar que existe
   ↓
3. Validar almacén y cliente
   ↓
4. MANEJAR STOCK (según escenarios arriba)
   ↓
5. Actualizar todos los campos
   ↓
6. Recalcular nombre automático
   ↓
7. Actualizar fecha_actualizacion
   ↓
8. Commit y retornar respuesta
```

## Campos que NO cambian
- `id` - Se mantiene
- `numero_oferta` - Se mantiene
- `fecha_creacion` - Se mantiene

## Validaciones Requeridas
- ✅ Oferta existe
- ✅ Almacén existe
- ✅ Cliente existe (si personalizada)
- ✅ Materiales existen
- ✅ Stock suficiente (si reservada)

## Errores a Manejar
- 404: Oferta no encontrada
- 400: Datos inválidos
- 400: Stock insuficiente
- 400: Cliente/Almacén no encontrado
- 500: Error del servidor

## Testing Rápido

### Caso 1: Actualizar precio
```bash
PUT /ofertas/confeccion/OF-001
Body: { ..., "precio_final": 6000 }
Esperado: ✅ Actualizado, sin cambios en stock
```

### Caso 2: Cambiar a reservada
```bash
PUT /ofertas/confeccion/OF-001
Body: { ..., "estado": "reservada" }
Esperado: ✅ Actualizado, stock descontado
```

### Caso 3: Cambiar materiales en oferta reservada
```bash
PUT /ofertas/confeccion/OF-001
Body: { ..., "estado": "reservada", "items": [nuevos items] }
Esperado: ✅ Stock anterior devuelto, nuevo stock reservado
```

## Código de Referencia
Ver archivo completo: `docs/BACKEND_EDITAR_OFERTA_SPEC.md`

## Frontend ya implementado ✅
- Botón de editar en cada oferta
- Diálogo de edición con todos los datos cargados
- Envía PUT a `/ofertas/confeccion/{oferta_id}`
- Recarga datos después de guardar

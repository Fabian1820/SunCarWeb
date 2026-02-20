# Solución: Error 500 al Actualizar Oferta OF-20260219-009

## 🔴 Problema Actual

Al intentar actualizar la oferta `OF-20260219-009`, el backend responde con **Error 500**:

```
Failed to load resource: the server responded with a status of 500 (OF-20260219-009)
Error: Error al actualizar la oferta
```

## 🔍 Diagnóstico

El error ocurre cuando el backend intenta actualizar una oferta y necesita limpiar los campos de contacto anteriores. El código actual hace:

```python
# En actualizar_oferta_con_stock
if viene_contacto:
    oferta.cliente_numero = None
    oferta.lead_id = None
    oferta.nombre_lead_sin_agregar = None
```

**El problema:** Los campos probablemente tienen restricción `NOT NULL` en la base de datos, causando un error de integridad.

## ✅ Solución Recomendada

### Opción 1: Hacer los Campos Nullable (RECOMENDADO)

Esta es la solución más limpia y correcta desde el punto de vista de diseño de base de datos.

#### Paso 1: Modificar el Modelo

```python
# En application/models/oferta_confeccion.py (o donde esté el modelo)

class OfertaConfeccion(db.Model):
    __tablename__ = 'ofertas_confeccion'
    
    # ... otros campos ...
    
    # Cambiar estos campos a nullable=True
    cliente_numero = db.Column(db.String, nullable=True)
    lead_id = db.Column(db.String, nullable=True)
    nombre_lead_sin_agregar = db.Column(db.String, nullable=True)
```

#### Paso 2: Crear y Aplicar Migración

```bash
# Si usas Flask-Migrate
flask db migrate -m "Hacer campos de contacto nullable en ofertas_confeccion"
flask db upgrade

# Si usas Alembic directamente
alembic revision --autogenerate -m "Hacer campos de contacto nullable"
alembic upgrade head
```

#### Paso 3: Verificar en la Base de Datos

```sql
-- PostgreSQL
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'ofertas_confeccion' 
  AND column_name IN ('cliente_numero', 'lead_id', 'nombre_lead_sin_agregar');

-- Deberías ver is_nullable = 'YES' para los tres campos
```

### Opción 2: Usar Strings Vacíos (Alternativa Rápida)

Si no puedes modificar la base de datos inmediatamente, usa strings vacíos en lugar de `None`:

#### Modificar el Servicio

```python
# En application/services/oferta_confeccion_service.py
# Método: actualizar_oferta_con_stock

def actualizar_oferta_con_stock(oferta_id, update_data):
    oferta = OfertaConfeccion.query.get(oferta_id)
    
    if not oferta:
        raise ValueError(f"Oferta {oferta_id} no encontrada")
    
    # Detectar si viene algún campo de contacto
    campos_contacto = ['cliente_numero', 'lead_id', 'nombre_lead_sin_agregar']
    viene_contacto = any(campo in update_data for campo in campos_contacto)
    
    if viene_contacto:
        # Limpiar TODOS los contactos anteriores usando strings vacíos
        oferta.cliente_numero = ""
        oferta.lead_id = ""
        oferta.nombre_lead_sin_agregar = ""
        
        # Establecer solo el nuevo contacto
        for campo in campos_contacto:
            if campo in update_data:
                valor = update_data[campo]
                setattr(oferta, campo, valor if valor else "")
    
    # Actualizar otros campos
    for campo, valor in update_data.items():
        if campo not in campos_contacto and hasattr(oferta, campo):
            setattr(oferta, campo, valor)
    
    # Validar que solo haya un contacto activo (considerando strings vacíos)
    if oferta.tipo == 'personalizada':
        contactos_activos = sum([
            bool(oferta.cliente_numero and oferta.cliente_numero.strip()),
            bool(oferta.lead_id and oferta.lead_id.strip()),
            bool(oferta.nombre_lead_sin_agregar and oferta.nombre_lead_sin_agregar.strip())
        ])
        
        if contactos_activos != 1:
            raise ValueError("Una oferta personalizada debe tener exactamente un contacto")
    
    db.session.commit()
    return oferta
```

## 🧪 Cómo Verificar la Solución

### 1. Revisar los Logs del Backend

Busca el error exacto en los logs del servidor. Deberías ver algo como:

```
IntegrityError: null value in column "cliente_numero" violates not-null constraint
```

O:

```
sqlalchemy.exc.IntegrityError: (psycopg2.errors.NotNullViolation) null value in column "cliente_numero" of relation "ofertas_confeccion" violates not-null constraint
```

### 2. Probar la Actualización

Después de aplicar la solución, prueba actualizar la oferta `OF-20260219-009`:

```bash
# Usando curl
curl -X PUT "https://api.suncarsrl.com/api/ofertas/confeccion/OF-20260219-009" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"cliente_numero": "C001"}'
```

Deberías recibir:

```json
{
  "success": true,
  "message": "Oferta actualizada correctamente",
  "data": { ... }
}
```

### 3. Casos de Prueba

Prueba estos escenarios:

1. ✅ Cambiar de cliente a otro cliente
2. ✅ Cambiar de lead a cliente
3. ✅ Cambiar de cliente a lead
4. ✅ Cambiar a lead sin agregar
5. ✅ Actualizar otros campos sin cambiar contacto

## 📋 Checklist de Implementación

- [ ] Revisar logs del backend para confirmar el error exacto
- [ ] Verificar el estado actual de los campos en el modelo
- [ ] Verificar restricciones en la base de datos
- [ ] Elegir solución (Opción 1 recomendada)
- [ ] Aplicar cambios en el modelo (si Opción 1)
- [ ] Crear y aplicar migración (si Opción 1)
- [ ] Modificar el servicio (si Opción 2)
- [ ] Probar actualización de oferta OF-20260219-009
- [ ] Probar todos los casos de cambio de contacto
- [ ] Verificar que no hay regresiones en otras funcionalidades

## 🔗 Referencias

- [ERROR_500_ACTUALIZAR_CONTACTO_OFERTA.md](./ERROR_500_ACTUALIZAR_CONTACTO_OFERTA.md)
- [RESUMEN_ERROR_500_BACKEND.md](./RESUMEN_ERROR_500_BACKEND.md)
- [DEBUG_ERROR_500_ACTUALIZAR_OFERTA.md](./DEBUG_ERROR_500_ACTUALIZAR_OFERTA.md)
- [SOLUCION_CAMBIO_CONTACTOS_OFERTAS.md](./SOLUCION_CAMBIO_CONTACTOS_OFERTAS.md)

## 💡 Notas Adicionales

- El frontend ya está enviando los datos correctamente (solo el campo de contacto que cambió)
- El problema está exclusivamente en el backend
- La solución no afecta la lógica de negocio, solo la implementación técnica
- Después de aplicar la solución, el frontend seguirá funcionando sin cambios

## 🚀 Próximos Pasos

1. El equipo de backend debe revisar los logs para confirmar el error
2. Aplicar la Opción 1 (hacer campos nullable) - es la solución correcta
3. Probar exhaustivamente todos los casos de actualización
4. Notificar cuando esté resuelto para probar desde el frontend

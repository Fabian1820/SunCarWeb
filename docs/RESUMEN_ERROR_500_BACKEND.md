# Resumen: Error 500 al Actualizar Oferta

## El Problema

El frontend está funcionando correctamente, pero el backend responde con **Error 500** al intentar actualizar una oferta.

## Causa Más Probable

Los campos de contacto (`cliente_numero`, `lead_id`, `nombre_lead_sin_agregar`) probablemente están definidos como **NOT NULL** en la base de datos, pero el código intenta establecerlos en `None` al limpiarlos.

## Solución Rápida

### Opción A: Hacer los campos nullable (RECOMENDADO)

1. Modificar el modelo:
```python
cliente_numero = db.Column(db.String, nullable=True)
lead_id = db.Column(db.String, nullable=True)
nombre_lead_sin_agregar = db.Column(db.String, nullable=True)
```

2. Crear migración:
```bash
flask db migrate -m "Hacer campos de contacto nullable"
flask db upgrade
```

### Opción B: Usar strings vacíos en lugar de None

En `actualizar_oferta_con_stock`:

```python
if viene_contacto:
    # Usar "" en lugar de None
    oferta.cliente_numero = ""
    oferta.lead_id = ""
    oferta.nombre_lead_sin_agregar = ""
```

Y ajustar la validación:
```python
contactos_activos = sum([
    bool(oferta.cliente_numero and oferta.cliente_numero.strip()),
    bool(oferta.lead_id and oferta.lead_id.strip()),
    bool(oferta.nombre_lead_sin_agregar and oferta.nombre_lead_sin_agregar.strip())
])
```

## Cómo Verificar

Revisa los logs del backend para confirmar el error exacto. Busca líneas como:

```
IntegrityError: null value in column "cliente_numero" violates not-null constraint
```

O similar.

## Frontend

El frontend ya está correcto y enviando los datos correctamente. No necesita cambios.

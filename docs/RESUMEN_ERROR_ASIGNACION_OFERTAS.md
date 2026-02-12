# Resumen: Error en Asignación de Ofertas a Clientes

## 🔴 Problema Identificado

La funcionalidad de asignar ofertas genéricas a clientes desde la tabla de gestión está fallando con error 500.

### Error Específico
```
Error: type object 'EstadoOfertaConfeccion' has no attribute 'APROBADA'
```

### Endpoint Afectado
```
GET /api/ofertas/confeccion/genericas/aprobadas
```

## 🎯 Causa Raíz

**El backend está usando un nombre de estado incorrecto.**

- ❌ **Incorrecto:** `EstadoOfertaConfeccion.APROBADA`
- ✅ **Correcto:** `EstadoOfertaConfeccion.APROBADA_PARA_ENVIAR` o `"aprobada_para_enviar"`

## 🔧 Solución

### Backend (URGENTE)

El equipo de backend debe cambiar en el archivo del router de ofertas:

```python
# ❌ ANTES (Incorrecto)
ofertas = db.query(OfertaConfeccion).filter(
    OfertaConfeccion.tipo == "generica",
    OfertaConfeccion.estado == EstadoOfertaConfeccion.APROBADA  # No existe
).all()

# ✅ DESPUÉS (Correcto)
ofertas = db.query(OfertaConfeccion).filter(
    OfertaConfeccion.tipo == "generica",
    OfertaConfeccion.estado == "aprobada_para_enviar"  # Correcto
).all()
```

### Estados Válidos

Según la especificación oficial:

**Ofertas Genéricas:**
- `en_revision`
- `aprobada_para_enviar` ← **Este es el correcto**

**Ofertas Personalizadas (adicionales):**
- `enviada_a_cliente`
- `confirmada_por_cliente`
- `reservada`

## 📋 Archivos Backend a Revisar

1. **Router de ofertas:** `routers/ofertas_confeccion.py`
   - Función: `listar_ofertas_genericas_aprobadas()`
   - Endpoint: `GET /genericas/aprobadas`

2. **Modelo/Enum:** `models/oferta_confeccion.py`
   - Verificar que el enum tenga `APROBADA_PARA_ENVIAR`
   - NO debe tener solo `APROBADA`

## ✅ Frontend

El frontend está correctamente implementado:
- ✅ Componente `AsignarOfertaGenericaDialog` funciona bien
- ✅ Hook `use-ofertas-confeccion.ts` hace la petición correcta
- ✅ Manejo de errores implementado

**No se requieren cambios en el frontend.**

## 🧪 Cómo Probar el Fix

Una vez que backend corrija el error:

1. **Abrir tabla de clientes** en `/clientes`
2. **Click en "Asignar Oferta"** en cualquier cliente
3. **Verificar que aparece el modal** con ofertas genéricas aprobadas
4. **Seleccionar una oferta** y hacer click en "Asignar"
5. **Verificar que se crea** la nueva oferta personalizada

## 📄 Documentación Creada

He creado el documento detallado:
- `docs/FIX_BACKEND_ESTADO_OFERTAS_GENERICAS.md`

Este documento incluye:
- Explicación completa del problema
- Código antes/después
- Pruebas a realizar
- Checklist de verificación

## ⏱️ Estimación

- **Tiempo de fix:** 15-30 minutos
- **Complejidad:** Baja (solo cambio de nombre)
- **Prioridad:** 🔴 URGENTE (bloqueante)

## 🔗 Referencias

- [Fix Detallado Backend](./docs/FIX_BACKEND_ESTADO_OFERTAS_GENERICAS.md)
- [Especificación Backend](./docs/BACKEND_CONFECCION_OFERTAS_SPEC.md)
- [Guía Asignar Oferta](./docs/ASIGNAR_OFERTA_GENERICA_A_CLIENTE.md)

---

**Siguiente paso:** Compartir `docs/FIX_BACKEND_ESTADO_OFERTAS_GENERICAS.md` con el equipo de backend para que apliquen el fix.

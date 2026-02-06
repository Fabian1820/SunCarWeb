# Quick Start: Asignar Oferta a Cliente

## 🎯 Objetivo

Duplicar una oferta genérica aprobada y asignarla automáticamente a un cliente desde la tabla de gestión de clientes.

## ✅ Backend Listo

El backend está **100% implementado y funcional**. Solo falta la integración en el frontend.

## 🚀 Endpoint

```http
POST /api/ofertas-confeccion/asignar-a-cliente
Content-Type: application/json
Authorization: Bearer {token}

{
  "oferta_generica_id": "6789abcd1234567890abcdef",
  "cliente_numero": "CL-20250205-001"
}
```

## 📦 Response

```json
{
  "success": true,
  "message": "Oferta genérica duplicada y asignada exitosamente a Juan Pérez",
  "oferta_original_id": "6789abcd1234567890abcdef",
  "oferta_nueva_id": "1234567890abcdef12345678",
  "oferta_nueva": { /* datos completos */ },
  "cliente_numero": "CL-20250205-001",
  "cliente_nombre": "Juan Pérez"
}
```

## 🔧 Implementación Frontend (3 pasos)

### 1. Agregar Botón en Tabla de Clientes

```tsx
<button onClick={() => handleAsignarOferta(cliente)}>
  📋 Asignar Oferta
</button>
```

### 2. Crear Modal de Selección

```tsx
// Cargar ofertas genéricas aprobadas
const ofertas = await fetch('/api/ofertas-confeccion/genericas/aprobadas');

// Mostrar lista y permitir selección
```

### 3. Llamar al Endpoint

```tsx
const response = await fetch('/api/ofertas-confeccion/asignar-a-cliente', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    oferta_generica_id: ofertaId,
    cliente_numero: cliente.numero
  })
});

const data = await response.json();

if (data.success) {
  // Redirigir a la nueva oferta
  navigate(`/ofertas/${data.oferta_nueva_id}`);
}
```

## 📋 Checklist Mínimo

- [ ] Botón "Asignar Oferta" en tabla de clientes
- [ ] Modal que muestra ofertas genéricas aprobadas
- [ ] Llamada al endpoint POST /asignar-a-cliente
- [ ] Manejo de respuesta exitosa (toast + redirección)
- [ ] Manejo de errores (mostrar mensaje)

## 📚 Documentación Completa

- **Documentación detallada**: `docs/ASIGNAR_OFERTA_GENERICA_A_CLIENTE.md`
- **Ejemplo visual**: `EJEMPLO_FRONTEND_ASIGNAR_OFERTA.md`
- **Checklist completo**: `CHECKLIST_FRONTEND_ASIGNAR_OFERTA.md`
- **Tests HTTP**: `test/test_asignar_oferta_a_cliente.http`
- **Resumen backend**: `RESUMEN_ASIGNAR_OFERTA_A_CLIENTE.md`

## ⚡ Flujo Rápido

```
Usuario → Clic "Asignar Oferta" → Modal con ofertas → Selecciona oferta
→ POST /asignar-a-cliente → Nueva oferta creada → Redirige a oferta
```

## 🎨 Ejemplo Visual Simplificado

```
┌─────────────────────────────────────┐
│ Tabla de Clientes                   │
│                                      │
│ Juan Pérez  [📋 Asignar Oferta]    │
│ María García [📋 Asignar Oferta]   │
└─────────────────────────────────────┘
              ↓ clic
┌─────────────────────────────────────┐
│ Seleccionar Oferta para Juan Pérez  │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ OF-001: I-2x5kW, B-4x5.12kWh   │ │
│ │ $15,000 USD                     │ │
│ │         [Asignar esta oferta]   │ │
│ └─────────────────────────────────┘ │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ OF-002: I-1x3kW, B-2x5.12kWh   │ │
│ │ $9,500 USD                      │ │
│ │         [Asignar esta oferta]   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
              ↓ clic
┌─────────────────────────────────────┐
│ ✅ Oferta Asignada                  │
│ Nueva Oferta: OF-042                │
│         [Ver Oferta]                │
└─────────────────────────────────────┘
```

## 🔍 Validaciones del Backend

El backend valida automáticamente:
- ✅ Oferta existe
- ✅ Oferta es genérica
- ✅ Oferta está aprobada para enviar
- ✅ Cliente existe

## 🎁 Lo que hace el Backend

1. Duplica la oferta completa
2. Cambia tipo a "personalizada"
3. Asigna el cliente_numero
4. Genera nuevo número de oferta
5. Crea oferta en estado "en_revision"
6. Agrega nota de duplicación

## 🚨 Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| 400 | Oferta no aprobada | Usar solo ofertas con estado "aprobada_para_enviar" |
| 400 | Cliente no existe | Verificar que el cliente_numero es correcto |
| 404 | Oferta no existe | Verificar que el oferta_generica_id es válido |

## 💡 Tips

- La nueva oferta NO tiene materiales reservados (debe hacerse manualmente)
- La nueva oferta está en estado "en_revision" (puede editarse)
- Se genera un nuevo número de oferta único
- Se mantienen todos los items, precios y configuraciones

## 🧪 Testing Rápido

```bash
# 1. Listar ofertas genéricas aprobadas
curl http://localhost:8000/api/ofertas-confeccion/genericas/aprobadas \
  -H "Authorization: Bearer TOKEN"

# 2. Asignar oferta
curl -X POST http://localhost:8000/api/ofertas-confeccion/asignar-a-cliente \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oferta_generica_id":"ID","cliente_numero":"CL-001"}'
```

## ✨ Resultado Final

El usuario podrá:
1. Ver lista de clientes
2. Hacer clic en "Asignar Oferta"
3. Seleccionar una oferta genérica
4. Ver la nueva oferta creada automáticamente
5. Editarla si es necesario
6. Reservar materiales cuando esté lista

---

**¿Necesitas más detalles?** Consulta la documentación completa en `docs/ASIGNAR_OFERTA_GENERICA_A_CLIENTE.md`

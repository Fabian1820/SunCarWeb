# Resumen de Cambios en el Frontend - Código de Cliente

## 📅 Fecha
19 de febrero de 2026

## 🎯 Objetivo
Actualizar el frontend para que use la oferta confeccionada en lugar de la oferta antigua del lead al generar el código de cliente.

## 🔧 Cambios Realizados

### 1. Archivo: `components/feats/leads/leads-table.tsx`

#### Función `openConvertDialog`

**Cambio Principal:** Verificar oferta confeccionada en lugar de inversor en oferta antigua

**ANTES:**
```typescript
// Verificaba si el lead tenía inversor en la oferta antigua
const tieneInversor = lead.ofertas && lead.ofertas.length > 0 && lead.ofertas[0].inversor_codigo

if (!tieneInversor) {
  // Preguntar si es equipo propio
}
```

**AHORA:**
```typescript
// Verifica si el lead tiene oferta confeccionada
const tieneOfertaConfeccionada = leadsConOferta.has(leadId)

if (!tieneOfertaConfeccionada) {
  // Preguntar si es equipo propio o crear oferta confeccionada
}
```

#### Mejoras en el Manejo de Errores

Se agregó detección específica de errores del backend:

```typescript
// Detectar errores específicos del backend
if (errorMessage.includes('ofertas confeccionadas')) {
  setConversionErrors({
    general: 'Este lead necesita una oferta confeccionada antes de generar el código. Crea una oferta confeccionada o marca el equipo como propio del cliente.'
  })
} else if (errorMessage.includes('inversor seleccionado')) {
  setConversionErrors({
    general: 'La oferta confeccionada debe tener un inversor seleccionado. Edita la oferta o marca el equipo como propio del cliente.'
  })
} else if (errorMessage.includes('marca_id')) {
  setConversionErrors({
    general: 'El material inversor no tiene marca asignada. Contacta al administrador para configurar la marca del material.'
  })
}
```

#### Botón para Crear Oferta Confeccionada

Se agregó un botón en el mensaje de error que permite crear una oferta confeccionada:

```typescript
{(conversionErrors.general.includes('oferta confeccionada') || 
  conversionErrors.general.includes('inversor seleccionado')) && (
  <Button
    onClick={() => {
      closeConvertDialog()
      openAsignarOfertaDialog(leadToConvert)
    }}
  >
    Crear Oferta Confeccionada
  </Button>
)}
```

#### Actualización del Flujo de Equipo Propio

Se mejoró la pregunta sobre equipo propio:

**ANTES:**
- "Sí, es propio" / "No, necesita equipo" (mostraba error)

**AHORA:**
- "Sí, es equipo propio del cliente" → Genera código con prefijo P
- "No, crear oferta confeccionada" → Abre diálogo para crear oferta

### 2. Archivo: `docs/FRONTEND_CAMBIOS_CODIGO_CLIENTE.md`

Se actualizó la documentación para reflejar los cambios implementados y marcar las tareas completadas.

## 🔄 Flujo Actualizado

### Conversión de Lead a Cliente

```
1. Usuario hace clic en "Convertir a cliente"
   ↓
2. Sistema verifica si el lead tiene oferta confeccionada
   ↓
3a. SI TIENE OFERTA CONFECCIONADA:
    - Genera código automáticamente usando la marca del inversor de la oferta confeccionada
    - Muestra formulario de conversión con código pre-llenado
   ↓
3b. NO TIENE OFERTA CONFECCIONADA:
    - Muestra pregunta: "¿El equipo es propio del cliente?"
    - Opción A: "Sí, es equipo propio" → Genera código con prefijo P
    - Opción B: "No, crear oferta confeccionada" → Abre diálogo para crear oferta
   ↓
4. Si hay error:
    - Muestra mensaje de error específico
    - Ofrece botón para crear oferta confeccionada (si aplica)
```

## ✅ Beneficios

1. **Consistencia:** El código de cliente ahora se genera usando la misma fuente de datos (oferta confeccionada) que se usa para el nombre del cliente
2. **Mejor UX:** Mensajes de error más claros con acciones sugeridas
3. **Flujo guiado:** El usuario es dirigido a crear una oferta confeccionada si es necesario
4. **Flexibilidad:** Mantiene la opción de equipo propio para casos especiales

## 🧪 Casos de Prueba

### Caso 1: Lead con Oferta Confeccionada
- ✅ Genera código automáticamente
- ✅ Usa la marca del inversor de la oferta confeccionada
- ✅ Formato: 1 letra + 9 dígitos (ej: F020400208)

### Caso 2: Lead sin Oferta Confeccionada
- ✅ Muestra pregunta sobre equipo propio
- ✅ Opción "Sí" genera código con prefijo P
- ✅ Opción "No" abre diálogo para crear oferta

### Caso 3: Error - Sin Oferta Confeccionada
- ✅ Muestra mensaje claro
- ✅ Ofrece botón para crear oferta confeccionada

### Caso 4: Error - Oferta sin Inversor
- ✅ Muestra mensaje específico
- ✅ Ofrece botón para crear/editar oferta

### Caso 5: Error - Material sin Marca
- ✅ Muestra mensaje indicando problema de configuración
- ✅ Sugiere contactar al administrador

## 📝 Notas Técnicas

- El estado `leadsConOferta` ya existe en el componente y se mantiene actualizado
- No se requieren cambios en el servicio `lead-service.ts` ya que los endpoints no cambiaron
- El componente `create-client-dialog.tsx` no requiere cambios porque crea leads temporales
- La validación del formato del código (10 caracteres) se mantiene igual

## 🚀 Próximos Pasos (Opcionales)

1. Agregar indicador visual en la tabla de leads mostrando si tienen oferta confeccionada
2. Agregar tooltip explicando el nuevo requisito
3. Agregar tutorial/guía para el nuevo flujo
4. Agregar validación en tiempo real del estado del lead
5. Mostrar preview del código antes de generarlo

## 📞 Soporte

Para más información, consulta:
- `docs/FRONTEND_CAMBIOS_CODIGO_CLIENTE.md` - Documentación completa
- `docs/ACTUALIZACION_CODIGO_CLIENTE_OFERTA_CONFECCIONADA.md` - Cambios en el backend

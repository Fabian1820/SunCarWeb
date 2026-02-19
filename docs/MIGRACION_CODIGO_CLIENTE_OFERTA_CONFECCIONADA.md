# Guía de Migración: Código de Cliente con Oferta Confeccionada

## 📅 Fecha de Implementación
19 de febrero de 2026

## 🎯 Resumen del Cambio

El sistema ahora genera el código de cliente usando la **oferta confeccionada** en lugar de la oferta antigua del lead.

### ¿Por qué este cambio?

**Problema anterior:**
- El código de cliente se generaba usando `lead.ofertas[0].inversor_codigo`
- El nombre del cliente se generaba usando la oferta confeccionada
- Esto causaba inconsistencias cuando la oferta antigua y la confeccionada tenían diferentes inversores

**Solución:**
- Ahora ambos (código y nombre) usan la misma fuente: la oferta confeccionada
- Garantiza consistencia en todo el sistema

## 🔄 Cambios en el Flujo de Trabajo

### ANTES (Flujo Antiguo)

```
1. Crear Lead
2. Asignar Inversor en la oferta del lead
3. Generar Código de Cliente (usa lead.ofertas[0].inversor_codigo)
4. Convertir a Cliente
```

### AHORA (Flujo Nuevo)

```
1. Crear Lead
2. Crear Oferta Confeccionada con inversor seleccionado
3. Generar Código de Cliente (usa oferta_confeccionada.inversor_seleccionado)
4. Convertir a Cliente
```

## 📋 Impacto en Usuarios

### Para Usuarios Finales (Comerciales)

**Cambio en el proceso:**
- Antes de convertir un lead a cliente, ahora DEBEN crear una oferta confeccionada
- Si intentan convertir sin oferta confeccionada, el sistema les preguntará:
  - ¿Es equipo propio del cliente? → Genera código con prefijo "P"
  - ¿Necesita crear oferta? → Abre diálogo para crear oferta confeccionada

**Ventajas:**
- Proceso más estructurado y consistente
- Menos errores por inconsistencias entre ofertas
- Mejor trazabilidad de las ofertas

### Para Desarrolladores

**Archivos modificados:**
- `components/feats/leads/leads-table.tsx` - Lógica de conversión actualizada
- `docs/BACKEND_CONVERSION_LEAD_CLIENTE.md` - Documentación actualizada
- `docs/FRONTEND_CAMBIOS_CODIGO_CLIENTE.md` - Guía de cambios

**Cambios técnicos:**
- Verificación de oferta confeccionada antes de generar código
- Manejo de errores mejorado con mensajes específicos
- Botón para crear oferta confeccionada desde el flujo de conversión

## 🧪 Casos de Uso

### Caso 1: Lead con Oferta Confeccionada (Flujo Normal)

```
Usuario: Hace clic en "Convertir a cliente"
Sistema: Verifica que el lead tiene oferta confeccionada
Sistema: Genera código automáticamente (ej: F020400208)
Sistema: Muestra formulario de conversión con código pre-llenado
Usuario: Completa datos adicionales (carnet, estado)
Usuario: Confirma conversión
Sistema: Crea el cliente exitosamente
```

### Caso 2: Lead sin Oferta Confeccionada

```
Usuario: Hace clic en "Convertir a cliente"
Sistema: Detecta que no hay oferta confeccionada
Sistema: Muestra pregunta: "¿El equipo es propio del cliente?"
Usuario: Selecciona una opción:
  
  Opción A: "Sí, es equipo propio del cliente"
    Sistema: Genera código con prefijo P (ej: P020400208)
    Sistema: Muestra formulario de conversión
    Usuario: Completa y confirma
    Sistema: Crea el cliente
  
  Opción B: "No, crear oferta confeccionada"
    Sistema: Cierra diálogo de conversión
    Sistema: Abre diálogo para crear oferta confeccionada
    Usuario: Crea la oferta con inversor seleccionado
    Usuario: Vuelve a intentar convertir
    Sistema: Ahora genera código usando la oferta creada
```

### Caso 3: Error - Oferta sin Inversor

```
Usuario: Hace clic en "Convertir a cliente"
Sistema: Verifica oferta confeccionada
Sistema: Detecta que la oferta no tiene inversor seleccionado
Sistema: Muestra error: "La oferta confeccionada debe tener un inversor seleccionado"
Sistema: Muestra botón "Crear Oferta Confeccionada"
Usuario: Hace clic en el botón
Sistema: Abre diálogo para editar/crear oferta
Usuario: Selecciona inversor y guarda
Usuario: Vuelve a intentar convertir
Sistema: Genera código exitosamente
```

## 🔧 Configuración Requerida

### Requisitos Previos

1. **Materiales con Marca Asignada:**
   - Todos los inversores deben tener `marca_id` configurado
   - Verificar en la base de datos: `SELECT codigo, descripcion, marca_id FROM materiales WHERE categoria = 'INVERSORES'`
   - Si algún inversor no tiene marca, asignarla antes de usarlo

2. **Provincias y Municipios:**
   - Deben estar correctamente configurados en la base de datos
   - Cada provincia debe tener un código único
   - Cada municipio debe estar asociado a una provincia

3. **Ofertas Confeccionadas:**
   - Los leads deben tener ofertas confeccionadas antes de convertirse
   - Las ofertas deben tener inversor seleccionado

## 📊 Validaciones Implementadas

### En el Frontend

1. **Verificación de Oferta Confeccionada:**
   ```typescript
   const tieneOfertaConfeccionada = leadsConOferta.has(leadId)
   ```

2. **Detección de Errores Específicos:**
   - Error: "ofertas confeccionadas" → Ofrece crear oferta
   - Error: "inversor seleccionado" → Ofrece editar oferta
   - Error: "marca_id" → Sugiere contactar administrador

3. **Validación de Formato:**
   - Código debe tener 10 caracteres
   - Formato: 1 letra + 9 dígitos
   - Ejemplo válido: F020400208
   - Ejemplo válido (equipo propio): P020400208

### En el Backend

1. **Verificación de Oferta Confeccionada:**
   - Si no hay oferta y no es equipo propio → Error 400
   - Si hay oferta pero sin inversor → Error 400

2. **Verificación de Marca:**
   - Si el material no tiene marca_id → Error 400

3. **Generación de Código:**
   - Usa marca del inversor de la oferta confeccionada
   - Genera consecutivo único por marca + provincia + municipio

## 🚨 Problemas Comunes y Soluciones

### Problema 1: "El lead no tiene ofertas confeccionadas"

**Causa:** El lead no tiene una oferta confeccionada asociada

**Solución:**
1. Hacer clic en el botón "Crear Oferta Confeccionada"
2. Seleccionar inversor y otros componentes
3. Guardar la oferta
4. Volver a intentar convertir

### Problema 2: "La oferta confeccionada no tiene inversor seleccionado"

**Causa:** La oferta existe pero no tiene inversor

**Solución:**
1. Hacer clic en el botón "Crear Oferta Confeccionada"
2. Editar la oferta existente
3. Seleccionar un inversor
4. Guardar cambios
5. Volver a intentar convertir

### Problema 3: "El material no tiene marca_id asignada"

**Causa:** El inversor en la base de datos no tiene marca configurada

**Solución:**
1. Contactar al administrador del sistema
2. El administrador debe asignar una marca al material inversor
3. Una vez asignada, volver a intentar convertir

### Problema 4: Código generado con formato incorrecto

**Causa:** Datos incompletos o incorrectos en el lead

**Solución:**
1. Verificar que el lead tenga provincia y municipio
2. Verificar que la oferta confeccionada tenga inversor
3. Verificar que el inversor tenga marca asignada
4. Si todo está correcto, contactar soporte técnico

## 📞 Soporte

### Documentación Relacionada

- `docs/FRONTEND_CAMBIOS_CODIGO_CLIENTE.md` - Guía completa de cambios en el frontend
- `docs/RESUMEN_CAMBIOS_FRONTEND_CODIGO_CLIENTE.md` - Resumen de implementación
- `docs/BACKEND_CONVERSION_LEAD_CLIENTE.md` - Especificación del backend
- `docs/ACTUALIZACION_CODIGO_CLIENTE_OFERTA_CONFECCIONADA.md` - Documentación del cambio en el backend

### Contacto

Para dudas o problemas:
1. Revisar esta documentación
2. Verificar los logs del navegador (F12 → Console)
3. Contactar al equipo de desarrollo con:
   - ID del lead
   - Mensaje de error completo
   - Pasos para reproducir el problema

## ✅ Checklist de Verificación

Antes de convertir un lead a cliente, verificar:

- [ ] El lead tiene provincia y municipio asignados
- [ ] El lead tiene una oferta confeccionada
- [ ] La oferta confeccionada tiene inversor seleccionado
- [ ] El inversor tiene marca asignada en la base de datos
- [ ] Si es equipo propio, marcar la opción correspondiente

## 🎓 Capacitación

### Para Nuevos Usuarios

1. **Crear Lead:** Ingresar datos básicos del cliente potencial
2. **Crear Oferta Confeccionada:** Seleccionar inversor y componentes
3. **Convertir a Cliente:** El sistema genera el código automáticamente
4. **Completar Datos:** Agregar carnet de identidad y estado

### Para Usuarios Existentes

**Cambio principal:** Ahora deben crear la oferta confeccionada ANTES de convertir el lead a cliente.

**Beneficio:** Mayor consistencia y menos errores en el sistema.

## 📈 Métricas de Éxito

- ✅ Reducción de inconsistencias entre código y nombre de cliente
- ✅ Mejor trazabilidad de ofertas
- ✅ Proceso más estructurado y predecible
- ✅ Mensajes de error más claros y accionables

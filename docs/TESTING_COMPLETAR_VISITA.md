# 🧪 Guía de Prueba: Completar Visita

## ⚡ Quick Start

### 1. Navegar al Módulo
```
Dashboard → Gestionar Instalaciones → Pendientes de Visita
```

### 2. Identificar el Nuevo Botón
Busca el botón **"Completada"** (color naranja) en cada fila de la tabla.
- **Antes:** Decía "Resultado"
- **Ahora:** Dice "Completada" con ícono de check ✓

## 📝 Escenario de Prueba 1: Oferta Cubre Necesidades

### Pasos:
1. Click en botón **"Completada"** de cualquier lead/cliente
2. En el diálogo que se abre:

**Estudio Energético:**
- Click en el área de carga
- Selecciona un archivo Excel o PDF
- Verifica que aparece el archivo listado

**Evidencia:**
- Click en el área de carga de evidencia
- Selecciona 2-3 fotos
- O escribe texto en el campo de descripción

**Resultado:**
- Click en el card verde: **"La oferta cubre las necesidades..."**
- Verifica que dice "Pendiente de instalación"

3. Click en **"Completar Visita"**
4. Debe mostrar toast de éxito
5. El lead/cliente debe desaparecer de la tabla

### ✅ Resultado Esperado:
- Lead/Cliente actualizado a estado "Pendiente de instalación"
- Aparece en: Instalaciones → Nuevas

---

## 📝 Escenario de Prueba 2: Se Necesita Material Extra

### Pasos:
1. Click en botón **"Completada"** de otro lead/cliente
2. En el diálogo:

**Estudio Energético:**
- Sube 1 archivo PDF

**Evidencia:**
- Escribe: "Cliente necesita instalación en techo inclinado"

**Resultado:**
- Click en el card púrpura: **"Se necesita cotizar material extra"**
- Verifica que dice "Pendiente de presupuesto"
- Debe aparecer selector de materiales

**Materiales Extra:**
- Click en "Agregar Material"
- Selecciona un material del dropdown
- Cambia cantidad a 5
- Click en "Agregar Material" otra vez
- Selecciona otro material diferente
- Cantidad: 2

3. Click en **"Completar Visita"**
4. Debe mostrar toast de éxito
5. El lead/cliente debe desaparecer de la tabla

### ✅ Resultado Esperado:
- Lead/Cliente actualizado a estado "Pendiente de presupuesto"
- Materiales guardados en el backend
- Debe aparecer en módulo de presupuestos (cuando esté implementado)

---

## 🚨 Escenarios de Error (Validaciones)

### Test 1: Sin Estudio Energético
1. Abre el diálogo
2. NO subas estudio energético
3. Sube solo evidencia
4. Selecciona resultado
5. Click "Completar Visita"

**Resultado:** ❌ Error toast: "Debe subir al menos un archivo de estudio energético"

---

### Test 2: Sin Evidencia
1. Abre el diálogo
2. Sube estudio energético
3. NO subas evidencia NI escribas texto
4. Selecciona resultado
5. Click "Completar Visita"

**Resultado:** ❌ Error toast: "Debe proporcionar evidencia (archivos o texto)"

---

### Test 3: Sin Resultado Seleccionado
1. Abre el diálogo
2. Sube estudio energético
3. Sube evidencia
4. NO selecciones ninguna opción de resultado
5. Click "Completar Visita"

**Resultado:** ❌ Error toast: "Debe seleccionar un resultado"

---

### Test 4: Opción 2 Sin Materiales
1. Abre el diálogo
2. Sube estudio energético
3. Sube evidencia
4. Selecciona Opción 2 (material extra)
5. NO agregues ningún material
6. Click "Completar Visita"

**Resultado:** ❌ Error toast: "Debe seleccionar al menos un material"

---

### Test 5: Material Sin Seleccionar
1. Abre el diálogo
2. Completa estudio y evidencia
3. Selecciona Opción 2
4. Click "Agregar Material"
5. NO selecciones producto (dejar en "Seleccionar material...")
6. Deja cantidad en 1
7. Click "Completar Visita"

**Resultado:** ❌ Error toast: "Todos los materiales deben tener un producto seleccionado y cantidad válida"

---

## 🎨 Pruebas de UI/UX

### Test: Eliminar Archivos
1. Sube 3 archivos de estudio energético
2. Click en la "X" del segundo archivo
3. Verifica que se elimina correctamente
4. Quedan 2 archivos

### Test: Eliminar Materiales
1. Agrega 3 materiales
2. Click en la "X" del material del medio
3. Verifica que se elimina
4. Quedan 2 materiales

### Test: Cambio de Opción
1. Selecciona Opción 2 (material extra)
2. Agrega 2 materiales
3. Cambia a Opción 1 (cubre necesidades)
4. Materiales deben seguir ahí
5. Cambia de nuevo a Opción 2
6. Materiales deben estar presentes

### Test: Cancelar
1. Llena todo el formulario
2. Click en "Cancelar"
3. Abre el diálogo de nuevo
4. Formulario debe estar limpio/vacío

---

## 📱 Pruebas Responsive

### Móvil:
1. Abre en pantalla pequeña (< 768px)
2. Botón "Completada" debe ser full-width
3. Selector de materiales debe ser 1 columna
4. Archivos deben mostrarse en grid de 2 columnas

### Desktop:
1. Abre en pantalla grande
2. Selector de materiales: 3 columnas
3. Archivos de evidencia: grid de 2 columnas
4. Diálogo centrado con max-width

---

## 🔍 Verificaciones en Consola

### Durante la Prueba:
Abre DevTools → Console y busca:

✅ **Logs esperados:**
```
🔍 Intentando cargar pendientes de visita...
✅ Respuesta recibida: {clientes: [...], leads: [...]}
```

❌ **No debe haber:**
```
Error al cargar materiales
Error al completar visita
```

---

## 🌐 Verificación Backend (Futuro)

### Cuando el backend esté listo:

**Endpoint para Leads:**
```bash
curl -X POST http://localhost:8000/api/leads/{id}/completar-visita \
  -H "Authorization: Bearer {token}" \
  -F "estudio_energetico_0=@estudio.pdf" \
  -F "evidencia_0=@foto1.jpg" \
  -F "evidencia_texto=Visita realizada" \
  -F "resultado=cubre" \
  -F "nuevo_estado=Pendiente de instalación"
```

**Endpoint para Clientes:**
```bash
curl -X POST http://localhost:8000/api/clientes/{numero}/completar-visita \
  -F "estudio_energetico_0=@estudio.xlsx" \
  -F "evidencia_0=@video.mp4" \
  -F "resultado=necesita_material" \
  -F "nuevo_estado=Pendiente de presupuesto" \
  -F 'materiales_extra=[{"material_id":"123","codigo":"INV-001","nombre":"Inversor","cantidad":2}]'
```

---

## 📊 Checklist de Pruebas

### Funcionalidad Básica:
- [ ] Botón "Completada" visible en la tabla
- [ ] Diálogo se abre al hacer click
- [ ] Nombre del lead/cliente aparece en el diálogo
- [ ] Badge de tipo (Lead/Cliente) es correcto

### Carga de Archivos:
- [ ] Estudio energético acepta Excel
- [ ] Estudio energético acepta PDF
- [ ] Estudio energético acepta Word
- [ ] Evidencia acepta imágenes
- [ ] Evidencia acepta videos
- [ ] Evidencia acepta audios
- [ ] Se pueden eliminar archivos subidos

### Evidencia de Texto:
- [ ] Textarea funciona correctamente
- [ ] Se puede escribir texto largo
- [ ] Texto O archivos es válido (al menos uno)

### Resultados:
- [ ] Card Opción 1 es seleccionable
- [ ] Card Opción 2 es seleccionable
- [ ] Solo una opción a la vez
- [ ] Visual feedback al seleccionar (borde y color)

### Materiales (Opción 2):
- [ ] Selector de materiales aparece solo con Opción 2
- [ ] Dropdown muestra todos los materiales
- [ ] Formato: código - nombre (categoría)
- [ ] Input de cantidad funciona
- [ ] Cantidad mínima es 1
- [ ] Se pueden agregar múltiples materiales
- [ ] Se pueden eliminar materiales

### Validaciones:
- [ ] Error si falta estudio energético
- [ ] Error si falta evidencia
- [ ] Error si falta resultado
- [ ] Error si Opción 2 sin materiales
- [ ] Error si material sin seleccionar
- [ ] Error si cantidad inválida

### Submit:
- [ ] Botón muestra "Guardando..." durante carga
- [ ] Toast de éxito al completar
- [ ] Diálogo se cierra automáticamente
- [ ] Tabla se recarga (onRefresh)
- [ ] Lead/Cliente desaparece de la lista

### Cancelar/Cerrar:
- [ ] Botón "Cancelar" cierra el diálogo
- [ ] Click fuera del diálogo lo cierra
- [ ] Formulario se limpia al cerrar
- [ ] No se envían datos al cancelar

---

## 🐛 Bugs Conocidos

Ninguno por el momento. Reporta cualquier problema encontrado.

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa la consola del navegador
2. Verifica que el backend esté corriendo
3. Confirma que tienes permisos adecuados
4. Consulta `docs/COMPLETAR_VISITA.md` para más detalles

---

**Última actualización:** 2024
**Versión:** 1.0.0
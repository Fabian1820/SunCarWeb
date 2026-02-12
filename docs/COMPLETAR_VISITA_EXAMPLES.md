# 🧪 Ejemplos Prácticos: Completar Visita

## 📋 Descripción

Este documento contiene ejemplos prácticos paso a paso para probar la funcionalidad "Completar Visita" en todos sus escenarios.

---

## 🎯 Ejemplo 1: Lead Sin Oferta Asignada

### Datos del Lead:
- **Nombre:** Juan Pérez
- **Teléfono:** +53 5555-1234
- **Estado actual:** Pendiente de visita
- **Tiene oferta:** ❌ NO

### Paso a Paso:

1. **Navegar al módulo:**
   ```
   Dashboard → Gestionar Instalaciones → Pendientes de Visita
   ```

2. **Buscar el lead:**
   - Buscar "Juan Pérez" en el campo de búsqueda
   - Verificar que aparece en la tabla con estado "Pendiente de visita"

3. **Abrir diálogo:**
   - Click en botón naranja "Completada"
   - Esperar a que aparezca el spinner azul
   - Mensaje: "Verificando oferta asignada..."

4. **Ver alerta sin oferta:**
   - Después de ~0.5s, aparece alerta naranja
   - Título: "⚠️ Sin Oferta Asignada"
   - Mensaje: "Este lead no tiene una oferta asignada. El estado se actualizará automáticamente a Pendiente de presupuesto."

5. **Completar formulario:**

   **Estudio Energético:**
   - Click en área de carga
   - Seleccionar archivo: `estudio_juan_perez.pdf`
   - Verificar que aparece en la lista con ícono de PDF

   **Evidencia:**
   - Opción A - Subir archivos:
     - Seleccionar 2 fotos: `foto_techo.jpg`, `foto_medidor.jpg`
   - Opción B - Escribir texto:
     - "Techo de zinc en buenas condiciones. Medidor accesible. Cliente muy interesado."

   **Resultado:**
   - NO se muestra sección de "Resultado"
   - El estado se determina automáticamente

6. **Enviar:**
   - Click en "Completar Visita"
   - Botón cambia a "Guardando..."
   - Esperar respuesta del backend

7. **Verificar resultado:**
   - Toast verde: "Visita completada"
   - Diálogo se cierra
   - Lead desaparece de la tabla
   - Buscar en: Gestión Comercial → Pendientes de Presupuesto

### Datos Enviados al Backend:

```json
FormData {
  estudio_energetico_0: File(estudio_juan_perez.pdf),
  evidencia_0: File(foto_techo.jpg),
  evidencia_1: File(foto_medidor.jpg),
  evidencia_texto: "Techo de zinc en buenas condiciones...",
  tiene_oferta: "false",
  resultado: "sin_oferta",
  nuevo_estado: "Pendiente de presupuesto"
}
```

### Respuesta Esperada:

```json
{
  "success": true,
  "message": "Visita completada. Lead sin oferta asignada.",
  "data": {
    "id": "64abc123def456789",
    "nombre": "Juan Pérez",
    "tenia_oferta": false,
    "estado_anterior": "Pendiente de visita",
    "estado_nuevo": "Pendiente de presupuesto",
    "resultado": "sin_oferta"
  }
}
```

---

## 🎯 Ejemplo 2: Cliente Con Oferta - Opción 1 (Cubre)

### Datos del Cliente:
- **Nombre:** María González
- **Número:** SUNCAR0001
- **Estado actual:** Pendiente de visita
- **Tiene oferta:** ✅ SÍ (Oferta #OFF-001)

### Paso a Paso:

1. **Abrir diálogo para cliente SUNCAR0001**

2. **Ver verificación de oferta:**
   - Spinner azul: "Verificando oferta asignada..."
   - Después de ~0.5s, desaparece
   - NO hay alerta naranja
   - Se muestran las 3 opciones

3. **Completar formulario:**

   **Estudio Energético:**
   - Subir: `estudio_energetico_maria.xlsx`

   **Evidencia:**
   - Subir 3 fotos: `casa_frente.jpg`, `techo.jpg`, `medidor.jpg`
   - Texto adicional: "Instalación en zona urbana, acceso fácil"

   **Resultado:**
   - Click en card verde (Opción 1)
   - Texto: "La oferta cubre las necesidades del cliente perfectamente"
   - Se muestra: "Estado: Pendiente de instalación" en verde

4. **Verificar antes de enviar:**
   - ✅ Estudio energético: 1 archivo Excel
   - ✅ Evidencia: 3 fotos + texto
   - ✅ Resultado: Opción 1 seleccionada (card verde resaltada)
   - ❌ NO hay selector de materiales (correcto, no es necesario)

5. **Enviar:**
   - Click "Completar Visita"
   - "Guardando..."

6. **Verificar resultado:**
   - Toast: "Visita completada. Cliente actualizado a estado: Pendiente de instalación"
   - Cliente desaparece de Pendientes de Visita
   - Buscar en: Instalaciones → Nuevas

### Datos Enviados:

```json
FormData {
  estudio_energetico_0: File(estudio_energetico_maria.xlsx),
  evidencia_0: File(casa_frente.jpg),
  evidencia_1: File(techo.jpg),
  evidencia_2: File(medidor.jpg),
  evidencia_texto: "Instalación en zona urbana, acceso fácil",
  tiene_oferta: "true",
  resultado: "oferta_cubre_necesidades",
  nuevo_estado: "Pendiente de instalación"
}
```

### Respuesta Esperada:

```json
{
  "success": true,
  "message": "Visita completada exitosamente",
  "data": {
    "numero": "SUNCAR0001",
    "nombre": "María González",
    "tenia_oferta": true,
    "estado_nuevo": "Pendiente de instalación",
    "resultado": "oferta_cubre_necesidades"
  }
}
```

---

## 🎯 Ejemplo 3: Lead Con Oferta - Opción 2 (Material Extra)

### Datos del Lead:
- **Nombre:** Pedro Martínez
- **Estado:** Pendiente de visita
- **Tiene oferta:** ✅ SÍ (Oferta básica de 5kW)

### Paso a Paso:

1. **Abrir diálogo**
   - Verificación OK → Muestra 3 opciones

2. **Completar formulario:**

   **Estudio Energético:**
   - Subir: `estudio_pedro.pdf`

   **Evidencia:**
   - Texto: "El techo es inclinado con ángulo de 45°. Se requiere estructura especial. También necesita cable adicional para mayor distancia."

   **Resultado:**
   - Click en card púrpura (Opción 2)
   - Texto: "Se necesita cotizar material extra"
   - Se muestra: "Estado: Pendiente de presupuesto" en púrpura

3. **Selector de materiales aparece:**
   - Mensaje: "Cargando materiales..." (spinner)
   - Después de ~1s, carga el catálogo completo

4. **Agregar materiales:**

   **Material 1:**
   - Click "Agregar Material"
   - Dropdown: Buscar "EST-200"
   - Seleccionar: "EST-200 - Estructura para techo inclinado (Estructuras)"
   - Cantidad: 1

   **Material 2:**
   - Click "Agregar Material" otra vez
   - Dropdown: Buscar "CAB-050"
   - Seleccionar: "CAB-050 - Cable solar 6mm (Cables)"
   - Cantidad: 50

5. **Verificar lista de materiales:**
   ```
   ┌────────────────────────────────────────┐
   │ EST-200 - Estructura...    Cant: 1   ❌│
   ├────────────────────────────────────────┤
   │ CAB-050 - Cable solar...   Cant: 50  ❌│
   └────────────────────────────────────────┘
   ```

6. **Enviar:**
   - Click "Completar Visita"
   - Validaciones:
     ✅ Estudio energético OK
     ✅ Evidencia OK
     ✅ Resultado seleccionado (Opción 2)
     ✅ Materiales: 2 materiales válidos

7. **Resultado:**
   - Estado: "Pendiente de presupuesto"
   - Buscar en: Gestión Comercial → Presupuestos

### Datos Enviados:

```json
FormData {
  estudio_energetico_0: File(estudio_pedro.pdf),
  evidencia_texto: "El techo es inclinado con ángulo de 45°...",
  tiene_oferta: "true",
  resultado: "necesita_material_extra",
  nuevo_estado: "Pendiente de presupuesto",
  materiales_extra: JSON.stringify([
    {
      material_id: "64abc111",
      codigo: "EST-200",
      nombre: "Estructura para techo inclinado",
      cantidad: 1
    },
    {
      material_id: "64abc222",
      codigo: "CAB-050",
      nombre: "Cable solar 6mm",
      cantidad: 50
    }
  ])
}
```

### Respuesta Esperada:

```json
{
  "success": true,
  "message": "Visita completada. Requiere cotización de materiales extra.",
  "data": {
    "id": "64abc789",
    "nombre": "Pedro Martínez",
    "tenia_oferta": true,
    "estado_nuevo": "Pendiente de presupuesto",
    "resultado": "necesita_material_extra",
    "materiales_extra": [
      {
        "material_id": "64abc111",
        "codigo": "EST-200",
        "nombre": "Estructura para techo inclinado",
        "cantidad": 1,
        "precio_unitario": 150.00
      },
      {
        "material_id": "64abc222",
        "codigo": "CAB-050",
        "nombre": "Cable solar 6mm",
        "cantidad": 50,
        "precio_unitario": 2.50
      }
    ],
    "total_materiales_extra": 275.00
  }
}
```

---

## 🎯 Ejemplo 4: Cliente Con Oferta - Opción 3 (Oferta Nueva)

### Datos del Cliente:
- **Nombre:** Ana López
- **Número:** SUNCAR0025
- **Estado:** Pendiente de visita
- **Tiene oferta:** ✅ SÍ (Oferta de 3kW - muy pequeña)

### Contexto:
Durante la visita se descubrió que el cliente tiene un consumo mucho mayor al estimado inicialmente. La oferta de 3kW no sirve, necesita al menos 10kW.

### Paso a Paso:

1. **Abrir diálogo → Verificación OK**

2. **Completar formulario:**

   **Estudio Energético:**
   - Subir: `estudio_ana_actualizado.xlsx` (con nuevos cálculos)

   **Evidencia:**
   - Subir: `factura_electricidad.jpg` (muestra consumo alto)
   - Texto: "Consumo real: 450 kWh/mes. La oferta actual de 3kW es insuficiente. Se requiere sistema de mínimo 10kW. Cliente tiene aire acondicionado y plancha eléctrica no mencionados en solicitud inicial."

   **Resultado:**
   - Click en card azul (Opción 3)
   - Texto: "Necesita una oferta completamente nueva"
   - Se muestra: "Estado: Pendiente de presupuesto" en azul

3. **Verificar:**
   - ✅ Estudio energético: 1 archivo
   - ✅ Evidencia: 1 foto + texto detallado
   - ✅ Opción 3 seleccionada (azul)
   - ❌ NO selector de materiales (correcto, necesita nueva oferta completa)

4. **Enviar:**
   - Click "Completar Visita"
   - "Guardando..."

5. **Resultado:**
   - Estado: "Pendiente de presupuesto"
   - Acción siguiente: El equipo comercial debe crear una nueva oferta de 10kW

### Datos Enviados:

```json
FormData {
  estudio_energetico_0: File(estudio_ana_actualizado.xlsx),
  evidencia_0: File(factura_electricidad.jpg),
  evidencia_texto: "Consumo real: 450 kWh/mes. La oferta actual de 3kW...",
  tiene_oferta: "true",
  resultado: "necesita_oferta_nueva",
  nuevo_estado: "Pendiente de presupuesto"
}
```

### Respuesta Esperada:

```json
{
  "success": true,
  "message": "Visita completada. Requiere nueva oferta comercial.",
  "data": {
    "numero": "SUNCAR0025",
    "nombre": "Ana López",
    "tenia_oferta": true,
    "oferta_anterior": "OFF-025 (3kW)",
    "estado_nuevo": "Pendiente de presupuesto",
    "resultado": "necesita_oferta_nueva",
    "motivo": "Oferta actual insuficiente - consumo real muy superior al estimado"
  }
}
```

---

## ❌ Ejemplo 5: Casos de Error

### Error 1: Sin Estudio Energético

**Pasos:**
1. Abrir diálogo
2. Solo completar evidencia
3. Seleccionar resultado
4. Click "Completar Visita"

**Resultado:**
```
🔴 Toast rojo de error
Título: "Campo requerido"
Descripción: "Debe subir al menos un archivo de estudio energético"
```

---

### Error 2: Sin Evidencia

**Pasos:**
1. Abrir diálogo
2. Solo subir estudio energético
3. NO subir archivos NI escribir texto
4. Seleccionar resultado
5. Submit

**Resultado:**
```
🔴 Toast rojo de error
Título: "Campo requerido"
Descripción: "Debe proporcionar evidencia (archivos o texto)"
```

---

### Error 3: Con Oferta Sin Resultado

**Pasos:**
1. Abrir diálogo (cliente CON oferta)
2. Completar estudio y evidencia
3. NO seleccionar ninguna de las 3 opciones
4. Submit

**Resultado:**
```
🔴 Toast rojo de error
Título: "Campo requerido"
Descripción: "Debe seleccionar un resultado"
```

---

### Error 4: Opción 2 Sin Materiales

**Pasos:**
1. Abrir diálogo (cliente con oferta)
2. Completar estudio y evidencia
3. Seleccionar Opción 2 (púrpura)
4. NO agregar materiales
5. Submit

**Resultado:**
```
🔴 Toast rojo de error
Título: "Materiales requeridos"
Descripción: "Debe seleccionar al menos un material"
```

---

### Error 5: Material Sin Seleccionar

**Pasos:**
1. Seleccionar Opción 2
2. Click "Agregar Material"
3. Dejar dropdown en "Seleccionar material..."
4. Cantidad: 1
5. Submit

**Resultado:**
```
🔴 Toast rojo de error
Título: "Material incompleto"
Descripción: "Todos los materiales deben tener un producto seleccionado y cantidad válida"
```

---

## 🧮 Tabla Resumen de Ejemplos

| Ejemplo | Tiene Oferta | Resultado | Estado Final | Materiales |
|---------|--------------|-----------|--------------|------------|
| 1. Juan | ❌ NO | (auto) | Presupuesto | NO |
| 2. María | ✅ SÍ | Opción 1 | Instalación | NO |
| 3. Pedro | ✅ SÍ | Opción 2 | Presupuesto | SÍ (2) |
| 4. Ana | ✅ SÍ | Opción 3 | Presupuesto | NO |

---

## 🎬 Escenarios de Prueba Completos

### Escenario A: Flujo Perfecto Sin Oferta
```
1. Lead "Carlos Ruiz" sin oferta
2. Abrir diálogo → Alerta naranja
3. Subir estudio.pdf + 2 fotos
4. Submit → Success
5. Verificar en Pendientes de Presupuesto
✅ PASS
```

### Escenario B: Flujo Perfecto Con Oferta → Instalación
```
1. Cliente "SUNCAR0050" con oferta
2. Abrir diálogo → 3 opciones
3. Estudio + evidencia + Opción 1
4. Submit → Success
5. Verificar en Instalaciones Nuevas
✅ PASS
```

### Escenario C: Flujo Con Material Extra
```
1. Lead con oferta
2. Opción 2 seleccionada
3. Agregar 3 materiales diferentes
4. Submit → Success
5. Verificar materiales en respuesta backend
✅ PASS
```

### Escenario D: Flujo Con Nueva Oferta
```
1. Cliente con oferta vieja
2. Opción 3 seleccionada
3. Evidencia detallada del problema
4. Submit → Success
5. Verificar en Presupuestos
✅ PASS
```

### Escenario E: Validaciones
```
1. Intentar submit sin estudio → Error ✅
2. Intentar submit sin evidencia → Error ✅
3. Con oferta sin resultado → Error ✅
4. Opción 2 sin materiales → Error ✅
5. Material sin ID → Error ✅
```

---

## 📝 Notas para Testing

### Archivos de Prueba Sugeridos:
- `estudio_test.pdf` (500 KB)
- `estudio_test.xlsx` (100 KB)
- `foto_test_1.jpg` (1 MB)
- `foto_test_2.jpg` (1 MB)
- `video_test.mp4` (5 MB)

### Texto de Evidencia de Ejemplo:
```
"Visita realizada el día [FECHA]. 

Observaciones:
- Techo en buenas condiciones
- Medidor accesible
- Espacio suficiente para inversor
- Cliente muy interesado
- Sin problemas estructurales

Recomendaciones:
- Proceder con instalación estándar
- No se requieren trabajos adicionales"
```

### Materiales Comunes para Pruebas:
- Estructuras: EST-100, EST-200
- Cables: CAB-050, CAB-100
- Protecciones: PROT-001
- Accesorios: ACC-010

---

**Versión:** 2.0.0  
**Última actualización:** 2024  
**Propósito:** Guía práctica con ejemplos reales para testing
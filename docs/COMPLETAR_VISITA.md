# Documentación: Completar Visita en Pendientes de Visita

## 📋 Descripción General

Esta funcionalidad permite a los usuarios completar el proceso de visita para leads y clientes que se encuentran en estado "Pendiente de visita". Al completar una visita, el sistema recopila información importante y actualiza automáticamente el estado del lead o cliente según el resultado de la evaluación **y la presencia de oferta asignada**.

## 🎯 Objetivo

Facilitar el registro estructurado de los resultados de visitas técnicas, permitiendo:
- Verificar automáticamente si el lead/cliente tiene oferta asignada
- Subir estudios energéticos
- Documentar evidencias de la visita
- Evaluar el resultado de la visita con 3 opciones posibles
- Cotizar materiales adicionales si es necesario
- Actualizar automáticamente el estado según reglas de negocio

## 🔄 Flujo de Trabajo Actualizado

```
Lead/Cliente en "Pendiente de Visita"
           ↓
   [Botón "Completada"]
           ↓
   Verificar Oferta Asignada
           ↓
     ┌─────┴─────┐
     NO         SÍ
     │          │
     │    ¿Resultado?
     │          │
     │    ┌─────┼─────┐
     │    │     │     │
     │  Op.1  Op.2  Op.3
     │    │     │     │
     └────┴─────┴─────┘
           ↓
    Estado actualizado
```

## 📊 Reglas de Negocio (Prioridad)

| Condición | Estado Final | Prioridad |
|-----------|--------------|-----------|
| **Sin oferta asignada** | `"Pendiente de presupuesto"` | **MÁXIMA** |
| Opción 1: Oferta cubre necesidades | `"Pendiente de instalación"` | Alta |
| Opción 2: Necesita material extra | `"Pendiente de presupuesto"` | Alta |
| Opción 3: Necesita oferta nueva | `"Pendiente de presupuesto"` | Alta |

### Explicación de Prioridades:

1. **Sin oferta asignada** (Prioridad máxima): Si el lead/cliente NO tiene oferta, automáticamente va a "Pendiente de presupuesto" sin importar qué opciones se muestren.

2. **Con oferta asignada**: Se muestran 3 opciones para el usuario:
   - **Opción 1**: La oferta actual es perfecta → Instalación
   - **Opción 2**: La oferta es buena pero falta material → Presupuesto + Materiales
   - **Opción 3**: La oferta no sirve, necesita una nueva → Presupuesto

## 📁 Archivos Modificados/Creados

### 1. Componente Actualizado: `completar-visita-dialog.tsx`
**Ubicación:** `components/feats/instalaciones/completar-visita-dialog.tsx`

**Nuevas Características:**
- ✅ Verificación automática de oferta al abrir el diálogo
- ✅ Alerta visual si no tiene oferta asignada
- ✅ 3 opciones de resultado (en lugar de 2)
- ✅ Lógica de decisión de estado basada en reglas de negocio
- ✅ Selector de materiales solo para Opción 2

**Props:**
```typescript
interface CompletarVisitaDialogProps {
  open: boolean                    // Control de visibilidad del diálogo
  onOpenChange: (open: boolean) => void  // Callback para cerrar/abrir
  pendiente: PendienteVisita | null      // Lead o cliente seleccionado
  onSuccess: () => void                  // Callback tras completar exitosamente
}
```

### 2. Tipos de Resultado:
```typescript
type ResultadoType =
  | "oferta_cubre_necesidades"      // Opción 1
  | "necesita_material_extra"       // Opción 2
  | "necesita_oferta_nueva"         // Opción 3
  | "";                             // Sin seleccionar
```

## 📝 Campos del Formulario

### 1. Verificación de Oferta (Automática)
- **Tipo:** Verificación automática al abrir el diálogo
- **Endpoints consultados:**
  - Leads: `/api/ofertas/confeccion/lead/{id}`
  - Clientes: `/api/ofertas/confeccion/cliente/{numero}`
- **Estados visuales:**
  - 🔄 Cargando: Spinner azul "Verificando oferta asignada..."
  - ⚠️ Sin oferta: Alerta naranja con mensaje explicativo
  - ✅ Con oferta: Muestra las 3 opciones de resultado

**Nota importante:** Si el backend devuelve 404 o el mensaje "No se encontraron ofertas", esto es **esperado y normal**. El sistema lo maneja correctamente mostrando la alerta naranja y continuando con el flujo sin oferta. NO es un error.

**Nota técnica:** La verificación de oferta usa `fetch` directamente en lugar de `apiRequest()` para evitar mostrar errores 404 en la consola del navegador, ya que este código es un comportamiento esperado y no un error real. Esto mejora la experiencia del desarrollador al no contaminar los logs con "errores" que son en realidad estados normales del sistema.

### 2. Estudio Energético (Requerido)
- **Tipo:** Carga de archivos
- **Formatos aceptados:** Excel (.xlsx, .xls, .csv), PDF (.pdf), Word (.doc, .docx)
- **Múltiples archivos:** Sí
- **Descripción:** Documentos técnicos con el análisis energético del sitio

### 3. Evidencia (Requerido)
Puede proporcionarse de dos formas (al menos una es obligatoria):

#### A. Archivos Multimedia
- **Formatos aceptados:** 
  - Imágenes: .jpg, .jpeg, .png, .gif, .webp
  - Videos: .mp4, .avi, .mov, .webm
  - Audios: .mp3, .wav, .ogg, .m4a
- **Múltiples archivos:** Sí

#### B. Texto Descriptivo
- **Tipo:** Textarea
- **Descripción:** Texto libre para describir lo observado durante la visita

### 4. Resultado (Condicional)
**Visible solo si:** El lead/cliente tiene oferta asignada  
**Requerido:** Sí (si tiene oferta)

#### Opción 1: "La oferta cubre las necesidades perfectamente"
- **Color:** Verde
- **Acción:** Actualiza el estado a **"Pendiente de instalación"**
- **Flujo siguiente:** El lead/cliente pasa directamente a instalación
- **Sin materiales extra:** No se requieren cotizaciones adicionales

#### Opción 2: "Se necesita cotizar material extra"
- **Color:** Púrpura
- **Acción:** Actualiza el estado a **"Pendiente de presupuesto"**
- **Campos adicionales:** Se despliega selector de materiales
- **Flujo siguiente:** Se debe generar presupuesto con materiales adicionales

#### Opción 3: "Necesita una oferta completamente nueva"
- **Color:** Azul
- **Acción:** Actualiza el estado a **"Pendiente de presupuesto"**
- **Flujo siguiente:** El equipo comercial debe crear una nueva oferta desde cero

### 5. Materiales Extra (Condicional)
**Visible solo si:** Se selecciona la Opción 2 (necesita material extra)

**Estructura por material:**
- **Material:** Dropdown con todos los materiales del catálogo
  - Formato: `{codigo} - {nombre} ({categoria})`
  - Ejemplo: "INV-001 - Inversor Growatt 5kW (Inversores)"
- **Cantidad:** Input numérico (mínimo: 1)
- **Acciones:** Botón para eliminar el material

**Funcionalidades:**
- ➕ Botón "Agregar Material" para añadir más líneas
- ❌ Botón eliminar por cada material
- Validación: Al menos 1 material con cantidad válida

## 🔐 Validaciones del Formulario

| Campo | Condición | Validación | Mensaje de Error |
|-------|-----------|------------|------------------|
| Estudio Energético | Siempre | Al menos 1 archivo | "Debe subir al menos un archivo de estudio energético" |
| Evidencia | Siempre | Archivos O texto (al menos uno) | "Debe proporcionar evidencia (archivos o texto)" |
| Resultado | Si tiene oferta | Opción seleccionada | "Debe seleccionar un resultado" |
| Materiales | Si Opción 2 | Al menos 1 material | "Debe seleccionar al menos un material" |
| Material Individual | Si Opción 2 | ID válido y cantidad ≥ 1 | "Todos los materiales deben tener un producto seleccionado y cantidad válida" |

**Nota:** Si NO tiene oferta, el campo "Resultado" no se muestra y no es requerido.

## 🌐 Integración con Backend

### Endpoints Consultados

#### Verificación de Oferta (GET)
```
GET /api/ofertas/confeccion/lead/{lead_id}
GET /api/ofertas/confeccion/cliente/{numero_cliente}
```

#### Completar Visita (POST)
```
POST /api/leads/{lead_id}/completar-visita
POST /api/clientes/{numero_cliente}/completar-visita
```

### Formato de Datos: FormData

El formulario envía los datos como `multipart/form-data` para soportar carga de archivos:

```javascript
FormData {
  // Archivos de estudio energético
  estudio_energetico_0: File
  estudio_energetico_1: File
  ...
  
  // Archivos de evidencia
  evidencia_0: File
  evidencia_1: File
  ...
  
  // Texto de evidencia (opcional)
  evidencia_texto: string
  
  // Información de oferta
  tiene_oferta: "true" | "false"
  
  // Resultado (si tiene oferta)
  resultado: "oferta_cubre_necesidades" | "necesita_material_extra" | "necesita_oferta_nueva" | "sin_oferta"
  
  // Estado calculado según reglas de negocio
  nuevo_estado: "Pendiente de instalación" | "Pendiente de presupuesto"
  
  // Materiales extra (solo si resultado = "necesita_material_extra")
  materiales_extra: JSON.stringify([
    {
      material_id: string,
      codigo: string,
      nombre: string,
      cantidad: number
    }
  ])
}
```

### Respuesta Esperada del Backend

#### Caso 1: Sin Oferta Asignada
```json
{
  "success": true,
  "message": "Visita completada. Lead sin oferta asignada.",
  "data": {
    "id": "64abc123def456789",
    "tipo": "lead",
    "nombre": "Juan Pérez",
    "tenia_oferta": false,
    "estado_anterior": "Pendiente de visita",
    "estado_nuevo": "Pendiente de presupuesto",
    "resultado": "sin_oferta",
    "motivo": "Lead sin oferta asignada - requiere presupuesto",
    "archivos_guardados": {
      "estudio_energetico": ["/uploads/estudios/..."],
      "evidencia": ["/uploads/evidencias/..."]
    },
    "fecha_completado": "2024-01-15T14:30:00Z"
  }
}
```

#### Caso 2: Oferta Cubre Necesidades (Opción 1)
```json
{
  "success": true,
  "message": "Visita completada exitosamente",
  "data": {
    "id": "SUNCAR0001",
    "tipo": "cliente",
    "nombre": "María González",
    "tenia_oferta": true,
    "estado_anterior": "Pendiente de visita",
    "estado_nuevo": "Pendiente de instalación",
    "resultado": "oferta_cubre_necesidades",
    "archivos_guardados": {
      "estudio_energetico": ["/uploads/estudios/..."],
      "evidencia": ["/uploads/evidencias/..."]
    },
    "fecha_completado": "2024-01-15T15:45:00Z"
  }
}
```

#### Caso 3: Necesita Material Extra (Opción 2)
```json
{
  "success": true,
  "message": "Visita completada. Requiere cotización de materiales extra.",
  "data": {
    "id": "SUNCAR0002",
    "tipo": "cliente",
    "nombre": "Pedro Martínez",
    "tenia_oferta": true,
    "estado_anterior": "Pendiente de visita",
    "estado_nuevo": "Pendiente de presupuesto",
    "resultado": "necesita_material_extra",
    "materiales_extra": [
      {
        "material_id": "64abc123",
        "codigo": "EST-200",
        "nombre": "Estructura para techo inclinado",
        "cantidad": 1,
        "precio_unitario": 150.00
      }
    ],
    "total_materiales_extra": 150.00,
    "fecha_completado": "2024-01-15T16:00:00Z"
  }
}
```

#### Caso 4: Necesita Oferta Nueva (Opción 3)
```json
{
  "success": true,
  "message": "Visita completada. Requiere nueva oferta comercial.",
  "data": {
    "id": "64abc456",
    "tipo": "lead",
    "nombre": "Ana López",
    "tenia_oferta": true,
    "estado_anterior": "Pendiente de visita",
    "estado_nuevo": "Pendiente de presupuesto",
    "resultado": "necesita_oferta_nueva",
    "motivo": "Oferta actual no se ajusta a necesidades reales del cliente",
    "fecha_completado": "2024-01-15T16:30:00Z"
  }
}
```

## 🎨 UI/UX

### Estados Visuales

1. **Verificación de Oferta:**
   - Spinner azul con texto "Verificando oferta asignada..."
   - Se muestra al abrir el diálogo

2. **Sin Oferta Asignada:**
   - Card naranja con ícono de alerta (AlertTriangle)
   - Texto: "Sin Oferta Asignada"
   - Mensaje explicativo sobre actualización automática a "Pendiente de presupuesto"

3. **Con Oferta Asignada:**
   - Sección "Resultado de la Visita" visible
   - 3 cards clicables con colores diferentes:
     - Verde: Opción 1
     - Púrpura: Opción 2 (con selector de materiales)
     - Azul: Opción 3

4. **Archivos Subidos:**
   - Cards individuales por archivo
   - Íconos según tipo (Excel, PDF, Word, Imagen, Video, Audio)
   - Botón eliminar (X) en cada card

5. **Botón Submit:**
   - Texto: "Completar Visita"
   - Color: Orange (brand)
   - Loading state: "Guardando..."
   - Deshabilitado durante verificación de oferta

### Colores por Resultado

| Resultado | Color Border | Color Fondo | Color Texto Estado |
|-----------|--------------|-------------|-------------------|
| Opción 1: Cubre | Verde (#10b981) | Verde claro (#f0fdf4) | Verde oscuro (#047857) |
| Opción 2: Material | Púrpura (#a855f7) | Púrpura claro (#faf5ff) | Púrpura oscuro (#7e22ce) |
| Opción 3: Nueva | Azul (#3b82f6) | Azul claro (#eff6ff) | Azul oscuro (#1e40af) |

## 🔄 Estados del Sistema

### Estados Iniciales Aceptados
- ✅ "Pendiente de visita" (único estado que muestra este módulo)

### Tabla de Transiciones de Estado

| Tiene Oferta | Resultado Seleccionado | Nuevo Estado | Siguiente Módulo |
|--------------|------------------------|--------------|------------------|
| ❌ NO | (No aplica) | **Pendiente de presupuesto** | Gestión Comercial → Crear Oferta |
| ✅ SÍ | Opción 1: Cubre | **Pendiente de instalación** | Instalaciones Nuevas |
| ✅ SÍ | Opción 2: Material Extra | **Pendiente de presupuesto** | Gestión Comercial → Presupuesto Materiales |
| ✅ SÍ | Opción 3: Oferta Nueva | **Pendiente de presupuesto** | Gestión Comercial → Crear Oferta |

## 🧪 Casos de Prueba

### Test 1: Lead Sin Oferta Asignada
```
1. Abrir diálogo de completar visita para lead sin oferta
2. Verificar que aparece alerta naranja "Sin Oferta Asignada"
3. Verificar que NO se muestra la sección "Resultado de la Visita"
4. Subir estudio energético y evidencia
5. Click "Completar Visita"
→ Estado debe ser: "Pendiente de presupuesto"
→ Campo "tiene_oferta": false
→ Campo "resultado": "sin_oferta"
```

### Test 2: Cliente Con Oferta - Opción 1 (Cubre)
```
1. Abrir diálogo para cliente con oferta asignada
2. Verificar que NO aparece alerta naranja
3. Verificar que se muestran las 3 opciones
4. Subir estudio energético y evidencia
5. Seleccionar Opción 1 (verde)
6. Click "Completar Visita"
→ Estado debe ser: "Pendiente de instalación"
→ Campo "resultado": "oferta_cubre_necesidades"
→ Sin materiales extra
```

### Test 3: Lead Con Oferta - Opción 2 (Material Extra)
```
1. Abrir diálogo para lead con oferta
2. Subir estudio energético y evidencia
3. Seleccionar Opción 2 (púrpura)
4. Verificar que aparece selector de materiales
5. Agregar 2 materiales con cantidades
6. Click "Completar Visita"
→ Estado debe ser: "Pendiente de presupuesto"
→ Campo "resultado": "necesita_material_extra"
→ Campo "materiales_extra": array con 2 materiales
```

### Test 4: Cliente Con Oferta - Opción 3 (Oferta Nueva)
```
1. Abrir diálogo para cliente con oferta
2. Subir estudio energético y evidencia
3. Seleccionar Opción 3 (azul)
4. Click "Completar Visita"
→ Estado debe ser: "Pendiente de presupuesto"
→ Campo "resultado": "necesita_oferta_nueva"
→ Sin materiales extra
```

### Test 5: Validación - Opción 2 Sin Materiales
```
1. Abrir diálogo para lead con oferta
2. Completar estudio y evidencia
3. Seleccionar Opción 2
4. NO agregar materiales
5. Click "Completar Visita"
→ Error: "Debe seleccionar al menos un material"
```

### Test 6: Validación - Con Oferta Sin Resultado
```
1. Abrir diálogo para cliente con oferta
2. Completar estudio y evidencia
3. NO seleccionar ninguna opción de resultado
4. Click "Completar Visita"
→ Error: "Debe seleccionar un resultado"
```

## 📊 Lógica de Decisión del Estado

### Función `determinarNuevoEstado()`

```typescript
const determinarNuevoEstado = (): string => {
  // Prioridad máxima: Sin oferta asignada
  if (tieneOferta === false) {
    return "Pendiente de presupuesto";
  }

  // Con oferta asignada, según resultado
  switch (resultado) {
    case "oferta_cubre_necesidades":
      return "Pendiente de instalación";
    case "necesita_material_extra":
      return "Pendiente de presupuesto";
    case "necesita_oferta_nueva":
      return "Pendiente de presupuesto";
    default:
      return "Pendiente de presupuesto";
  }
};
```

### Diagrama de Flujo de Decisión

```
┌─────────────────────┐
│ Completar Visita    │
└──────────┬──────────┘
           │
           ▼
    ¿Tiene Oferta?
           │
    ┌──────┴──────┐
    NO           SÍ
    │            │
    │      ¿Resultado?
    │            │
    │    ┌───────┼───────┐
    │    │       │       │
    │  Op.1    Op.2    Op.3
    │ Cubre  Material Nueva
    │    │       │       │
    └────┴───────┴───────┘
         │       │       │
         ▼       ▼       ▼
    Presup. Instalac. Presup.
```

## 🚀 Mejoras Futuras

1. **Histórico de Visitas:**
   - Ver todas las visitas completadas
   - Timeline de cambios de estado
   - Comparación de ofertas rechazadas

2. **Notificaciones Automáticas:**
   - Email al cliente confirmando visita
   - Alerta al equipo comercial si necesita nueva oferta
   - Notificación a brigadas si está listo para instalación

3. **Analytics de Visitas:**
   - % de ofertas que cubren necesidades
   - Materiales más solicitados como extras
   - Tasa de conversión por resultado

4. **Mejora de Evidencia:**
   - Captura de fotos directamente desde la cámara
   - Grabación de notas de voz in-app
   - Plantillas de checklist por tipo de instalación

## 📚 Referencias

- **Componente Principal:** `components/feats/instalaciones/completar-visita-dialog.tsx`
- **Tabla de Pendientes:** `components/feats/instalaciones/pendientes-visita-table.tsx`
- **Material Service:** `lib/services/feats/materials/material-service.ts`
- **API Config:** `lib/api-config.ts`
- **Tipos:** `lib/types/feats/instalaciones/instalaciones-types.ts`

## 👥 Roles y Permisos

**Usuarios con acceso:**
- ✅ Técnicos de instalación
- ✅ Coordinadores de brigadas
- ✅ Administradores
- ✅ Comerciales con permisos de seguimiento

**Usuarios sin acceso:**
- ❌ Clientes/Leads
- ❌ Usuarios con permisos de solo lectura

---

**Última actualización:** 2024  
**Versión:** 2.0.0 (Actualizado con 3 opciones y verificación de oferta)  
**Autor:** Equipo de Desarrollo SunCar
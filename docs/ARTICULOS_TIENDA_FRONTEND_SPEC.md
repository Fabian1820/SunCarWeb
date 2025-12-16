# Especificación Frontend - Artículos Tienda

## Resumen de Problemas Reportados

1. ✅ **Crear artículo**: Funciona correctamente
2. ❌ **Editar - descripcion_uso**: Si está vacía y se agrega, se guarda. Pero luego si se quiere eliminar (string vacío), no se elimina.
3. ❌ **Editar - precio_por_cantidad**: No se guarda cuando se agrega (ej: 36 unidades a $105)
4. ❌ **Editar - especificaciones**: No se guarda cuando se agrega (ej: voltaje: "590W")

---

## 📋 Formato de Datos que Envía el Frontend

### 1. **CREAR Artículo** (POST `/api/articulos-tienda/`)

El frontend envía un `FormData` con los siguientes campos:

```javascript
// Campos OBLIGATORIOS
formData.append('categoria', 'Paneles')
formData.append('modelo', 'Panel Solar 550W')
formData.append('unidad', 'pieza')  // "pieza" o "set"
formData.append('precio', '1000')   // String del número

// Campos OPCIONALES - Solo si tienen valor
formData.append('descripcion_uso', 'Panel solar de alta eficiencia')  // Solo si hay texto

// Foto - Solo si se seleccionó archivo
formData.append('foto', File)  // Objeto File del input

// especificaciones - Solo si tiene contenido
formData.append('especificaciones', '{"voltaje":"590W","capacidad":"10kWh"}')  // JSON string

// precio_por_cantidad - Solo si tiene contenido
formData.append('precio_por_cantidad', '{"36":105,"50":95}')  // JSON string
```

**Ejemplo real de creación:**
```javascript
const formData = new FormData()
formData.append('categoria', 'Paneles')
formData.append('modelo', 'Panel 550W')
formData.append('unidad', 'pieza')
formData.append('precio', '1000')
formData.append('descripcion_uso', 'Descripción del panel')
formData.append('especificaciones', '{"voltaje":"590W"}')
formData.append('precio_por_cantidad', '{"36":105}')

// Envía: POST /api/articulos-tienda/ con Content-Type: multipart/form-data
```

---

### 2. **EDITAR Artículo** (PUT `/api/articulos-tienda/{id}`)

El frontend envía un `FormData` con **SOLO los campos que se quieren modificar**:

#### Caso 1: Agregar descripcion_uso
```javascript
const formData = new FormData()
formData.append('descripcion_uso', 'Nueva descripción')
// Otros campos NO se incluyen (quedan igual)
```

#### Caso 2: ELIMINAR descripcion_uso
```javascript
const formData = new FormData()
formData.append('descripcion_uso', '')  // String vacío para eliminar
```

#### Caso 3: Agregar especificaciones
```javascript
const formData = new FormData()
formData.append('especificaciones', '{"voltaje":"590W"}')  // JSON string
```

#### Caso 4: ELIMINAR especificaciones
```javascript
const formData = new FormData()
formData.append('especificaciones', '')  // String vacío para eliminar
```

#### Caso 5: Agregar precio_por_cantidad
```javascript
const formData = new FormData()
formData.append('precio_por_cantidad', '{"36":105,"50":95}')  // JSON string
```

#### Caso 6: ELIMINAR precio_por_cantidad
```javascript
const formData = new FormData()
formData.append('precio_por_cantidad', '')  // String vacío para eliminar
```

#### Caso 7: NO TOCAR especificaciones ni precio_por_cantidad
```javascript
const formData = new FormData()
formData.append('precio', '1500')  // Solo actualizar precio
// NO se incluyen especificaciones ni precio_por_cantidad
// (backend no debe tocar estos campos)
```

---

## 🔍 Logs de Debugging

### Frontend Console Logs

Cuando se edita un artículo, deberías ver:

```
[Form] Modo edición - Enviando especificaciones: {voltaje: "590W"}
[Form] Modo edición - Enviando precio_por_cantidad: {36: 105}
[Form] Datos a enviar: {categoria: "Paneles", modelo: "Panel 550W", ...}

[ArticuloTiendaService] Actualizando artículo: 673fd8e0b05c3a0bb0df26cb {categoria: "Paneles", ...}
[ArticuloTiendaService] Especificaciones enviadas: {"voltaje":"590W"}
[ArticuloTiendaService] Precio por cantidad enviado: {"36":105}
[ArticuloTiendaService] Enviando PUT request a: /articulos-tienda/673fd8e0b05c3a0bb0df26cb
[ArticuloTiendaService] Respuesta recibida: {...}
```

### Network Tab (DevTools)

**Request Headers:**
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
Authorization: Bearer {token}
```

**Request Payload (FormData):**
```
------WebKitFormBoundary...
Content-Disposition: form-data; name="categoria"

Paneles
------WebKitFormBoundary...
Content-Disposition: form-data; name="especificaciones"

{"voltaje":"590W"}
------WebKitFormBoundary...
Content-Disposition: form-data; name="precio_por_cantidad"

{"36":105}
------WebKitFormBoundary...
```

---

## 🧪 Casos de Prueba

### Test 1: Agregar especificaciones a artículo existente sin especificaciones

**Estado inicial:**
```json
{
  "id": "123",
  "categoria": "Paneles",
  "modelo": "Panel 550W",
  "especificaciones": null
}
```

**Frontend envía:**
```javascript
formData.append('especificaciones', '{"voltaje":"590W"}')
```

**Esperado en BD:**
```json
{
  "especificaciones": {"voltaje": "590W"}
}
```

---

### Test 2: Agregar precio_por_cantidad a artículo existente sin precios

**Estado inicial:**
```json
{
  "id": "123",
  "precio_por_cantidad": null
}
```

**Frontend envía:**
```javascript
formData.append('precio_por_cantidad', '{"36":105}')
```

**Esperado en BD:**
```json
{
  "precio_por_cantidad": {"36": 105}
}
```

---

### Test 3: Eliminar descripcion_uso existente

**Estado inicial:**
```json
{
  "descripcion_uso": "Descripción antigua"
}
```

**Frontend envía:**
```javascript
formData.append('descripcion_uso', '')
```

**Esperado en BD:**
```json
{
  "descripcion_uso": null  // o "" según implementación del backend
}
```

---

## ⚠️ Errores Comunes del Frontend (YA CORREGIDOS)

### ❌ Error 1: Enviar `undefined` en modo edición
```javascript
// MAL - El backend no recibe nada
if (Object.keys(especificaciones).length > 0) {
  data.especificaciones = especificaciones
}
// Si está vacío, no se envía nada
```

### ✅ Corrección: Siempre enviar en modo edición
```javascript
// BIEN - El backend recibe {} para eliminar
data.especificaciones = especificaciones  // Siempre enviar
```

### ❌ Error 2: Enviar objeto JavaScript en lugar de JSON string
```javascript
// MAL
formData.append('especificaciones', {voltaje: "590W"})
// Se envía como "[object Object]"
```

### ✅ Corrección: Stringify el objeto
```javascript
// BIEN
formData.append('especificaciones', JSON.stringify({voltaje: "590W"}))
// Se envía como '{"voltaje":"590W"}'
```

---

## 📤 Qué Debe Hacer el Backend

### Al recibir PUT con especificaciones
```python
# Si recibe '{"voltaje":"590W"}' (string JSON)
especificaciones = json.loads(form_data['especificaciones'])  # Parse JSON
articulo.especificaciones = especificaciones  # Actualizar

# Si recibe '' (string vacío)
articulo.especificaciones = None  # Eliminar

# Si NO recibe el campo
# NO tocar articulo.especificaciones (dejar como está)
```

### Al recibir PUT con precio_por_cantidad
```python
# Si recibe '{"36":105}' (string JSON)
precio_por_cantidad = json.loads(form_data['precio_por_cantidad'])  # Parse JSON
articulo.precio_por_cantidad = precio_por_cantidad  # Actualizar

# Si recibe '' (string vacío)
articulo.precio_por_cantidad = None  # Eliminar

# Si NO recibe el campo
# NO tocar articulo.precio_por_cantidad (dejar como está)
```

---

## 🔧 Archivos del Frontend Involucrados

1. **Formulario**: `components/feats/articulos-tienda/articulo-tienda-form.tsx`
   - Líneas 130-203: `handleSubmit()` - Prepara datos para enviar
   - Líneas 163-177: Lógica de modo edición vs creación

2. **Servicio**: `lib/services/feats/articulos-tienda/articulo-tienda-service.ts`
   - Líneas 53-115: `createArticulo()` - Envía POST
   - Líneas 117-198: `updateArticulo()` - Envía PUT
   - Líneas 158-180: Manejo de especificaciones y precio_por_cantidad

3. **Página**: `app/articulos-tienda/page.tsx`
   - Líneas 62-88: `handleUpdateArticulo()` - Callback de edición

---

## 📝 Comunicación con Backend

**Mensaje para el equipo de backend:**

> El frontend está enviando los datos correctamente según la especificación:
>
> - **JSON objects** (especificaciones, precio_por_cantidad) se envían como **JSON strings** en FormData
> - Para **agregar/actualizar**: `'{"key":"value"}'`
> - Para **eliminar**: `''` (string vacío)
> - Para **no tocar**: campo NO incluido en FormData
>
> Por favor verificar:
> 1. ¿El backend está parseando correctamente los JSON strings?
> 2. ¿El backend distingue entre string vacío (eliminar) vs campo ausente (no tocar)?
> 3. ¿Hay logs del backend que muestren qué recibe en cada campo?
>
> Ejemplos de lo que recibe el backend en FormData:
> - `especificaciones: '{"voltaje":"590W"}'` → Parsear y guardar
> - `especificaciones: ''` → Poner en null
> - (campo especificaciones ausente) → No modificar

---

## 🐛 Debugging Checklist

Para el equipo de backend, verificar:

- [ ] El backend parsea `JSON.parse(form_data['especificaciones'])` cuando es string JSON
- [ ] El backend detecta `form_data['especificaciones'] == ''` para eliminar
- [ ] El backend NO modifica campos ausentes en el FormData
- [ ] Los cambios se guardan correctamente en MongoDB
- [ ] La respuesta incluye los datos actualizados

Para el frontend, verificar en DevTools:

- [ ] Console muestra logs `[Form]` con datos correctos
- [ ] Console muestra logs `[ArticuloTiendaService]` con JSON strings
- [ ] Network tab muestra FormData con formato correcto
- [ ] Response incluye los datos actualizados

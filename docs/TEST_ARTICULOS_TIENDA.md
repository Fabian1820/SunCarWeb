# Script de Pruebas - Artículos Tienda

## 🧪 Pruebas para Verificar Frontend → Backend

### Preparación

1. Abre las DevTools del navegador (F12)
2. Ve a la pestaña **Console**
3. Ve a la pestaña **Network**
4. Filtra por `articulos-tienda` en Network

---

## Test 1: Crear Artículo con Especificaciones

### Pasos:
1. Click en "Agregar Artículo"
2. Llenar:
   - Categoría: `Paneles`
   - Modelo: `Panel Test 550W`
   - Unidad: `pieza`
   - Precio: `1000`
   - Descripción: `Panel de prueba`
   - Agregar especificación:
     - Key: `voltaje`
     - Value: `590W`
     - Click "Agregar"
   - Agregar precio por cantidad:
     - Cantidad: `36`
     - Precio: `105`
     - Click "Agregar"
3. Click "Guardar"

### Verificar en Console:
```
✅ [Form] Datos a enviar: {
  categoria: "Paneles",
  modelo: "Panel Test 550W",
  unidad: "pieza",
  precio: 1000,
  descripcion_uso: "Panel de prueba",
  especificaciones: {voltaje: "590W"},
  precio_por_cantidad: {36: 105}
}

✅ [ArticuloTiendaService] Creando artículo: ...
✅ [ArticuloTiendaService] Especificaciones enviadas: {"voltaje":"590W"}
✅ [ArticuloTiendaService] Precio por cantidad enviado: {"36":105}
✅ [ArticuloTiendaService] Enviando POST request a /articulos-tienda/
✅ [ArticuloTiendaService] Artículo creado, respuesta: ...
```

### Verificar en Network Tab:
1. Click en la petición `POST articulos-tienda/`
2. Ve a **Payload** → **Form Data**
3. Deberías ver:
```
categoria: Paneles
modelo: Panel Test 550W
unidad: pieza
precio: 1000
descripcion_uso: Panel de prueba
especificaciones: {"voltaje":"590W"}
precio_por_cantidad: {"36":105}
```

### Verificar en BD:
```json
{
  "_id": "...",
  "categoria": "Paneles",
  "modelo": "Panel Test 550W",
  "especificaciones": {"voltaje": "590W"},
  "precio_por_cantidad": {"36": 105}
}
```

---

## Test 2: Editar - Agregar Especificaciones

### Pasos:
1. Selecciona un artículo SIN especificaciones
2. Click "Editar"
3. Agregar especificación:
   - Key: `voltaje`
   - Value: `590W`
   - Click "Agregar"
4. Click "Guardar"

### Verificar en Console:
```
✅ [Form] Modo edición - Enviando especificaciones: {voltaje: "590W"}
✅ [Form] Datos a enviar: {
  categoria: "...",
  especificaciones: {voltaje: "590W"},
  precio_por_cantidad: {}
}

✅ [ArticuloTiendaService] Actualizando artículo: 123 {...}
✅ [ArticuloTiendaService] Especificaciones enviadas: {"voltaje":"590W"}
✅ [ArticuloTiendaService] Eliminando precio_por_cantidad (string vacío)
✅ [ArticuloTiendaService] Enviando PUT request a: /articulos-tienda/123
```

### Verificar en Network Tab:
```
especificaciones: {"voltaje":"590W"}
precio_por_cantidad:
```
⚠️ **IMPORTANTE**: `precio_por_cantidad` debe aparecer como string vacío, NO ausente.

### Verificar en BD:
```json
{
  "especificaciones": {"voltaje": "590W"}  // ✅ Debe aparecer
}
```

---

## Test 3: Editar - Agregar Precio por Cantidad

### Pasos:
1. Selecciona un artículo SIN precio_por_cantidad
2. Click "Editar"
3. Agregar precio por cantidad:
   - Cantidad: `36`
   - Precio: `105`
   - Click "Agregar"
4. Click "Guardar"

### Verificar en Console:
```
✅ [Form] Modo edición - Enviando precio_por_cantidad: {36: 105}
✅ [ArticuloTiendaService] Precio por cantidad enviado: {"36":105}
```

### Verificar en Network Tab:
```
precio_por_cantidad: {"36":105}
especificaciones:
```

### Verificar en BD:
```json
{
  "precio_por_cantidad": {"36": 105}  // ✅ Debe aparecer
}
```

---

## Test 4: Editar - Eliminar Descripción

### Pasos:
1. Selecciona un artículo CON descripcion_uso
2. Click "Editar"
3. Borrar todo el texto de "Descripción de Uso"
4. Click "Guardar"

### Verificar en Console:
```
✅ [Form] Datos a enviar: {
  descripcion_uso: ""  // String vacío
}
```

### Verificar en Network Tab:
```
descripcion_uso:
```
⚠️ **IMPORTANTE**: Debe aparecer como string vacío, NO ausente.

### Verificar en BD:
```json
{
  "descripcion_uso": null  // o "" según backend
}
```

---

## Test 5: Editar - Eliminar Especificaciones

### Pasos:
1. Selecciona un artículo CON especificaciones
2. Click "Editar"
3. Elimina TODAS las especificaciones (click en el botón de basura)
4. Click "Guardar"

### Verificar en Console:
```
✅ [Form] Modo edición - Enviando especificaciones: {}
✅ [ArticuloTiendaService] Eliminando especificaciones (string vacío)
```

### Verificar en Network Tab:
```
especificaciones:
```
⚠️ **IMPORTANTE**: Debe aparecer como string vacío `''`, NO ausente, NO `"{}"`

### Verificar en BD:
```json
{
  "especificaciones": null  // o {} según backend
}
```

---

## Test 6: Editar - Solo Precio (No Tocar Especificaciones)

### Pasos:
1. Selecciona un artículo CON especificaciones existentes
2. Click "Editar"
3. **NO tocar las especificaciones**
4. Cambiar solo el precio a `1500`
5. Click "Guardar"

### Verificar en Console:
```
✅ [Form] Modo edición - Enviando especificaciones: {voltaje: "590W"}
```
⚠️ **NOTA**: Aunque se envían, deben ser las MISMAS que ya tenía el artículo.

### Verificar en Network Tab:
```
precio: 1500
especificaciones: {"voltaje":"590W"}
```

### Verificar en BD:
```json
{
  "precio": 1500,
  "especificaciones": {"voltaje": "590W"}  // ✅ Debe quedar IGUAL
}
```

---

## 🔍 Debugging

Si algo no funciona:

### 1. Verificar Logs del Frontend

Busca en Console:
- `[Form]` - Datos que el formulario prepara
- `[ArticuloTiendaService]` - Datos que el servicio envía
- Errores en rojo

### 2. Verificar Network Request

En la pestaña Network:
1. Click en la petición `PUT articulos-tienda/...`
2. Ve a **Headers** → Verificar `Authorization: Bearer ...`
3. Ve a **Payload** → Verificar FormData exacto
4. Ve a **Response** → Ver qué devuelve el backend

### 3. Copiar cURL para Backend

En Network Tab:
1. Click derecho en la petición
2. Copy → Copy as cURL
3. Pegar en el chat para analizar

### 4. Verificar MongoDB

```javascript
// En MongoDB Compass o shell
db.articulos_tienda.findOne({_id: ObjectId("...")})
```

---

## ❌ Errores Comunes

### Error 1: especificaciones no se guarda

**Síntoma**: Console muestra el JSON correcto pero BD no se actualiza

**Verificar**:
- [ ] Network Tab muestra `especificaciones: {"voltaje":"590W"}` (con comillas)
- [ ] Backend parsea el string con `JSON.parse()`
- [ ] Backend logs muestran el objeto parseado
- [ ] MongoDB muestra el cambio

**Solución Backend**:
```python
# Verificar que el backend haga esto:
if 'especificaciones' in form_data:
    espec_str = form_data['especificaciones']
    if espec_str:  # Si no es string vacío
        articulo.especificaciones = json.loads(espec_str)  # Parse JSON
    else:  # Si es string vacío
        articulo.especificaciones = None
```

### Error 2: precio_por_cantidad como string en BD

**Síntoma**: BD tiene `"precio_por_cantidad": "{"36":105}"` (string en lugar de objeto)

**Causa**: Backend no está parseando el JSON

**Solución Backend**:
```python
# Backend debe hacer:
precio_str = form_data['precio_por_cantidad']
articulo.precio_por_cantidad = json.loads(precio_str)  # Parse!
```

### Error 3: Campos no se eliminan

**Síntoma**: Al enviar string vacío, el campo no se pone en null

**Causa**: Backend no detecta string vacío

**Solución Backend**:
```python
if 'descripcion_uso' in form_data:
    desc = form_data['descripcion_uso']
    articulo.descripcion_uso = desc if desc else None  # '' → None
```

---

## 📋 Checklist para Compartir con Backend

- [ ] El frontend envía `especificaciones` como string JSON: `'{"voltaje":"590W"}'`
- [ ] El frontend envía `precio_por_cantidad` como string JSON: `'{"36":105}'`
- [ ] El frontend envía string vacío `''` para eliminar
- [ ] El frontend NO envía el campo si no debe tocarse (modo creación)
- [ ] El frontend SIEMPRE envía en modo edición (para permitir eliminación)
- [ ] Logs del frontend son claros y completos
- [ ] Network Tab muestra FormData correcto

Ahora el backend debe verificar:
- [ ] ¿Parsea los JSON strings correctamente?
- [ ] ¿Distingue entre `''` (eliminar) y campo ausente (no tocar)?
- [ ] ¿Los cambios se guardan en MongoDB?
- [ ] ¿La respuesta incluye los datos actualizados?

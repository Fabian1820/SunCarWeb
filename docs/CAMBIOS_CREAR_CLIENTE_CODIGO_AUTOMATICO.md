# ✅ Cambios Aplicados - Código Automático en Crear Cliente

## 📝 Resumen

Se implementó la generación automática del código de cliente en el formulario de "Crear Cliente". El código se genera automáticamente cuando el usuario selecciona:
1. **Provincia**
2. **Municipio**
3. **Inversor**

El campo de código es de **solo lectura** y no se puede modificar manualmente.

---

## 🔧 Cambios Realizados en el Frontend

### 1. Archivo: `components/feats/cliente/create-client-dialog.tsx`

#### ✅ Estados Agregados

```typescript
const [generandoCodigo, setGenerandoCodigo] = useState(false)
const [errorCodigo, setErrorCodigo] = useState('')
```

#### ✅ useEffect para Generación Automática

Se agregó un `useEffect` que:
- Monitorea cambios en provincia, municipio e inversor
- Genera el código automáticamente cuando los 3 campos están completos
- Valida el formato del código generado (10 caracteres, 1 letra + 9 dígitos)
- Muestra estados de carga y errores

**Dependencias:**
```typescript
[selectedProvinciaCodigo, formData.municipio, oferta.inversor_codigo, inversores, municipios, loadingMateriales]
```

#### ✅ Campo de Código Actualizado

**Antes:**
```tsx
<Input
  id="numero"
  value={formData.numero}
  onChange={(e) => handleInputChange('numero', e.target.value)}
  className="text-gray-900 placeholder:text-gray-400"
/>
```

**Ahora:**
```tsx
<div className="relative">
  <Input
    id="numero"
    value={formData.numero}
    readOnly
    disabled
    className="text-gray-900 bg-gray-50"
    placeholder={generandoCodigo ? 'Generando código...' : 'Seleccione provincia, municipio e inversor'}
  />
  {generandoCodigo && (
    <div className="absolute right-3 top-1/2 -translate-y-1/2">
      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    </div>
  )}
</div>
```

#### ✅ Mensajes de Estado

- **Generando:** "Generando código..." con spinner
- **Éxito:** "✓ Código generado automáticamente" (verde)
- **Esperando datos:** "El código se generará automáticamente al seleccionar provincia, municipio e inversor" (gris)
- **Error:** Mensaje de error específico (rojo)

---

### 2. Archivo: `lib/services/feats/customer/cliente-service.ts`

#### ✅ Método Agregado

```typescript
static async generarCodigoCliente(params: {
  marca_letra: string
  provincia_codigo: string
  municipio_codigo: string
}): Promise<string> {
  console.log('Calling generarCodigoCliente with params:', params)
  const response = await apiRequest<{
    success: boolean
    message: string
    codigo_generado: string
  }>('/clientes/generar-codigo', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  console.log('ClienteService.generarCodigoCliente response:', response)
  if (!response.success || !response.codigo_generado) {
    throw new Error(response.message || 'Error al generar el código de cliente')
  }
  return response.codigo_generado
}
```

---

## 🎯 Flujo de Generación

```
1. Usuario selecciona Provincia
   ↓
2. Usuario selecciona Municipio
   ↓
3. Usuario selecciona Inversor
   ↓
4. useEffect detecta que los 3 campos están completos
   ↓
5. Extrae la primera letra del inversor (marca)
   ↓
6. Formatea códigos con padding (3 dígitos)
   ↓
7. Llama a POST /clientes/generar-codigo
   ↓
8. Backend genera el consecutivo
   ↓
9. Valida el código (10 caracteres, formato correcto)
   ↓
10. Actualiza el campo "numero" automáticamente
```

---

## 📊 Ejemplo de Generación

### Datos de Entrada

- **Provincia:** La Habana (código: "2")
- **Municipio:** Playa (código: "4")
- **Inversor:** "Fronius Primo 5.0-1" (primera letra: "F")

### Proceso

1. **Formateo:**
   - Provincia: `"2"` → `"002"` (padding de 3 dígitos)
   - Municipio: `"4"` → `"004"` (padding de 3 dígitos)
   - Marca: `"F"` (primera letra del inversor)

2. **Request al Backend:**
```json
{
  "marca_letra": "F",
  "provincia_codigo": "002",
  "municipio_codigo": "004"
}
```

3. **Response del Backend:**
```json
{
  "success": true,
  "message": "Código generado exitosamente",
  "codigo_generado": "F002004208"
}
```

4. **Resultado:**
   - Campo "Código de cliente" se llena automáticamente con: `F002004208`
   - Mensaje: "✓ Código generado automáticamente"

---

## ✅ Validaciones Implementadas

### 1. Validación de Datos Requeridos

```typescript
if (!selectedProvinciaCodigo || !formData.municipio || !oferta.inversor_codigo) {
  // Limpiar código si falta algún dato
  if (formData.numero) {
    setFormData(prev => ({ ...prev, numero: '' }))
  }
  return
}
```

### 2. Validación del Inversor

```typescript
const inversorSeleccionado = inversores.find(inv => String(inv.codigo) === String(oferta.inversor_codigo))

if (!inversorSeleccionado) {
  throw new Error('No se encontró el inversor seleccionado')
}

const nombreInversor = inversorSeleccionado.descripcion || ''
const letraMarca = nombreInversor.charAt(0).toUpperCase()

if (!letraMarca || !/[A-Z]/.test(letraMarca)) {
  throw new Error('El nombre del inversor debe comenzar con una letra')
}
```

### 3. Validación del Municipio

```typescript
const municipioSeleccionado = municipios.find(m => m.nombre === formData.municipio)

if (!municipioSeleccionado) {
  throw new Error('No se encontró el municipio seleccionado')
}
```

### 4. Validación del Código Generado

```typescript
// Validar longitud
if (codigoGenerado.length !== 10) {
  throw new Error(
    `El código generado tiene un formato incorrecto. ` +
    `Se esperaban 10 caracteres pero se recibieron ${codigoGenerado.length}.`
  )
}

// Validar formato
if (!/^[A-Z]\d{9}$/.test(codigoGenerado)) {
  throw new Error(
    `El código generado tiene un formato inválido: "${codigoGenerado}". ` +
    `Debe ser 1 letra mayúscula seguida de 9 dígitos.`
  )
}
```

---

## 🎨 Estados Visuales

### Estado 1: Esperando Datos
```
┌─────────────────────────────────────────────┐
│ Código de cliente *                         │
│ ┌─────────────────────────────────────────┐ │
│ │ Seleccione provincia, municipio e inv...│ │
│ └─────────────────────────────────────────┘ │
│ ℹ El código se generará automáticamente... │
└─────────────────────────────────────────────┘
```

### Estado 2: Generando
```
┌─────────────────────────────────────────────┐
│ Código de cliente *                         │
│ ┌─────────────────────────────────────────┐ │
│ │ Generando código...              ⟳     │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Estado 3: Éxito
```
┌─────────────────────────────────────────────┐
│ Código de cliente *                         │
│ ┌─────────────────────────────────────────┐ │
│ │ F002004208                              │ │
│ └─────────────────────────────────────────┘ │
│ ✓ Código generado automáticamente          │
└─────────────────────────────────────────────┘
```

### Estado 4: Error
```
┌─────────────────────────────────────────────┐
│ Código de cliente *                         │
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│ ❌ Error al generar código: [mensaje]      │
└─────────────────────────────────────────────┘
```

---

## 🚨 Cambios Requeridos en el Backend

### ⚠️ IMPORTANTE: Se necesita implementar el endpoint

**Endpoint:** `POST /clientes/generar-codigo`

**Documentación completa:** Ver `docs/BACKEND_GENERAR_CODIGO_CLIENTE.md`

**Request esperado:**
```json
{
  "marca_letra": "F",
  "provincia_codigo": "002",
  "municipio_codigo": "004"
}
```

**Response esperada:**
```json
{
  "success": true,
  "message": "Código generado exitosamente",
  "codigo_generado": "F002004208"
}
```

---

## 🧪 Pruebas Recomendadas

### 1. Prueba de Generación Básica
1. Abrir formulario "Crear Cliente"
2. Seleccionar provincia: "La Habana"
3. Seleccionar municipio: "Playa"
4. Seleccionar inversor: "Fronius Primo 5.0-1"
5. Verificar que el código se genera automáticamente
6. Verificar formato: 1 letra + 9 dígitos

### 2. Prueba de Cambio de Datos
1. Generar código con una combinación
2. Cambiar la provincia
3. Verificar que el código se regenera
4. Cambiar el municipio
5. Verificar que el código se regenera nuevamente

### 3. Prueba de Datos Incompletos
1. Seleccionar solo provincia
2. Verificar que el código NO se genera
3. Seleccionar municipio
4. Verificar que el código NO se genera
5. Seleccionar inversor
6. Verificar que el código SÍ se genera

### 4. Prueba de Solo Lectura
1. Generar código automáticamente
2. Intentar editar el campo manualmente
3. Verificar que el campo está deshabilitado
4. Verificar que no se puede modificar

---

## 📊 Impacto de los Cambios

### ✅ Cambios Aplicados en Frontend
- `components/feats/cliente/create-client-dialog.tsx` (lógica de generación)
- `lib/services/feats/customer/cliente-service.ts` (método de servicio)

### ⏳ Pendiente en Backend
- Crear endpoint `POST /clientes/generar-codigo`
- Implementar lógica de consecutivo
- Validaciones de formato

### ✅ Sin Cambios Necesarios
- Hooks personalizados
- Otros componentes
- Estilos CSS (usa clases existentes)

---

## 🔗 Archivos Relacionados

- **Componente:** `components/feats/cliente/create-client-dialog.tsx`
- **Servicio:** `lib/services/feats/customer/cliente-service.ts`
- **Documentación Backend:** `docs/BACKEND_GENERAR_CODIGO_CLIENTE.md`
- **Documentación Leads:** `docs/FRONTEND_CONVERSION_LEADS_GUIA_COMPLETA.md`

---

## 📞 Notas Finales

1. El código se genera **automáticamente** - no requiere acción del usuario
2. El campo es de **solo lectura** - no se puede editar manualmente
3. Se **regenera automáticamente** si el usuario cambia provincia, municipio o inversor
4. Incluye **validaciones robustas** de formato y longitud
5. Muestra **estados visuales claros** (cargando, éxito, error)
6. **Requiere implementación del endpoint en el backend** para funcionar

---

## 🚀 Próximos Pasos

1. ✅ Frontend implementado
2. ⏳ Implementar endpoint en backend
3. ⏳ Probar integración completa
4. ⏳ Verificar generación de consecutivos
5. ⏳ Desplegar a producción

# Resumen de Cambios: Crear Cliente con Equipo Propio

## Archivos Modificados

### 1. `lib/types/feats/customer/cliente-types.ts`
**Cambio:** Agregado campo `equipo_propio` al tipo `ClienteCreateData`

```typescript
export interface ClienteCreateData {
  numero: string
  nombre: string
  direccion: string
  // ... otros campos
  equipo_propio?: boolean  // ✅ NUEVO - Si el equipo es propio del cliente (código con P)
}
```

### 2. `components/feats/cliente/create-client-dialog.tsx`
**Cambios múltiples:**

#### a) Agregados nuevos estados
```typescript
// Estado para equipo propio
const [equipoPropio, setEquipoPropio] = useState<boolean | undefined>(undefined)
const [mostrarPreguntaEquipoPropio, setMostrarPreguntaEquipoPropio] = useState(false)
```

#### b) Modificado useEffect de generación de código
El efecto ahora:
1. Detecta si hay inversor seleccionado
2. Si NO hay inversor y NO se ha respondido sobre equipo propio → muestra pregunta
3. Si NO hay inversor y se indicó que NO es equipo propio → muestra error
4. Si NO hay inversor pero equipoPropio === true → genera código con prefijo "P"
5. Si hay inversor → genera código normal con marca del inversor

```typescript
useEffect(() => {
  const generarCodigoAutomatico = async () => {
    // Verificar que tengamos provincia y municipio
    if (!selectedProvinciaCodigo || !formData.municipio) {
      setMostrarPreguntaEquipoPropio(false)
      return
    }

    // Verificar si hay inversor seleccionado
    const tieneInversor = oferta.inversor_codigo && oferta.inversor_codigo.trim() !== ''
    
    // Si no hay inversor y no se ha respondido sobre equipo propio, mostrar pregunta
    if (!tieneInversor && equipoPropio === undefined) {
      setMostrarPreguntaEquipoPropio(true)
      return
    }

    // Si no hay inversor y se indicó que NO es equipo propio, no generar código
    if (!tieneInversor && equipoPropio === false) {
      setMostrarPreguntaEquipoPropio(true)
      setErrorCodigo('Debes seleccionar un inversor para generar el código del cliente')
      return
    }

    // Generar código según el caso
    if (equipoPropio) {
      // Generar código con prefijo P
      // ... lógica de generación con equipo_propio=true
    } else {
      // Generar código normal con inversor
      // ... lógica de generación normal
    }
  }
  
  generarCodigoAutomatico()
}, [selectedProvinciaCodigo, formData.municipio, oferta.inversor_codigo, equipoPropio, ...])
```

#### c) Agregada UI para pregunta sobre equipo propio
```tsx
{/* Pregunta sobre equipo propio - solo si no hay inversor */}
{mostrarPreguntaEquipoPropio && (
  <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
    <Label className="text-sm font-semibold text-amber-900 mb-3 block">
      ¿El equipo es propio del cliente?
    </Label>
    <p className="text-xs text-amber-700 mb-3">
      No has seleccionado un inversor. Si el cliente ya tiene su propio equipo instalado, 
      el código empezará con "P". Si necesita equipo, debes seleccionar un inversor.
    </p>
    <div className="flex gap-3">
      <Button
        type="button"
        variant="outline"
        className={`flex-1 ${equipoPropio === true ? 'bg-amber-100 border-amber-500 border-2' : 'border-amber-300'} hover:bg-amber-100`}
        onClick={() => {
          setEquipoPropio(true)
          setErrorCodigo('')
        }}
      >
        {equipoPropio === true && '✓ '}Sí, es propio
      </Button>
      <Button
        type="button"
        variant="outline"
        className={`flex-1 ${equipoPropio === false ? 'bg-amber-100 border-amber-500 border-2' : 'border-amber-300'} hover:bg-amber-100`}
        onClick={() => {
          setEquipoPropio(false)
          setErrorCodigo('Debes seleccionar un inversor para generar el código del cliente')
        }}
      >
        {equipoPropio === false && '✓ '}No, necesita equipo
      </Button>
    </div>
  </div>
)}
```

#### d) Actualizado mensaje de ayuda del código
```tsx
{!errorCodigo && !generandoCodigo && formData.numero && (
  <p className="text-sm text-green-600 mt-1">
    ✓ Código generado automáticamente
    {equipoPropio && ' (Equipo propio - Prefijo P)'}
  </p>
)}
```

#### e) Modificada función handleSubmit
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  if (!validateForm()) {
    return
  }

  try {
    // ... construcción de oferta
    
    const clientDataWithOferta: ClienteCreateData = {
      ...formData,
      fecha_contacto: getCurrentDateDDMMYYYY(),
      latitud: clientLatLng.lat || undefined,
      longitud: clientLatLng.lng || undefined,
      ofertas: [ofertaToSend],
      equipo_propio: equipoPropio,  // ✅ NUEVO
    }

    await onSubmit(sanitizeClientData(clientDataWithOferta))
  } catch (error) {
    console.error('Error al crear cliente:', error)
  }
}
```

## Flujo de Usuario

### Escenario 1: Cliente con Inversor (Flujo Normal)
1. Usuario completa datos básicos (nombre, teléfono, etc.)
2. Usuario selecciona provincia y municipio
3. Usuario selecciona inversor en la sección de oferta
4. Sistema genera código automáticamente con la marca del inversor (ej: "F020400208")
5. Usuario completa resto de datos y crea el cliente

### Escenario 2: Cliente con Equipo Propio (Sin Inversor)
1. Usuario completa datos básicos (nombre, teléfono, etc.)
2. Usuario selecciona provincia y municipio
3. Usuario NO selecciona inversor
4. Sistema detecta que no hay inversor y muestra pregunta: "¿El equipo es propio del cliente?"
5. Usuario hace clic en "Sí, es propio"
6. Sistema genera código con prefijo "P" (ej: "P020400208")
7. Mensaje de confirmación: "✓ Código generado automáticamente (Equipo propio - Prefijo P)"
8. Usuario completa resto de datos y crea el cliente

### Escenario 3: Sin Inversor - Necesita Equipo
1. Usuario completa datos básicos (nombre, teléfono, etc.)
2. Usuario selecciona provincia y municipio
3. Usuario NO selecciona inversor
4. Sistema detecta que no hay inversor y muestra pregunta: "¿El equipo es propio del cliente?"
5. Usuario hace clic en "No, necesita equipo"
6. Sistema muestra error: "Debes seleccionar un inversor para generar el código del cliente"
7. Usuario debe ir a la sección de oferta y seleccionar un inversor

## Validaciones Implementadas

1. **Detección automática**: El sistema detecta si hay inversor seleccionado
2. **Pregunta contextual**: Solo se muestra si no hay inversor y no se ha respondido
3. **Formato del código**: Siempre 10 caracteres
   - Con equipo propio: `^P\d{9}$` (ej: "P020400208")
   - Con inversor: `^[A-Z]\d{9}$` (ej: "F020400208")
4. **Feedback visual**: 
   - Botones con checkmark cuando están seleccionados
   - Mensaje de confirmación con indicador de equipo propio
   - Error claro si falta seleccionar inversor

## Diferencias con Conversión de Lead

### Conversión de Lead a Cliente
- Usa el endpoint: `GET /api/leads/{lead_id}/generar-codigo-cliente?equipo_propio=true`
- El lead ya existe en la base de datos
- Se genera código y luego se convierte

### Creación Directa de Cliente
- Crea un lead temporal para generar el código
- Usa el mismo endpoint: `GET /api/leads/{lead_id}/generar-codigo-cliente?equipo_propio=true`
- Elimina el lead temporal después de generar el código
- Envía el campo `equipo_propio` al crear el cliente: `POST /api/clientes/`

## Notas Importantes

- El campo `equipo_propio` es opcional en `ClienteCreateData`
- El valor `undefined` indica que el usuario aún no ha respondido la pregunta
- El valor `true` indica que el equipo es propio (código con "P")
- El valor `false` indica que el equipo NO es propio (debe seleccionar inversor)
- La pregunta se oculta automáticamente cuando se selecciona un inversor
- Si el usuario selecciona un inversor después de marcar "equipo propio", el sistema regenera el código con la marca del inversor

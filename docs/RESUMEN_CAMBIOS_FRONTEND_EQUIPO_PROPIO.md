# Resumen de Cambios Frontend: Soporte para Equipos Propios

## Archivos Modificados

### 1. `lib/types/feats/leads/lead-types.ts`
**Cambio:** Agregado campo `equipo_propio` al tipo `LeadConversionRequest`

```typescript
export interface LeadConversionRequest {
  numero: string
  fecha_montaje?: string
  latitud?: string | number
  longitud?: string | number
  carnet_identidad?: string
  fecha_instalacion?: string
  comprobante_pago_url?: string
  metodo_pago?: string
  moneda?: string
  estado?: string
  fuente?: string
  municipio?: string
  equipo_propio?: boolean  // ✅ NUEVO
}
```

### 2. `components/feats/leads/leads-table.tsx`
**Cambios múltiples:**

#### a) Actualizada interfaz de props
```typescript
interface LeadsTableProps {
  // ...
  onGenerarCodigo: (leadId: string, equipoPropio?: boolean) => Promise<string>  // ✅ Agregado parámetro
}
```

#### b) Actualizado estado inicial
```typescript
const [conversionData, setConversionData] = useState<LeadConversionRequest>({ 
  numero: '',
  equipo_propio: undefined  // ✅ NUEVO - undefined indica que necesita respuesta
})
```

#### c) Modificada función `resetConversionState`
```typescript
const resetConversionState = () => {
  setConversionData({ 
    numero: '', 
    metodo_pago: '', 
    moneda: '', 
    equipo_propio: undefined  // ✅ NUEVO
  })
  setConversionErrors({})
  setConversionLoading(false)
}
```

#### d) Modificada función `openConvertDialog`
Ahora detecta si el lead tiene inversor y pregunta al usuario si no lo tiene:

```typescript
const openConvertDialog = async (lead: Lead) => {
  setLeadToConvert(lead)
  setConversionLoading(true)
  setConversionErrors({})
  
  try {
    // ✅ NUEVO: Verificar si el lead tiene inversor asignado
    const tieneInversor = lead.ofertas && lead.ofertas.length > 0 && lead.ofertas[0].inversor_codigo
    
    if (!tieneInversor) {
      // Si no tiene inversor, preguntar si el equipo es propio
      setConversionData({
        numero: '',
        carnet_identidad: '',
        estado: 'Pendiente de instalación',
        equipo_propio: undefined, // Indicar que necesita respuesta
      })
      setConversionLoading(false)
      setIsConvertDialogOpen(true)
      return
    }
    
    // Si tiene inversor, generar código normalmente
    const codigoGenerado = await onGenerarCodigo(lead.id || '')
    // ... resto del código
  }
}
```

#### e) Modificada función `handleConfirmConversion`
Ahora valida que se haya respondido la pregunta sobre equipo propio:

```typescript
const handleConfirmConversion = async () => {
  if (!leadToConvert) return

  const errors: Record<string, string> = {}
  
  // ✅ NUEVO: Verificar si necesita responder sobre equipo propio
  if (conversionData.equipo_propio === undefined) {
    errors.general = 'Debes indicar si el equipo es propio del cliente o si necesita asignar un inversor'
    setConversionErrors(errors)
    return
  }
  
  // ... resto de validaciones
}
```

#### f) Modificada función `buildConversionPayload`
```typescript
const buildConversionPayload = (): LeadConversionRequest => {
  const payload: LeadConversionRequest = {
    numero: conversionData.numero.trim(),
  }

  // ... otros campos

  // ✅ NUEVO
  if (conversionData.equipo_propio !== undefined) {
    payload.equipo_propio = conversionData.equipo_propio
  }

  return payload
}
```

#### g) Actualizado UI del diálogo de conversión
Agregada sección para preguntar sobre equipo propio:

```tsx
<div className="space-y-3">
  {/* ✅ NUEVO: Pregunta sobre equipo propio - solo si no hay inversor */}
  {conversionData.equipo_propio === undefined && (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <Label className="text-sm font-semibold text-amber-900 mb-3 block">
        ¿El equipo es propio del cliente?
      </Label>
      <p className="text-xs text-amber-700 mb-3">
        Este lead no tiene un inversor asignado. Indica si el cliente ya tiene su propio equipo instalado.
      </p>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-amber-300 hover:bg-amber-100"
          onClick={async () => {
            setConversionLoading(true)
            try {
              // Generar código con prefijo P para equipo propio
              const codigoGenerado = await onGenerarCodigo(leadToConvert.id || '', true)
              
              if (codigoGenerado.length !== 10 || !/^P\d{9}$/.test(codigoGenerado)) {
                throw new Error('El código generado tiene un formato incorrecto')
              }
              
              setConversionData(prev => ({
                ...prev,
                numero: codigoGenerado,
                equipo_propio: true,
              }))
            } catch (error) {
              setConversionErrors({
                general: error instanceof Error ? error.message : 'Error al generar el código'
              })
            } finally {
              setConversionLoading(false)
            }
          }}
        >
          Sí, es propio
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-amber-300 hover:bg-amber-100"
          onClick={() => {
            setConversionErrors({
              general: 'Debes asignar un inversor al lead antes de convertirlo a cliente. Edita el lead y agrega un inversor en la sección de oferta.'
            })
          }}
        >
          No, necesita equipo
        </Button>
      </div>
    </div>
  )}

  {/* Campo de código - actualizado el mensaje de ayuda */}
  <div>
    <Label htmlFor="numero_cliente" className="text-xs sm:text-sm">
      Código de cliente (generado automáticamente)
    </Label>
    <Input
      id="numero_cliente"
      value={conversionData.numero}
      disabled
      className="bg-gray-100 cursor-not-allowed"
    />
    <p className="text-xs text-gray-500 mt-1">
      {conversionData.equipo_propio 
        ? 'Código con prefijo "P" para equipo propio del cliente'
        : 'Este código se genera automáticamente basado en la marca del inversor, provincia y municipio'
      }
    </p>
  </div>
  
  {/* ... resto de campos */}
</div>
```

### 3. `hooks/use-leads.ts`
**Cambios:**

#### a) Actualizada firma de función en interfaz
```typescript
interface UseLeadsReturn {
  // ...
  generarCodigoCliente: (id: string, equipoPropio?: boolean) => Promise<string>  // ✅ Agregado parámetro
}
```

#### b) Actualizada implementación
```typescript
const generarCodigoCliente = useCallback(async (id: string, equipoPropio?: boolean): Promise<string> => {
  setError(null)
  try {
    const codigo = await LeadService.generarCodigoCliente(id, equipoPropio)  // ✅ Pasar parámetro
    return codigo
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al generar el código de cliente'
    setError(message)
    console.error('Error generating client code:', err)
    throw err instanceof Error ? err : new Error(message)
  }
}, [])
```

### 4. `lib/services/feats/leads/lead-service.ts`
**Cambio:** Actualizada función para enviar query parameter

```typescript
static async generarCodigoCliente(leadId: string, equipoPropio?: boolean): Promise<string> {
  console.log('Calling generarCodigoCliente with ID:', leadId, 'equipoPropio:', equipoPropio)
  
  // ✅ NUEVO: Agregar query parameter si equipoPropio es true
  const url = equipoPropio 
    ? `/leads/${leadId}/generar-codigo-cliente?equipo_propio=true`
    : `/leads/${leadId}/generar-codigo-cliente`
    
  const response = await apiRequest<{ success: boolean; message: string; codigo_generado: string }>(url)
  
  console.log('LeadService.generarCodigoCliente response:', response)
  if (!response.success || !response.codigo_generado) {
    throw new Error(response.message || 'Error al generar el código de cliente')
  }
  return response.codigo_generado
}
```

## Flujo de Usuario

### Escenario 1: Lead con Inversor (Flujo Normal)
1. Usuario hace clic en "Convertir a cliente"
2. Sistema detecta que el lead tiene inversor
3. Sistema genera código automáticamente con la marca del inversor (ej: "F020400208")
4. Usuario completa datos adicionales (CI, estado)
5. Usuario confirma conversión

### Escenario 2: Lead sin Inversor - Equipo Propio
1. Usuario hace clic en "Convertir a cliente"
2. Sistema detecta que el lead NO tiene inversor
3. Sistema muestra pregunta: "¿El equipo es propio del cliente?"
4. Usuario hace clic en "Sí, es propio"
5. Sistema genera código con prefijo "P" (ej: "P020400208")
6. Usuario completa datos adicionales (CI, estado)
7. Usuario confirma conversión

### Escenario 3: Lead sin Inversor - Necesita Equipo
1. Usuario hace clic en "Convertir a cliente"
2. Sistema detecta que el lead NO tiene inversor
3. Sistema muestra pregunta: "¿El equipo es propio del cliente?"
4. Usuario hace clic en "No, necesita equipo"
5. Sistema muestra error: "Debes asignar un inversor al lead antes de convertirlo..."
6. Usuario cancela y edita el lead para agregar inversor

## Validaciones Implementadas

1. **Formato del código**: Siempre 10 caracteres (`^[A-Z]\d{9}$`)
2. **Código con "P"**: Solo si `equipoPropio=true`
3. **Respuesta obligatoria**: Si no hay inversor, el usuario DEBE responder la pregunta
4. **Validación de formato**: El código generado se valida antes de aceptarlo

## Notas Importantes

- El campo `equipo_propio` es opcional en el tipo `LeadConversionRequest`
- El valor `undefined` indica que el usuario aún no ha respondido la pregunta
- El valor `true` indica que el equipo es propio (código con "P")
- El valor `false` indica que el equipo NO es propio (código con marca de inversor)
- La pregunta solo se muestra si el lead NO tiene inversor asignado

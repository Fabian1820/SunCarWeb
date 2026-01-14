# Documento de Diseño

## Resumen

Este documento describe el diseño para rediseñar el diálogo de detalles de lead (`LeadsTable` - Detail Dialog) para que coincida con el diseño profesional y organizado del `CreateLeadDialog`. El rediseño se enfoca en mejorar la jerarquía visual, organización de información y consistencia de diseño en toda la aplicación.

## Arquitectura

### Componente Actual

El diálogo de detalles de lead está actualmente implementado dentro del componente `LeadsTable` en `components/feats/leads/leads-table.tsx`. Es un Dialog de shadcn/ui que se abre cuando el usuario hace clic en el botón "Ver detalles" (ícono de ojo).

### Patrón de Diseño de Referencia

El `CreateLeadDialog` (`components/feats/leads/create-lead-dialog.tsx`) utiliza un patrón de diseño estructurado con:

1. **Secciones Bordeadas**: Cada grupo lógico de información está envuelto en un contenedor con:
   - `border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm`
   
2. **Encabezados de Sección**: Cada sección tiene un encabezado con:
   - Título: `text-xl font-bold text-gray-900`
   - Subtítulo descriptivo: `text-sm text-gray-500 mt-1`
   - Separador: `pb-4 mb-4 border-b-2 border-gray-200`

3. **Diseños de Cuadrícula**: Los campos se organizan en cuadrículas responsivas:
   - `grid grid-cols-1 md:grid-cols-2 gap-4` para dos columnas
   - `grid grid-cols-1 md:grid-cols-3 gap-4` para tres columnas

4. **Espaciado Consistente**: 
   - Entre secciones: `space-y-6`
   - Dentro de secciones: `space-y-4`

## Componentes e Interfaces

### Estructura del Diálogo

```tsx
<Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader className="border-b pb-4">
      <DialogTitle className="text-xl font-semibold text-gray-900">
        Información del Lead
      </DialogTitle>
    </DialogHeader>

    {selectedLead && (
      <div className="space-y-6 pt-4">
        {/* Sección 1: Datos Personales */}
        {/* Sección 2: Oferta */}
        {/* Sección 3: Costos y Pago */}
        {/* Sección 4: Comentarios (condicional) */}
        {/* Botón Cerrar */}
      </div>
    )}
  </DialogContent>
</Dialog>
```

### Componente de Sección Reutilizable

Para mantener consistencia, cada sección seguirá esta estructura:

```tsx
<div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
  <div className="pb-4 mb-4 border-b-2 border-gray-200">
    <h3 className="text-xl font-bold text-gray-900">{título}</h3>
    <p className="text-sm text-gray-500 mt-1">{descripción}</p>
  </div>
  <div className="space-y-4">
    {/* Contenido de la sección */}
  </div>
</div>
```

## Modelos de Datos

### Interfaz Lead (Existente)

El componente ya recibe el objeto `Lead` con la siguiente estructura relevante:

```typescript
interface Lead {
  id: string
  nombre: string
  telefono: string
  telefono_adicional?: string
  direccion?: string
  estado: string
  fuente?: string
  referencia?: string
  pais_contacto?: string
  provincia_montaje?: string
  municipio?: string
  comercial?: string
  fecha_contacto: string
  comentario?: string
  metodo_pago?: string
  moneda?: string
  comprobante_pago_url?: string
  ofertas?: Oferta[]
  elementos_personalizados?: ElementoPersonalizado[]
}

interface Oferta {
  inversor_codigo?: string
  inversor_nombre?: string
  inversor_cantidad: number
  bateria_codigo?: string
  bateria_nombre?: string
  bateria_cantidad: number
  panel_codigo?: string
  panel_nombre?: string
  panel_cantidad: number
  elementos_personalizados?: string
  aprobada: boolean
  pagada: boolean
  costo_oferta: number
  costo_extra: number
  costo_transporte: number
  razon_costo_extra?: string
}

interface ElementoPersonalizado {
  descripcion: string
  cantidad: number
}
```

## Diseño Detallado de Secciones

### Sección 1: Datos Personales

**Propósito**: Mostrar información básica del contacto y ubicación

**Estructura**:
```tsx
<div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
  <div className="pb-4 mb-4 border-b-2 border-gray-200">
    <h3 className="text-xl font-bold text-gray-900">Datos Personales</h3>
    <p className="text-sm text-gray-500 mt-1">Información básica del contacto</p>
  </div>
  <div className="space-y-4">
    {/* Fila 1: Nombre y Referencia */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Nombre</Label>
        <p className="text-gray-900 font-medium">{lead.nombre}</p>
      </div>
      {lead.referencia && (
        <div>
          <Label>Referencia</Label>
          <p className="text-gray-900">{lead.referencia}</p>
        </div>
      )}
    </div>

    {/* Fila 2: Teléfono y Teléfono Adicional */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Teléfono</Label>
        <p className="text-gray-900 font-medium flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-400" />
          {lead.telefono}
        </p>
      </div>
      {lead.telefono_adicional && (
        <div>
          <Label>Teléfono Adicional</Label>
          <p className="text-gray-900 flex items-center gap-2">
            <PhoneForwarded className="h-4 w-4 text-gray-400" />
            {lead.telefono_adicional}
          </p>
        </div>
      )}
    </div>

    {/* Fila 3: Estado, Fuente y Fecha */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label>Estado</Label>
        <Badge className={estadoBadge.className}>
          {estadoBadge.label}
        </Badge>
      </div>
      {lead.fuente && (
        <div>
          <Label>Fuente</Label>
          <p className="text-gray-900">{lead.fuente}</p>
        </div>
      )}
      <div>
        <Label>Fecha de Contacto</Label>
        <p className="text-gray-900 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          {formatDate(lead.fecha_contacto)}
        </p>
      </div>
    </div>

    {/* Fila 4: Dirección (ancho completo) */}
    {lead.direccion && (
      <div>
        <Label>Dirección</Label>
        <p className="text-gray-900 flex items-start gap-2">
          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          {lead.direccion}
        </p>
      </div>
    )}

    {/* Fila 5: Provincia, Municipio y País */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {lead.provincia_montaje && (
        <div>
          <Label>Provincia</Label>
          <p className="text-gray-900">{lead.provincia_montaje}</p>
        </div>
      )}
      {lead.municipio && (
        <div>
          <Label>Municipio</Label>
          <p className="text-gray-900">{lead.municipio}</p>
        </div>
      )}
      {lead.pais_contacto && (
        <div>
          <Label>País de Contacto</Label>
          <p className="text-gray-900">{lead.pais_contacto}</p>
        </div>
      )}
    </div>

    {/* Fila 6: Comercial */}
    {lead.comercial && (
      <div>
        <Label>Comercial Asignado</Label>
        <p className="text-gray-900 flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-gray-400" />
          {lead.comercial}
        </p>
      </div>
    )}
  </div>
</div>
```

### Sección 2: Oferta

**Propósito**: Mostrar detalles de productos en las ofertas asociadas

**Estructura**:
```tsx
{selectedLead.ofertas && selectedLead.ofertas.length > 0 && (
  <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
    <div className="pb-4 mb-4 border-b-2 border-gray-200">
      <h3 className="text-xl font-bold text-gray-900">Oferta</h3>
      <p className="text-sm text-gray-500 mt-1">Detalles de productos y cantidades</p>
    </div>
    <div className="space-y-4">
      {selectedLead.ofertas.map((oferta, idx) => (
        <div key={idx} className="border rounded-lg p-4 bg-gray-50">
          {/* Productos en Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Inversor */}
            {oferta.inversor_codigo && oferta.inversor_cantidad > 0 && (
              <div>
                <Label>Inversor</Label>
                <p className="text-gray-900 font-medium">
                  {oferta.inversor_nombre || oferta.inversor_codigo}
                </p>
                <p className="text-sm text-gray-600">Cantidad: {oferta.inversor_cantidad}</p>
              </div>
            )}

            {/* Batería */}
            {oferta.bateria_codigo && oferta.bateria_cantidad > 0 && (
              <div>
                <Label>Batería</Label>
                <p className="text-gray-900 font-medium">
                  {oferta.bateria_nombre || oferta.bateria_codigo}
                </p>
                <p className="text-sm text-gray-600">Cantidad: {oferta.bateria_cantidad}</p>
              </div>
            )}

            {/* Paneles */}
            {oferta.panel_codigo && oferta.panel_cantidad > 0 && (
              <div>
                <Label>Paneles</Label>
                <p className="text-gray-900 font-medium">
                  {oferta.panel_nombre || oferta.panel_codigo}
                </p>
                <p className="text-sm text-gray-600">Cantidad: {oferta.panel_cantidad}</p>
              </div>
            )}
          </div>

          {/* Estado de la Oferta */}
          {(oferta.aprobada || oferta.pagada) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {oferta.aprobada && (
                <div className="flex items-center space-x-2 p-3 border rounded-md bg-white">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="h-5 w-5 rounded border-gray-300 text-green-600"
                  />
                  <Label className="font-medium">Oferta Aprobada</Label>
                </div>
              )}
              {oferta.pagada && (
                <div className="flex items-center space-x-2 p-3 border rounded-md bg-white">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="h-5 w-5 rounded border-gray-300 text-blue-600"
                  />
                  <Label className="font-medium">Oferta Pagada</Label>
                </div>
              )}
            </div>
          )}

          {/* Elementos Personalizados */}
          {oferta.elementos_personalizados && (
            <div className="mt-4">
              <Label>Elementos Personalizados</Label>
              <p className="text-sm text-gray-700 bg-white p-3 rounded-md border">
                {oferta.elementos_personalizados}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

### Sección 3: Costos y Pago

**Propósito**: Mostrar información financiera de las ofertas

**Estructura**:
```tsx
{selectedLead.ofertas && selectedLead.ofertas.length > 0 && (
  <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
    <div className="pb-4 mb-4 border-b-2 border-gray-200">
      <h3 className="text-xl font-bold text-gray-900">Costos y Pago</h3>
      <p className="text-sm text-gray-500 mt-1">Información financiera de la oferta</p>
    </div>
    <div className="space-y-4">
      {selectedLead.ofertas.map((oferta, idx) => (
        <div key={idx}>
          {/* Costos - Primera fila */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Costo de Oferta</Label>
              <p className="text-gray-900 font-semibold">
                ${oferta.costo_oferta.toFixed(2)}
              </p>
            </div>
            {oferta.costo_extra > 0 && (
              <div>
                <Label>Costo Extra</Label>
                <p className="text-gray-900 font-semibold">
                  ${oferta.costo_extra.toFixed(2)}
                </p>
              </div>
            )}
            {oferta.costo_transporte > 0 && (
              <div>
                <Label>Costo de Transporte</Label>
                <p className="text-gray-900 font-semibold">
                  ${oferta.costo_transporte.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Costo Final */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <Label>Costo Final</Label>
            <p className="text-2xl font-bold text-gray-900">
              ${(oferta.costo_oferta + oferta.costo_extra + oferta.costo_transporte).toFixed(2)}
            </p>
          </div>

          {/* Razón del Costo Extra */}
          {oferta.razon_costo_extra && (
            <div className="mt-4">
              <Label>Razón del Costo Extra</Label>
              <p className="text-sm text-gray-700 bg-white p-3 rounded-md border">
                {oferta.razon_costo_extra}
              </p>
            </div>
          )}
        </div>
      ))}

      {/* Método de Pago y Moneda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
        {selectedLead.metodo_pago && (
          <div>
            <Label>Método de Pago</Label>
            <p className="text-gray-900 font-medium">{selectedLead.metodo_pago}</p>
          </div>
        )}
        {selectedLead.moneda && (
          <div>
            <Label>Moneda</Label>
            <p className="text-gray-900 font-medium">{selectedLead.moneda}</p>
          </div>
        )}
      </div>

      {/* Comprobante de Pago */}
      {selectedLead.comprobante_pago_url && (
        <div className="pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleDownloadComprobante(selectedLead)}
            className="w-full md:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar Comprobante
          </Button>
        </div>
      )}
    </div>
  </div>
)}
```

### Sección 4: Comentarios (Condicional)

**Propósito**: Mostrar comentarios adicionales si existen

**Estructura**:
```tsx
{selectedLead.comentario && (
  <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
    <div className="pb-4 mb-4 border-b-2 border-gray-200">
      <h3 className="text-xl font-bold text-gray-900">Comentarios</h3>
      <p className="text-sm text-gray-500 mt-1">Notas adicionales sobre el lead</p>
    </div>
    <div className="space-y-4">
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words bg-gray-50 p-4 rounded-lg border">
        {selectedLead.comentario}
      </p>
    </div>
  </div>
)}
```

### Sección 5: Elementos Personalizados (Condicional)

**Propósito**: Mostrar elementos personalizados adicionales si existen

**Estructura**:
```tsx
{selectedLead.elementos_personalizados && selectedLead.elementos_personalizados.length > 0 && (
  <div className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm">
    <div className="pb-4 mb-4 border-b-2 border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <ListChecks className="h-5 w-5" />
        Elementos Personalizados
      </h3>
      <p className="text-sm text-gray-500 mt-1">Elementos adicionales del lead</p>
    </div>
    <div className="space-y-2">
      {selectedLead.elementos_personalizados.map((elemento, index) => (
        <div key={index} className="flex items-center justify-between border rounded-md px-4 py-3 bg-gray-50">
          <span className="text-sm text-gray-900">{elemento.descripcion}</span>
          <span className="text-sm font-medium text-gray-600 ml-4">
            Cant: {elemento.cantidad}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

## Propiedades de Corrección

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas de un sistema - esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquina.*

### Propiedad 1: Consistencia de Diseño de Secciones

*Para cualquier* sección mostrada en el diálogo de detalles, la sección debe usar las mismas clases CSS de envoltura que el create-lead-dialog (border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm)

**Valida: Requisitos 1.1, 1.4, 5.1**

### Propiedad 2: Estructura de Encabezado Consistente

*Para cualquier* sección con encabezado, el encabezado debe incluir un título en negrita (text-xl font-bold text-gray-900), un subtítulo descriptivo (text-sm text-gray-500 mt-1), y un separador (pb-4 mb-4 border-b-2 border-gray-200)

**Valida: Requisitos 1.2, 1.5, 3.1, 3.2, 5.2**

### Propiedad 3: Preservación de Datos

*Para cualquier* campo de lead que existe en el objeto selectedLead, el campo debe ser mostrado en el diálogo de detalles en la sección apropiada

**Valida: Requisitos 4.1**

### Propiedad 4: Agrupación Lógica de Información

*Para cualquier* campo de información personal (nombre, teléfono, dirección, provincia, municipio, país), el campo debe aparecer en la sección "Datos Personales"

**Valida: Requisitos 2.1, 2.2**

### Propiedad 5: Visualización Completa de Ofertas

*Para cualquier* oferta en el array de ofertas del lead, la oferta debe mostrar todos sus productos (inversor, batería, paneles) con sus cantidades en un diseño de cuadrícula

**Valida: Requisitos 2.3, 6.2**

### Propiedad 6: Cálculo Correcto de Costo Final

*Para cualquier* oferta mostrada, el costo final debe ser igual a la suma de costo_oferta + costo_extra + costo_transporte

**Valida: Requisitos 2.4, 6.3**

### Propiedad 7: Manejo de Campos Opcionales

*Para cualquier* campo opcional que esté vacío o undefined, el campo no debe causar errores de renderizado y debe ser omitido o mostrar texto de respaldo apropiado

**Valida: Requisitos 4.4**

### Propiedad 8: Diseño Responsivo

*Para cualquier* tamaño de pantalla (móvil o escritorio), el diálogo debe mantener su legibilidad y las cuadrículas deben colapsar apropiadamente usando las clases md:grid-cols-*

**Valida: Requisitos 4.5**

## Manejo de Errores

### Campos Faltantes o Vacíos

- **Estrategia**: Renderizado condicional usando operadores `&&` y `?`
- **Ejemplo**: `{lead.referencia && <div>...</div>}`
- **Texto de Respaldo**: Para campos críticos, mostrar "No registrado" o "Sin información"

### Ofertas Vacías

- **Estrategia**: No renderizar las secciones "Oferta" y "Costos y Pago" si `ofertas` está vacío o undefined
- **Condición**: `{selectedLead.ofertas && selectedLead.ofertas.length > 0 && <div>...</div>}`

### Errores de Formato de Fecha

- **Estrategia**: Usar la función `formatDate` existente que maneja múltiples formatos
- **Respaldo**: Si la fecha no se puede parsear, mostrar el string original

## Estrategia de Pruebas

### Pruebas Unitarias

1. **Prueba de Renderizado de Secciones**
   - Verificar que cada sección se renderiza con los datos correctos
   - Verificar que las secciones condicionales solo aparecen cuando hay datos

2. **Prueba de Manejo de Datos Faltantes**
   - Verificar que el componente no falla con campos undefined
   - Verificar que se muestran textos de respaldo apropiados

3. **Prueba de Cálculo de Costos**
   - Verificar que el costo final se calcula correctamente
   - Verificar que los costos se formatean con 2 decimales

4. **Prueba de Formato de Fecha**
   - Verificar que las fechas en formato DD/MM/YYYY se muestran correctamente
   - Verificar que las fechas en formato ISO se convierten correctamente

### Pruebas de Integración

1. **Prueba de Flujo Completo**
   - Abrir el diálogo desde la tabla de leads
   - Verificar que todos los datos del lead se muestran correctamente
   - Cerrar el diálogo

2. **Prueba de Descarga de Comprobante**
   - Verificar que el botón de descarga funciona cuando hay comprobante_pago_url
   - Verificar que el botón no aparece cuando no hay comprobante

### Pruebas Visuales

1. **Comparación con Create-Lead-Dialog**
   - Verificar que el espaciado es consistente
   - Verificar que los colores y tipografía coinciden
   - Verificar que las secciones tienen el mismo estilo

2. **Pruebas Responsivas**
   - Verificar el diseño en móvil (< 768px)
   - Verificar el diseño en tablet (768px - 1024px)
   - Verificar el diseño en escritorio (> 1024px)

## Notas de Implementación

### Orden de Implementación

1. Crear la estructura base con secciones vacías
2. Implementar la sección "Datos Personales"
3. Implementar la sección "Oferta"
4. Implementar la sección "Costos y Pago"
5. Implementar secciones condicionales (Comentarios, Elementos Personalizados)
6. Ajustar estilos para coincidir exactamente con create-lead-dialog
7. Probar con diferentes conjuntos de datos (completos, parciales, vacíos)

### Consideraciones de Rendimiento

- El componente ya está optimizado con renderizado condicional
- No se requieren cambios en la lógica de estado
- El rediseño es puramente visual/estructural

### Accesibilidad

- Mantener los iconos con clases de tamaño apropiadas (h-4 w-4)
- Asegurar contraste de color adecuado (ya cumplido con gray-900 sobre white)
- Mantener la estructura semántica con etiquetas Label apropiadas

### Compatibilidad

- El diseño usa clases de Tailwind CSS estándar
- Compatible con todos los navegadores modernos
- Responsivo por defecto con prefijos `md:`

# Implementación Frontend - Sistema de Ofertas de Confección

## Resumen de Implementación

El sistema de confección de ofertas ha sido completamente implementado en el frontend con integración al backend.

---

## Endpoints Implementados

### 1. Crear Oferta
```typescript
POST /api/ofertas/confeccion
```

**Implementado en:** `components/feats/ofertas/confeccion-ofertas-view.tsx` → `handleCrearOferta()`

**Datos enviados:**
- `tipo_oferta`: "generica" | "personalizada"
- `cliente_numero`: string (opcional, requerido si es personalizada)
- `almacen_id`: string
- `foto_portada`: string (URL de MinIO, opcional)
- `estado`: string
- `items`: Array de materiales
- `secciones_personalizadas`: Array (opcional)
- `elementos_personalizados`: Array (opcional)
- `componentes_principales`: Objeto con inversores, baterías y paneles seleccionados
- Cálculos financieros: totales, márgenes, precio final

**Respuesta esperada:**
```typescript
{
  success: boolean
  message: string
  data: {
    id: string
    numero_oferta: string
    nombre_automatico: string
    ...
  }
}
```

### 2. Subir Foto de Portada
```typescript
POST /api/ofertas/confeccion/upload-foto-portada
```

**Implementado en:** `components/feats/ofertas/confeccion-ofertas-view.tsx` → `handleSubirFotoPortada()`

**Datos enviados:**
- FormData con:
  - `foto`: File (imagen)
  - `tipo`: "oferta_portada"

**Respuesta esperada:**
```typescript
{
  success: boolean
  url: string
  filename: string
  size: number
  content_type: string
}
```

---

## Funcionalidades Implementadas

### 1. Configuración de Oferta
- ✅ Selección de tipo (genérica/personalizada)
- ✅ Selección de cliente (para personalizadas)
- ✅ Selección de almacén
- ✅ Selección de estado
- ✅ Foto de portada (subida a MinIO)

### 2. Gestión de Materiales
- ✅ Agregar materiales por secciones predefinidas
- ✅ 11 secciones predefinidas (Inversores, Baterías, Paneles, etc.)
- ✅ Secciones personalizadas de materiales
- ✅ Validación de stock disponible
- ✅ Actualización de cantidades
- ✅ Visualización de stock en tiempo real

### 3. Secciones Personalizadas
- ✅ Crear secciones de materiales (con categorías específicas)
- ✅ Crear secciones de texto libre
- ✅ Crear secciones de costos extras
- ✅ Eliminar secciones personalizadas
- ✅ Editar contenido de secciones

### 4. Elementos Personalizados
- ✅ Agregar elementos fuera del inventario
- ✅ Configurar precio y cantidad
- ✅ Eliminar elementos

### 5. Cálculos Financieros
- ✅ Total de materiales
- ✅ Margen comercial (%)
- ✅ Subtotal con margen
- ✅ Costo de transportación
- ✅ Total de elementos personalizados
- ✅ Total de costos extras
- ✅ Precio final (redondeado)

### 6. Generación Automática de Nombre
- ✅ Selección de componentes principales (inversor, batería, panel)
- ✅ Generación automática del nombre descriptivo
- ✅ Formato: "Oferta de {inversores}, {baterías} y {paneles}"

### 7. Sistema de Reservas
- ✅ Reserva temporal (con días de duración)
- ✅ Reserva definitiva
- ✅ Cancelación de reservas temporales
- ✅ Validación de stock antes de reservar
- ✅ Visualización de fecha de expiración

### 8. Flujo Completo
- ✅ Crear oferta
- ✅ Protección post-creación (no editable)
- ✅ Reservar materiales (después de crear)
- ✅ Nueva oferta (reset completo)

---

## Validaciones Implementadas

### Frontend
1. ✅ Almacén seleccionado
2. ✅ Al menos un material agregado
3. ✅ Cliente seleccionado (si es personalizada)
4. ✅ Foto de portada: tipo y tamaño
5. ✅ Stock disponible al agregar materiales
6. ✅ Cantidades positivas
7. ✅ Precios válidos

### Backend (esperadas)
1. Stock suficiente en almacén
2. Cliente existe (si es personalizada)
3. Almacén existe
4. Materiales existen
5. Cálculos correctos
6. Autenticación válida

---

## Manejo de Errores

### Errores Comunes Manejados

1. **Stock Insuficiente**
   - Mensaje: "Stock insuficiente para: [materiales]"
   - Acción: Mostrar toast con detalles

2. **Cliente No Encontrado**
   - Mensaje: "El cliente seleccionado no existe"
   - Acción: Verificar selección de cliente

3. **Almacén No Encontrado**
   - Mensaje: "El almacén seleccionado no existe"
   - Acción: Verificar selección de almacén

4. **Sesión Expirada**
   - Mensaje: "Sesión expirada. Por favor, inicia sesión nuevamente"
   - Acción: Redirigir a login (manejado por apiRequest)

5. **Foto Muy Grande**
   - Mensaje: "La imagen no debe superar los 5MB"
   - Acción: Solicitar imagen más pequeña

6. **Formato de Imagen Inválido**
   - Mensaje: "Formato de imagen no soportado. Usa JPG, PNG o WebP"
   - Acción: Solicitar formato correcto

---

## Estados del Componente

```typescript
// Estados principales
const [items, setItems] = useState<OfertaItem[]>([])
const [ofertaGenerica, setOfertaGenerica] = useState(true)
const [clienteId, setClienteId] = useState("")
const [almacenId, setAlmacenId] = useState<string>("")
const [estadoOferta, setEstadoOferta] = useState<string>("en_revision")

// Secciones y elementos
const [seccionesPersonalizadas, setSeccionesPersonalizadas] = useState<SeccionPersonalizada[]>([])
const [elementosPersonalizados, setElementosPersonalizados] = useState<ElementoPersonalizado[]>([])

// Componentes principales
const [inversorSeleccionado, setInversorSeleccionado] = useState<string>("")
const [bateriaSeleccionada, setBateriaSeleccionada] = useState<string>("")
const [panelSeleccionado, setPanelSeleccionado] = useState<string>("")

// Cálculos
const [margenComercial, setMargenComercial] = useState(0)
const [costoTransportacion, setCostoTransportacion] = useState(0)

// Foto
const [fotoPortada, setFotoPortada] = useState<string>("")
const [subiendoFoto, setSubiendoFoto] = useState(false)

// Creación y reserva
const [creandoOferta, setCreandoOferta] = useState(false)
const [ofertaCreada, setOfertaCreada] = useState(false)
const [ofertaId, setOfertaId] = useState<string>("")
const [materialesReservados, setMaterialesReservados] = useState(false)
const [reservandoMateriales, setReservandoMateriales] = useState(false)
```

---

## Integración con API

### Configuración
- Usa `apiRequest` de `@/lib/api-config.ts`
- Autenticación automática con token JWT
- Headers configurados automáticamente
- Manejo de errores centralizado

### Ejemplo de Uso

```typescript
import { apiRequest } from '@/lib/api-config'

// Crear oferta
const response = await apiRequest<ResponseType>('/ofertas/confeccion', {
  method: 'POST',
  body: JSON.stringify(data)
})

// Subir foto
const formData = new FormData()
formData.append('foto', file)
const response = await apiRequest<ResponseType>('/ofertas/upload-foto-portada', {
  method: 'POST',
  body: formData
})
```

---

## Próximos Pasos

### Pendientes de Implementar

1. **Reservas (Backend)**
   - Endpoint: `POST /api/ofertas/{id}/reservar-materiales`
   - Endpoint: `POST /api/ofertas/{id}/cancelar-reserva`
   - Job automático de expiración

2. **Listado de Ofertas**
   - Endpoint: `GET /api/ofertas/confeccion`
   - Tabla con filtros
   - Búsqueda y paginación

3. **Editar Oferta**
   - Endpoint: `PUT /api/ofertas/{id}`
   - Solo si no tiene materiales reservados

4. **Eliminar Oferta**
   - Endpoint: `DELETE /api/ofertas/{id}`
   - Solo si no tiene materiales reservados

5. **Ver Detalles**
   - Endpoint: `GET /api/ofertas/{id}`
   - Modal con información completa

6. **Exportar/Imprimir**
   - PDF de la oferta
   - Envío por email/WhatsApp

---

## Testing

### Casos de Prueba Recomendados

1. ✅ Crear oferta genérica simple
2. ✅ Crear oferta personalizada con cliente
3. ✅ Crear oferta con secciones personalizadas
4. ✅ Crear oferta con foto de portada
5. ✅ Validar stock insuficiente
6. ✅ Validar cliente no encontrado
7. ✅ Validar almacén no encontrado
8. ✅ Subir foto muy grande
9. ✅ Subir foto con formato inválido
10. ✅ Crear oferta sin autenticación

---

## Notas Técnicas

### Performance
- Los cálculos se hacen en tiempo real con `useMemo`
- Las validaciones son instantáneas
- La subida de fotos es asíncrona

### UX
- Feedback visual en todos los estados
- Mensajes de error claros y específicos
- Protección contra edición accidental
- Confirmaciones para acciones destructivas

### Seguridad
- Token JWT en todas las peticiones
- Validación de tipos de archivo
- Límites de tamaño de archivo
- Sanitización de inputs

---

## Documentación Relacionada

- `docs/CONFECCION_OFERTAS_BACKEND_SPEC.md` - Especificación completa del backend
- `docs/FRONTEND_CREAR_OFERTA_GUIA.md` - Guía de uso del endpoint
- `lib/api-config.ts` - Configuración de la API
- `components/feats/ofertas/confeccion-ofertas-view.tsx` - Componente principal

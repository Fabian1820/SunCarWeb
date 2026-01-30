# 🎨 Ejemplo Visual: Request al Actualizar Contacto

## 📊 Flujo de Construcción del Request

```
┌─────────────────────────────────────────────────────────────┐
│  INICIO: Usuario edita oferta y cambia contacto            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Crear objeto base                                       │
│                                                             │
│  const ofertaData: any = {                                 │
│    tipo_oferta: 'personalizada',                           │
│    almacen_id: 'ALM001'                                    │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. ¿Es oferta personalizada?                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    │               │
                   SÍ              NO
                    │               │
                    ↓               ↓
    ┌───────────────────────┐   [No agregar contacto]
    │ 3. ¿Qué tipo?        │
    └───────────────────────┘
              ↓
    ┌─────────┴─────────┐
    │                   │
 CLIENTE            LEAD          LEAD_SIN_AGREGAR
    │                   │                │
    ↓                   ↓                ↓
┌─────────┐      ┌──────────┐    ┌──────────────┐
│ ¿Tiene  │      │ ¿Tiene   │    │ ¿Tiene       │
│ valor?  │      │ valor?   │    │ valor?       │
└─────────┘      └──────────┘    └──────────────┘
    │                   │                │
   SÍ                  SÍ               SÍ
    │                   │                │
    ↓                   ↓                ↓
┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐
│ Agregar     │  │ Agregar     │  │ Agregar              │
│ cliente_    │  │ lead_id     │  │ nombre_lead_sin_     │
│ numero      │  │             │  │ agregar              │
└─────────────┘  └─────────────┘  └──────────────────────┘
    │                   │                │
    └───────────────────┴────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Agregar resto de campos                                 │
│     - foto_portada (si existe)                             │
│     - estado                                                │
│     - items                                                 │
│     - servicios (si existen)                               │
│     - secciones_personalizadas (si existen)                │
│     - elementos_personalizados (si existen)                │
│     - componentes_principales                              │
│     - datos de margen y precios                            │
│     - datos de pago                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Enviar PUT request                                      │
│     PUT /ofertas/confeccion/{oferta_id}                    │
│     Body: ofertaData                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  FIN: Backend procesa con UN SOLO campo de contacto        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Ejemplo Paso a Paso

### Paso 1: Objeto Base
```javascript
const ofertaData = {
  tipo_oferta: 'personalizada',
  almacen_id: 'ALM001'
}
```

### Paso 2: Evaluar Tipo de Contacto

#### Opción A: Usuario seleccionó CLIENTE
```javascript
// Estado del formulario:
tipoContacto = 'cliente'
selectedCliente = { numero: 'CLI-2024-001' }

// Código ejecutado:
if (tipoContacto === 'cliente' && selectedCliente?.numero) {
  ofertaData.cliente_numero = 'CLI-2024-001'  // ✅ Se agrega
}

// Resultado:
{
  tipo_oferta: 'personalizada',
  almacen_id: 'ALM001',
  cliente_numero: 'CLI-2024-001'  // ✅ Solo este
}
```

#### Opción B: Usuario seleccionó LEAD
```javascript
// Estado del formulario:
tipoContacto = 'lead'
leadId = '507f1f77bcf86cd799439011'

// Código ejecutado:
if (tipoContacto === 'lead' && leadId) {
  ofertaData.lead_id = '507f1f77bcf86cd799439011'  // ✅ Se agrega
}

// Resultado:
{
  tipo_oferta: 'personalizada',
  almacen_id: 'ALM001',
  lead_id: '507f1f77bcf86cd799439011'  // ✅ Solo este
}
```

#### Opción C: Usuario seleccionó LEAD SIN AGREGAR
```javascript
// Estado del formulario:
tipoContacto = 'lead_sin_agregar'
nombreLeadSinAgregar = 'Pedro López'

// Código ejecutado:
if (tipoContacto === 'lead_sin_agregar' && nombreLeadSinAgregar.trim()) {
  ofertaData.nombre_lead_sin_agregar = 'Pedro López'  // ✅ Se agrega
}

// Resultado:
{
  tipo_oferta: 'personalizada',
  almacen_id: 'ALM001',
  nombre_lead_sin_agregar: 'Pedro López'  // ✅ Solo este
}
```

### Paso 3: Agregar Resto de Campos
```javascript
// Foto de portada (condicional)
if (fotoPortada) {
  ofertaData.foto_portada = fotoPortada
  ofertaData.foto_portada_url = fotoPortada
}

// Estado (siempre)
ofertaData.estado = 'en_revision'

// Items (siempre)
ofertaData.items = [
  {
    material_codigo: 'INV-001',
    descripcion: 'Inversor 5kW',
    precio: 1200.00,
    cantidad: 1,
    categoria: 'INVERSORES',
    seccion: 'INVERSORES',
    margen_asignado: 300.00
  },
  // ... más items
]

// Servicios (condicional)
if (servicios.length > 0) {
  ofertaData.servicios = servicios
}

// ... resto de campos
```

### Paso 4: Request Final

```http
PUT /ofertas/confeccion/OFF-2024-001 HTTP/1.1
Host: api.suncar.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "tipo_oferta": "personalizada",
  "almacen_id": "ALM001",
  "lead_id": "507f1f77bcf86cd799439011",
  "estado": "en_revision",
  "items": [
    {
      "material_codigo": "INV-001",
      "descripcion": "Inversor 5kW",
      "precio": 1200.00,
      "cantidad": 1,
      "categoria": "INVERSORES",
      "seccion": "INVERSORES",
      "margen_asignado": 300.00
    }
  ],
  "componentes_principales": {
    "inversor_seleccionado": "INV-001",
    "bateria_seleccionada": "BAT-001",
    "panel_seleccionado": "PAN-001"
  },
  "margen_comercial": 1500.00,
  "precio_final": 6700.00,
  "moneda_pago": "USD",
  "tasa_cambio": 0,
  "pago_transferencia": false,
  "aplica_contribucion": false
}
```

---

## 🎯 Puntos Clave

### ✅ Lo Que SÍ Sucede

1. **Se crea un objeto vacío** con solo `tipo_oferta` y `almacen_id`
2. **Se evalúa el tipo de contacto** seleccionado por el usuario
3. **Se agrega SOLO el campo correspondiente** si tiene valor
4. **Se agregan los demás campos** de la oferta
5. **Se envía el request** con UN SOLO campo de contacto

### ❌ Lo Que NO Sucede

1. ❌ No se crean campos con valor `undefined`
2. ❌ No se crean campos con valor `null`
3. ❌ No se crean campos con valor `""`
4. ❌ No se agregan múltiples campos de contacto
5. ❌ No se envían campos que no tienen valor

---

## 🔬 Inspección en DevTools

### Network Tab

```
Request URL: https://api.suncar.com/ofertas/confeccion/OFF-2024-001
Request Method: PUT
Status Code: 200 OK

Request Headers:
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Request Payload:
  {
    "tipo_oferta": "personalizada",
    "almacen_id": "ALM001",
    "lead_id": "507f1f77bcf86cd799439011",  ← Solo este campo de contacto
    "estado": "en_revision",
    "items": [...],
    "precio_final": 6700.00
  }

Response:
  {
    "success": true,
    "message": "Oferta actualizada exitosamente",
    "data": {
      "id": "OFF-2024-001",
      "lead_id": "507f1f77bcf86cd799439011",
      "cliente_numero": null,
      "nombre_lead_sin_agregar": null
    }
  }
```

### Console Log

```javascript
📤 Actualizando oferta: {
  tipo_oferta: "personalizada",
  almacen_id: "ALM001",
  lead_id: "507f1f77bcf86cd799439011",
  estado: "en_revision",
  items: Array(5) [...],
  componentes_principales: {...},
  margen_comercial: 1500,
  precio_final: 6700
}
```

**Nota:** Observa que NO aparecen `cliente_numero` ni `nombre_lead_sin_agregar` en el objeto.

---

## 📋 Checklist de Verificación

Cuando actualices el contacto de una oferta, verifica:

- [ ] El objeto `ofertaData` solo tiene UN campo de contacto
- [ ] No hay campos con valor `undefined` en el objeto
- [ ] No hay campos con valor `null` en el objeto
- [ ] No hay campos con valor `""` (string vacío) en el objeto
- [ ] El console.log muestra solo el campo de contacto activo
- [ ] El Network tab muestra solo el campo de contacto activo
- [ ] El backend responde con status 200 OK
- [ ] No hay error de "múltiples contactos"

---

**Conclusión:** El frontend ahora construye el objeto dinámicamente, agregando SOLO las propiedades que tienen valor, evitando enviar múltiples campos de contacto al backend.

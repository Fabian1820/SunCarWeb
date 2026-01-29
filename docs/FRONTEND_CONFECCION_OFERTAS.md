# Documentación Frontend - Confección de Ofertas

Guía para integrar el frontend con el backend de **ofertas de confección**.

## Base URL

```
/api/ofertas/confeccion
```

## Autenticación

Enviar token JWT en el header:

```http
Authorization: Bearer TU_TOKEN_JWT
```

---

## Modelos (TypeScript)

```ts
export type TipoOferta = "generica" | "personalizada";
export type EstadoOferta =
  | "en_revision"
  | "aprobada_para_enviar"
  | "enviada_a_cliente"
  | "confirmada_por_cliente"
  | "reservada";
export type MonedaPago = "USD" | "EUR" | "CUP";

export interface ItemOferta {
  material_codigo: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  categoria: string;
  seccion: string; // SeccionEnum o CUSTOM_xxxxx
}

export interface CostoExtra {
  id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export interface SeccionPersonalizada {
  id: string;
  label: string;
  tipo: "materiales" | "extra";
  tipo_extra?: "escritura" | "costo";
  categorias_materiales?: string[];
  contenido_escritura?: string;
  costos_extras?: CostoExtra[];
}

export interface ElementoPersonalizado {
  material_codigo: string;
  descripcion: string;
  precio: number;
  cantidad: number;
  categoria: string;
}

export interface ComponentesPrincipales {
  inversor_seleccionado?: string;
  bateria_seleccionada?: string;
  panel_seleccionado?: string;
}

export interface DatosPagoContribucion {
  aplica_contribucion?: boolean;
  porcentaje_contribucion?: number;
  monto_contribucion?: number;
  moneda_pago?: MonedaPago;
  tasa_cambio?: number;
  pago_transferencia?: boolean;
  datos_cuenta?: string;
  monto_convertido?: number;
}
```

---

## 1) Listar ofertas

**GET** `/api/ofertas/confeccion/`

**Query params opcionales:**
- `page` (int)
- `limit` (int)
- `es_generica` (bool)
- `estado` (string)
- `cliente_id` (string)

**Respuesta** (dos formatos admitidos):

```json
[
  {
    "id": "67960a1b2f8e4c001234abcd",
    "numero_oferta": "OF-20260126-001",
    "nombre_automatico": "Oferta de 1x 5kW Inversor Growatt...",
    "tipo_oferta": "generica",
    "almacen_id": "alm-001",
    "almacen_nombre": "Almacén Central",
    "foto_portada": "https://.../uuid.jpg",
    "items": [],
    "secciones_personalizadas": [],
    "componentes_principales": {},
    "margen_comercial": 15.0,
    "costo_transportacion": 500.0,
    "total_materiales": 11800.0,
    "subtotal_con_margen": 13882.35,
    "total_elementos_personalizados": 0.0,
    "total_costos_extras": 0.0,
    "precio_final": 14382.35,
    "aplica_contribucion": true,
    "porcentaje_contribucion": 5,
    "monto_contribucion": 250.0,
    "moneda_pago": "EUR",
    "tasa_cambio": 1.08,
    "monto_convertido": 11574.07,
    "pago_transferencia": true,
    "datos_cuenta": "Banco X - Titular Y - Cuenta Z",
    "estado": "en_revision",
    "materiales_reservados": false,
    "fecha_creacion": "2026-01-26T10:30:00Z",
    "fecha_actualizacion": "2026-01-26T10:30:00Z"
  }
]
```

o:

```json
{
  "success": true,
  "message": "Ofertas obtenidas",
  "data": [ /* mismo array que arriba */ ]
}
```

**Ejemplo:**

```ts
const res = await fetch("/api/ofertas/confeccion/?page=1&limit=20&es_generica=true");
const data = await res.json();
const ofertas = Array.isArray(data) ? data : data.data;
```

---

## 2) Obtener oferta por ID o número

**GET** `/api/ofertas/confeccion/{id|numero_oferta}`

**Respuesta:**

```json
{
  "success": true,
  "message": "Oferta obtenida",
  "data": {
    "id": "67960a1b2f8e4c001234abcd",
    "numero_oferta": "OF-20260126-001",
    "nombre_automatico": "Oferta de 1x 5kW Inversor Growatt...",
    "tipo_oferta": "generica",
    "almacen_id": "alm-001",
    "almacen_nombre": "Almacén Central",
    "foto_portada": "https://.../uuid.jpg",
    "items": [],
    "secciones_personalizadas": [],
    "componentes_principales": {},
    "margen_comercial": 15.0,
    "costo_transportacion": 500.0,
    "total_materiales": 11800.0,
    "subtotal_con_margen": 13882.35,
    "total_elementos_personalizados": 0.0,
    "total_costos_extras": 0.0,
    "precio_final": 14382.35,
    "aplica_contribucion": true,
    "porcentaje_contribucion": 5,
    "monto_contribucion": 250.0,
    "moneda_pago": "EUR",
    "tasa_cambio": 1.08,
    "monto_convertido": 11574.07,
    "pago_transferencia": true,
    "datos_cuenta": "Banco X - Titular Y - Cuenta Z",
    "estado": "en_revision",
    "materiales_reservados": false,
    "fecha_creacion": "2026-01-26T10:30:00Z",
    "fecha_actualizacion": "2026-01-26T10:30:00Z"
  }
}
```

---

## 3) Editar oferta (completa o parcial)

**PUT** `/api/ofertas/confeccion/{id}` (completa)  
**PATCH** `/api/ofertas/confeccion/{id}` (parcial)

**Body** (misma estructura de creación, campos opcionales):

```json
{
  "tipo_oferta": "generica",
  "almacen_id": "alm-001",
  "items": [],
  "componentes_principales": {},
  "margen_comercial": 15.0,
  "costo_transportacion": 500.0,
  "total_materiales": 11800.0,
  "subtotal_con_margen": 13882.35,
  "total_elementos_personalizados": 0.0,
  "total_costos_extras": 0.0,
  "precio_final": 14382.35,
  "aplica_contribucion": true,
  "porcentaje_contribucion": 5,
  "monto_contribucion": 250.0,
  "moneda_pago": "EUR",
  "tasa_cambio": 1.08,
  "monto_convertido": 11574.07,
  "pago_transferencia": true,
  "datos_cuenta": "Banco X - Titular Y - Cuenta Z",
  "cliente_numero": "CLI-001",
  "foto_portada": "https://.../uuid.jpg",
  "estado": "en_revision",
  "secciones_personalizadas": [],
  "elementos_personalizados": [],
  "notas": "..."
}
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Oferta actualizada",
  "data": { /* oferta actualizada, misma estructura que obtener */ }
}
```

---

## 4) Cambiar solo estado

**PATCH** `/api/ofertas/confeccion/{id}/estado`

**Body:**

```json
{
  "estado": "aprobada_para_enviar"
}
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Estado actualizado",
  "data": { /* oferta actualizada */ }
}
```

---

## 5) Subir foto de portada

**POST** `/api/ofertas/confeccion/upload-foto-portada`

**Content-Type:** `multipart/form-data`  
**Body:** `foto` (archivo)

**Respuesta:**

```json
{
  "success": true,
  "message": "Foto de portada subida exitosamente",
  "url": "https://.../ofertas-portadas/uuid.jpg",
  "filename": "uuid.jpg",
  "size": 245678,
  "content_type": "image/jpeg"
}
```

---

## 6) Calcular margen comercial distribuido en materiales

**POST** `/api/ofertas/confeccion/margen-materiales`

**Body:**

```json
{
  "margen_comercial": 30,
  "porcentaje_margen_materiales": 50,
  "items": [
    {
      "id": "item-1",
      "material_codigo": "PANEL-450",
      "descripcion": "Panel 450W",
      "precio": 8000,
      "cantidad": 1,
      "categoria": "PANELES",
      "seccion": "PANELES"
    },
    {
      "id": "item-2",
      "material_codigo": "CABLE-10",
      "descripcion": "Cableado",
      "precio": 2000,
      "cantidad": 1,
      "categoria": "CABLEADO_DC",
      "seccion": "CABLEADO_DC"
    }
  ]
}
```

**Respuesta:**

```json
{
  "total_materiales": 10000,
  "margen_total": 4285.71,
  "margen_materiales": 2142.86,
  "items": [
    {
      "id": "item-1",
      "margen_asignado": 1714.29,
      "porcentaje_margen_item": 21.4286
    },
    {
      "id": "item-2",
      "margen_asignado": 428.57,
      "porcentaje_margen_item": 21.4286
    }
  ],
  "redondeo": 2
}
```

**Notas:**
- `margen_comercial` y `porcentaje_margen_materiales` son porcentajes en rango 0-100.
- La distribucion del margen se hace por categoria con factores de peso internos.
- Si hay varios materiales en una categoria, todos usan el mismo factor.
- En categoria `BATERIAS`, el factor se divide entre todos los items de esa categoria.

---

## Errores comunes

```json
{ "detail": "Oferta no encontrada" }
```

```json
{ "detail": "Stock insuficiente para: INV-GW-5K" }
```

```json
{ "detail": "cliente_numero es requerido para ofertas personalizadas" }
```

```json
{ "detail": "Estado inválido" }
```

```json
{ "detail": "porcentaje_contribucion es requerido cuando aplica_contribucion es true" }
```

```json
{ "detail": "tasa_cambio es requerido cuando moneda_pago no es USD" }
```

```json
{ "detail": "datos_cuenta es requerido cuando pago_transferencia es true" }
```

---

## Reglas de validación (resumen)

- `aplica_contribucion = true` → `porcentaje_contribucion` requerido y >= 0.
- `moneda_pago = USD` → `tasa_cambio` opcional/null.
- `moneda_pago = EUR` → `tasa_cambio` requerido (1 EUR = tasa_cambio USD).
- `moneda_pago = CUP` → `tasa_cambio` requerido (1 USD = tasa_cambio CUP).
- `pago_transferencia = true` → `datos_cuenta` requerido.

---

## Helpers (cálculos en frontend)

```ts
export const calcularTotales = (formData: {
  items: ItemOferta[];
  elementos_personalizados?: ElementoPersonalizado[];
  secciones_personalizadas?: SeccionPersonalizada[];
  margen_comercial: number;
  costo_transportacion: number;
  aplica_contribucion?: boolean;
  porcentaje_contribucion?: number;
  moneda_pago?: MonedaPago;
  tasa_cambio?: number;
}) => {
  const total_materiales = formData.items.reduce(
    (sum, item) => sum + item.precio * item.cantidad,
    0
  );

  const total_elementos_personalizados = (formData.elementos_personalizados || []).reduce(
    (sum, elem) => sum + elem.precio * elem.cantidad,
    0
  );

  const total_costos_extras = (formData.secciones_personalizadas || [])
    .filter((s) => s.tipo === "extra" && s.tipo_extra === "costo")
    .reduce((sum, seccion) => {
      const subtotal = (seccion.costos_extras || []).reduce(
        (s, costo) => s + costo.precio_unitario * costo.cantidad,
        0
      );
      return sum + subtotal;
    }, 0);

  const subtotal_con_margen = total_materiales / (1 - formData.margen_comercial / 100);
  const base =
    subtotal_con_margen +
    formData.costo_transportacion +
    total_elementos_personalizados +
    total_costos_extras;
  const porcentaje_contribucion = formData.porcentaje_contribucion || 0;
  const aplica = Boolean(formData.aplica_contribucion);
  const monto_contribucion = aplica ? base * (porcentaje_contribucion / 100) : 0;
  const total_sin_redondeo = base + monto_contribucion;
  const precio_final = Math.ceil(total_sin_redondeo);

  let monto_convertido: number | null = null;
  if (formData.moneda_pago === "EUR" && formData.tasa_cambio) {
    monto_convertido = precio_final / formData.tasa_cambio;
  } else if (formData.moneda_pago === "CUP" && formData.tasa_cambio) {
    monto_convertido = precio_final * formData.tasa_cambio;
  }

  return {
    total_materiales: Number(total_materiales.toFixed(2)),
    subtotal_con_margen: Number(subtotal_con_margen.toFixed(2)),
    total_elementos_personalizados: Number(total_elementos_personalizados.toFixed(2)),
    total_costos_extras: Number(total_costos_extras.toFixed(2)),
    precio_final: Number(precio_final.toFixed(2)),
    monto_contribucion: Number(monto_contribucion.toFixed(2)),
    monto_convertido: monto_convertido === null ? null : Number(monto_convertido.toFixed(2))
  };
};
```

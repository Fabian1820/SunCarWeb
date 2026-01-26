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

---

## Helpers (cálculos en frontend)

```ts
export const calcularTotales = (formData: {
  items: ItemOferta[];
  elementos_personalizados?: ElementoPersonalizado[];
  secciones_personalizadas?: SeccionPersonalizada[];
  margen_comercial: number;
  costo_transportacion: number;
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
  const precio_final = Math.ceil(
    subtotal_con_margen +
      formData.costo_transportacion +
      total_elementos_personalizados +
      total_costos_extras
  );

  return {
    total_materiales: Number(total_materiales.toFixed(2)),
    subtotal_con_margen: Number(subtotal_con_margen.toFixed(2)),
    total_elementos_personalizados: Number(total_elementos_personalizados.toFixed(2)),
    total_costos_extras: Number(total_costos_extras.toFixed(2)),
    precio_final: Number(precio_final.toFixed(2))
  };
};
```


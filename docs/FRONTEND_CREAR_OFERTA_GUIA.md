# Guía Frontend - Crear Oferta de Confección

## Endpoint Principal

```
POST /api/ofertas/confeccion/
```

**⚠️ IMPORTANTE:** La barra diagonal al final (`/`) es OBLIGATORIA

---

## 🔐 Autenticación

**Header requerido:**
```javascript
headers: {
  'Authorization': 'Bearer TU_TOKEN_JWT',
  'Content-Type': 'application/json'
}
```

---

## 📋 Estructura del Request Body

### Campos Obligatorios

```typescript
interface CrearOfertaRequest {
  // BÁSICOS (Obligatorios)
  tipo_oferta: "generica" | "personalizada";
  almacen_id: string;
  items: ItemOferta[];
  componentes_principales: ComponentesPrincipales;
  
  // CÁLCULOS (Obligatorios)
  margen_comercial: number;
  costo_transportacion: number;
  total_materiales: number;
  subtotal_con_margen: number;
  total_elementos_personalizados: number;
  total_costos_extras: number;
  precio_final: number;
  
  // OPCIONALES
  cliente_numero?: string;  // Requerido si tipo_oferta es "personalizada"
  foto_portada?: string;
  estado?: string;
  secciones_personalizadas?: SeccionPersonalizada[];
  elementos_personalizados?: ElementoPersonalizado[];
  notas?: string;
}
```

---

## 📦 Tipos de Datos Detallados

### 1. ItemOferta

```typescript
interface ItemOferta {
  material_codigo: string;      // Código del material del inventario
  descripcion: string;          // Descripción del material
  precio: number;               // Precio unitario
  cantidad: number;             // Cantidad (entero positivo)
  categoria: string;            // Ej: "INVERSORES", "BATERIAS", "PANELES"
  seccion: string;              // Sección donde aparece (ver secciones predefinidas)
}
```

**Secciones Predefinidas:**
- `"INVERSORES"`
- `"BATERIAS"`
- `"PANELES"`
- `"MPPT"`
- `"ESTRUCTURAS"`
- `"CABLEADO_DC"`
- `"CABLEADO_AC"`
- `"CANALIZACION"`
- `"TIERRA"`
- `"PROTECCIONES_ELECTRICAS"`
- `"MATERIAL_VARIO"`
- `"CUSTOM_xxxxx"` (para secciones personalizadas)

### 2. ComponentesPrincipales

```typescript
interface ComponentesPrincipales {
  inversor_seleccionado?: string;  // Código del material inversor
  bateria_seleccionada?: string;   // Código del material batería
  panel_seleccionado?: string;     // Código del material panel
}
```

**Importante:** Estos códigos se usan para generar el nombre automático de la oferta.

### 3. SeccionPersonalizada

```typescript
interface SeccionPersonalizada {
  id: string;                    // Ej: "CUSTOM_1234567890"
  label: string;                 // Ej: "Instalación"
  tipo: "materiales" | "extra";
  
  // Si tipo es "materiales"
  categorias_materiales?: string[];  // Ej: ["CABLE", "ESTRUCTURA"]
  
  // Si tipo es "extra"
  tipo_extra?: "escritura" | "costo";
  contenido_escritura?: string;      // Si tipo_extra es "escritura"
  costos_extras?: CostoExtra[];      // Si tipo_extra es "costo"
}

interface CostoExtra {
  id: string;                    // Ej: "COSTO_1234567890"
  descripcion: string;           // Ej: "Mano de obra instalación"
  cantidad: number;              // Cantidad
  precio_unitario: number;       // Precio por unidad
}
```

### 4. ElementoPersonalizado

```typescript
interface ElementoPersonalizado {
  material_codigo: string;       // Código personalizado (no del inventario)
  descripcion: string;           // Descripción del elemento
  precio: number;                // Precio unitario
  cantidad: number;              // Cantidad
  categoria: string;             // Categoría personalizada
}
```

---

## 💡 Ejemplos Completos

### Ejemplo 1: Oferta Genérica Simple

```javascript
const crearOfertaGenerica = async () => {
  const oferta = {
    tipo_oferta: "generica",
    almacen_id: "alm-001",
    estado: "en_revision",
    
    // Items de la oferta
    items: [
      {
        material_codigo: "INV-GW-5K",
        descripcion: "Inversor Growatt 5kW",
        precio: 5000.00,
        cantidad: 1,
        categoria: "INVERSORES",
        seccion: "INVERSORES"
      },
      {
        material_codigo: "BAT-PYL-2.4",
        descripcion: "Batería Pylontech 2.4kWh",
        precio: 1200.00,
        cantidad: 4,
        categoria: "BATERIAS",
        seccion: "BATERIAS"
      },
      {
        material_codigo: "PAN-JA-550",
        descripcion: "Panel JA Solar 550W",
        precio: 150.00,
        cantidad: 10,
        categoria: "PANELES",
        seccion: "PANELES"
      }
    ],
    
    // Componentes principales (para generar nombre automático)
    componentes_principales: {
      inversor_seleccionado: "INV-GW-5K",
      bateria_seleccionada: "BAT-PYL-2.4",
      panel_seleccionado: "PAN-JA-550"
    },
    
    // Cálculos financieros
    margen_comercial: 15.0,
    costo_transportacion: 500.00,
    total_materiales: 11800.00,  // 5000 + (1200*4) + (150*10)
    subtotal_con_margen: 13882.35,  // total_materiales / (1 - 0.15)
    total_elementos_personalizados: 0.00,
    total_costos_extras: 0.00,
    precio_final: 14382.35  // subtotal_con_margen + costo_transportacion
  };
  
  const response = await fetch('/api/ofertas/confeccion', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(oferta)
  });
  
  const result = await response.json();
  console.log(result);
  // {
  //   success: true,
  //   message: "Oferta de confección creada exitosamente",
  //   data: {
  //     id: "of-001",
  //     numero_oferta: "OF-20260126-001",
  //     nombre_automatico: "Oferta de 1x 5kW Inversor Growatt, 4x 2.4kWh Batería Pylontech y 10x 550W Paneles JA Solar",
  //     ...
  //   }
  // }
};
```

### Ejemplo 2: Oferta Personalizada con Cliente

```javascript
const crearOfertaPersonalizada = async () => {
  const oferta = {
    tipo_oferta: "personalizada",
    cliente_numero: "CLI-001",  // ← REQUERIDO para ofertas personalizadas
    almacen_id: "alm-001",
    estado: "en_revision",
    
    items: [
      {
        material_codigo: "INV-GW-5K",
        descripcion: "Inversor Growatt 5kW",
        precio: 5000.00,
        cantidad: 1,
        categoria: "INVERSORES",
        seccion: "INVERSORES"
      }
    ],
    
    componentes_principales: {
      inversor_seleccionado: "INV-GW-5K"
    },
    
    margen_comercial: 15.0,
    costo_transportacion: 500.00,
    total_materiales: 5000.00,
    subtotal_con_margen: 5882.35,
    total_elementos_personalizados: 0.00,
    total_costos_extras: 0.00,
    precio_final: 6382.35
  };
  
  const response = await fetch('/api/ofertas/confeccion', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(oferta)
  });
  
  return await response.json();
};
```

### Ejemplo 3: Oferta con Secciones Personalizadas

```javascript
const crearOfertaConSecciones = async () => {
  const oferta = {
    tipo_oferta: "generica",
    almacen_id: "alm-001",
    
    items: [
      {
        material_codigo: "INV-GW-5K",
        descripcion: "Inversor Growatt 5kW",
        precio: 5000.00,
        cantidad: 1,
        categoria: "INVERSORES",
        seccion: "INVERSORES"
      },
      {
        material_codigo: "CABLE-10MM",
        descripcion: "Cable 10mm rojo",
        precio: 50.00,
        cantidad: 10,
        categoria: "CABLE",
        seccion: "CUSTOM_1234567890"  // ← Sección personalizada
      }
    ],
    
    // Secciones personalizadas
    secciones_personalizadas: [
      {
        id: "CUSTOM_1234567890",
        label: "Cableado Especial",
        tipo: "materiales",
        categorias_materiales: ["CABLE", "ESTRUCTURA"]
      },
      {
        id: "CUSTOM_1234567891",
        label: "Instalación",
        tipo: "extra",
        tipo_extra: "costo",
        costos_extras: [
          {
            id: "COSTO_1",
            descripcion: "Mano de obra instalación",
            cantidad: 1,
            precio_unitario: 500.00
          },
          {
            id: "COSTO_2",
            descripcion: "Transporte de equipo",
            cantidad: 2,
            precio_unitario: 100.00
          }
        ]
      },
      {
        id: "CUSTOM_1234567892",
        label: "Términos y Condiciones",
        tipo: "extra",
        tipo_extra: "escritura",
        contenido_escritura: "La instalación incluye garantía de 2 años..."
      }
    ],
    
    componentes_principales: {
      inversor_seleccionado: "INV-GW-5K"
    },
    
    margen_comercial: 15.0,
    costo_transportacion: 200.00,
    total_materiales: 5500.00,  // 5000 + (50*10)
    subtotal_con_margen: 6470.59,
    total_elementos_personalizados: 0.00,
    total_costos_extras: 700.00,  // 500 + (100*2)
    precio_final: 7370.59
  };
  
  const response = await fetch('/api/ofertas/confeccion', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(oferta)
  });
  
  return await response.json();
};
```

### Ejemplo 4: Oferta con Foto de Portada

```javascript
const crearOfertaConFoto = async () => {
  // Paso 1: Subir la foto primero
  const formData = new FormData();
  formData.append('foto', archivoImagen);  // File object del input
  
  const uploadResponse = await fetch('/api/ofertas/confeccion/upload-foto-portada', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  const uploadResult = await uploadResponse.json();
  const fotoUrl = uploadResult.url;
  
  // Paso 2: Crear la oferta con la URL de la foto
  const oferta = {
    tipo_oferta: "generica",
    almacen_id: "alm-001",
    foto_portada: fotoUrl,  // ← URL de la foto subida
    
    items: [
      {
        material_codigo: "INV-GW-5K",
        descripcion: "Inversor Growatt 5kW",
        precio: 5000.00,
        cantidad: 1,
        categoria: "INVERSORES",
        seccion: "INVERSORES"
      }
    ],
    
    componentes_principales: {
      inversor_seleccionado: "INV-GW-5K"
    },
    
    margen_comercial: 15.0,
    costo_transportacion: 500.00,
    total_materiales: 5000.00,
    subtotal_con_margen: 5882.35,
    total_elementos_personalizados: 0.00,
    total_costos_extras: 0.00,
    precio_final: 6382.35
  };
  
  const response = await fetch('/api/ofertas/confeccion', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(oferta)
  });
  
  return await response.json();
};
```

---

## 🧮 Cálculos Financieros

### Fórmulas para el Frontend

```javascript
// 1. Total de materiales
const total_materiales = items.reduce((sum, item) => 
  sum + (item.precio * item.cantidad), 0
);

// 2. Total de elementos personalizados
const total_elementos_personalizados = elementos_personalizados.reduce((sum, elem) => 
  sum + (elem.precio * elem.cantidad), 0
);

// 3. Total de costos extras
const total_costos_extras = secciones_personalizadas
  .filter(s => s.tipo === "extra" && s.tipo_extra === "costo")
  .reduce((sum, seccion) => {
    const subtotal = seccion.costos_extras.reduce((s, costo) => 
      s + (costo.precio_unitario * costo.cantidad), 0
    );
    return sum + subtotal;
  }, 0);

// 4. Subtotal con margen
const subtotal_con_margen = total_materiales / (1 - (margen_comercial / 100));

// 5. Precio final
const precio_final = Math.ceil(
  subtotal_con_margen + 
  costo_transportacion + 
  total_elementos_personalizados + 
  total_costos_extras
);
```

### Ejemplo de Calculadora

```javascript
const calcularTotales = (formData) => {
  const { items, elementos_personalizados, secciones_personalizadas, margen_comercial, costo_transportacion } = formData;
  
  // Total materiales
  const total_materiales = items.reduce((sum, item) => 
    sum + (parseFloat(item.precio) * parseInt(item.cantidad)), 0
  );
  
  // Total elementos personalizados
  const total_elementos_personalizados = (elementos_personalizados || []).reduce((sum, elem) => 
    sum + (parseFloat(elem.precio) * parseInt(elem.cantidad)), 0
  );
  
  // Total costos extras
  const total_costos_extras = (secciones_personalizadas || [])
    .filter(s => s.tipo === "extra" && s.tipo_extra === "costo")
    .reduce((sum, seccion) => {
      const subtotal = (seccion.costos_extras || []).reduce((s, costo) => 
        s + (parseFloat(costo.precio_unitario) * parseInt(costo.cantidad)), 0
      );
      return sum + subtotal;
    }, 0);
  
  // Subtotal con margen
  const margen = parseFloat(margen_comercial) || 0;
  const subtotal_con_margen = total_materiales / (1 - (margen / 100));
  
  // Precio final
  const precio_final = Math.ceil(
    subtotal_con_margen + 
    parseFloat(costo_transportacion) + 
    total_elementos_personalizados + 
    total_costos_extras
  );
  
  return {
    total_materiales: parseFloat(total_materiales.toFixed(2)),
    subtotal_con_margen: parseFloat(subtotal_con_margen.toFixed(2)),
    total_elementos_personalizados: parseFloat(total_elementos_personalizados.toFixed(2)),
    total_costos_extras: parseFloat(total_costos_extras.toFixed(2)),
    precio_final: parseFloat(precio_final.toFixed(2))
  };
};
```

---

## ✅ Validaciones en el Frontend

```javascript
const validarOferta = (oferta) => {
  const errores = [];
  
  // Validar tipo de oferta
  if (!["generica", "personalizada"].includes(oferta.tipo_oferta)) {
    errores.push("Tipo de oferta inválido");
  }
  
  // Validar cliente si es personalizada
  if (oferta.tipo_oferta === "personalizada" && !oferta.cliente_numero) {
    errores.push("Cliente es requerido para ofertas personalizadas");
  }
  
  // Validar almacén
  if (!oferta.almacen_id) {
    errores.push("Almacén es requerido");
  }
  
  // Validar items
  if (!oferta.items || oferta.items.length === 0) {
    errores.push("Debe agregar al menos un material");
  }
  
  // Validar cada item
  oferta.items.forEach((item, index) => {
    if (!item.material_codigo) errores.push(`Item ${index + 1}: Código de material requerido`);
    if (!item.descripcion) errores.push(`Item ${index + 1}: Descripción requerida`);
    if (item.precio <= 0) errores.push(`Item ${index + 1}: Precio debe ser mayor a 0`);
    if (item.cantidad <= 0) errores.push(`Item ${index + 1}: Cantidad debe ser mayor a 0`);
  });
  
  // Validar componentes principales
  if (!oferta.componentes_principales) {
    errores.push("Componentes principales son requeridos");
  }
  
  // Validar cálculos
  if (oferta.precio_final <= 0) {
    errores.push("Precio final debe ser mayor a 0");
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
};
```

---

## 📤 Respuesta del Servidor

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Oferta de confección creada exitosamente",
  "data": {
    "id": "67960a1b2f8e4c001234abcd",
    "numero_oferta": "OF-20260126-001",
    "nombre_automatico": "Oferta de 1x 5kW Inversor Growatt, 4x 2.4kWh Batería Pylontech y 10x 550W Paneles JA Solar",
    "tipo_oferta": "generica",
    "almacen_id": "alm-001",
    "almacen_nombre": "Almacén Central",
    "foto_portada": "https://s3.suncarsrl.com/photos/ofertas-portadas/uuid.jpg",
    "items": [...],
    "secciones_personalizadas": [...],
    "componentes_principales": {...},
    "margen_comercial": 15.0,
    "costo_transportacion": 500.00,
    "total_materiales": 11800.00,
    "subtotal_con_margen": 13882.35,
    "total_elementos_personalizados": 0.00,
    "total_costos_extras": 0.00,
    "precio_final": 14382.35,
    "estado": "en_revision",
    "materiales_reservados": false,
    "fecha_creacion": "2026-01-26T10:30:00Z",
    "fecha_actualizacion": "2026-01-26T10:30:00Z"
  }
}
```

### Errores Comunes

**400 - Stock Insuficiente**
```json
{
  "detail": "Stock insuficiente para: INV-GW-5K, BAT-PYL-2.4"
}
```

**400 - Cliente No Encontrado**
```json
{
  "detail": "Cliente CLI-001 no encontrado"
}
```

**400 - Almacén No Encontrado**
```json
{
  "detail": "Almacén alm-001 no encontrado"
}
```

**401 - No Autenticado**
```json
{
  "detail": "Not authenticated"
}
```

---

## 🎨 Componente React de Ejemplo

```typescript
import React, { useState } from 'react';

interface CrearOfertaFormProps {
  token: string;
  onSuccess: (oferta: any) => void;
}

const CrearOfertaForm: React.FC<CrearOfertaFormProps> = ({ token, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    tipo_oferta: 'generica',
    almacen_id: '',
    cliente_numero: '',
    items: [],
    margen_comercial: 15.0,
    costo_transportacion: 0,
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Calcular totales
      const totales = calcularTotales(formData);
      
      // Preparar payload
      const payload = {
        ...formData,
        ...totales,
        componentes_principales: {
          inversor_seleccionado: formData.items.find(i => i.categoria === 'INVERSORES')?.material_codigo,
          bateria_seleccionada: formData.items.find(i => i.categoria === 'BATERIAS')?.material_codigo,
          panel_seleccionado: formData.items.find(i => i.categoria === 'PANELES')?.material_codigo,
        }
      };
      
      // Enviar al backend
      const response = await fetch('/api/ofertas/confeccion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear oferta');
      }
      
      const result = await response.json();
      onSuccess(result.data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Formulario aquí */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creando...' : 'Crear Oferta'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};
```

---

## 📝 Resumen para el Frontend

### URL del Endpoint
```
POST https://tu-dominio.railway.app/api/ofertas/confeccion
```

### Headers Requeridos
```javascript
{
  'Authorization': 'Bearer TU_TOKEN',
  'Content-Type': 'application/json'
}
```

### Campos Mínimos Requeridos
```javascript
{
  tipo_oferta: "generica" | "personalizada",
  almacen_id: string,
  items: ItemOferta[],  // Al menos 1
  componentes_principales: {},
  margen_comercial: number,
  costo_transportacion: number,
  total_materiales: number,
  subtotal_con_margen: number,
  total_elementos_personalizados: number,
  total_costos_extras: number,
  precio_final: number
}
```

### Respuesta Exitosa
```javascript
{
  success: true,
  message: "Oferta de confección creada exitosamente",
  data: {
    id: string,
    numero_oferta: string,  // "OF-20260126-001"
    nombre_automatico: string,  // Generado automáticamente
    ...
  }
}
```

---

¿Necesitas algún ejemplo específico o tienes dudas sobre algún campo?

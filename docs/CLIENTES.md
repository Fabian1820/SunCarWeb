# API de Clientes - Documentación Actualizada

## Diferencias con la Versión Anterior

### Campos Nuevos (heredados de Leads)
- **`telefono_adicional`**: Teléfono adicional opcional
- **`fecha_contacto`**: Fecha del primer contacto
- **`estado`**: Estado del cliente (heredado del lead)
- **`fuente`**: Fuente de origen del cliente
- **`referencia`**: Referencia o detalle de cómo llegó
- **`pais_contacto`**: País de contacto
- **`comentario`**: Comentarios generales sobre el cliente
- **`provincia_montaje`**: Provincia donde se realiza el montaje
- **`comercial`**: Comercial que atendió al cliente
- **`ofertas`**: Lista de ofertas embebidas con cantidad solicitada
- **`elementos_personalizados`**: Lista de elementos personalizados solicitados
- **`fecha_montaje`**: Fecha programada de montaje (nuevo campo específico de cliente)

### Campos Eliminados
- **`equipo_instalado`**: Ahora esta información está contenida en `ofertas` y `elementos_personalizados`

### Cambios en el Modelo
El modelo Cliente ahora incluye todos los campos de Lead más campos específicos de cliente. Esto permite mantener el histórico completo desde que era un lead hasta que se convirtió en cliente, incluyendo todas las ofertas y elementos solicitados.

---

## Modelo Cliente

```typescript
interface ElementoPersonalizado {
  descripcion: string;
  cantidad: number;
}

interface OfertaEmbebida {
  id?: string;
  descripcion: string;
  descripcion_detallada?: string;
  precio: number;
  precio_cliente?: number;
  marca?: string;
  imagen?: string;
  moneda?: string;
  financiamiento?: boolean;
  descuentos?: string;
  garantias: string[];
  elementos: any[];
  cantidad: number;
}

interface Cliente {
  // Identificador único
  numero: string;                   // Obligatorio

  // Campos compartidos con Lead
  nombre: string;                   // Obligatorio
  telefono?: string;                // Opcional
  telefono_adicional?: string;      // Opcional
  direccion: string;                // Obligatorio
  fecha_contacto?: string;          // Opcional
  estado?: string;                  // Opcional
  fuente?: string;                  // Opcional
  referencia?: string;              // Opcional
  pais_contacto?: string;           // Opcional
  comentario?: string;              // Opcional
  provincia_montaje?: string;       // Opcional
  comercial?: string;               // Opcional
  ofertas: OfertaEmbebida[];        // Lista de ofertas
  elementos_personalizados: ElementoPersonalizado[];  // Elementos personalizados

  // Campos específicos de Cliente
  latitud?: number;                 // Opcional
  longitud?: number;                // Opcional
  carnet_identidad?: string;        // Opcional
  fecha_instalacion?: datetime;     // Opcional
  fecha_montaje?: string;           // Opcional - NUEVO
}
```

### Campos Obligatorios
- `numero` (string): Número único identificador del cliente
- `nombre` (string): Nombre completo del cliente
- `direccion` (string): Dirección física del cliente

### Campos Opcionales Compartidos con Lead
- `telefono` (string): Número de teléfono principal
- `telefono_adicional` (string): Número de teléfono adicional
- `fecha_contacto` (string): Fecha del primer contacto
- `estado` (string): Estado del cliente
- `fuente` (string): Fuente de origen
- `referencia` (string): Referencia
- `pais_contacto` (string): País de contacto
- `comentario` (string): Comentarios generales
- `provincia_montaje` (string): Provincia de montaje
- `comercial` (string): Comercial que atiende
- `ofertas` (array): Ofertas solicitadas
- `elementos_personalizados` (array): Elementos personalizados

### Campos Opcionales Específicos de Cliente
- `latitud` (float): Latitud GPS
- `longitud` (float): Longitud GPS
- `carnet_identidad` (string): Documento de identidad
- `fecha_instalacion` (datetime): Fecha de instalación
- `fecha_montaje` (string): Fecha programada de montaje

---

## Endpoints

### 1. Crear Cliente Completo
**POST** `/api/clientes/`

**Descripción**: Crea un nuevo cliente con información completa. Si el cliente ya existe (mismo número), actualiza su información.

**Request Body:**
```json
{
  "numero": "CLI-2024-001",
  "nombre": "Juan Pérez",
  "telefono": "+34612345678",
  "telefono_adicional": "+34698765432",
  "direccion": "Calle Solar 123, Madrid",
  "latitud": "40.4168",
  "longitud": "-3.7038",
  "carnet_identidad": "12345678A",
  "fecha_contacto": "2024-10-01",
  "estado": "activo",
  "fuente": "página web",
  "referencia": "campaña Google Ads",
  "pais_contacto": "España",
  "comentario": "Cliente interesado en sistema de 10kW",
  "provincia_montaje": "Madrid",
  "comercial": "María González",
  "fecha_montaje": "2024-11-15",
  "fecha_instalacion": "2024-11-20T10:00:00",
  "ofertas": [
    {
      "id": "oferta123",
      "descripcion": "Kit Solar Residencial 10kW",
      "descripcion_detallada": "Sistema completo de alta eficiencia",
      "precio": 10000,
      "precio_cliente": 9000,
      "marca": "SolarTech Pro",
      "imagen": "https://example.com/imagen.jpg",
      "moneda": "EUR",
      "financiamiento": true,
      "descuentos": "10% por pago al contado",
      "garantias": ["25 años paneles", "10 años inversor"],
      "elementos": [],
      "cantidad": 1
    }
  ],
  "elementos_personalizados": [
    {
      "descripcion": "Estructura reforzada para techo especial",
      "cantidad": 1
    },
    {
      "descripcion": "Cableado adicional 100m",
      "cantidad": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cliente creado exitosamente",
  "data": {
    "numero": "CLI-2024-001",
    "nombre": "Juan Pérez",
    "telefono": "+34612345678",
    "telefono_adicional": "+34698765432",
    ...
  }
}
```

### 2. Crear Cliente Simple
**POST** `/api/clientes/simple`

**Descripción**: Crea un cliente con información mínima. Útil para creación rápida.

**Request Body:**
```json
{
  "numero": "CLI-2024-002",
  "nombre": "Ana Torres",
  "direccion": "Avenida Principal 456",
  "telefono": "+34612345679"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cliente creado exitosamente",
  "data": {...}
}
```

### 3. Buscar Cliente por Número
**GET** `/api/clientes/verificar/{numero}`

**Descripción**: Verifica si existe un cliente por su número y devuelve información básica.

**Response:**
```json
{
  "success": true,
  "message": "Cliente encontrado",
  "data": {
    "numero": "CLI-2024-001",
    "nombre": "Juan Pérez",
    ...
  }
}
```

### 4. Buscar Cliente por Número o Teléfono
**POST** `/api/clientes/verificar-por-identificador`

**Descripción**: Verifica si existe un cliente por número de cliente o teléfono.

**Request Body:**
```json
{
  "identifier": "CLI-2024-001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cliente encontrado",
  "data": {
    "numero": "CLI-2024-001",
    "nombre": "Juan Pérez"
  }
}
```

### 5. Listar Clientes
**GET** `/api/clientes/`

**Query Parameters (todos opcionales):**
- `numero` (string): Filtro exacto por número
- `nombre` (string): Búsqueda parcial por nombre
- `direccion` (string): Búsqueda parcial por dirección

**Ejemplo:**
```
GET /api/clientes/?nombre=Juan
```

**Response:**
```json
{
  "success": true,
  "message": "Clientes obtenidos exitosamente",
  "data": [...]
}
```

### 6. Actualizar Cliente
**PATCH** `/api/clientes/{numero}`

**Descripción**: Actualiza parcialmente un cliente. Solo los campos enviados serán modificados.

**Request Body (todos opcionales):**
```json
{
  "telefono_adicional": "+34699999999",
  "estado": "instalado",
  "fecha_montaje": "2024-12-01",
  "comentario": "Instalación completada exitosamente"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cliente actualizado correctamente",
  "data": {...}
}
```

### 7. Eliminar Cliente
**DELETE** `/api/clientes/{numero}`

**Response:**
```json
{
  "success": true,
  "message": "Cliente eliminado correctamente",
  "data": {
    "numero": "CLI-2024-001"
  }
}
```

---

## Relación con Leads

### Conversión de Lead a Cliente

Los clientes pueden crearse de dos formas:
1. **Directamente**: Usando los endpoints POST `/api/clientes/` o `/api/clientes/simple`
2. **Por conversión desde Lead**: Usando el endpoint `POST /api/leads/{lead_id}/convertir-a-cliente`

Cuando un lead se convierte a cliente:
- Todos los datos del lead se copian automáticamente al cliente
- Las ofertas y elementos personalizados se mantienen como snapshot histórico
- El lead se elimina del sistema
- Se agrega información específica de cliente (número, latitud, longitud, etc.)

**Ejemplo de conversión:**
```bash
POST /api/leads/507f1f77bcf86cd799439011/convertir-a-cliente
{
  "numero": "CLI-2024-042",
  "fecha_montaje": "2024-11-30",
  "latitud": "40.4168",
  "longitud": "-3.7038"
}
```

Los campos heredados automáticamente del lead son:
- nombre, telefono, telefono_adicional, direccion
- fecha_contacto, estado, fuente, referencia
- pais_contacto, comentario, provincia_montaje, comercial
- ofertas completas con cantidad
- elementos_personalizados

---

## Códigos de Estado HTTP

- **200 OK**: Operación exitosa
- **404 Not Found**: Cliente no encontrado
- **422 Unprocessable Entity**: Error de validación en los datos
- **500 Internal Server Error**: Error interno del servidor

---

## Notas Importantes

1. **Campo `equipo_instalado` eliminado**: La información sobre equipos instalados ahora está contenida en los arrays `ofertas` y `elementos_personalizados`, lo que permite un registro más detallado y estructurado.

2. **Ofertas embebidas**: Las ofertas se almacenan como snapshots completos del momento de la solicitud/venta. Si los precios de las ofertas cambian en el catálogo, el cliente conserva los precios originales.

3. **Campo `fecha_montaje`**: Nuevo campo que permite programar la fecha del montaje, diferente de `fecha_instalacion` que registra cuándo se completó la instalación.

4. **Histórico completo**: Los clientes que fueron convertidos desde leads mantienen todo el histórico de seguimiento, incluyendo comercial que atendió, fuente de origen, etc.

5. **Coordenadas GPS**: Los campos `latitud` y `longitud` son opcionales, útiles para visualizar clientes en mapas.

6. **Elementos personalizados**: Permiten registrar elementos especiales o personalizados que no están en el catálogo de ofertas estándar.

7. **Actualización parcial**: Al usar PATCH, solo se actualizan los campos enviados, el resto permanece sin cambios.

---

## Ejemplo de Flujo Completo

### Escenario: Lead que se convierte en Cliente

#### 1. Se crea un lead
```bash
POST /api/leads/
{
  "fecha_contacto": "2024-10-22",
  "nombre": "Carlos Martínez",
  "telefono": "+34612345680",
  "estado": "nuevo",
  "fuente": "feria solar",
  "comercial": "Laura Ruiz",
  "comentario": "Interesado en sistema 15kW para negocio",
  "ofertas": [
    {
      "descripcion": "Kit Solar Comercial 15kW",
      "precio": 15000,
      "precio_cliente": 13500,
      "cantidad": 1,
      ...
    }
  ]
}
```

#### 2. Lead cierra la venta y se convierte a cliente
```bash
POST /api/leads/507f1f77bcf86cd799439011/convertir-a-cliente
{
  "numero": "CLI-2024-050",
  "latitud": "41.3851",
  "longitud": "2.1734",
  "fecha_montaje": "2024-12-10",
  "carnet_identidad": "87654321B"
}
```

#### 3. Cliente creado con toda la información
El cliente `CLI-2024-050` ahora tiene:
- Toda la información del lead (nombre, teléfono, ofertas, comercial, etc.)
- Información adicional de cliente (número, coordenadas, fecha_montaje)
- El lead original ya no existe

#### 4. Actualizar fecha de instalación cuando se complete
```bash
PATCH /api/clientes/CLI-2024-050
{
  "fecha_instalacion": "2024-12-10T14:30:00",
  "estado": "instalado",
  "comentario": "Instalación completada. Cliente satisfecho."
}
```

---

## Migración desde Versión Anterior

Si tienes clientes existentes con el campo `equipo_instalado`, considera:

1. **Migrar datos**: Convertir el texto de `equipo_instalado` en elementos de `elementos_personalizados`:
   ```json
   {
     "elementos_personalizados": [
       {
         "descripcion": "Panel Solar 300W + Inversor 2000W",
         "cantidad": 1
       }
     ]
   }
   ```

2. **Nuevos clientes**: Usar los arrays `ofertas` y `elementos_personalizados` para registrar equipos de forma estructurada.

3. **Compatibilidad**: Si tu sistema frontend aún usa `equipo_instalado`, puedes generar ese campo dinámicamente concatenando los elementos de `ofertas` y `elementos_personalizados`.

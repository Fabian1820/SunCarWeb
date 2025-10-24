# API de Clientes - Documentaci�n Actualizada

## Diferencias con la Versi�n Anterior

### Campos Nuevos (heredados de Leads)
- **`telefono_adicional`**: Tel�fono adicional opcional
- **`fecha_contacto`**: Fecha del primer contacto
- **`estado`**: Estado del cliente (heredado del lead)
- **`fuente`**: Fuente de origen del cliente
- **`referencia`**: Referencia o detalle de c�mo lleg�
- **`pais_contacto`**: Pa�s de contacto
- **`comentario`**: Comentarios generales sobre el cliente
- **`provincia_montaje`**: Provincia donde se realiza el montaje
- **`comercial`**: Comercial que atendi� al cliente
- **`ofertas`**: Lista de ofertas embebidas con cantidad solicitada
- **`elementos_personalizados`**: Lista de elementos personalizados solicitados
- **`fecha_montaje`**: Fecha programada de montaje (nuevo campo espec�fico de cliente)

### Campos Eliminados
- **`equipo_instalado`**: Ahora esta informaci�n est� contenida en `ofertas` y `elementos_personalizados`

### Cambios en el Modelo
El modelo Cliente ahora incluye todos los campos de Lead m�s campos espec�ficos de cliente. Esto permite mantener el hist�rico completo desde que era un lead hasta que se convirti� en cliente, incluyendo todas las ofertas y elementos solicitados.

---

## Modelo Cliente

```typescript
interface ElementoPersonalizado {
  descripcion: string;
  cantidad: number;
}

interface OfertaAsignacion {
  oferta_id: string;  // ID de la oferta a asignar (OBLIGATORIO)
  cantidad: number;   // Cantidad solicitada de esta oferta (debe ser mayor a 0)
}

// NOTA: Al crear/actualizar un cliente, el backend busca la oferta completa
// por su ID y la guarda embebida en el cliente (snapshot completo).
// La oferta embebida que verás al obtener el cliente tiene esta estructura:
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
  // Identificador �nico
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
  ofertas: OfertaAsignacion[];      // Al crear/actualizar: solo envías ID + cantidad
  elementos_personalizados: ElementoPersonalizado[];  // Elementos personalizados

  // NOTA: Al OBTENER un cliente, las ofertas vienen como OfertaEmbebida[]

  // Campos espec�ficos de Cliente
  latitud?: number;                 // Opcional
  longitud?: number;                // Opcional
  carnet_identidad?: string;        // Opcional
  fecha_instalacion?: datetime;     // Opcional
  fecha_montaje?: string;           // Opcional - NUEVO
}
```

### Campos Obligatorios
- `numero` (string): N�mero �nico identificador del cliente
- `nombre` (string): Nombre completo del cliente
- `direccion` (string): Direcci�n f�sica del cliente

### Campos Opcionales Compartidos con Lead
- `telefono` (string): N�mero de tel�fono principal
- `telefono_adicional` (string): N�mero de tel�fono adicional
- `fecha_contacto` (string): Fecha del primer contacto
- `estado` (string): Estado del cliente
- `fuente` (string): Fuente de origen
- `referencia` (string): Referencia
- `pais_contacto` (string): Pa�s de contacto
- `comentario` (string): Comentarios generales
- `provincia_montaje` (string): Provincia de montaje
- `comercial` (string): Comercial que atiende
- `ofertas` (array): Ofertas a asignar. Cada oferta requiere solo `oferta_id` (string) y `cantidad` (number)
- `elementos_personalizados` (array): Elementos personalizados

### Campos Opcionales Espec�ficos de Cliente
- `latitud` (float): Latitud GPS
- `longitud` (float): Longitud GPS
- `carnet_identidad` (string): Documento de identidad
- `fecha_instalacion` (datetime): Fecha de instalaci�n
- `fecha_montaje` (string): Fecha programada de montaje

---

## Endpoints

### 1. Crear Cliente Completo
**POST** `/api/clientes/`

**Descripci�n**: Crea un nuevo cliente con informaci�n completa. Si el cliente ya existe (mismo n�mero), actualiza su informaci�n.

**Request Body:**
```json
{
  "numero": "CLI-2024-001",
  "nombre": "Juan P�rez",
  "telefono": "+34612345678",
  "telefono_adicional": "+34698765432",
  "direccion": "Calle Solar 123, Madrid",
  "latitud": "40.4168",
  "longitud": "-3.7038",
  "carnet_identidad": "12345678A",
  "fecha_contacto": "2024-10-01",
  "estado": "activo",
  "fuente": "p�gina web",
  "referencia": "campa�a Google Ads",
  "pais_contacto": "Espa�a",
  "comentario": "Cliente interesado en sistema de 10kW",
  "provincia_montaje": "Madrid",
  "comercial": "Mar�a Gonz�lez",
  "fecha_montaje": "2024-11-15",
  "fecha_instalacion": "2024-11-20T10:00:00",
  "ofertas": [
    {
      "oferta_id": "67491f8b2e4c3d001234abcd",
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
    "nombre": "Juan P�rez",
    "telefono": "+34612345678",
    "telefono_adicional": "+34698765432",
    ...
  }
}
```

### 2. Crear Cliente Simple
**POST** `/api/clientes/simple`

**Descripci�n**: Crea un cliente con informaci�n m�nima. �til para creaci�n r�pida.

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

### 3. Buscar Cliente por N�mero
**GET** `/api/clientes/verificar/{numero}`

**Descripci�n**: Verifica si existe un cliente por su n�mero y devuelve informaci�n b�sica.

**Response:**
```json
{
  "success": true,
  "message": "Cliente encontrado",
  "data": {
    "numero": "CLI-2024-001",
    "nombre": "Juan P�rez",
    ...
  }
}
```

### 4. Buscar Cliente por N�mero o Tel�fono
**POST** `/api/clientes/verificar-por-identificador`

**Descripci�n**: Verifica si existe un cliente por n�mero de cliente o tel�fono.

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
    "nombre": "Juan P�rez"
  }
}
```

### 5. Listar Clientes
**GET** `/api/clientes/`

**Query Parameters (todos opcionales):**
- `numero` (string): Filtro exacto por n�mero
- `nombre` (string): B�squeda parcial por nombre
- `direccion` (string): B�squeda parcial por direcci�n

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

**Descripci�n**: Actualiza parcialmente un cliente. Solo los campos enviados ser�n modificados.

**Request Body (todos opcionales):**
```json
{
  "telefono_adicional": "+34699999999",
  "estado": "instalado",
  "fecha_montaje": "2024-12-01",
  "comentario": "Instalaci�n completada exitosamente"
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

## Relaci�n con Leads

### Conversi�n de Lead a Cliente

Los clientes pueden crearse de dos formas:
1. **Directamente**: Usando los endpoints POST `/api/clientes/` o `/api/clientes/simple`
2. **Por conversi�n desde Lead**: Usando el endpoint `POST /api/leads/{lead_id}/convertir-a-cliente`

Cuando un lead se convierte a cliente:
- Todos los datos del lead se copian autom�ticamente al cliente
- Las ofertas y elementos personalizados se mantienen como snapshot hist�rico
- El lead se elimina del sistema
- Se agrega informaci�n espec�fica de cliente (n�mero, latitud, longitud, etc.)

**Ejemplo de conversi�n:**
```bash
POST /api/leads/507f1f77bcf86cd799439011/convertir-a-cliente
{
  "numero": "CLI-2024-042",
  "fecha_montaje": "2024-11-30",
  "latitud": "40.4168",
  "longitud": "-3.7038"
}
```

Los campos heredados autom�ticamente del lead son:
- nombre, telefono, telefono_adicional, direccion
- fecha_contacto, estado, fuente, referencia
- pais_contacto, comentario, provincia_montaje, comercial
- ofertas completas con cantidad
- elementos_personalizados

---

## C�digos de Estado HTTP

- **200 OK**: Operaci�n exitosa
- **404 Not Found**: Cliente no encontrado
- **422 Unprocessable Entity**: Error de validaci�n en los datos
- **500 Internal Server Error**: Error interno del servidor

---

## Notas Importantes

1. **Sistema de Ofertas - IMPORTANTE**:
   - **Al crear o actualizar**: Solo env�as el `oferta_id` y la `cantidad` en el array de ofertas
   - **El backend autom�ticamente**:
     - Busca la oferta completa en la base de datos usando el ID
     - Guarda un snapshot completo de la oferta en el cliente (embed)
     - Si la oferta no existe, retorna error 404
   - **Al obtener un cliente**: Recibes las ofertas como `OfertaEmbebida[]` con todos los detalles
   - **Beneficio**: Si la oferta original cambia de precio o caracter�sticas, el cliente conserva los datos exactos del momento de la venta

2. **Campo `equipo_instalado` eliminado**: La informaci�n sobre equipos instalados ahora est� contenida en los arrays `ofertas` y `elementos_personalizados`, lo que permite un registro m�s detallado y estructurado.

3. **Campo `fecha_montaje`**: Nuevo campo que permite programar la fecha del montaje, diferente de `fecha_instalacion` que registra cu�ndo se complet� la instalaci�n.

4. **Hist�rico completo**: Los clientes que fueron convertidos desde leads mantienen todo el hist�rico de seguimiento, incluyendo comercial que atendi�, fuente de origen, etc.

5. **Coordenadas GPS**: Los campos `latitud` y `longitud` son opcionales, �tiles para visualizar clientes en mapas.

6. **Elementos personalizados**: Permiten registrar elementos especiales o personalizados que no est�n en el cat�logo de ofertas est�ndar.

7. **Actualizaci�n parcial**: Al usar PATCH, solo se actualizan los campos enviados, el resto permanece sin cambios.

---

## Ejemplo de Flujo Completo

### Escenario: Lead que se convierte en Cliente

#### 1. Se crea un lead
```bash
POST /api/leads/
{
  "fecha_contacto": "2024-10-22",
  "nombre": "Carlos Mart�nez",
  "telefono": "+34612345680",
  "estado": "nuevo",
  "fuente": "feria solar",
  "comercial": "Laura Ruiz",
  "comentario": "Interesado en sistema 15kW para negocio",
  "ofertas": [
    {
      "oferta_id": "67491f8b2e4c3d0012340001",
      "cantidad": 1
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

#### 3. Cliente creado con toda la informaci�n
El cliente `CLI-2024-050` ahora tiene:
- Toda la informaci�n del lead (nombre, tel�fono, ofertas, comercial, etc.)
- Informaci�n adicional de cliente (n�mero, coordenadas, fecha_montaje)
- El lead original ya no existe

#### 4. Actualizar fecha de instalaci�n cuando se complete
```bash
PATCH /api/clientes/CLI-2024-050
{
  "fecha_instalacion": "2024-12-10T14:30:00",
  "estado": "instalado",
  "comentario": "Instalaci�n completada. Cliente satisfecho."
}
```

---

## Migraci�n desde Versi�n Anterior

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

3. **Compatibilidad**: Si tu sistema frontend a�n usa `equipo_instalado`, puedes generar ese campo din�micamente concatenando los elementos de `ofertas` y `elementos_personalizados`.

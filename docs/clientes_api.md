# API de Clientes - SunCar Backend

Esta documentación describe todos los endpoints disponibles para la gestión de clientes. Está orientada a desarrolladores frontend.

---

## Modelo de Datos: Cliente

Un cliente tiene la siguiente estructura:

```json
{
  "numero": "SUN-001",
  "nombre": "Juan Pérez",
  "direccion": "Calle 123, Vedado, La Habana",
  "latitud": "23.123456",
  "longitud": "-82.345678",
  "telefono": "555-1234",
  "carnet_identidad": "12345678901",
  "equipo_instalado": "Panel Solar 300W + Inversor 2000W",
  "fecha_instalacion": "2025-01-15T10:30:00"
}
```

### Campos del Cliente

| Campo              | Tipo     | Requerido | Descripción                                        |
|--------------------|----------|-----------|---------------------------------------------------|
| numero             | string   | ✅ Sí     | Número único identificador del cliente            |
| nombre             | string   | ✅ Sí     | Nombre completo del cliente                       |
| direccion          | string   | ✅ Sí     | Dirección física del cliente                      |
| latitud            | string   | ⚠️ Depende| Latitud GPS (requerido en endpoint completo)      |
| longitud           | string   | ⚠️ Depende| Longitud GPS (requerido en endpoint completo)     |
| telefono           | string   | ❌ No     | Número de teléfono del cliente                    |
| carnet_identidad   | string   | ❌ No     | Carnet de identidad (CI) del cliente              |
| equipo_instalado   | string   | ❌ No     | Descripción del equipo instalado                  |
| fecha_instalacion  | datetime | ❌ No     | Fecha y hora de instalación (formato ISO 8601)    |

---

## 1. Crear Cliente Completo

### Endpoint
- **POST** `/api/clientes/`
- **Content-Type:** `application/json`

### Descripción
Crea un nuevo cliente con información completa. Si el cliente ya existe (mismo número), actualiza su información.

### Request Body

```json
{
  "numero": "SUN-001",
  "nombre": "Juan Pérez",
  "direccion": "Calle 123, Vedado, La Habana",
  "latitud": "23.123456",
  "longitud": "-82.345678",
  "telefono": "555-1234",
  "carnet_identidad": "12345678901",
  "equipo_instalado": "Panel Solar 300W + Inversor 2000W",
  "fecha_instalacion": "2025-01-15T10:30:00"
}
```

**Campos requeridos:**
- `numero`, `nombre`, `direccion`, `latitud`, `longitud`

**Campos opcionales:**
- `telefono`, `carnet_identidad`, `equipo_instalado`, `fecha_instalacion`

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Cliente creado exitosamente",
  "data": {
    "numero": "SUN-001",
    "nombre": "Juan Pérez",
    "direccion": "Calle 123, Vedado, La Habana",
    "latitud": 23.123456,
    "longitud": -82.345678,
    "telefono": "555-1234",
    "carnet_identidad": "12345678901",
    "equipo_instalado": "Panel Solar 300W + Inversor 2000W",
    "fecha_instalacion": "2025-01-15T10:30:00"
  }
}
```

### Ejemplo de uso (JavaScript/Fetch)

```javascript
const crearCliente = async (clienteData) => {
  try {
    const response = await fetch('/api/clientes/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        numero: "SUN-001",
        nombre: "Juan Pérez",
        direccion: "Calle 123, Vedado",
        latitud: "23.123456",
        longitud: "-82.345678",
        telefono: "555-1234",
        carnet_identidad: "12345678901",
        equipo_instalado: "Panel Solar 300W",
        fecha_instalacion: "2025-01-15T10:30:00"
      })
    });

    const result = await response.json();
    if (result.success) {
      console.log('Cliente creado:', result.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 2. Crear Cliente Simple

### Endpoint
- **POST** `/api/clientes/simple`
- **Content-Type:** `application/json`

### Descripción
Crea un cliente con información mínima. Todos los campos son opcionales excepto `numero`, `nombre` y `direccion`.

### Request Body

```json
{
  "numero": "SUN-002",
  "nombre": "María González",
  "direccion": "Avenida 5ta, Miramar",
  "latitud": "23.100000",
  "longitud": "-82.400000",
  "telefono": "555-5678",
  "carnet_identidad": "98765432109",
  "equipo_instalado": "Panel Solar 500W",
  "fecha_instalacion": "2025-02-20T14:00:00"
}
```

**Campos requeridos:**
- `numero`, `nombre`, `direccion`

**Campos opcionales:**
- `latitud`, `longitud`, `telefono`, `carnet_identidad`, `equipo_instalado`, `fecha_instalacion`

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Cliente simple creado exitosamente",
  "data": {
    "numero": "SUN-002",
    "nombre": "María González",
    "direccion": "Avenida 5ta, Miramar",
    "latitud": "23.100000",
    "longitud": "-82.400000",
    "telefono": "555-5678",
    "carnet_identidad": "98765432109",
    "equipo_instalado": "Panel Solar 500W",
    "fecha_instalacion": "2025-02-20T14:00:00"
  }
}
```

### Ejemplo de uso (JavaScript/Fetch)

```javascript
const crearClienteSimple = async () => {
  try {
    const response = await fetch('/api/clientes/simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        numero: "SUN-002",
        nombre: "María González",
        direccion: "Avenida 5ta, Miramar"
      })
    });

    const result = await response.json();
    if (result.success) {
      console.log('Cliente creado:', result.data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 3. Listar Clientes (con filtros opcionales)

### Endpoint
- **GET** `/api/clientes/`
- **Query Parameters:** `numero`, `nombre`, `direccion` (todos opcionales)

### Descripción
Obtiene una lista de clientes. Permite filtrar por número exacto, nombre (búsqueda parcial) o dirección (búsqueda parcial).

### Query Parameters

| Parámetro | Tipo   | Descripción                                      |
|-----------|--------|--------------------------------------------------|
| numero    | string | Busca por número exacto de cliente               |
| nombre    | string | Busca por nombre (búsqueda parcial, case-insensitive) |
| direccion | string | Busca por dirección (búsqueda parcial, case-insensitive) |

### Ejemplos de URLs

```
GET /api/clientes/
GET /api/clientes/?numero=SUN-001
GET /api/clientes/?nombre=Juan
GET /api/clientes/?direccion=Vedado
GET /api/clientes/?nombre=María&direccion=Miramar
```

### Respuesta Exitosa (200)

```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "numero": "SUN-001",
    "nombre": "Juan Pérez",
    "direccion": "Calle 123, Vedado",
    "latitud": 23.123456,
    "longitud": -82.345678,
    "telefono": "555-1234",
    "carnet_identidad": "12345678901",
    "equipo_instalado": "Panel Solar 300W",
    "fecha_instalacion": "2025-01-15T10:30:00"
  },
  {
    "id": "507f1f77bcf86cd799439012",
    "numero": "SUN-002",
    "nombre": "María González",
    "direccion": "Avenida 5ta, Miramar",
    "latitud": 23.100000,
    "longitud": -82.400000,
    "telefono": "555-5678",
    "carnet_identidad": "98765432109",
    "equipo_instalado": "Panel Solar 500W",
    "fecha_instalacion": "2025-02-20T14:00:00"
  }
]
```

**Nota:** Los clientes están ordenados por los últimos 4 dígitos del campo `numero`.

### Ejemplo de uso (JavaScript/Fetch)

```javascript
// Listar todos los clientes
const listarClientes = async () => {
  try {
    const response = await fetch('/api/clientes/');
    const clientes = await response.json();
    console.log('Clientes:', clientes);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Buscar por nombre
const buscarPorNombre = async (nombre) => {
  try {
    const response = await fetch(`/api/clientes/?nombre=${encodeURIComponent(nombre)}`);
    const clientes = await response.json();
    console.log('Resultados:', clientes);
  } catch (error) {
    console.error('Error:', error);
  }
};

// Buscar por número exacto
const buscarPorNumero = async (numero) => {
  try {
    const response = await fetch(`/api/clientes/?numero=${encodeURIComponent(numero)}`);
    const clientes = await response.json();
    console.log('Cliente encontrado:', clientes[0]);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 4. Actualizar Cliente Parcialmente

### Endpoint
- **PATCH** `/api/clientes/{numero}`
- **Content-Type:** `application/json`

### Descripción
Actualiza parcialmente un cliente existente. Solo se modifican los campos enviados en el request.

### Path Parameters

| Parámetro | Tipo   | Descripción                    |
|-----------|--------|--------------------------------|
| numero    | string | Número del cliente a actualizar|

### Request Body

Envía solo los campos que deseas actualizar:

```json
{
  "telefono": "555-9999",
  "equipo_instalado": "Panel Solar 600W + Inversor 3000W",
  "fecha_instalacion": "2025-03-10T09:00:00"
}
```

**Campos actualizables:**
- `nombre`, `direccion`, `latitud`, `longitud`, `telefono`, `carnet_identidad`, `equipo_instalado`, `fecha_instalacion`

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Cliente actualizado correctamente"
}
```

### Respuesta si no se encuentra (200)

```json
{
  "success": false,
  "message": "Cliente no encontrado o sin cambios"
}
```

### Respuesta si no se envían campos (400)

```json
{
  "detail": "No se enviaron campos para actualizar"
}
```

### Ejemplo de uso (JavaScript/Fetch)

```javascript
const actualizarCliente = async (numero, datosActualizar) => {
  try {
    const response = await fetch(`/api/clientes/${numero}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datosActualizar)
    });

    const result = await response.json();
    if (result.success) {
      console.log('Cliente actualizado exitosamente');
    } else {
      console.log('No se pudo actualizar:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Ejemplo: actualizar solo el teléfono
actualizarCliente("SUN-001", { telefono: "555-9999" });

// Ejemplo: actualizar múltiples campos
actualizarCliente("SUN-001", {
  telefono: "555-9999",
  equipo_instalado: "Panel Solar 600W",
  fecha_instalacion: "2025-03-10T09:00:00"
});
```

---

## 5. Verificar Cliente por Número

### Endpoint
- **GET** `/api/clientes/{numero}/verificar`

### Descripción
Verifica si existe un cliente con el número especificado y retorna toda su información.

### Path Parameters

| Parámetro | Tipo   | Descripción                  |
|-----------|--------|------------------------------|
| numero    | string | Número del cliente a verificar|

### Respuesta si existe (200)

```json
{
  "success": true,
  "message": "Cliente encontrado",
  "data": {
    "numero": "SUN-001",
    "nombre": "Juan Pérez",
    "direccion": "Calle 123, Vedado",
    "latitud": 23.123456,
    "longitud": -82.345678,
    "telefono": "555-1234",
    "carnet_identidad": "12345678901",
    "equipo_instalado": "Panel Solar 300W",
    "fecha_instalacion": "2025-01-15T10:30:00"
  }
}
```

### Respuesta si no existe (200)

```json
{
  "success": false,
  "message": "Cliente no encontrado",
  "data": null
}
```

### Ejemplo de uso (JavaScript/Fetch)

```javascript
const verificarCliente = async (numero) => {
  try {
    const response = await fetch(`/api/clientes/${numero}/verificar`);
    const result = await response.json();

    if (result.success) {
      console.log('Cliente existe:', result.data);
      return result.data;
    } else {
      console.log('Cliente no encontrado');
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 6. Verificar Cliente por Número o Teléfono

### Endpoint
- **POST** `/api/clientes/verificar`
- **Content-Type:** `application/json`

### Descripción
Busca un cliente por número de cliente o teléfono. Retorna únicamente el número y nombre del cliente si lo encuentra.

### Request Body

```json
{
  "identifier": "SUN-001"
}
```

o

```json
{
  "identifier": "555-1234"
}
```

### Respuesta si existe (200)

```json
{
  "success": true,
  "message": "Cliente encontrado exitosamente",
  "data": {
    "numero": "SUN-001",
    "nombre": "Juan Pérez"
  }
}
```

### Respuesta si no existe (200)

```json
{
  "success": false,
  "message": "No se encontró ningún cliente con el identificador: 555-9999. Verifica que el número de cliente o teléfono sea correcto.",
  "data": null
}
```

### Ejemplo de uso (JavaScript/Fetch)

```javascript
const verificarClientePorIdentificador = async (identificador) => {
  try {
    const response = await fetch('/api/clientes/verificar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: identificador
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('Cliente encontrado:', result.data);
      return result.data;
    } else {
      console.log('Cliente no encontrado:', result.message);
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Verificar por número de cliente
verificarClientePorIdentificador("SUN-001");

// Verificar por teléfono
verificarClientePorIdentificador("555-1234");
```

---

## 7. Eliminar Cliente

### Endpoint
- **DELETE** `/api/clientes/{numero}`

### Descripción
Elimina un cliente por su número.

### Path Parameters

| Parámetro | Tipo   | Descripción                  |
|-----------|--------|------------------------------|
| numero    | string | Número del cliente a eliminar |

### Respuesta si se eliminó (200)

```json
{
  "success": true,
  "message": "Cliente eliminado correctamente"
}
```

### Respuesta si no se encontró (200)

```json
{
  "success": false,
  "message": "Cliente no encontrado"
}
```

### Ejemplo de uso (JavaScript/Fetch)

```javascript
const eliminarCliente = async (numero) => {
  try {
    const confirmar = confirm(`¿Estás seguro de eliminar el cliente ${numero}?`);

    if (!confirmar) return;

    const response = await fetch(`/api/clientes/${numero}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      console.log('Cliente eliminado exitosamente');
    } else {
      console.log('No se pudo eliminar:', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## Notas Importantes para el Frontend

### 1. Formato de Fecha y Hora
El campo `fecha_instalacion` debe enviarse en formato ISO 8601:
```javascript
// Correcto
"fecha_instalacion": "2025-01-15T10:30:00"

// También válido (con zona horaria)
"fecha_instalacion": "2025-01-15T10:30:00-05:00"

// Crear desde objeto Date en JavaScript
const fecha = new Date();
const fechaISO = fecha.toISOString(); // "2025-01-15T10:30:00.000Z"
```

### 2. Validación de Campos
- **numero**: Debe ser único. Si intentas crear un cliente con un número existente, se actualizará el cliente.
- **latitud/longitud**: Deben ser strings numéricos válidos en el endpoint completo.
- **telefono**: Puede incluir cualquier formato (números, guiones, paréntesis).
- **carnet_identidad**: Campo de texto libre, validar formato en el frontend si es necesario.

### 3. Manejo de Errores
Todos los endpoints pueden retornar error 500 en caso de fallo del servidor:

```json
{
  "detail": "Mensaje de error descriptivo"
}
```

### 4. Búsqueda Parcial
Los parámetros `nombre` y `direccion` en el endpoint de listado soportan búsqueda parcial y son case-insensitive:

```javascript
// Encontrará "Juan Pérez", "Juan Carlos", "María Juana", etc.
fetch('/api/clientes/?nombre=juan')

// Encontrará "Vedado", "Calle Vedado", "Vedado #123", etc.
fetch('/api/clientes/?direccion=vedado')
```

### 5. Ordenamiento
Los clientes se ordenan automáticamente por los últimos 4 dígitos del campo `numero` en orden ascendente.

---

## Ejemplos Completos de Flujos

### Flujo 1: Crear Cliente y Verificar

```javascript
const flujoCrearYVerificar = async () => {
  // 1. Crear cliente
  const nuevoCliente = {
    numero: "SUN-003",
    nombre: "Carlos Rodríguez",
    direccion: "Calle 10, Centro Habana",
    latitud: "23.135",
    longitud: "-82.365",
    telefono: "555-7777",
    carnet_identidad: "11223344556",
    equipo_instalado: "Panel Solar 400W",
    fecha_instalacion: new Date().toISOString()
  };

  const crearResp = await fetch('/api/clientes/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nuevoCliente)
  });

  const creado = await crearResp.json();

  if (!creado.success) {
    console.error('Error al crear cliente');
    return;
  }

  // 2. Verificar que existe
  const verificarResp = await fetch(`/api/clientes/${nuevoCliente.numero}/verificar`);
  const verificado = await verificarResp.json();

  if (verificado.success) {
    console.log('Cliente creado y verificado:', verificado.data);
  }
};
```

### Flujo 2: Buscar, Actualizar y Listar

```javascript
const flujoActualizarCliente = async () => {
  // 1. Buscar cliente por teléfono
  const buscarResp = await fetch('/api/clientes/verificar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: "555-1234" })
  });

  const encontrado = await buscarResp.json();

  if (!encontrado.success) {
    console.log('Cliente no encontrado');
    return;
  }

  const numeroCliente = encontrado.data.numero;

  // 2. Actualizar información del equipo
  const actualizarResp = await fetch(`/api/clientes/${numeroCliente}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      equipo_instalado: "Panel Solar 800W + Batería 200Ah",
      fecha_instalacion: new Date().toISOString()
    })
  });

  const actualizado = await actualizarResp.json();

  if (actualizado.success) {
    console.log('Cliente actualizado exitosamente');

    // 3. Listar para verificar cambios
    const listarResp = await fetch(`/api/clientes/?numero=${numeroCliente}`);
    const clienteActualizado = await listarResp.json();
    console.log('Datos actualizados:', clienteActualizado[0]);
  }
};
```

---

## Resumen de Endpoints

| Método | Endpoint                         | Descripción                                      |
|--------|----------------------------------|--------------------------------------------------|
| POST   | `/api/clientes/`                 | Crear cliente completo (upsert)                  |
| POST   | `/api/clientes/simple`           | Crear cliente con datos mínimos                  |
| GET    | `/api/clientes/`                 | Listar clientes con filtros opcionales           |
| PATCH  | `/api/clientes/{numero}`         | Actualizar cliente parcialmente                  |
| GET    | `/api/clientes/{numero}/verificar`| Verificar cliente por número (retorna todo)     |
| POST   | `/api/clientes/verificar`        | Verificar por número o teléfono (retorna resumen)|
| DELETE | `/api/clientes/{numero}`         | Eliminar cliente                                 |

---

¿Dudas o necesitas más ejemplos? Consulta con el equipo de backend para detalles adicionales.

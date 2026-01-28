# Especificación Backend: Conversión de Lead a Cliente con Código Autogenerado

## Descripción General

El sistema permite convertir leads en clientes con generación automática de códigos únicos basados en:
- **Marca del inversor** (primera letra)
- **Provincia** (código de 2 dígitos)
- **Municipio** (código de 2 dígitos)
- **Número consecutivo** (3 dígitos con padding de ceros)

**Formato del código:** `{Letra}{Provincia}{Municipio}{Consecutivo}`  
**Longitud:** 8 caracteres (fija)  
**Ejemplo:** `G0807050` (Growatt, Provincia 08, Municipio 07, Cliente #50)  
**Capacidad:** 999 clientes por cada combinación de marca + provincia + municipio

### 1. Generar Código de Cliente
**Endpoint:** `GET /leads/{lead_id}/generar-codigo-cliente`

**Descripción:** Genera automáticamente un código único para el cliente basado en los datos del lead.

**Parámetros:**
- `lead_id` (path parameter): ID del lead

**Lógica de Generación del Código:**

1. **Obtener la marca del inversor:**
   - Buscar en `lead.ofertas[0].inversor_codigo` o `lead.ofertas[0].inversor_nombre`
   - Si el lead tiene ofertas, extraer la marca del primer inversor
   - Obtener la primera letra de la marca en mayúscula
   - Ejemplos:
     - "Huawei" → "H"
     - "Growatt" → "G"
     - "Deye" → "D"
     - "Goodwe" → "G"

2. **Obtener código de provincia:**
   - Usar el campo `lead.provincia_montaje`
   - Convertir a código numérico de 2 dígitos
   - Ejemplos:
     - "La Habana" → "10"
     - "Santiago de Cuba" → "15"
   - Si no hay provincia, usar "00"

3. **Obtener código de municipio:**
   - Usar el campo `lead.municipio`
   - Convertir a código numérico de 2 dígitos
   - Ejemplos:
     - "Plaza de la Revolución" → "01"
     - "Centro Habana" → "02"
   - Si no hay municipio, usar "00"

4. **Obtener número consecutivo:**
   - Buscar el último cliente creado en la base de datos
   - Extraer los últimos 3 dígitos de su código
   - Incrementar en 1
   - Formatear a 3 dígitos con ceros a la izquierda
   - Si no hay clientes previos, empezar en "001"
   - Ejemplos:
     - Último cliente: "G0807050" → Nuevo: "051"
     - Último cliente: "G0807099" → Nuevo: "100"
     - Último cliente: "G0807999" → Nuevo: "000" (reinicia)

5. **Formato final del código:**
   ```
   {LetraMarca}{CodigoProvincia}{CodigoMunicipio}{NumeroConsecutivo}
   ```
   
   Ejemplos completos:
   - Marca: Growatt, Provincia: 08, Municipio: 07, Consecutivo: 50 → `G0807050`
   - Marca: Huawei, Provincia: 03, Municipio: 02, Consecutivo: 1 → `H0302001`
   - Marca: Fronius, Provincia: 08, Municipio: 06, Consecutivo: 100 → `F0806100`

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "codigo_generado": "G0807050",
  "message": "Código generado exitosamente"
}
```

**Respuesta de Error (400/404):**
```json
{
  "success": false,
  "message": "No se pudo generar el código: Lead no encontrado",
  "codigo_generado": null
}
```

**Casos de Error a Manejar:**
- Lead no existe
- Lead no tiene ofertas con inversor
- No se puede determinar la marca del inversor
- Error al consultar la base de datos de clientes

---

### 2. Convertir Lead a Cliente (Modificación)
**Endpoint:** `POST /leads/{lead_id}/convertir`

**Descripción:** Convierte un lead en cliente usando el código pre-generado.

**Cambios Requeridos:**

1. **Nuevos campos obligatorios en el payload:**
   ```json
   {
     "numero": "G0807050",  // OBLIGATORIO - Código pre-generado (8 caracteres)
     "carnet_identidad": "12345678901",  // OPCIONAL
     "estado": "Pendiente de instalación"  // OBLIGATORIO - Solo acepta estos valores
   }
   ```

2. **Validaciones:**
   - `numero`: Debe ser un string no vacío (ya viene generado del frontend)
   - `carnet_identidad`: String opcional. Si se proporciona, debe tener 11 dígitos numéricos
   - `estado`: Solo acepta estos valores exactos:
     - `"Pendiente de instalación"`
     - `"Esperando equipo"`
   - Si `estado` tiene otro valor, retornar error 400

3. **Comportamiento:**
   - Copiar todos los datos del lead al nuevo cliente
   - Usar el `numero` proporcionado (no generar uno nuevo)
   - Establecer el `estado` proporcionado
   - Establecer `carnet_identidad` si se proporciona
   - Copiar ofertas, elementos personalizados, comprobante de pago, método de pago, moneda, etc. del lead
   - El lead se elimina automáticamente después de la conversión exitosa

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Lead convertido exitosamente a cliente G0807050",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "numero": "G0807050",
    "nombre": "Juan Pérez",
    "direccion": "Calle 23 #456",
    "telefono": "53123456",
    "estado": "Pendiente de instalación",
    "carnet_identidad": "12345678901",
    // ... resto de campos del cliente
  }
}
```

**Respuesta de Error (400):**
```json
{
  "success": false,
  "message": "Estado inválido. Solo se permite 'Pendiente de instalación' o 'Esperando equipo'",
  "data": null
}
```

---

## Mapeo de Provincias y Municipios

### Códigos de Provincias (Sugeridos)
```
01 - Pinar del Río
02 - Artemisa
03 - La Habana
04 - Mayabeque
05 - Matanzas
06 - Cienfuegos
07 - Villa Clara
08 - Sancti Spíritus
09 - Ciego de Ávila
10 - Camagüey
11 - Las Tunas
12 - Holguín
13 - Granma
14 - Santiago de Cuba
15 - Guantánamo
16 - Isla de la Juventud
```

**Nota:** Ajustar según la codificación que ya tengan en el backend.

### Códigos de Municipios
Cada provincia tiene sus propios municipios. Sugerimos usar códigos del 01 al 99 por provincia.

---

## Consideraciones Técnicas

### Concurrencia
- El número consecutivo debe manejarse de forma thread-safe
- Considerar usar transacciones o locks para evitar duplicados
- Si dos requests llegan simultáneamente, deben generar códigos diferentes

### Validación de Unicidad
- Antes de crear el cliente, verificar que el código no exista
- Si existe, incrementar el consecutivo y reintentar

### Logging
- Registrar cada generación de código para auditoría
- Incluir: timestamp, lead_id, código generado, usuario (si aplica)

### Performance
- Cachear el último número consecutivo para evitar queries repetitivas
- Invalidar cache al crear un nuevo cliente

---

## Ejemplos de Uso desde el Frontend

### 1. Generar Código
```typescript
// Frontend llama a este endpoint cuando el usuario hace clic en "Convertir a cliente"
const response = await fetch('/leads/507f1f77bcf86cd799439011/generar-codigo-cliente')
const data = await response.json()
// data.codigo_generado = "G0807050"
```

### 2. Convertir Lead
```typescript
// Frontend usa el código generado para convertir
const response = await fetch('/leads/507f1f77bcf86cd799439011/convertir', {
  method: 'POST',
  body: JSON.stringify({
    numero: "G0807050",  // Código pre-generado (8 caracteres)
    carnet_identidad: "12345678901",
    estado: "Pendiente de instalación"
  })
})
```

---

## Testing

### Casos de Prueba Requeridos

1. **Generación de código exitosa:**
   - Lead con oferta válida → Código generado correctamente

2. **Lead sin ofertas:**
   - Debe retornar error o usar marca por defecto

3. **Primer cliente:**
   - No hay clientes previos → Consecutivo debe ser "001"

4. **Consecutivo 999:**
   - Último cliente tiene consecutivo 999 → Nuevo debe ser "000" o manejar overflow

5. **Conversión con estado válido:**
   - Estado "Pendiente de instalación" → Cliente creado

6. **Conversión con estado inválido:**
   - Estado "Otro Estado" → Error 400

7. **Código duplicado:**
   - Intentar crear cliente con código existente → Error o auto-incremento

---

## Preguntas para el Equipo de Backend

1. ¿Ya tienen un sistema de códigos de provincia/municipio implementado?
2. ¿Cómo manejan la concurrencia en la generación de consecutivos?
3. ¿Necesitan que el frontend envíe algún dato adicional?
4. ¿Hay alguna restricción en el formato del código de cliente?
5. ¿Deben mantener algún registro histórico de códigos generados?

---

## Fecha de Implementación
**Solicitado:** 28 de enero de 2025
**Prioridad:** Alta
**Contacto Frontend:** [Tu nombre/equipo]

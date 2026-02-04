# Cambios Backend: Soporte para Equipos Propios del Cliente

## Contexto

Cuando se crea un cliente o se convierte un lead a cliente, puede darse el caso de que:
1. **No tenga inversor asignado** porque el equipo es propio del cliente
2. **No tenga inversor asignado** porque falta agregarlo

Para diferenciar estos casos, se implementó en el frontend una pregunta que permite al usuario indicar si el equipo es propio del cliente. Si es así, el código del cliente debe empezar con la letra **"P"** (de "Propio").

## Cambios Requeridos en el Backend

### 1. Endpoint: `GET /api/leads/{lead_id}/generar-codigo-cliente`

**Modificación:** Agregar soporte para query parameter `equipo_propio`

#### Request
```
GET /api/leads/{lead_id}/generar-codigo-cliente?equipo_propio=true
```

#### Lógica de Generación del Código

**Formato actual:** `{Letra}{Provincia}{Municipio}{Consecutivo}` (10 caracteres)
- Ejemplo: `F020400208` (F = Fronius, 02 = provincia, 04 = municipio, 00208 = consecutivo)

**Nueva lógica:**

```python
def generar_codigo_cliente(lead_id: str, equipo_propio: bool = False):
    """
    Genera un código de cliente de 10 caracteres.
    
    Formato: {Letra}{Provincia}{Municipio}{Consecutivo}
    - Letra: P si equipo_propio=True, sino primera letra de la marca del inversor
    - Provincia: 2 dígitos del código de provincia
    - Municipio: 2 dígitos del código de municipio
    - Consecutivo: 5 dígitos secuenciales
    
    Args:
        lead_id: ID del lead
        equipo_propio: Si True, usa "P" como prefijo. Si False, usa marca del inversor.
    
    Returns:
        str: Código de 10 caracteres (ej: "P020400208" o "F020400208")
    """
    lead = obtener_lead(lead_id)
    
    # Obtener códigos de provincia y municipio
    provincia_codigo = lead.provincia_codigo  # 2 dígitos
    municipio_codigo = lead.municipio_codigo  # 2 dígitos
    
    # Determinar la letra inicial
    if equipo_propio:
        letra_inicial = "P"
    else:
        # Obtener la marca del inversor de la primera oferta
        if not lead.ofertas or not lead.ofertas[0].inversor_codigo:
            raise ValueError(
                "El lead no tiene un inversor asignado. "
                "Debe asignar un inversor o marcar el equipo como propio del cliente."
            )
        
        inversor = obtener_material(lead.ofertas[0].inversor_codigo)
        if not inversor.marca:
            raise ValueError(
                f"El inversor {inversor.codigo} no tiene una marca asignada. "
                "Asigna una marca al material o marca el equipo como propio."
            )
        
        # Primera letra de la marca en mayúscula
        letra_inicial = inversor.marca[0].upper()
    
    # Generar consecutivo (5 dígitos)
    # Buscar el último código con el mismo prefijo (letra + provincia + municipio)
    prefijo = f"{letra_inicial}{provincia_codigo}{municipio_codigo}"
    ultimo_consecutivo = obtener_ultimo_consecutivo(prefijo)
    nuevo_consecutivo = (ultimo_consecutivo + 1) % 100000  # Máximo 99999
    consecutivo_str = str(nuevo_consecutivo).zfill(5)
    
    # Código final
    codigo = f"{prefijo}{consecutivo_str}"
    
    # Validar formato
    if len(codigo) != 10:
        raise ValueError(f"Código generado con longitud incorrecta: {codigo}")
    if not re.match(r"^[A-Z]\d{9}$", codigo):
        raise ValueError(f"Código generado con formato inválido: {codigo}")
    
    return codigo
```

#### Response
```json
{
  "success": true,
  "message": "Código generado correctamente",
  "codigo_generado": "P020400208"
}
```

### 2. Endpoint: `POST /api/leads/{lead_id}/convertir`

**Modificación:** Agregar campo opcional `equipo_propio` en el body

#### Request Body
```json
{
  "numero": "P020400208",
  "carnet_identidad": "12345678901",
  "estado": "Pendiente de instalación",
  "equipo_propio": true
}
```

#### Campos del Request
- `numero` (string, requerido): Código del cliente (10 caracteres)
- `carnet_identidad` (string, opcional): CI del cliente (11 dígitos)
- `estado` (string, opcional): Estado inicial del cliente
- `equipo_propio` (boolean, opcional): Indica si el equipo es propio del cliente

#### Lógica de Conversión

```python
def convertir_lead_a_cliente(lead_id: str, payload: dict):
    """
    Convierte un lead a cliente.
    
    Si equipo_propio=True:
    - El código debe empezar con "P"
    - No se requiere inversor en las ofertas del lead
    
    Si equipo_propio=False o no se especifica:
    - El código debe empezar con la letra de la marca del inversor
    - Se requiere que el lead tenga al menos una oferta con inversor
    """
    lead = obtener_lead(lead_id)
    equipo_propio = payload.get("equipo_propio", False)
    codigo = payload["numero"]
    
    # Validaciones
    if len(codigo) != 10:
        raise ValueError("El código debe tener exactamente 10 caracteres")
    
    if not re.match(r"^[A-Z]\d{9}$", codigo):
        raise ValueError("El código debe tener formato: 1 letra mayúscula + 9 dígitos")
    
    # Validar coherencia entre equipo_propio y el código
    if equipo_propio:
        if not codigo.startswith("P"):
            raise ValueError(
                "Si el equipo es propio, el código debe empezar con 'P'. "
                f"Código recibido: {codigo}"
            )
    else:
        if codigo.startswith("P"):
            raise ValueError(
                "El código empieza con 'P' pero no se marcó como equipo propio. "
                "Marca 'equipo_propio: true' o genera un código con la marca del inversor."
            )
        
        # Validar que tenga inversor
        if not lead.ofertas or not lead.ofertas[0].inversor_codigo:
            raise ValueError(
                "El lead no tiene un inversor asignado. "
                "Asigna un inversor o marca el equipo como propio del cliente."
            )
    
    # Crear el cliente
    cliente = crear_cliente_desde_lead(lead, payload)
    
    # Marcar el lead como convertido
    lead.convertido_a_cliente = True
    lead.cliente_id = cliente.id
    guardar_lead(lead)
    
    return cliente
```

### 3. Endpoint: `POST /api/clientes/` (Crear Cliente Directo)

**Modificación:** Agregar campo opcional `equipo_propio` en el body

#### Request Body
```json
{
  "numero": "P020400208",
  "nombre": "Juan Pérez",
  "telefono": "+5351234567",
  "direccion": "Calle 123",
  "provincia_montaje": "La Habana",
  "municipio": "Plaza de la Revolución",
  "estado": "Pendiente de instalación",
  "equipo_propio": true,
  "ofertas": []
}
```

#### Lógica de Validación

```python
def crear_cliente(payload: dict):
    """
    Crea un cliente directamente.
    
    Si equipo_propio=True:
    - El código debe empezar con "P"
    - No se requieren ofertas con inversor
    
    Si equipo_propio=False o no se especifica:
    - Si el código empieza con "P", se debe marcar equipo_propio=True
    - Si no empieza con "P", se requiere al menos una oferta con inversor
    """
    equipo_propio = payload.get("equipo_propio", False)
    codigo = payload.get("numero", "")
    
    # Validar formato del código
    if len(codigo) != 10:
        raise ValueError("El código debe tener exactamente 10 caracteres")
    
    if not re.match(r"^[A-Z]\d{9}$", codigo):
        raise ValueError("El código debe tener formato: 1 letra mayúscula + 9 dígitos")
    
    # Si el código empieza con P, debe estar marcado como equipo propio
    if codigo.startswith("P") and not equipo_propio:
        raise ValueError(
            "El código empieza con 'P' pero no se marcó como equipo propio. "
            "Marca 'equipo_propio: true' en el request."
        )
    
    # Si está marcado como equipo propio, el código debe empezar con P
    if equipo_propio and not codigo.startswith("P"):
        raise ValueError(
            "Si el equipo es propio, el código debe empezar con 'P'. "
            f"Código recibido: {codigo}"
        )
    
    # Si no es equipo propio, validar que tenga inversor
    if not equipo_propio:
        ofertas = payload.get("ofertas", [])
        if not ofertas or not ofertas[0].get("inversor_codigo"):
            raise ValueError(
                "Debe proporcionar al menos una oferta con inversor, "
                "o marcar el equipo como propio del cliente."
            )
    
    # Crear el cliente
    cliente = Cliente(**payload)
    guardar_cliente(cliente)
    
    return cliente
```

**IMPORTANTE:** El frontend ahora envía el campo `equipo_propio` al crear clientes directamente (no solo al convertir leads). Esto permite que el usuario cree clientes con equipos propios desde el formulario de "Gestionar Clientes" sin necesidad de pasar por el flujo de leads.

## Resumen de Cambios

### Endpoints Modificados

1. **`GET /api/leads/{lead_id}/generar-codigo-cliente`**
   - Agregar query param: `?equipo_propio=true`
   - Si `equipo_propio=true`: generar código con prefijo "P"
   - Si `equipo_propio=false` o no se especifica: usar marca del inversor

2. **`POST /api/leads/{lead_id}/convertir`**
   - Agregar campo opcional en body: `equipo_propio: boolean`
   - Validar coherencia entre el código y el flag `equipo_propio`

3. **`POST /api/clientes/`**
   - Agregar campo opcional en body: `equipo_propio: boolean`
   - Validar coherencia entre el código y el flag `equipo_propio`

### Validaciones Importantes

1. **Código con "P"**: Solo si `equipo_propio=true`
2. **Código sin "P"**: Requiere inversor asignado
3. **Formato del código**: Siempre 10 caracteres (`^[A-Z]\d{9}$`)
4. **Consecutivo**: Debe ser único para cada combinación de letra + provincia + municipio

## Ejemplos de Uso

### Caso 1: Cliente con Equipo Propio (Sin Inversor)

```bash
# 1. Generar código para equipo propio
GET /api/leads/123/generar-codigo-cliente?equipo_propio=true
# Response: { "codigo_generado": "P020400208" }

# 2. Convertir a cliente
POST /api/leads/123/convertir
{
  "numero": "P020400208",
  "estado": "Pendiente de instalación",
  "equipo_propio": true
}
```

### Caso 2: Cliente con Inversor Fronius

```bash
# 1. Generar código (lead ya tiene inversor Fronius)
GET /api/leads/456/generar-codigo-cliente
# Response: { "codigo_generado": "F020400209" }

# 2. Convertir a cliente
POST /api/leads/456/convertir
{
  "numero": "F020400209",
  "estado": "Pendiente de instalación",
  "equipo_propio": false
}
```

### Caso 3: Error - Sin Inversor y Sin Marcar Equipo Propio

```bash
# Lead sin inversor, intentando generar código sin equipo_propio
GET /api/leads/789/generar-codigo-cliente
# Response 400: {
#   "success": false,
#   "message": "El lead no tiene un inversor asignado. Debe asignar un inversor o marcar el equipo como propio del cliente."
# }
```

## Notas Adicionales

- El prefijo "P" es exclusivo para equipos propios
- Los códigos con "P" siguen el mismo formato de 10 caracteres
- El consecutivo es independiente para cada prefijo (letra + provincia + municipio)
- La validación debe ser estricta para evitar inconsistencias en la base de datos

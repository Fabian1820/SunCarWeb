# Backend: Endpoint para Generar Código de Cliente

## 📋 Resumen

Se necesita crear un nuevo endpoint en el backend para generar códigos de cliente sin necesidad de un lead existente. Este endpoint será usado en el formulario de "Crear Cliente" para generar automáticamente el código basándose en provincia, municipio e inversor.

---

## 🎯 Endpoint Requerido

### POST `/clientes/generar-codigo`

**Descripción:** Genera un código único de cliente basado en marca, provincia y municipio.

**Request Body:**
```json
{
  "marca_letra": "F",
  "provincia_codigo": "002",
  "municipio_codigo": "004"
}
```

**Campos:**
- `marca_letra` (string, required): Primera letra de la marca del inversor (A-Z mayúscula)
- `provincia_codigo` (string, required): Código de provincia con padding de 3 dígitos (ej: "002")
- `municipio_codigo` (string, required): Código de municipio con padding de 3 dígitos (ej: "004")

**Response exitosa:**
```json
{
  "success": true,
  "message": "Código generado exitosamente",
  "codigo_generado": "F002004208"
}
```

**Response de error:**
```json
{
  "success": false,
  "message": "Error al generar código",
  "detail": "Descripción del error"
}
```

---

## 🔧 Lógica de Implementación

### 1. Validaciones de Entrada

```python
def validar_parametros(marca_letra: str, provincia_codigo: str, municipio_codigo: str):
    """Validar los parámetros de entrada"""
    
    # Validar marca_letra
    if not marca_letra or len(marca_letra) != 1:
        raise ValueError("marca_letra debe ser exactamente 1 carácter")
    
    if not marca_letra.isupper() or not marca_letra.isalpha():
        raise ValueError("marca_letra debe ser una letra mayúscula (A-Z)")
    
    # Validar provincia_codigo
    if not provincia_codigo or len(provincia_codigo) != 3:
        raise ValueError("provincia_codigo debe tener exactamente 3 dígitos")
    
    if not provincia_codigo.isdigit():
        raise ValueError("provincia_codigo debe contener solo dígitos")
    
    # Validar municipio_codigo
    if not municipio_codigo or len(municipio_codigo) != 3:
        raise ValueError("municipio_codigo debe tener exactamente 3 dígitos")
    
    if not municipio_codigo.isdigit():
        raise ValueError("municipio_codigo debe contener solo dígitos")
```

### 2. Generación del Consecutivo

```python
def obtener_siguiente_consecutivo(marca_letra: str, provincia_codigo: str, municipio_codigo: str) -> int:
    """
    Obtener el siguiente número consecutivo para la combinación de marca + provincia + municipio
    """
    
    # Buscar el último cliente con esta combinación
    # Patrón: {marca_letra}{provincia_codigo}{municipio_codigo}*
    patron_prefijo = f"{marca_letra}{provincia_codigo}{municipio_codigo}"
    
    # Buscar en la base de datos el último código que coincida con este prefijo
    ultimo_cliente = db.clientes.find({
        "numero": {"$regex": f"^{patron_prefijo}"}
    }).sort("numero", -1).limit(1)
    
    if not ultimo_cliente:
        # No hay clientes con esta combinación, empezar en 1
        return 1
    
    # Extraer el consecutivo del último código
    ultimo_codigo = ultimo_cliente["numero"]
    consecutivo_str = ultimo_codigo[-3:]  # Últimos 3 dígitos
    
    try:
        consecutivo_actual = int(consecutivo_str)
        return consecutivo_actual + 1
    except ValueError:
        # Si hay error al parsear, empezar en 1
        return 1
```

### 3. Construcción del Código

```python
def construir_codigo(marca_letra: str, provincia_codigo: str, municipio_codigo: str, consecutivo: int) -> str:
    """
    Construir el código de cliente completo
    
    Formato: {Letra}{Provincia}{Municipio}{Consecutivo}
    Ejemplo: F002004208
    """
    
    # Formatear consecutivo con padding de 3 dígitos
    consecutivo_str = str(consecutivo).zfill(3)
    
    # Construir código completo
    codigo = f"{marca_letra}{provincia_codigo}{municipio_codigo}{consecutivo_str}"
    
    # Validar longitud final
    if len(codigo) != 10:
        raise ValueError(f"El código generado tiene longitud incorrecta: {len(codigo)} (esperado: 10)")
    
    # Validar formato
    if not re.match(r'^[A-Z]\d{9}$', codigo):
        raise ValueError(f"El código generado tiene formato inválido: {codigo}")
    
    return codigo
```

### 4. Endpoint Completo

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class GenerarCodigoRequest(BaseModel):
    marca_letra: str
    provincia_codigo: str
    municipio_codigo: str

@router.post("/clientes/generar-codigo")
async def generar_codigo_cliente(request: GenerarCodigoRequest):
    """
    Generar código único de cliente
    """
    try:
        # 1. Validar parámetros
        validar_parametros(
            request.marca_letra,
            request.provincia_codigo,
            request.municipio_codigo
        )
        
        # 2. Obtener siguiente consecutivo
        consecutivo = obtener_siguiente_consecutivo(
            request.marca_letra,
            request.provincia_codigo,
            request.municipio_codigo
        )
        
        # 3. Verificar límite (999 clientes por combinación)
        if consecutivo > 999:
            raise HTTPException(
                status_code=400,
                detail=f"Se alcanzó el límite de clientes para la combinación "
                       f"{request.marca_letra}{request.provincia_codigo}{request.municipio_codigo} "
                       f"(máximo: 999)"
            )
        
        # 4. Construir código
        codigo = construir_codigo(
            request.marca_letra,
            request.provincia_codigo,
            request.municipio_codigo,
            consecutivo
        )
        
        # 5. Verificar que no exista (por seguridad)
        cliente_existente = db.clientes.find_one({"numero": codigo})
        if cliente_existente:
            raise HTTPException(
                status_code=409,
                detail=f"El código {codigo} ya existe en la base de datos"
            )
        
        return {
            "success": True,
            "message": "Código generado exitosamente",
            "codigo_generado": codigo
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar código: {str(e)}"
        )
```

---

## 🧪 Casos de Prueba

### Caso 1: Generación Exitosa (Primer Cliente)

**Request:**
```json
{
  "marca_letra": "F",
  "provincia_codigo": "002",
  "municipio_codigo": "004"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Código generado exitosamente",
  "codigo_generado": "F002004001"
}
```

### Caso 2: Generación Exitosa (Cliente Consecutivo)

**Request:**
```json
{
  "marca_letra": "H",
  "provincia_codigo": "010",
  "municipio_codigo": "005"
}
```

**Response (si ya existen 207 clientes con esta combinación):**
```json
{
  "success": true,
  "message": "Código generado exitosamente",
  "codigo_generado": "H010005208"
}
```

### Caso 3: Error - Marca Inválida

**Request:**
```json
{
  "marca_letra": "f",
  "provincia_codigo": "002",
  "municipio_codigo": "004"
}
```

**Response:**
```json
{
  "success": false,
  "detail": "marca_letra debe ser una letra mayúscula (A-Z)"
}
```

### Caso 4: Error - Provincia Inválida

**Request:**
```json
{
  "marca_letra": "F",
  "provincia_codigo": "2",
  "municipio_codigo": "004"
}
```

**Response:**
```json
{
  "success": false,
  "detail": "provincia_codigo debe tener exactamente 3 dígitos"
}
```

### Caso 5: Error - Límite Alcanzado

**Request:**
```json
{
  "marca_letra": "G",
  "provincia_codigo": "015",
  "municipio_codigo": "008"
}
```

**Response (si ya existen 999 clientes):**
```json
{
  "success": false,
  "detail": "Se alcanzó el límite de clientes para la combinación G015008 (máximo: 999)"
}
```

---

## 🔗 Integración con Frontend

El frontend llamará a este endpoint automáticamente cuando el usuario:
1. Seleccione una provincia
2. Seleccione un municipio
3. Seleccione un inversor

**Ejemplo de llamada desde el frontend:**
```typescript
const response = await apiRequest<{
  success: boolean
  message: string
  codigo_generado: string
}>('/clientes/generar-codigo', {
  method: 'POST',
  body: JSON.stringify({
    marca_letra: 'F',
    provincia_codigo: '002',
    municipio_codigo: '004'
  })
})

console.log('Código generado:', response.codigo_generado)
// Output: "F002004208"
```

---

## 📊 Formato del Código

### Estructura
```
F 0 0 2 0 0 4 2 0 8
│ └──┬──┘ └──┬──┘ └─┬─┘
│    │       │      │
│    │       │      └─ Consecutivo (3 dígitos: 001-999)
│    │       └──────── Municipio (3 dígitos con padding)
│    └──────────────── Provincia (3 dígitos con padding)
└───────────────────── Marca (1 letra mayúscula)
```

### Ejemplos Válidos
- `F002004001` ✅ (Fronius, Provincia 2, Municipio 4, Cliente 1)
- `H010005208` ✅ (Huawei, Provincia 10, Municipio 5, Cliente 208)
- `G015008999` ✅ (Growatt, Provincia 15, Municipio 8, Cliente 999)

### Validaciones
- **Longitud:** Exactamente 10 caracteres
- **Formato:** `/^[A-Z]\d{9}$/`
- **Rango consecutivo:** 001-999 (máximo 999 clientes por combinación)

---

## 🚀 Notas de Implementación

1. **Transacciones:** Considerar usar transacciones de base de datos para evitar códigos duplicados en caso de concurrencia
2. **Índices:** Crear índice en el campo `numero` para búsquedas rápidas
3. **Caché:** Opcionalmente cachear el último consecutivo por combinación para mejorar performance
4. **Logs:** Registrar cada generación de código para auditoría
5. **Rate Limiting:** Considerar limitar las llamadas para evitar abuso

---

## 📞 Referencias

- Frontend: `components/feats/cliente/create-client-dialog.tsx`
- Servicio: `lib/services/feats/customer/cliente-service.ts`
- Documentación relacionada: `docs/FRONTEND_CONVERSION_LEADS_GUIA_COMPLETA.md`

# Cambios Backend - Nombres de Ofertas (Corto y Completo)

## Resumen
El frontend ahora envía dos nombres para cada oferta:
- **`nombre_oferta`**: Nombre corto para mostrar en tarjetas/UI (ej: `I-2x5kW, B-4x5.12kWh, P-12x590W`)
- **`nombre_completo`**: Nombre largo descriptivo para exportaciones (ej: `Oferta de 2x 5.0kW Inversor Felicity Solar, 4x 5.12kWh Batería Felicity Solar y 12x 590W Paneles Evo Solar`)

## Cambios Requeridos en el Backend

### 1. Modelo de Base de Datos

Agregar un nuevo campo al modelo de ofertas confeccionadas:

```python
class OfertaConfeccionada(Base):
    __tablename__ = "ofertas_confeccionadas"
    
    # ... campos existentes ...
    
    nombre = Column(String(500))  # Nombre corto (ya existe)
    nombre_completo = Column(Text)  # NUEVO: Nombre completo para exportaciones
    
    # ... resto de campos ...
```

**Migración SQL:**
```sql
ALTER TABLE ofertas_confeccionadas 
ADD COLUMN nombre_completo TEXT;
```

### 2. Endpoint POST `/ofertas/confeccion/`

**Request Body - Campos Nuevos:**
```json
{
  "tipo_oferta": "personalizada",
  "almacen_id": "ALM001",
  "nombre_oferta": "I-2x5kW, B-4x5.12kWh, P-12x590W",
  "nombre_completo": "Oferta de 2x 5.0kW Inversor Felicity Solar, 4x 5.12kWh Batería Felicity Solar y 12x 590W Paneles Evo Solar",
  "items": [...],
  // ... resto de campos ...
}
```

**Lógica de Procesamiento:**

```python
@router.post("/ofertas/confeccion/")
async def crear_oferta_confeccionada(
    oferta_data: OfertaConfeccionadaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ⚠️ IMPORTANTE: Extraer nombres del request
    nombre_corto = oferta_data.nombre_oferta  # Nombre corto (ej: "I-2x5kW, B-4x5.12kWh")
    nombre_completo = oferta_data.nombre_completo  # Nombre completo (ej: "Oferta de 2x 5.0kW...")
    
    # Si no se proporciona nombre_completo, usar nombre_corto como fallback
    if not nombre_completo:
        nombre_completo = nombre_corto
    
    # Si no se proporciona nombre_corto, generar automáticamente (lógica existente)
    if not nombre_corto:
        nombre_corto = generar_nombre_automatico(oferta_data)
        nombre_completo = generar_nombre_completo(oferta_data)
    
    # ✅ CRÍTICO: Guardar el nombre CORTO en el campo 'nombre'
    nueva_oferta = OfertaConfeccionada(
        nombre=nombre_corto,  # ⚠️ Guardar nombre CORTO aquí (no el completo)
        nombre_completo=nombre_completo,  # Guardar nombre completo aquí
        # ... resto de campos ...
    )
    
    db.add(nueva_oferta)
    db.commit()
    db.refresh(nueva_oferta)
    
    return {
        "success": True,
        "message": "Oferta creada exitosamente",
        "data": {
            "id": nueva_oferta.id,
            "numero_oferta": nueva_oferta.numero_oferta,
            "nombre": nueva_oferta.nombre,  # Nombre corto
            "nombre_automatico": nueva_oferta.nombre,  # Alias (mismo valor)
            "nombre_oferta": nueva_oferta.nombre,  # Alias (mismo valor)
            "nombre_completo": nueva_oferta.nombre_completo  # Nombre completo
        }
    }
```

**⚠️ ERROR COMÚN A EVITAR:**
```python
# ❌ INCORRECTO - NO hacer esto:
nueva_oferta = OfertaConfeccionada(
    nombre=nombre_completo,  # ❌ Esto guarda el nombre largo en 'nombre'
    nombre_completo=nombre_completo
)

# ✅ CORRECTO - Hacer esto:
nueva_oferta = OfertaConfeccionada(
    nombre=nombre_corto,  # ✅ Guardar nombre corto en 'nombre'
    nombre_completo=nombre_completo  # ✅ Guardar nombre largo en 'nombre_completo'
)
```

### 3. Endpoint PUT `/ofertas/confeccion/{oferta_id}`

**Request Body - Campos Nuevos:**
```json
{
  "nombre_oferta": "I-2x5kW, B-4x5.12kWh, P-12x590W",
  "nombre_completo": "Oferta de 2x 5.0kW Inversor Felicity Solar, 4x 5.12kWh Batería Felicity Solar y 12x 590W Paneles Evo Solar",
  // ... resto de campos ...
}
```

**Lógica de Procesamiento:**

```python
@router.put("/ofertas/confeccion/{oferta_id}")
async def actualizar_oferta_confeccionada(
    oferta_id: str,
    oferta_data: OfertaConfeccionadaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    oferta = db.query(OfertaConfeccionada).filter(
        OfertaConfeccionada.id == oferta_id
    ).first()
    
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")
    
    # Actualizar nombres si se proporcionan
    if oferta_data.nombre_oferta:
        oferta.nombre = oferta_data.nombre_oferta
    
    if oferta_data.nombre_completo:
        oferta.nombre_completo = oferta_data.nombre_completo
    elif oferta_data.nombre_oferta:
        # Si solo se proporciona nombre corto, usar como completo también
        oferta.nombre_completo = oferta_data.nombre_oferta
    
    # ... actualizar resto de campos ...
    
    db.commit()
    db.refresh(oferta)
    
    return {
        "success": True,
        "message": "Oferta actualizada exitosamente",
        "data": {
            "id": oferta.id,
            "numero_oferta": oferta.numero_oferta,
            "nombre_automatico": oferta.nombre,
            "nombre_completo": oferta.nombre_completo
        }
    }
```

### 4. Endpoint GET `/ofertas/confeccion/`

**Response - Incluir Ambos Nombres:**

```json
{
  "success": true,
  "data": [
    {
      "id": "OFC001",
      "numero_oferta": "OF-2024-001",
      "nombre": "I-2x5kW, B-4x5.12kWh, P-12x590W",
      "nombre_automatico": "I-2x5kW, B-4x5.12kWh, P-12x590W",
      "nombre_oferta": "I-2x5kW, B-4x5.12kWh, P-12x590W",
      "nombre_completo": "Oferta de 2x 5.0kW Inversor Felicity Solar, 4x 5.12kWh Batería Felicity Solar y 12x 590W Paneles Evo Solar",
      "tipo": "personalizada",
      "estado": "en_revision",
      "precio_final": 15000.00,
      // ... resto de campos ...
    }
  ]
}
```

**Nota:** El backend devuelve tres campos para compatibilidad:
- `nombre`: Nombre corto (campo principal en BD)
- `nombre_automatico`: Alias de `nombre` (compatibilidad)
- `nombre_oferta`: Alias de `nombre` (compatibilidad frontend)
- `nombre_completo`: Nombre largo descriptivo

### 5. Endpoint GET `/ofertas/confeccion/{oferta_id}`

**Response - Incluir Ambos Nombres:**

```json
{
  "success": true,
  "data": {
    "id": "OFC001",
    "numero_oferta": "OF-2024-001",
    "nombre": "I-2x5kW, B-4x5.12kWh, P-12x590W",
    "nombre_automatico": "I-2x5kW, B-4x5.12kWh, P-12x590W",
    "nombre_oferta": "I-2x5kW, B-4x5.12kWh, P-12x590W",
    "nombre_completo": "Oferta de 2x 5.0kW Inversor Felicity Solar, 4x 5.12kWh Batería Felicity Solar y 12x 590W Paneles Evo Solar",
    "tipo": "personalizada",
    "estado": "en_revision",
    "items": [...],
    // ... resto de campos ...
  }
}
```

**Nota:** Los tres campos (`nombre`, `nombre_automatico`, `nombre_oferta`) contienen el mismo valor (nombre corto) para máxima compatibilidad.

## Schemas Pydantic

### OfertaConfeccionadaCreate

```python
from pydantic import BaseModel, Field
from typing import Optional

class OfertaConfeccionadaCreate(BaseModel):
    tipo_oferta: str
    almacen_id: str
    nombre_oferta: Optional[str] = None  # Nombre corto (opcional)
    nombre_completo: Optional[str] = None  # Nombre completo (opcional)
    items: List[ItemOferta]
    componentes_principales: Optional[ComponentesPrincipales] = None
    # ... resto de campos ...
```

### OfertaConfeccionadaUpdate

```python
class OfertaConfeccionadaUpdate(BaseModel):
    nombre_oferta: Optional[str] = None  # Nombre corto
    nombre_completo: Optional[str] = None  # Nombre completo
    estado: Optional[str] = None
    items: Optional[List[ItemOferta]] = None
    # ... resto de campos ...
```

### OfertaConfeccionadaResponse

```python
class OfertaConfeccionadaResponse(BaseModel):
    id: str
    numero_oferta: str
    nombre: str  # Nombre corto (campo principal)
    nombre_automatico: str  # Alias de nombre (compatibilidad)
    nombre_oferta: str  # Alias de nombre (compatibilidad frontend)
    nombre_completo: Optional[str] = None  # Nombre completo descriptivo
    tipo: str
    estado: str
    precio_final: float
    # ... resto de campos ...
    
    class Config:
        from_attributes = True
    
    @property
    def nombre_automatico(self) -> str:
        """Alias para compatibilidad"""
        return self.nombre
    
    @property
    def nombre_oferta(self) -> str:
        """Alias para compatibilidad con frontend"""
        return self.nombre
```

## Compatibilidad con Ofertas Existentes

Para ofertas existentes que no tienen `nombre_completo`:

```python
def get_nombre_completo(oferta: OfertaConfeccionada) -> str:
    """
    Retorna el nombre completo de la oferta.
    Si no existe, retorna el nombre corto como fallback.
    """
    return oferta.nombre_completo or oferta.nombre
```

## Migración de Datos Existentes

Script para migrar ofertas existentes (opcional):

```python
def migrar_nombres_ofertas():
    """
    Copia el nombre corto al campo nombre_completo 
    para ofertas que no lo tienen.
    """
    ofertas = db.query(OfertaConfeccionada).filter(
        OfertaConfeccionada.nombre_completo.is_(None)
    ).all()
    
    for oferta in ofertas:
        oferta.nombre_completo = oferta.nombre
    
    db.commit()
    print(f"Migradas {len(ofertas)} ofertas")
```

## Formato de Nombres

### Nombre Corto (nombre_oferta)
Formato compacto con prefijos:
- `I-` para Inversores
- `B-` para Baterías
- `P-` para Paneles

**Ejemplos:**
- `I-2x5kW, B-4x5.12kWh, P-12x590W`
- `I-1x10kW, P-20x450W`
- `B-8x2.5kWh`

### Nombre Completo (nombre_completo)
Formato descriptivo con marcas:

**Ejemplos:**
- `Oferta de 2x 5.0kW Inversor Felicity Solar, 4x 5.12kWh Batería Felicity Solar y 12x 590W Paneles Evo Solar`
- `Oferta de 1x 10.0kW Inversor Growatt y 20x 450W Paneles JA Solar`
- `Oferta de 8x 2.5kWh Batería Pylontech`

## Uso en el Frontend

### En Tarjetas/Listados
```typescript
// El backend devuelve tres campos con el nombre corto:
// - oferta.nombre
// - oferta.nombre_automatico  
// - oferta.nombre_oferta
// Todos contienen el mismo valor

<h3>{oferta.nombre}</h3>
// o también funciona:
<h3>{oferta.nombre_automatico}</h3>
<h3>{oferta.nombre_oferta}</h3>

// Resultado: "I-2x5kW, B-4x5.12kWh, P-12x590W"
```

### En Exportaciones
```typescript
// Usa el nombre completo con fallback al nombre corto
const nombreParaExportar = oferta.nombre_completo || oferta.nombre
// Resultado: "Oferta de 2x 5.0kW Inversor Felicity Solar..."
```

### Campos Disponibles en el Frontend
```typescript
interface Oferta {
  nombre: string;              // "I-2x5kW, B-4x5.12kWh, P-12x590W"
  nombre_automatico: string;   // "I-2x5kW, B-4x5.12kWh, P-12x590W" (mismo que nombre)
  nombre_oferta: string;       // "I-2x5kW, B-4x5.12kWh, P-12x590W" (mismo que nombre)
  nombre_completo?: string;    // "Oferta de 2x 5.0kW Inversor Felicity Solar..."
}
```

## Validaciones Recomendadas

```python
def validar_nombres_oferta(nombre_oferta: str, nombre_completo: str):
    """Validaciones para los nombres de oferta"""
    
    # Validar longitud nombre corto
    if nombre_oferta and len(nombre_oferta) > 500:
        raise ValueError("El nombre corto no puede exceder 500 caracteres")
    
    # Validar longitud nombre completo
    if nombre_completo and len(nombre_completo) > 2000:
        raise ValueError("El nombre completo no puede exceder 2000 caracteres")
    
    return True
```

## Notas Importantes

1. **Retrocompatibilidad**: El campo `nombre_completo` es opcional. Si no se proporciona, usar `nombre` como fallback.

2. **Generación Automática**: Si el frontend no envía ningún nombre, el backend debe generar ambos automáticamente usando la lógica existente.

3. **Actualización**: Al actualizar una oferta, si solo se proporciona uno de los nombres, mantener el otro sin cambios.

4. **Índices**: Considerar agregar índice en `nombre` para búsquedas rápidas:
   ```sql
   CREATE INDEX idx_ofertas_nombre ON ofertas_confeccionadas(nombre);
   ```

5. **Búsqueda**: Las búsquedas deben considerar ambos campos:
   ```python
   ofertas = db.query(OfertaConfeccionada).filter(
       or_(
           OfertaConfeccionada.nombre.ilike(f"%{query}%"),
           OfertaConfeccionada.nombre_completo.ilike(f"%{query}%")
       )
   ).all()
   ```

## Testing

### Test Case 1: Crear oferta con ambos nombres
```python
def test_crear_oferta_con_nombres():
    response = client.post("/ofertas/confeccion/", json={
        "tipo_oferta": "personalizada",
        "almacen_id": "ALM001",
        "nombre_oferta": "I-2x5kW, B-4x5.12kWh",
        "nombre_completo": "Oferta de 2x 5.0kW Inversor Felicity Solar...",
        "items": [...]
    })
    
    assert response.status_code == 200
    data = response.json()["data"]
    
    # ✅ Verificar que el nombre corto se guardó correctamente
    assert data["nombre"] == "I-2x5kW, B-4x5.12kWh"
    assert data["nombre_automatico"] == "I-2x5kW, B-4x5.12kWh"
    assert data["nombre_oferta"] == "I-2x5kW, B-4x5.12kWh"
    
    # ✅ Verificar que el nombre completo se guardó correctamente
    assert "Felicity Solar" in data["nombre_completo"]
    assert data["nombre_completo"].startswith("Oferta de")
```

### Test Case 2: Crear oferta sin nombres (generación automática)
```python
def test_crear_oferta_sin_nombres():
    response = client.post("/ofertas/confeccion/", json={
        "tipo_oferta": "personalizada",
        "almacen_id": "ALM001",
        "items": [...]
    })
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["nombre_automatico"] is not None
    assert data["nombre_completo"] is not None
```

### Test Case 3: Obtener oferta con ambos nombres
```python
def test_obtener_oferta_con_nombres():
    response = client.get("/ofertas/confeccion/OFC001")
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert "nombre" in data
    assert "nombre_completo" in data
```

## Troubleshooting

### Problema: En los cards aparece el nombre largo en lugar del corto

**Síntoma:**
```
Card muestra: "Oferta de 2x 5.0kW Inversor Felicity Solar..."
Debería mostrar: "I-2x5kW, B-4x5.12kWh, P-12x590W"
```

**Causa:**
El backend está guardando el nombre largo en el campo `nombre` en lugar del corto.

**Solución:**
Verificar que el backend esté haciendo esto:

```python
# ✅ CORRECTO:
oferta.nombre = oferta_data.nombre_oferta  # Nombre CORTO
oferta.nombre_completo = oferta_data.nombre_completo  # Nombre LARGO

# ❌ INCORRECTO:
oferta.nombre = oferta_data.nombre_completo  # ❌ Esto causa el problema
```

**Verificación:**
```python
# Imprimir en el backend para debug:
print(f"nombre_oferta recibido: {oferta_data.nombre_oferta}")
print(f"nombre_completo recibido: {oferta_data.nombre_completo}")
print(f"Guardando en BD - nombre: {oferta.nombre}")
print(f"Guardando en BD - nombre_completo: {oferta.nombre_completo}")
```

**Resultado esperado:**
```
nombre_oferta recibido: I-2x5kW, B-4x5.12kWh, P-12x590W
nombre_completo recibido: Oferta de 2x 5.0kW Inversor Felicity Solar...
Guardando en BD - nombre: I-2x5kW, B-4x5.12kWh, P-12x590W
Guardando en BD - nombre_completo: Oferta de 2x 5.0kW Inversor Felicity Solar...
```

### Problema: El frontend no recibe nombre_completo

**Síntoma:**
Las exportaciones muestran el nombre corto en lugar del completo.

**Causa:**
El backend no está devolviendo el campo `nombre_completo` en las respuestas.

**Solución:**
Asegurarse de incluir `nombre_completo` en el schema de respuesta:

```python
class OfertaConfeccionadaResponse(BaseModel):
    nombre: str
    nombre_completo: Optional[str] = None  # ⚠️ Debe estar incluido
    # ... otros campos
```

### Problema: Ofertas antiguas muestran None en nombre_completo

**Síntoma:**
Ofertas creadas antes de este cambio no tienen `nombre_completo`.

**Solución:**
Usar fallback en el frontend (ya implementado):

```typescript
const nombreParaExportar = oferta.nombre_completo || oferta.nombre
```

O ejecutar migración en el backend:

```python
def migrar_nombres_ofertas():
    ofertas = db.query(OfertaConfeccionada).filter(
        OfertaConfeccionada.nombre_completo.is_(None)
    ).all()
    
    for oferta in ofertas:
        # Copiar nombre corto al completo como fallback
        oferta.nombre_completo = oferta.nombre
    
    db.commit()
```

## Checklist de Implementación

- [ ] Agregar campo `nombre_completo` a la tabla de base de datos
- [ ] Actualizar modelo SQLAlchemy con el nuevo campo
- [ ] Modificar endpoint POST para guardar `nombre_oferta` en `nombre` (no `nombre_completo`)
- [ ] Modificar endpoint PUT para actualizar ambos campos correctamente
- [ ] Actualizar schemas Pydantic para incluir ambos campos
- [ ] Verificar que GET devuelve `nombre`, `nombre_automatico`, `nombre_oferta` y `nombre_completo`
- [ ] Agregar logs de debug para verificar qué se está guardando
- [ ] Probar creación de oferta nueva
- [ ] Probar edición de oferta existente
- [ ] Verificar que los cards muestran nombre corto
- [ ] Verificar que las exportaciones usan nombre completo
- [ ] Ejecutar migración para ofertas existentes (opcional)

## Fecha de Implementación
**Fecha**: 2024-02-03
**Versión**: 1.0
**Prioridad**: Media

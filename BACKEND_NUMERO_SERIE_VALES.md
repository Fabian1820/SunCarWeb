# Backend: Números de Serie en Vales de Salida

## Cambios Necesarios

### 1. Base de Datos
Agregar columna `numero_serie` (nullable, VARCHAR) a la tabla de materiales de vales:

```sql
ALTER TABLE vales_salida_materiales 
ADD COLUMN numero_serie VARCHAR(255) NULL;
```

### 2. Modelo/Schema
Agregar campo opcional en el modelo de materiales del vale:

```python
class ValeSalidaMaterial(BaseModel):
    material_id: str
    cantidad: int
    numero_serie: Optional[str] = None  # NUEVO
```

### 3. Endpoint POST /api/vales-salida/
Aceptar `numero_serie` en el payload:

```json
{
  "materiales": [
    {
      "material_id": "uuid",
      "cantidad": 5,
      "numero_serie": "SN123456"  // Opcional
    }
  ]
}
```

### 4. Endpoints GET (lista y detalle)
Incluir `numero_serie` en las respuestas:

```json
{
  "materiales": [
    {
      "material_id": "uuid",
      "cantidad": 5,
      "numero_serie": "SN123456",  // Incluir en respuesta
      "material": { ... }
    }
  ]
}
```

Eso es todo. El campo es opcional y nullable, no requiere validaciones especiales.

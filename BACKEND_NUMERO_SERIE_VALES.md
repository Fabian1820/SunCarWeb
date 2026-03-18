# Backend: Números de Serie en Vales de Salida

## Cambios Necesarios

### 1. Base de Datos
Agregar columna `numero_serie` (nullable, VARCHAR o TEXT) a la tabla de materiales de vales:

```sql
ALTER TABLE vales_salida_materiales 
ADD COLUMN numero_serie TEXT NULL;
```

### 2. Modelo/Schema
Agregar campo opcional en el modelo de materiales del vale:

```python
class ValeSalidaMaterial(BaseModel):
    material_id: str
    cantidad: int
    numero_serie: Optional[str] = None  # NUEVO - String con series separadas por coma
```

### 3. Endpoint POST /api/vales-salida/
Aceptar `numero_serie` en el payload (string con números separados por coma):

```json
{
  "materiales": [
    {
      "material_id": "uuid",
      "cantidad": 3,
      "numero_serie": "SN001, SN002, SN003"  // Opcional - separados por coma
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
      "cantidad": 3,
      "numero_serie": "SN001, SN002, SN003",  // Incluir en respuesta
      "material": { ... }
    }
  ]
}
```

**Nota**: El frontend envía los números de serie como un string separado por comas. Si la cantidad es 3, habrá 3 números de serie separados por coma y espacio (", ").

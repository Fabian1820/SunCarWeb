# API de Ingreso Mensual - Guía para Frontend

Esta documentación describe cómo consumir los endpoints de Ingreso Mensual desde un frontend.

## Base URL
```
/api/ingreso-mensual
```

## 📋 Endpoints Disponibles

### 1. Obtener todos los ingresos
**GET** `/api/ingreso-mensual/`

Obtiene todos los ingresos mensuales ordenados por año y mes (descendente).

**Respuesta:** Array de ingresos mensuales.

---

### 2. Obtener el último ingreso registrado
**GET** `/api/ingreso-mensual/latest`

Obtiene el ingreso mensual más reciente.

**Respuesta:** Objeto con el último ingreso o `null` si no hay ingresos.

---

### 3. Buscar ingreso por mes y año
**GET** `/api/ingreso-mensual/search?mes={mes}&anio={anio}`

Busca un ingreso mensual específico por mes y año.

**Query Parameters:**
- `mes` (requerido): Mes del ingreso (1-12)
- `anio` (requerido): Año del ingreso (>= 2000)

**Respuesta:** Objeto con el ingreso encontrado o `null` si no existe.

**Uso:** Útil para verificar si ya existe un ingreso antes de crearlo, o para cargar datos de un mes específico en un formulario.

---

### 4. Obtener un ingreso por ID
**GET** `/api/ingreso-mensual/{ingreso_id}`

Obtiene un ingreso mensual específico por su ID.

**Respuesta:** Objeto con el ingreso encontrado o error 404 si no existe.

---

### 5. Crear un nuevo ingreso mensual ✅
**POST** `/api/ingreso-mensual/`

Crea un nuevo ingreso mensual. **Validación importante**: No permite crear un ingreso si ya existe uno para el mismo mes y año.

#### Request Body:
```json
{
  "mes": 12,           
  "anio": 2024,        
  "monto": 50000.0,    
  "moneda": "CUP"      
}
```

**Respuesta exitosa:**
```json
{
  "message": "Ingreso mensual creado exitosamente",
  "id": "507f1f77bcf86cd799439011"
}
```

**Error común:** Si ya existe un ingreso para ese mes/año, retorna error 400 con mensaje indicando el mes/año duplicado.

---

### 6. Actualizar un ingreso mensual existente ✅
**PUT** `/api/ingreso-mensual/{ingreso_id}`

Actualiza un ingreso mensual existente. **Validaciones importantes**:
- Verifica que el ingreso con el ID proporcionado exista
- Si se actualiza mes/año, verifica que no exista otro ingreso con esa fecha

#### Request Body (todos los campos son opcionales):
```json
{
  "mes": 11,          
  "anio": 2024,        
  "monto": 48000.0,    
  "moneda": "USD"      
}
```

**Respuesta exitosa:**
```json
{
  "message": "Ingreso mensual actualizado exitosamente"
}
```

**Errores comunes:**
- 404: Ingreso no encontrado
- 400: Si el ingreso no existe o si ya existe otro ingreso para la fecha destino

---

### 7. Eliminar un ingreso mensual
**DELETE** `/api/ingreso-mensual/{ingreso_id}`

Elimina un ingreso mensual existente.

**Respuesta exitosa:**
```json
{
  "message": "Ingreso mensual eliminado exitosamente"
}
```

**Error:** 404 si el ingreso no existe.

## 🔍 Validaciones Implementadas

### Al Crear (POST):
✅ **Validación de duplicados**: No permite crear un ingreso si ya existe uno para el mismo mes y año.

### Al Actualizar (PUT):
✅ **Validación de existencia**: Verifica que el ingreso con el ID existe.
✅ **Validación de duplicados**: Si se actualiza mes/año, verifica que no exista otro ingreso con esa fecha.


## 📝 Notas Importantes

1. **Unicidad de mes/año**: El sistema garantiza que solo puede existir un ingreso por cada combinación de mes y año.

2. **Manejo de errores**: Siempre verifica el status de la respuesta y maneja los errores apropiadamente en el frontend.

3. **Validación de datos**: Los campos tienen validaciones:
   - `mes`: debe estar entre 1 y 12
   - `anio`: debe ser >= 2000
   - `monto`: debe ser >= 0

4. **Moneda por defecto**: Si no se especifica, la moneda será "CUP".

5. **IDs de MongoDB**: Los IDs devueltos son strings en formato ObjectId de MongoDB.

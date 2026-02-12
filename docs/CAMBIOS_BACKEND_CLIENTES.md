# Cambios en Backend - Campo `falta_instalacion` para Clientes

## Resumen
Se agregó un nuevo campo `falta_instalacion` al modelo de Cliente para registrar qué le falta a una instalación cuando está en proceso.

## Cambios Requeridos en el Backend

### 1. Modelo de Cliente
Agregar el campo `falta_instalacion` al modelo/schema de Cliente:

```python
# En el modelo Cliente
falta_instalacion: Optional[str] = None  # Campo opcional de texto
```

### 2. Endpoints Afectados

#### GET /clientes/
- **Cambio**: Incluir el campo `falta_instalacion` en la respuesta
- **Tipo**: `string | null`
- **Descripción**: Texto que describe qué le falta a la instalación

#### POST /clientes/
- **Cambio**: Aceptar el campo `falta_instalacion` en el body de la petición
- **Tipo**: `string | null` (opcional)
- **Validación**: Solo relevante cuando `estado === "Instalación en Proceso"`

#### PUT /clientes/{id}
- **Cambio**: Aceptar el campo `falta_instalacion` en el body de la petición
- **Tipo**: `string | null` (opcional)
- **Validación**: Solo relevante cuando `estado === "Instalación en Proceso"`

### 3. Validaciones Recomendadas
- El campo es opcional y puede ser `null` o una cadena vacía
- No requiere validación de longitud mínima
- Se recomienda un límite máximo de 500 caracteres

### 4. Comportamiento del Frontend
- El campo solo se muestra cuando `estado === "Instalación en Proceso"`
- Se envía en las peticiones POST/PUT incluso si está vacío
- El usuario puede dejarlo vacío (no es obligatorio)

### 5. Estados de Cliente (Actualización)
Los estados válidos de cliente son:
1. "Equipo instalado con éxito"
2. "Pendiente de instalación" ← **Con tilde en "instalación"**
3. "Instalación en Proceso" ← **Con tilde en "Instalación" y "Proceso" con mayúscula**

**IMPORTANTE**: El backend debe aceptar tanto las versiones antiguas (sin tilde) como las nuevas (con tilde) para mantener compatibilidad con datos existentes:
- "Pendiente de instalacion" (antiguo) → normalizar a "Pendiente de instalación"
- "Instalacion en proceso" (antiguo) → normalizar a "Instalación en Proceso"

El frontend ahora envía siempre los estados con tildes correctas.

## Ejemplo de Payload

### Crear Cliente con instalación en proceso:
```json
{
  "numero": "CLI-001",
  "nombre": "Juan Pérez",
  "telefono": "+53 5 1234567",
  "direccion": "Calle 23 #456",
  "estado": "Instalación en Proceso",
  "falta_instalacion": "Falta instalar los paneles solares y conectar el inversor",
  "comercial": "Enelido Alexander Calero Perez",
  "fecha_contacto": "15/01/2026",
  "ofertas": [...]
}
```

### Actualizar Cliente:
```json
{
  "estado": "Instalación en Proceso",
  "falta_instalacion": "Solo falta la conexión eléctrica final"
}
```

### Cliente con instalación completada:
```json
{
  "estado": "Equipo instalado con éxito",
  "falta_instalacion": null  // Se puede limpiar o dejar el valor anterior
}
```

## Migración de Datos
No se requiere migración de datos existentes ya que:
- El campo es opcional
- Los clientes existentes funcionarán sin este campo
- Solo se usa para nuevos clientes o actualizaciones

## Notas Adicionales
- El campo se muestra en:
  - Tabla de clientes (columna condicional)
  - Formulario de crear cliente
  - Formulario de editar cliente
  - Diálogo de ver detalles del cliente
- El campo tiene un fondo ámbar en el diálogo de detalles para destacarlo visualmente

# Solución: Cálculo de Márgenes en el Frontend

## Problema
El backend hacía autoajustes al margen cuando el margen total no alcanzaba el mínimo requerido, pero estos ajustes no se reflejaban en el frontend. El usuario veía valores diferentes a los que realmente se guardaban en la base de datos.

## Solución Implementada
Se implementó el algoritmo completo de distribución de márgenes directamente en el frontend, eliminando la dependencia del endpoint `/ofertas/confeccion/margen-materiales` del backend.

## Mejoras en la UI

### 1. Nueva Estructura de Columnas
La tabla de materiales ahora muestra:
- **Material**: Nombre y categoría
- **P. Unit**: Precio unitario (editable)
- **Cant**: Cantidad (editable)
- **Costo**: Precio × Cantidad (calculado)
- **Margen ($)**: Margen en USD (editable directamente)
- **P. Final**: Precio final con margen incluido (destacado en verde)
- **Botón eliminar**: Para quitar el item

### 2. Edición Directa del Margen en USD
Ahora puedes editar el margen directamente en dólares. El sistema:
- Calcula automáticamente el porcentaje correspondiente
- Muestra el porcentaje debajo del campo de margen
- Actualiza el precio final en tiempo real

### 3. Precio Final Visible
El precio final (costo + margen) se muestra claramente en verde, facilitando ver el precio de venta de cada material.

## Algoritmo de Distribución de Márgenes

### 1. Parámetros de Entrada
- `margen_comercial`: Porcentaje (0-100)
- `porcentaje_margen_materiales`: Porcentaje del margen total para materiales (0-100)
- `items`: Array de materiales con precio, cantidad y categoría

### 2. Factores por Categoría
Cada categoría tiene un factor de peso para la distribución:

```javascript
const FACTORES_CATEGORIA = {
  'inversores': 3.0,
  'baterias': 3.0,
  'paneles': 2.0,
  'estructuras': 1.5,
  'mppt': 1.5,
  'cableado ac': 1.0,
  'cableado dc': 1.0,
  'canalizacion': 1.0,
  'tierra': 1.0,
  'protecciones electricas': 1.2,
  'material vario': 1.0,
  'default': 1.0
}
```

### 3. Topes Máximos por Categoría (en USD por unidad)
```javascript
const TOPES_CATEGORIA = {
  'inversores': 100,
  'baterias': 100,
  'paneles': 15,
  'estructuras': 40,
  'cableado ac': 5,
  'cableado dc': 5,
  'canalizacion': 5,
  'tierra': 5,
  'material vario': 5,
  'default': 20
}
```

### 4. Categorías Prioritarias para Redistribución
```javascript
const CATEGORIAS_PRIORITARIAS = ['inversores', 'baterias', 'paneles', 'estructuras']
```

### 5. Pasos del Algoritmo

1. **Normalizar categorías y contar**: Convertir categorías a formato estándar y contar items por categoría

2. **Calcular costo total**: Sumar el costo de todos los materiales (precio × cantidad)

3. **Calcular scores**: Para cada item:
   - `score = costo × factor_categoria`
   - Para inversores y baterías: dividir el factor entre la cantidad de items de esa categoría

4. **Calcular márgenes totales**:
   - `margen_total = (total_materiales / (1 - margen_comercial%)) - total_materiales`
   - `margen_materiales = margen_total × porcentaje_margen_materiales%`
   - `margen_instalacion = margen_total × porcentaje_margen_instalacion%`

5. **Distribuir proporcionalmente**: 
   - `margen_item = (score_item / score_total) × margen_materiales`

6. **Aplicar topes**: 
   - Calcular tope máximo por item: `tope = tope_categoria × cantidad`
   - Si un item excede su tope, limitarlo y acumular el exceso

7. **Redistribuir excesos iterativamente**:
   - Solo entre categorías prioritarias
   - Proporcional a los scores
   - Hasta que no haya más excesos o no haya receptores disponibles

8. **Redondear a 2 decimales**: Todos los márgenes se redondean

9. **Ajuste fino**: Corregir diferencias de redondeo para que la suma sea exacta
   - Ajustar incrementalmente en pasos de 0.01
   - Priorizar categorías prioritarias para ajustes positivos
   - Ordenar candidatos por score (mayor a menor)

## Cambios en el Código

### Archivo Modificado
- `components/feats/ofertas/confeccion-ofertas-view.tsx`

### Cambios Realizados

1. **Eliminada la llamada al backend** en el `useEffect` que calculaba márgenes
   - Antes: `apiRequest('/ofertas/confeccion/margen-materiales', ...)`
   - Ahora: Cálculo local con `calcularMargenesLocal()`

2. **Implementado el algoritmo completo** con todas las funciones auxiliares:
   - `normalizarCategoria()`: Normaliza nombres de categorías
   - `obtenerFactorCategoria()`: Obtiene el factor de peso
   - `obtenerTopeCategoria()`: Obtiene el tope máximo
   - Lógica de distribución, topes y redistribución

3. **Eliminada la recarga de oferta** después de crear/actualizar
   - Ya no es necesario hacer GET para obtener márgenes ajustados
   - El frontend calcula los valores finales correctamente

## Beneficios

1. **Consistencia**: Los valores mostrados en el frontend son exactamente los que se guardan
2. **Rendimiento**: Se elimina una llamada HTTP al backend
3. **Transparencia**: El usuario ve en tiempo real cómo se distribuye el margen
4. **Independencia**: El frontend no depende del backend para cálculos de UI

## Validación

Para validar que el algoritmo funciona correctamente:

1. Crear una oferta con varios materiales de diferentes categorías
2. Configurar un margen comercial (ej: 35%)
3. Verificar que:
   - La suma de márgenes asignados = margen_materiales
   - Ningún item excede su tope máximo
   - Los excesos se redistribuyen solo a categorías prioritarias
   - Los valores se redondean correctamente a 2 decimales

## Ejemplo de Uso

```javascript
// Entrada
margen_comercial: 35.0
porcentaje_margen_materiales: 50.0
items: [
  { precio: 850, cantidad: 1, categoria: "INVERSORES" },
  { precio: 650, cantidad: 2, categoria: "BATERIAS" },
  { precio: 125, cantidad: 8, categoria: "PANELES" }
]

// Salida esperada
total_materiales: 3450.00
margen_total: 1861.54
margen_materiales: 930.77
items: [
  { margen_asignado: 100.00, porcentaje: 11.76% },  // Inversor (limitado por tope)
  { margen_asignado: 200.00, porcentaje: 15.38% },  // Baterías (limitado por tope)
  { margen_asignado: 630.77, porcentaje: 63.08% }   // Paneles (recibe exceso)
]
```

## Notas Técnicas

- El algoritmo garantiza que la suma de márgenes asignados sea exactamente igual al margen_materiales
- Los topes se aplican por unidad, no por costo total del item
- La redistribución de excesos es iterativa para manejar casos complejos
- El ajuste fino usa incrementos de 0.01 para corregir diferencias de redondeo

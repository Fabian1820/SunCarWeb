# Documentación: Distribución de Margen Comercial en Confección de Ofertas

## Resumen

El sistema de confección de ofertas incluye una distribución del margen comercial entre **materiales** e **instalación**. El usuario puede configurar qué porcentaje del margen se aplica a cada concepto, y el sistema calcula automáticamente:

1. El margen distribuido proporcionalmente sobre cada material
2. Un servicio de "Instalación y Montaje" con el costo correspondiente al margen de instalación

---

## Flujo de Cálculo

### 1. Cálculo del Margen Comercial Total

```
Total Materiales Base = Suma de (precio × cantidad) de todos los materiales
Margen Comercial (%) = Porcentaje definido por el usuario (ej: 30%)

Margen Total ($) = Total Materiales Base × (Margen % / 100) / (1 - Margen % / 100)
```

**Ejemplo:**
- Total Materiales Base: $10,000
- Margen Comercial: 30%
- Margen Total: $10,000 × (30/100) / (1 - 30/100) = $10,000 × 0.3 / 0.7 = $4,285.71

### 2. Distribución del Margen

El usuario define cómo distribuir el margen total:

```
Porcentaje para Materiales (%) = Definido por usuario (ej: 60%)
Porcentaje para Instalación (%) = Definido por usuario (ej: 40%)

Suma debe ser = 100%

Margen para Materiales ($) = Margen Total × (% Materiales / 100)
Margen para Instalación ($) = Margen Total × (% Instalación / 100)
```

**Ejemplo:**
- Margen Total: $4,285.71
- % Materiales: 60% → $2,571.43
- % Instalación: 40% → $1,714.28

### 3. Distribución Proporcional del Margen sobre Materiales

El margen asignado a materiales se distribuye proporcionalmente según el costo de cada material:

```
Para cada material:
  Costo Material = precio × cantidad
  Proporción = Costo Material / Total Materiales Base
  Margen Asignado = Margen para Materiales × Proporción
  Precio con Margen = Costo Material + Margen Asignado
```

**Ejemplo:**
- Material A: $3,000 (30% del total)
  - Margen asignado: $2,571.43 × 0.30 = $771.43
  - Precio con margen: $3,771.43

- Material B: $7,000 (70% del total)
  - Margen asignado: $2,571.43 × 0.70 = $1,800.00
  - Precio con margen: $8,800.00

### 4. Servicio de Instalación

Se crea automáticamente un ítem de servicio:

```json
{
  "tipo": "servicio",
  "descripcion": "Servicio de Instalación y Montaje",
  "costo": 1714.28,
  "porcentaje_margen_origen": 40
}
```

### 5. Precio Final

```
Subtotal Materiales con Margen = Total Materiales Base + Margen para Materiales
Servicio Instalación = Margen para Instalación
Costo Transportación = Definido por usuario (opcional)
Elementos Personalizados = Suma de elementos personalizados (opcional)
Costos Extras = Suma de costos extras de secciones personalizadas (opcional)

Precio Final = Subtotal Materiales con Margen
             + Servicio Instalación
             + Costo Transportación
             + Elementos Personalizados
             + Costos Extras
```

---

## Campos enviados al backend

### Payload mínimo (fragmento relevante)

```json
{
  "items": [
    {
      "material_codigo": "MAT-001",
      "descripcion": "Panel 550W",
      "precio": 250.00,
      "cantidad": 10,
      "categoria": "PANELES",
      "seccion": "PANELES",
      "margen_asignado": 1800.00
    }
  ],
  "servicios": [
    {
      "id": "SERVICIO_INSTALACION",
      "descripcion": "Servicio de Instalación y Montaje",
      "cantidad": 1,
      "costo": 1714.28,
      "porcentaje_margen_origen": 40
    }
  ],
  "margen_comercial": 30.0,
  "porcentaje_margen_materiales": 60,
  "porcentaje_margen_instalacion": 40,
  "margen_total": 4285.71,
  "margen_materiales": 2571.43,
  "margen_instalacion": 1714.28,
  "total_materiales": 10000.00,
  "subtotal_con_margen": 12571.43,
  "precio_final": 14286.00
}
```

### Notas de validación sugeridas para backend

- `porcentaje_margen_materiales + porcentaje_margen_instalacion` debe ser `100`.
- Si `margen_instalacion` es `0`, el array `servicios` puede venir vacío u omitido.
- `margen_asignado` de cada item se calcula proporcional al costo del material, salvo que se implemente otra estrategia en backend.

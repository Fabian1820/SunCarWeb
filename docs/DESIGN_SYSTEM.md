# Sistema de Diseño SunCar

Este documento describe el sistema de identidad visual y colores de la aplicación administrativa SunCar.

## Paleta de Colores Corporativa

La paleta se basa en los colores oficiales de SunCar, transmitiendo profesionalismo, energía y claridad.

| Nombre | Color HEX | Variable CSS | Descripción |
|--------|-----------|--------------|-------------|
| **Azul SunCar** | `#0A2A5B` | `--primary` | Color principal. Usado en encabezados, botones primarios, texto destacado y navegación. |
| **Naranja SunCar** | `#D09752` | `--secondary` | Color secundario. Usado para acciones secundarias, badges y elementos de énfasis suave. |
| **Naranja Vibrante** | `#F07F2D` | `--accent` | Color de acento. Usado para hovers, llamadas a la acción (CTAs) y alertas informativas. |
| **Amarillo SunCar** | `#FDD835` | `--chart-4` | Color auxiliar. Usado en gráficos y alertas de advertencia. |
| **Blanco** | `#FFFFFF` | `--background` | Fondo principal. |
| **Gris Superficie** | `#F1EFEF` | `--muted` | Fondos de tarjetas secundarias, áreas de contenido gris. |

## Variables CSS y Tailwind

El sistema utiliza variables CSS nativas para soportar cambios de tema (Claro/Oscuro) y consistencia en componentes ShadCN UI.

### Uso en Tailwind

```tsx
// Texto Azul SunCar
<h1 className="text-primary">Título</h1>

// Fondo Naranja SunCar
<div className="bg-secondary text-secondary-foreground">Contenido</div>

// Botón con degradado solar
<div className="solar-gradient">...</div>
```

### Variables de Sistema

| Token Tailwind | Variable CSS | Uso Recomendado |
|----------------|--------------|-----------------|
| `bg-background` | `--background` | Fondo de página y contenedores principales. |
| `text-foreground` | `--foreground` | Texto principal (cuerpo). |
| `bg-primary` | `--primary` | Botones principales, estados activos, encabezados de secciones. |
| `bg-secondary` | `--secondary` | Botones secundarios, pills, etiquetas. |
| `bg-muted` | `--muted` | Fondos de tablas alternados, áreas deshabilitadas, esqueletos de carga. |
| `border-input` | `--input` | Bordes de formularios. |

## Identidad por Módulo

Para facilitar la navegación visual, cada módulo puede definir una identidad sutil pero reconocible. Aunque la base es Azul/Naranja, se pueden usar acentos semánticos.

### Variables de Módulo
Se han definido variables CSS para permitir personalización por layout:

- `--module-primary`: Color principal del módulo.
- `--module-secondary`: Color de acento del módulo.

### Asignación de Identidad (Propuesta)

1. **Dashboard & General**: Azul SunCar (Corporativo)
2. **Brigadas**: Azul Ingeniería (`#0A2A5B` o variante técnica)
3. **Materiales**: Naranja Logístico (`#D09752`)
4. **Reportes**: Azul Documental (Variante más clara o grisácea)
5. **Clientes**: Dorado/Amarillo (Valor)

## Tipografía

- **Fuente Principal**: Sans-serif (Geist, Inter o system-ui).
- **Títulos**: Peso Bold (700) o Semibold (600), color `text-foreground` (Azul Oscuro).
- **Cuerpo**: Peso Regular (400), color `text-muted-foreground` (Gris legible) para textos secundarios.

## Componentes UI Rediseñados

### Botones
- **Primario**: Fondo Azul Oscuro, Texto Blanco. Hover: Opacidad 90%.
- **Secundario**: Fondo Naranja Suave, Texto Blanco.
- **Ghost**: Texto Azul, Fondo transparente. Hover: Fondo Azul muy suave (`bg-primary/10`).

### Tarjetas (Cards)
- Fondo blanco con sombra suave (`shadow-sm`).
- Borde sutil (`border-border`).

### Tablas
- Encabezado: Fondo Muted (`bg-muted/50`).
- Filas: Hover suave (`hover:bg-muted/50`).

## Accesibilidad

- Se ha verificado que el contraste entre `#0A2A5B` (Azul) y `#FFFFFF` (Blanco) cumple con WCAG AAA.
- El Naranja `#D09752` sobre blanco cumple con WCAG AA para textos grandes y componentes gráficos.

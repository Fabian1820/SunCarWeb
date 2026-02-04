# Mejoras en el Formato de Términos y Condiciones en PDF

## 🎨 Mejoras Aplicadas

Se ha mejorado significativamente el formato y presentación de los términos y condiciones en los PDFs exportados.

---

## ✨ Características del Nuevo Formato

### 1. Márgenes Profesionales
- **Margen izquierdo:** 15mm
- **Margen derecho:** 15mm
- **Margen superior:** 20mm
- **Margen inferior:** 25mm (para pie de página)

### 2. Título Principal
- **Tamaño:** 16pt
- **Estilo:** Negrita
- **Alineación:** Centrado
- **Color:** Negro (#000000)
- **Texto:** "TÉRMINOS Y CONDICIONES"

### 3. Línea Separadora Decorativa
- **Color:** Verde SunCar (RGB: 189, 215, 176)
- **Grosor:** 1pt
- **Posición:** Debajo del título

### 4. Jerarquía de Contenido

#### Títulos Principales (MAYÚSCULAS)
- **Tamaño:** 11pt
- **Estilo:** Negrita
- **Color:** Negro
- **Espaciado:** 5mm antes, 2mm después
- **Ejemplo:** "CONDICIONES DE PAGO Y RESERVA DE EQUIPOS"

#### Subtítulos (terminan con :)
- **Tamaño:** 10pt
- **Estilo:** Negrita
- **Color:** Negro
- **Espaciado:** 3mm antes, 1mm después
- **Ejemplo:** "Forma de Pago:"

#### Items de Lista (con •)
- **Tamaño:** 9pt
- **Estilo:** Normal
- **Indentación:** 20mm desde el margen izquierdo
- **Bullet:** • (punto negro)
- **Espaciado:** 1mm después de cada item

#### Texto Normal
- **Tamaño:** 9pt
- **Estilo:** Normal
- **Color:** Gris oscuro (RGB: 50, 50, 50)
- **Alineación:** **JUSTIFICADO** ✨
- **Espaciado entre líneas:** 4.5pt
- **Espaciado entre párrafos:** 2.5mm

### 5. Texto Justificado Inteligente

El texto se justifica automáticamente distribuyendo el espacio entre palabras:

```
Antes (alineado a la izquierda):
El pago del proyecto se realizará de la siguiente
forma: 50% del importe total al momento de la
aceptación y firma del presupuesto.

Después (justificado):
El  pago  del  proyecto  se  realizará  de  la  siguiente
forma:  50%  del  importe  total  al  momento  de  la
aceptación y firma del presupuesto.
```

**Nota:** La última línea de cada párrafo se alinea a la izquierda (estándar tipográfico).

---

## 🔧 Mejoras Técnicas

### 1. Conversión HTML Mejorada

La función `htmlToPlainText` ahora:
- ✅ Procesa correctamente la estructura HTML
- ✅ Preserva saltos de línea y párrafos
- ✅ Maneja listas con bullets
- ✅ Convierte emojis a caracteres estándar (🔹 → •)
- ✅ Limpia espacios múltiples
- ✅ Elimina líneas vacías excesivas

### 2. Detección Inteligente de Contenido

El sistema detecta automáticamente:
- **Títulos principales:** Texto en MAYÚSCULAS < 60 caracteres
- **Subtítulos:** Texto que termina con `:` < 80 caracteres
- **Listas:** Texto que empieza con `•` o números
- **Texto normal:** Todo lo demás

### 3. Paginación Automática

- Verifica espacio disponible antes de cada elemento
- Crea nueva página automáticamente cuando es necesario
- Mantiene márgenes consistentes en todas las páginas
- Evita cortar títulos o items de lista entre páginas

### 4. Justificación de Texto

Algoritmo de justificación:
```typescript
// Calcular espacio extra entre palabras
const palabras = line.split(' ')
const anchoLinea = doc.getTextWidth(line)
const espacioExtra = (anchoTexto - anchoLinea) / (palabras.length - 1)

// Distribuir palabras con espacio extra
let xPos = margenIzq
palabras.forEach((palabra, idx) => {
  doc.text(palabra, xPos, yPosition)
  if (idx < palabras.length - 1) {
    xPos += doc.getTextWidth(palabra + ' ') + espacioExtra
  }
})
```

---

## 📊 Comparación Antes vs Después

### Antes ❌
- Texto alineado a la izquierda
- Márgenes inconsistentes (10mm)
- Sin jerarquía visual clara
- Títulos del mismo tamaño que el texto
- Espaciado irregular
- Caracteres extraños (encoding issues)

### Después ✅
- Texto justificado profesionalmente
- Márgenes amplios y consistentes (15mm)
- Jerarquía visual clara con 4 niveles
- Títulos destacados con diferentes tamaños
- Espaciado uniforme y legible
- Texto limpio y bien formateado

---

## 🎯 Resultado Visual

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│           TÉRMINOS Y CONDICIONES                    │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                     │
│   CONDICIONES DE PAGO Y RESERVA DE EQUIPOS         │
│                                                     │
│   Forma de Pago:                                    │
│                                                     │
│   El  pago  del  proyecto  se  realizará  de  la   │
│   siguiente forma:                                  │
│                                                     │
│   • 50% del importe total al momento de la         │
│     aceptación  y  firma  del  presupuesto.  50%   │
│     restante  en  el  momento  de  la  puesta  en  │
│     marcha del sistema.                            │
│                                                     │
│   Los  pagos  se  efectuarán  en  dólares  esta-   │
│   dounidenses  (USD)  o  euros,  salvo  que  se    │
│   acuerde otra forma por escrito.                  │
│                                                     │
│   GARANTÍA                                          │
│                                                     │
│   ...                                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📝 Archivos Modificados

### `lib/export-service.ts`

**Función mejorada:** `htmlToPlainText()`
- Procesamiento recursivo de nodos HTML
- Preservación de estructura
- Limpieza de caracteres especiales

**Sección mejorada:** Renderizado de términos en PDF
- Márgenes profesionales
- Texto justificado
- Jerarquía visual
- Paginación inteligente

---

## 🚀 Beneficios

1. **Profesionalismo:** Los PDFs se ven más profesionales y legibles
2. **Legibilidad:** El texto justificado es más fácil de leer
3. **Consistencia:** Formato uniforme en todos los PDFs
4. **Jerarquía:** Fácil identificar secciones y subsecciones
5. **Espacio:** Mejor uso del espacio en la página

---

## 🔍 Verificación

Para verificar las mejoras:

1. Exportar una oferta a PDF
2. Ir a la última página (Términos y Condiciones)
3. Verificar:
   - ✅ Título centrado y en negrita
   - ✅ Línea verde decorativa
   - ✅ Texto justificado
   - ✅ Márgenes amplios
   - ✅ Títulos destacados
   - ✅ Listas con bullets e indentación
   - ✅ Sin caracteres extraños

---

**Fecha:** 4 de febrero de 2026  
**Implementado por:** Kiro AI Assistant  
**Mejora:** Formato profesional de términos y condiciones en PDF

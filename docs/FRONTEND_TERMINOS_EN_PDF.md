# Guía Frontend: Agregar Términos y Condiciones al PDF de Ofertas

## Resumen

Esta guía explica cómo obtener los términos y condiciones desde el backend e incluirlos al final del PDF de ofertas generado en el frontend.

---

## 1. Obtener Términos y Condiciones

### Endpoint

```
GET /api/terminos-condiciones/activo
```

### Ejemplo de Request

```typescript
const obtenerTerminosCondiciones = async () => {
  try {
    const response = await fetch('/api/terminos-condiciones/activo');
    const { success, data } = await response.json();
    
    if (success && data) {
      return data.texto; // Retorna el HTML o texto
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo términos:', error);
    return null;
  }
};
```

### Response Esperado

```json
{
  "success": true,
  "message": "Términos y condiciones obtenidos",
  "data": {
    "id": "698287670e410fe1648bcebf",
    "texto": "<div class=\"terminos-condiciones\">...</div>",
    "fecha_creacion": "2026-02-03T23:40:23.986Z",
    "fecha_actualizacion": "2026-02-03T23:40:23.986Z",
    "version": 1,
    "activo": true
  }
}
```

---

## 2. Integración con Generación de PDF

### Opción A: Usando jsPDF con html2canvas

```typescript
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const generarPDFOferta = async (ofertaData: any) => {
  // 1. Obtener términos y condiciones
  const terminos = await obtenerTerminosCondiciones();
  
  // 2. Crear contenedor temporal para el contenido completo
  const contenedor = document.createElement('div');
  contenedor.style.width = '210mm'; // A4 width
  contenedor.style.padding = '20mm';
  contenedor.style.backgroundColor = 'white';
  
  // 3. Agregar contenido de la oferta
  contenedor.innerHTML = `
    <div class="oferta-content">
      <!-- Contenido de la oferta -->
      <h1>Oferta: ${ofertaData.numero_oferta}</h1>
      <h2>${ofertaData.nombre_automatico}</h2>
      
      <!-- Detalles de la oferta -->
      <div class="detalles">
        <!-- ... tu contenido de oferta ... -->
      </div>
      
      <!-- Salto de página antes de términos -->
      <div style="page-break-before: always;"></div>
      
      <!-- Términos y Condiciones -->
      ${terminos ? `
        <div class="terminos-section">
          <h2 style="text-align: center; margin-bottom: 20px;">
            TÉRMINOS Y CONDICIONES
          </h2>
          ${terminos}
        </div>
      ` : ''}
    </div>
  `;
  
  // 4. Agregar al DOM temporalmente
  document.body.appendChild(contenedor);
  
  // 5. Generar PDF
  const canvas = await html2canvas(contenedor, {
    scale: 2,
    useCORS: true,
    logging: false
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  
  // 6. Limpiar
  document.body.removeChild(contenedor);
  
  // 7. Descargar
  pdf.save(`oferta-${ofertaData.numero_oferta}.pdf`);
};
```

---

### Opción B: Usando react-pdf

```typescript
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

// Componente de Términos
const TerminosCondiciones = ({ texto }: { texto: string }) => {
  // Convertir HTML a texto plano o usar dangerouslySetInnerHTML alternativo
  const textoPlano = texto.replace(/<[^>]*>/g, '').trim();
  
  return (
    <View style={styles.terminosSection}>
      <Text style={styles.terminosTitle}>TÉRMINOS Y CONDICIONES</Text>
      <Text style={styles.terminosText}>{textoPlano}</Text>
    </View>
  );
};

// Documento PDF
const OfertaPDF = ({ oferta, terminos }: any) => (
  <Document>
    {/* Páginas de la oferta */}
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text>Oferta: {oferta.numero_oferta}</Text>
        <Text>{oferta.nombre_automatico}</Text>
      </View>
      
      <View style={styles.content}>
        {/* Contenido de la oferta */}
      </View>
    </Page>
    
    {/* Página de términos y condiciones */}
    <Page size="A4" style={styles.page}>
      <TerminosCondiciones texto={terminos} />
    </Page>
  </Document>
);

// Generar y descargar
const generarPDF = async (oferta: any) => {
  const terminos = await obtenerTerminosCondiciones();
  
  const blob = await pdf(
    <OfertaPDF oferta={oferta} terminos={terminos} />
  ).toBlob();
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `oferta-${oferta.numero_oferta}.pdf`;
  link.click();
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
  },
  terminosSection: {
    marginTop: 20,
  },
  terminosTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  terminosText: {
    fontSize: 9,
    lineHeight: 1.5,
    textAlign: 'justify',
  },
});
```

---

### Opción C: Usando pdfmake

```typescript
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const generarPDFOferta = async (ofertaData: any) => {
  // 1. Obtener términos
  const terminos = await obtenerTerminosCondiciones();
  
  // 2. Convertir HTML a texto plano
  const terminosTexto = terminos
    ? terminos.replace(/<[^>]*>/g, '\n').trim()
    : '';
  
  // 3. Definir documento
  const docDefinition = {
    content: [
      // Contenido de la oferta
      { text: 'OFERTA COMERCIAL', style: 'header' },
      { text: ofertaData.numero_oferta, style: 'subheader' },
      { text: ofertaData.nombre_automatico, style: 'title' },
      
      // ... más contenido de la oferta ...
      
      // Salto de página
      { text: '', pageBreak: 'after' },
      
      // Términos y Condiciones
      { text: 'TÉRMINOS Y CONDICIONES', style: 'terminosHeader' },
      { text: terminosTexto, style: 'terminos' },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },
      terminosHeader: {
        fontSize: 14,
        bold: true,
        alignment: 'center',
        margin: [0, 20, 0, 15]
      },
      terminos: {
        fontSize: 9,
        alignment: 'justify',
        lineHeight: 1.3
      }
    }
  };
  
  // 4. Generar y descargar
  pdfMake.createPdf(docDefinition).download(`oferta-${ofertaData.numero_oferta}.pdf`);
};
```

---

## 3. Procesamiento del HTML de Términos

### Convertir HTML a Texto Plano

```typescript
const htmlToText = (html: string): string => {
  // Crear elemento temporal
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Extraer texto
  return temp.textContent || temp.innerText || '';
};
```

### Convertir HTML a Estructura para PDF

```typescript
const parseTerminosHTML = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const secciones = [];
  const sections = doc.querySelectorAll('.seccion-terminos');
  
  sections.forEach(section => {
    const titulo = section.querySelector('h2')?.textContent || '';
    const subsecciones = [];
    
    section.querySelectorAll('.subseccion').forEach(sub => {
      const subtitulo = sub.querySelector('h3')?.textContent || '';
      const contenido = sub.querySelector('p')?.textContent || '';
      const lista = Array.from(sub.querySelectorAll('li')).map(li => li.textContent);
      
      subsecciones.push({
        subtitulo,
        contenido,
        lista
      });
    });
    
    secciones.push({
      titulo,
      subsecciones
    });
  });
  
  return secciones;
};
```

---

## 4. Estilos CSS para Vista Previa

Si quieres mostrar una vista previa antes de generar el PDF:

```css
.terminos-condiciones {
  font-family: 'Arial', sans-serif;
  font-size: 10pt;
  line-height: 1.5;
  color: #333;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.seccion-terminos {
  margin-bottom: 30px;
  page-break-inside: avoid;
}

.seccion-terminos h2 {
  font-size: 14pt;
  font-weight: bold;
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 8px;
  margin-bottom: 15px;
}

.subseccion {
  margin-bottom: 20px;
}

.subseccion h3 {
  font-size: 11pt;
  font-weight: bold;
  color: #34495e;
  margin-bottom: 8px;
}

.subseccion p {
  margin-bottom: 10px;
  text-align: justify;
}

.subseccion ul {
  margin-left: 20px;
  margin-bottom: 10px;
}

.subseccion li {
  margin-bottom: 5px;
}

.lista-importante {
  list-style: none;
  padding-left: 0;
}

.lista-importante li {
  padding-left: 25px;
  position: relative;
}

@media print {
  .terminos-condiciones {
    page-break-before: always;
  }
  
  .seccion-terminos {
    page-break-inside: avoid;
  }
}
```

---

## 5. Ejemplo Completo con React

```typescript
import React, { useState, useEffect } from 'react';

interface TerminosCondiciones {
  id: string;
  texto: string;
  version: number;
}

const GeneradorPDFOferta: React.FC<{ oferta: any }> = ({ oferta }) => {
  const [terminos, setTerminos] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Cargar términos al montar el componente
  useEffect(() => {
    const cargarTerminos = async () => {
      try {
        const response = await fetch('/api/terminos-condiciones/activo');
        const { success, data } = await response.json();
        
        if (success && data) {
          setTerminos(data.texto);
        }
      } catch (error) {
        console.error('Error cargando términos:', error);
      }
    };
    
    cargarTerminos();
  }, []);
  
  const generarPDF = async () => {
    if (!terminos) {
      alert('No se pudieron cargar los términos y condiciones');
      return;
    }
    
    setLoading(true);
    
    try {
      // Aquí va tu lógica de generación de PDF
      // usando cualquiera de las opciones anteriores
      
      console.log('Generando PDF con términos...');
      
      // Ejemplo simple
      await generarPDFConTerminos(oferta, terminos);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <button 
        onClick={generarPDF}
        disabled={loading || !terminos}
      >
        {loading ? 'Generando PDF...' : 'Descargar PDF'}
      </button>
      
      {!terminos && (
        <p style={{ color: 'orange' }}>
          Cargando términos y condiciones...
        </p>
      )}
    </div>
  );
};

export default GeneradorPDFOferta;
```

---

## 6. Caché de Términos (Opcional)

Para evitar hacer la petición cada vez:

```typescript
// terminos-cache.ts
let terminosCache: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

export const obtenerTerminosConCache = async (): Promise<string | null> => {
  const now = Date.now();
  
  // Si hay caché válido, usarlo
  if (terminosCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return terminosCache;
  }
  
  // Obtener nuevos términos
  try {
    const response = await fetch('/api/terminos-condiciones/activo');
    const { success, data } = await response.json();
    
    if (success && data) {
      terminosCache = data.texto;
      cacheTimestamp = now;
      return terminosCache;
    }
  } catch (error) {
    console.error('Error obteniendo términos:', error);
  }
  
  return null;
};

export const limpiarCacheTerminos = () => {
  terminosCache = null;
  cacheTimestamp = 0;
};
```

---

## 7. Notas Importantes

### ✅ Recomendaciones

1. **Cargar términos al inicio**: Carga los términos cuando el usuario abre la vista de la oferta, no cuando hace clic en "Generar PDF"
2. **Manejo de errores**: Si no se pueden cargar los términos, decide si:
   - Generar el PDF sin términos (con advertencia)
   - No permitir generar el PDF
3. **Vista previa**: Muestra una vista previa del PDF antes de descargarlo
4. **Formato**: El HTML viene estructurado, pero puedes necesitar convertirlo según tu librería de PDF

### ⚠️ Consideraciones

- El texto HTML tiene **3,424 caracteres**
- Ocupa aproximadamente **1-2 páginas** en formato A4
- Usa `page-break-before: always` para empezar en nueva página
- Los emojis (🔹) pueden no renderizarse en algunos generadores de PDF

### 🔧 Troubleshooting

**Problema**: Los términos no se cargan
- Verificar que el endpoint `/api/terminos-condiciones/activo` esté accesible
- Verificar que hay términos activos en la BD

**Problema**: El HTML no se renderiza bien en el PDF
- Convertir HTML a texto plano
- O usar una librería que soporte HTML (como html2canvas)

**Problema**: El PDF es muy grande
- Reducir la escala de html2canvas
- Comprimir imágenes
- Usar formato texto en lugar de imágenes

---

## 8. Ejemplo de Resultado Final

El PDF debería verse así:

```
┌─────────────────────────────────────┐
│                                     │
│         OFERTA COMERCIAL            │
│      OF-20260203-001                │
│   I-2x5kW, B-4x5.12kWh, P-12x590W  │
│                                     │
│   [Contenido de la oferta]          │
│                                     │
└─────────────────────────────────────┘

[Nueva página]

┌─────────────────────────────────────┐
│                                     │
│    TÉRMINOS Y CONDICIONES           │
│                                     │
│ CONDICIONES DE PAGO Y RESERVA...    │
│                                     │
│ Forma de Pago:                      │
│ • 50% del importe total...          │
│ • 50% restante...                   │
│                                     │
│ GARANTÍA                            │
│ ...                                 │
│                                     │
└─────────────────────────────────────┘
```

---

¿Necesitas ayuda con alguna librería específica de generación de PDF?

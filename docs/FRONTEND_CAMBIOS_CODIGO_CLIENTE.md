# Cambios Necesarios en el Frontend

## 🎯 Resumen

El backend ahora usa la **oferta confeccionada** para generar el código de cliente en lugar de la oferta antigua del lead. El frontend NO necesita cambios en la mayoría de los casos, pero hay algunas consideraciones importantes.

## ✅ Lo Que NO Cambia

1. **Formato del código**: Sigue siendo 10 caracteres (1 letra + 9 dígitos)
2. **Endpoints**: Los mismos endpoints (`GET /leads/{id}/generar-codigo-cliente` y `POST /leads/{id}/convertir`)
3. **Estructura de respuesta**: La respuesta del API es la misma
4. **Validaciones de formato**: Las mismas validaciones del lado del cliente

## ⚠️ Lo Que SÍ Cambia

### 1. Flujo de Trabajo Requerido

**Antes:**
```
Lead → Asignar Inversor → Generar Código → Convertir
```

**Ahora:**
```
Lead → Crear Oferta Confeccionada → Generar Código → Convertir
```

### 2. Validación de Requisitos Previos

Antes de permitir generar el código, el frontend debe verificar:

```javascript
// Verificar que el lead tenga oferta confeccionada
const tieneOfertaConfeccionada = await verificarOfertaConfeccionada(leadId);

if (!tieneOfertaConfeccionada && !equipoPropio) {
  // Mostrar mensaje al usuario
  alert("Debes crear una oferta confeccionada antes de generar el código");
  // Redirigir a crear oferta confeccionada
  router.push(`/ofertas-confeccion/crear?lead_id=${leadId}`);
  return;
}
```

### 3. Mensajes de Error Actualizados

El backend ahora retorna estos errores:

```javascript
// Error 400: Lead sin oferta confeccionada
{
  "detail": "El lead no tiene ofertas confeccionadas. Debe crear una oferta confeccionada o marcar el equipo como propio del cliente."
}

// Error 400: Oferta sin inversor
{
  "detail": "La oferta confeccionada no tiene inversor seleccionado. Debe asignar un inversor o marcar el equipo como propio del cliente."
}

// Error 400: Material sin marca
{
  "detail": "El material {codigo} no tiene marca_id asignada. Por favor, asigne una marca al material."
}
```

**Acción requerida:** Actualizar el manejo de errores para mostrar estos mensajes al usuario.

## 🔧 Cambios Recomendados en el Frontend

### 1. Verificar Oferta Confeccionada Antes de Generar Código

```javascript
// En el componente de conversión de lead a cliente

async function verificarRequisitos(leadId, equipoPropio) {
  if (equipoPropio) {
    // Si es equipo propio, no necesita oferta confeccionada
    return true;
  }
  
  try {
    // Verificar si el lead tiene oferta confeccionada
    const response = await fetch(
      `/api/oferta-confeccion/lead/${leadId}`
    );
    
    if (response.status === 404) {
      // No tiene oferta confeccionada
      return {
        valido: false,
        mensaje: "Debes crear una oferta confeccionada antes de generar el código",
        accion: "crear_oferta"
      };
    }
    
    const oferta = await response.json();
    
    // Verificar que tenga inversor seleccionado
    if (!oferta.componentes_principales?.inversor_seleccionado) {
      return {
        valido: false,
        mensaje: "La oferta confeccionada debe tener un inversor seleccionado",
        accion: "editar_oferta"
      };
    }
    
    return { valido: true };
    
  } catch (error) {
    console.error("Error verificando requisitos:", error);
    return {
      valido: false,
      mensaje: "Error verificando requisitos previos",
      accion: null
    };
  }
}

// Uso en el botón de generar código
async function handleGenerarCodigo() {
  const requisitos = await verificarRequisitos(leadId, equipoPropio);
  
  if (!requisitos.valido) {
    // Mostrar mensaje al usuario
    showNotification(requisitos.mensaje, "warning");
    
    // Redirigir según la acción
    if (requisitos.accion === "crear_oferta") {
      router.push(`/ofertas-confeccion/crear?lead_id=${leadId}`);
    } else if (requisitos.accion === "editar_oferta") {
      router.push(`/ofertas-confeccion/${ofertaId}/editar`);
    }
    
    return;
  }
  
  // Continuar con la generación del código
  generarCodigo();
}
```

### 2. Actualizar UI para Mostrar Estado

```javascript
// Mostrar indicador visual del estado del lead

function LeadStatusBadge({ lead }) {
  const [tieneOferta, setTieneOferta] = useState(false);
  const [tieneInversor, setTieneInversor] = useState(false);
  
  useEffect(() => {
    verificarEstado();
  }, [lead.id]);
  
  async function verificarEstado() {
    const response = await fetch(`/api/oferta-confeccion/lead/${lead.id}`);
    if (response.ok) {
      const oferta = await response.json();
      setTieneOferta(true);
      setTieneInversor(!!oferta.componentes_principales?.inversor_seleccionado);
    }
  }
  
  return (
    <div className="status-badges">
      {tieneOferta ? (
        <span className="badge badge-success">
          ✓ Oferta Confeccionada
        </span>
      ) : (
        <span className="badge badge-warning">
          ⚠ Sin Oferta Confeccionada
        </span>
      )}
      
      {tieneOferta && tieneInversor && (
        <span className="badge badge-success">
          ✓ Inversor Asignado
        </span>
      )}
      
      {tieneOferta && !tieneInversor && (
        <span className="badge badge-warning">
          ⚠ Sin Inversor
        </span>
      )}
    </div>
  );
}
```

### 3. Mejorar Manejo de Errores

```javascript
async function generarCodigo(leadId, equipoPropio = false) {
  try {
    const url = `/api/leads/${leadId}/generar-codigo-cliente${
      equipoPropio ? '?equipo_propio=true' : ''
    }`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      
      // Manejar errores específicos
      if (error.detail.includes("ofertas confeccionadas")) {
        showNotification(
          "Debes crear una oferta confeccionada primero",
          "warning"
        );
        // Ofrecer crear oferta
        if (confirm("¿Deseas crear una oferta confeccionada ahora?")) {
          router.push(`/ofertas-confeccion/crear?lead_id=${leadId}`);
        }
        return null;
      }
      
      if (error.detail.includes("inversor seleccionado")) {
        showNotification(
          "La oferta debe tener un inversor seleccionado",
          "warning"
        );
        return null;
      }
      
      if (error.detail.includes("marca_id")) {
        showNotification(
          "El material inversor no tiene marca asignada. Contacta al administrador.",
          "error"
        );
        return null;
      }
      
      // Error genérico
      showNotification(error.detail, "error");
      return null;
    }
    
    const data = await response.json();
    return data.codigo;
    
  } catch (error) {
    console.error("Error generando código:", error);
    showNotification("Error al generar código", "error");
    return null;
  }
}
```

### 4. Actualizar Flujo de Conversión

```javascript
// En el formulario de conversión de lead a cliente

function ConversionForm({ lead }) {
  const [codigo, setCodigo] = useState("");
  const [equipoPropio, setEquipoPropio] = useState(false);
  const [puedeGenerar, setPuedeGenerar] = useState(false);
  
  useEffect(() => {
    verificarSiPuedeGenerar();
  }, [lead.id, equipoPropio]);
  
  async function verificarSiPuedeGenerar() {
    if (equipoPropio) {
      setPuedeGenerar(true);
      return;
    }
    
    // Verificar oferta confeccionada
    const requisitos = await verificarRequisitos(lead.id, equipoPropio);
    setPuedeGenerar(requisitos.valido);
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={equipoPropio}
            onChange={(e) => setEquipoPropio(e.target.checked)}
          />
          Equipo propio del cliente
        </label>
      </div>
      
      {!puedeGenerar && !equipoPropio && (
        <div className="alert alert-warning">
          ⚠ Este lead necesita una oferta confeccionada con inversor seleccionado.
          <button
            type="button"
            onClick={() => router.push(`/ofertas-confeccion/crear?lead_id=${lead.id}`)}
          >
            Crear Oferta Confeccionada
          </button>
        </div>
      )}
      
      <div className="form-group">
        <label>Código de Cliente</label>
        <div className="input-group">
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            maxLength={10}
            pattern="[A-Z]\d{9}"
            required
          />
          <button
            type="button"
            onClick={handleGenerarCodigo}
            disabled={!puedeGenerar}
          >
            Generar
          </button>
        </div>
      </div>
      
      {/* Resto del formulario */}
    </form>
  );
}
```

## 📋 Checklist de Cambios

### Obligatorios
- [x] Actualizar manejo de errores para nuevos mensajes del backend
- [x] Agregar validación de oferta confeccionada antes de generar código
- [x] Mostrar mensaje claro cuando falta oferta confeccionada
- [x] Agregar botón para crear oferta confeccionada desde el flujo de conversión

### Recomendados
- [x] Mejorar mensajes de error con acciones sugeridas
- [ ] Agregar indicador visual de estado (tiene oferta, tiene inversor)
- [ ] Agregar tooltip explicando el nuevo requisito

### Opcionales
- [ ] Agregar tutorial/guía para el nuevo flujo
- [ ] Agregar validación en tiempo real del estado del lead
- [ ] Mostrar preview del código antes de generarlo

## ✅ Cambios Implementados en el Frontend

### 1. Actualización de `openConvertDialog` en `leads-table.tsx`

Se modificó la función para verificar si el lead tiene oferta confeccionada en lugar de verificar si tiene inversor en la oferta antigua:

```typescript
// ANTES: Verificaba lead.ofertas[0].inversor_codigo
const tieneInversor = lead.ofertas && lead.ofertas.length > 0 && lead.ofertas[0].inversor_codigo

// AHORA: Verifica si el lead tiene oferta confeccionada
const tieneOfertaConfeccionada = leadsConOferta.has(leadId)
```

### 2. Mejora en el Manejo de Errores

Se agregó detección específica de errores del backend:

```typescript
if (errorMessage.includes('ofertas confeccionadas')) {
  setConversionErrors({
    general: 'Este lead necesita una oferta confeccionada antes de generar el código...'
  })
} else if (errorMessage.includes('inversor seleccionado')) {
  setConversionErrors({
    general: 'La oferta confeccionada debe tener un inversor seleccionado...'
  })
} else if (errorMessage.includes('marca_id')) {
  setConversionErrors({
    general: 'El material inversor no tiene marca asignada...'
  })
}
```

### 3. Botón para Crear Oferta Confeccionada

Se agregó un botón en el mensaje de error que permite crear una oferta confeccionada directamente:

```typescript
{(conversionErrors.general.includes('oferta confeccionada') || 
  conversionErrors.general.includes('inversor seleccionado')) && (
  <Button onClick={() => {
    closeConvertDialog()
    openAsignarOfertaDialog(leadToConvert)
  }}>
    Crear Oferta Confeccionada
  </Button>
)}
```

### 4. Actualización del Flujo de Equipo Propio

Se mejoró la pregunta sobre equipo propio para ofrecer dos opciones claras:
- "Sí, es equipo propio del cliente" → Genera código con prefijo P
- "No, crear oferta confeccionada" → Abre el diálogo para crear oferta

## 🔄 Flujo Actualizado

### Conversión de Lead a Cliente

1. Usuario hace clic en "Convertir a cliente"
2. Sistema verifica si el lead tiene oferta confeccionada
3. **Si tiene oferta confeccionada:**
   - Genera código automáticamente usando la marca del inversor de la oferta confeccionada
   - Muestra el formulario de conversión con el código pre-llenado
4. **Si NO tiene oferta confeccionada:**
   - Muestra pregunta: "¿El equipo es propio del cliente?"
   - **Opción A:** "Sí, es equipo propio" → Genera código con prefijo P
   - **Opción B:** "No, crear oferta confeccionada" → Abre diálogo para crear oferta
5. Si hay error, muestra mensaje con botón para crear oferta confeccionada

## 🧪 Pruebas Recomendadas

1. **Caso 1: Lead sin oferta confeccionada**
   - Intentar generar código
   - Verificar que muestra mensaje de error
   - Verificar que ofrece crear oferta

2. **Caso 2: Lead con oferta pero sin inversor**
   - Intentar generar código
   - Verificar que muestra mensaje de error
   - Verificar que ofrece editar oferta

3. **Caso 3: Lead con oferta completa**
   - Generar código exitosamente
   - Verificar formato (10 caracteres)
   - Verificar que la letra corresponde a la marca

4. **Caso 4: Equipo propio**
   - Marcar checkbox de equipo propio
   - Generar código
   - Verificar que empieza con "P"

## 📞 Soporte

Si tienes dudas sobre la implementación, consulta:
- `ACTUALIZACION_CODIGO_CLIENTE_OFERTA_CONFECCIONADA.md` - Documentación completa del backend
- `RESUMEN_CAMBIOS_CODIGO_CLIENTE.md` - Resumen ejecutivo de cambios

# Guía Frontend: Conversión de Leads a Clientes

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Endpoints Disponibles](#endpoints-disponibles)
3. [Flujo de Conversión](#flujo-de-conversión)
4. [Implementación React](#implementación-react)
5. [Servicio API](#servicio-api)
6. [Validaciones](#validaciones)
7. [Manejo de Errores](#manejo-de-errores)
8. [Ejemplos Completos](#ejemplos-completos)

---

## Descripción General

El sistema permite convertir leads en clientes con generación automática de códigos únicos basados en:
- **Marca del inversor** (primera letra)
- **Provincia** (código de 3 dígitos con padding)
- **Municipio** (código de 3 dígitos con padding)
- **Número consecutivo** (3 dígitos con padding de ceros)

**Formato del código:** `{Letra}{Provincia}{Municipio}{Consecutivo}`  
**Longitud:** 10 caracteres (fija)  
**Ejemplo:** `F020400208` (1 letra + 9 dígitos)
- F = Fronius
- 02 = Provincia (con padding)
- 04 = Municipio (con padding)
- 00208 = Cliente #208

**Capacidad:** 999 clientes por cada combinación de marca + provincia + municipio

---

## Endpoints Disponibles

### 1. Generar Código de Cliente

```http
GET /leads/{lead_id}/generar-codigo-cliente
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Código generado exitosamente",
  "codigo_generado": "F020400208"
}
```

**Errores posibles:**
- `404`: Lead no encontrado
- `400`: Lead sin ofertas
- `400`: Lead sin provincia_montaje
- `400`: Lead sin municipio
- `400`: Primera oferta sin nombre de inversor

---

### 2. Convertir Lead a Cliente

```http
POST /leads/{lead_id}/convertir
Content-Type: application/json
```

**Body (campos obligatorios):**
```json
{
  "numero": "F020400208",
  "carnet_identidad": "12345678901",
  "estado": "Pendiente de instalación"
}
```

**Body (con campos opcionales):**
```json
{
  "numero": "F020400208",
  "carnet_identidad": "12345678901",
  "estado": "Pendiente de instalación",
  "latitud": "23.1136",
  "longitud": "-82.3666",
  "fecha_instalacion": "2026-02-15T10:00:00",
  "fecha_montaje": "2026-02-10",
  "comprobante_pago_url": "https://...",
  "metodo_pago": "Transferencia",
  "moneda": "USD"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Lead convertido exitosamente a cliente F020400208",
  "data": {
    "numero": "F020400208",
    "nombre": "Juan Pérez",
    "telefono": "53123456",
    "carnet_identidad": "12345678901",
    "estado": "Pendiente de instalación",
    "provincia_montaje": "10",
    "municipio": "05",
    "ofertas": [...],
    ...
  }
}
```

**Estados válidos:**
- `"Pendiente de instalación"`
- `"Esperando equipo"`

**Errores posibles:**
- `404`: Lead no encontrado
- `400`: Estado inválido
- `400`: Carnet de identidad faltante
- `500`: Error al crear cliente

---

## Flujo de Conversión

```
1. Usuario selecciona lead
   ↓
2. Sistema genera código automáticamente
   GET /leads/{id}/generar-codigo-cliente
   ↓
3. Usuario ingresa datos adicionales
   - Carnet de identidad (obligatorio)
   - Estado (obligatorio)
   - Ubicación (opcional)
   - Fechas (opcional)
   ↓
4. Sistema convierte lead a cliente
   POST /leads/{id}/convertir
   ↓
5. Lead se elimina, cliente se crea
   ↓
6. Redirigir a vista de cliente o lista actualizada
```

---

## Implementación React

### Componente Completo

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ConvertirLeadACliente = ({ leadId, leadData, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [codigoGenerado, setCodigoGenerado] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    carnet_identidad: '',
    estado: 'Pendiente de instalación',
    latitud: '',
    longitud: '',
    fecha_instalacion: '',
    fecha_montaje: ''
  });

  // Auto-generar código al montar
  useEffect(() => {
    generarCodigo();
  }, [leadId]);

  const generarCodigo = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(
        `/leads/${leadId}/generar-codigo-cliente`
      );
      
      if (response.data.success) {
        setCodigoGenerado(response.data.codigo_generado);
      }
    } catch (err) {
      const mensaje = err.response?.data?.detail || 'Error al generar código';
      setError(mensaje);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const convertirLead = async () => {
    // Validaciones
    if (!codigoGenerado) {
      setError('Primero debe generar el código de cliente');
      return;
    }

    if (!formData.carnet_identidad) {
      setError('El carnet de identidad es obligatorio');
      return;
    }

    if (formData.carnet_identidad.length !== 11) {
      setError('El carnet de identidad debe tener 11 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `/leads/${leadId}/convertir`,
        {
          numero: codigoGenerado,
          carnet_identidad: formData.carnet_identidad,
          estado: formData.estado,
          latitud: formData.latitud || undefined,
          longitud: formData.longitud || undefined,
          fecha_instalacion: formData.fecha_instalacion || undefined,
          fecha_montaje: formData.fecha_montaje || undefined
        }
      );

      if (response.data.success) {
        onSuccess(response.data.data);
      }
    } catch (err) {
      const mensaje = err.response?.data?.detail || 'Error al convertir lead';
      setError(mensaje);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="convertir-lead-modal">
      <div className="modal-header">
        <h2>Convertir Lead a Cliente</h2>
        <button onClick={onCancel} disabled={loading}>×</button>
      </div>

      <div className="modal-body">
        {/* Información del Lead */}
        <div className="lead-info">
          <h3>Datos del Lead</h3>
          <p><strong>Nombre:</strong> {leadData.nombre}</p>
          <p><strong>Teléfono:</strong> {leadData.telefono}</p>
          <p><strong>Provincia:</strong> {leadData.provincia_montaje}</p>
          <p><strong>Municipio:</strong> {leadData.municipio}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Código Generado */}
        <div className="form-group">
          <label>Código de Cliente Generado:</label>
          <div className="codigo-display">
            {loading && !codigoGenerado ? (
              <span className="loading">Generando código...</span>
            ) : (
              <span className="codigo">{codigoGenerado}</span>
            )}
          </div>
          <small className="text-muted">
            Este código se generó automáticamente basado en la marca del inversor,
            provincia y municipio del lead.
          </small>
        </div>

        {/* Formulario */}
        <form onSubmit={(e) => { e.preventDefault(); convertirLead(); }}>
          {/* Carnet de Identidad */}
          <div className="form-group">
            <label>
              Carnet de Identidad: <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-control"
              value={formData.carnet_identidad}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ''); // Solo números
                if (value.length <= 11) {
                  setFormData({ ...formData, carnet_identidad: value });
                }
              }}
              placeholder="12345678901"
              maxLength={11}
              required
              disabled={loading}
            />
            <small className="text-muted">11 dígitos</small>
          </div>

          {/* Estado */}
          <div className="form-group">
            <label>
              Estado: <span className="required">*</span>
            </label>
            <select
              className="form-control"
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              required
              disabled={loading}
            >
              <option value="Pendiente de instalación">
                Pendiente de instalación
              </option>
              <option value="Esperando equipo">
                Esperando equipo
              </option>
            </select>
          </div>

          {/* Ubicación (Opcional) */}
          <div className="form-row">
            <div className="form-group col-md-6">
              <label>Latitud:</label>
              <input
                type="text"
                className="form-control"
                value={formData.latitud}
                onChange={(e) => setFormData({ ...formData, latitud: e.target.value })}
                placeholder="23.1136"
                disabled={loading}
              />
            </div>
            <div className="form-group col-md-6">
              <label>Longitud:</label>
              <input
                type="text"
                className="form-control"
                value={formData.longitud}
                onChange={(e) => setFormData({ ...formData, longitud: e.target.value })}
                placeholder="-82.3666"
                disabled={loading}
              />
            </div>
          </div>

          {/* Fechas (Opcional) */}
          <div className="form-row">
            <div className="form-group col-md-6">
              <label>Fecha de Instalación:</label>
              <input
                type="datetime-local"
                className="form-control"
                value={formData.fecha_instalacion}
                onChange={(e) => setFormData({ ...formData, fecha_instalacion: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group col-md-6">
              <label>Fecha de Montaje:</label>
              <input
                type="date"
                className="form-control"
                value={formData.fecha_montaje}
                onChange={(e) => setFormData({ ...formData, fecha_montaje: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Botones */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !codigoGenerado}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2"></span>
                  Procesando...
                </>
              ) : (
                'Convertir a Cliente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConvertirLeadACliente;
```

### CSS Sugerido

```css
.convertir-lead-modal {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.modal-body {
  padding: 20px;
}

.lead-info {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.lead-info h3 {
  font-size: 1rem;
  margin-bottom: 10px;
  color: #495057;
}

.lead-info p {
  margin: 5px 0;
  font-size: 0.9rem;
}

.codigo-display {
  background: #e7f3ff;
  border: 2px solid #0066cc;
  padding: 15px;
  border-radius: 4px;
  text-align: center;
  margin: 10px 0;
}

.codigo-display .codigo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #0066cc;
  font-family: 'Courier New', monospace;
}

.codigo-display .loading {
  color: #6c757d;
  font-style: italic;
}

.required {
  color: #dc3545;
}

.alert {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.alert-danger {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #dee2e6;
}
```

---

## Servicio API

### Archivo: `services/leadsService.js`

```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class LeadsService {
  /**
   * Generar código de cliente para un lead
   */
  async generarCodigoCliente(leadId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/leads/${leadId}/generar-codigo-cliente`
      );
      return response.data.codigo_generado;
    } catch (error) {
      console.error('Error generando código:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Convertir lead a cliente
   */
  async convertirLeadACliente(leadId, datos) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/leads/${leadId}/convertir`,
        datos
      );
      return response.data.data;
    } catch (error) {
      console.error('Error convirtiendo lead:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Flujo completo: generar código y convertir
   */
  async convertirLeadCompleto(leadId, datosAdicionales) {
    try {
      // 1. Generar código
      const codigo = await this.generarCodigoCliente(leadId);
      
      // 2. Convertir lead
      const cliente = await this.convertirLeadACliente(leadId, {
        numero: codigo,
        ...datosAdicionales
      });
      
      return { codigo, cliente };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Manejo centralizado de errores
   */
  handleError(error) {
    if (error.response) {
      const status = error.response.status;
      const detail = error.response.data?.detail || 'Error desconocido';

      switch (status) {
        case 404:
          return new Error('Lead no encontrado');
        case 400:
          if (detail.includes('ofertas')) {
            return new Error('El lead no tiene ofertas');
          }
          if (detail.includes('provincia')) {
            return new Error('El lead no tiene provincia configurada');
          }
          if (detail.includes('municipio')) {
            return new Error('El lead no tiene municipio configurado');
          }
          if (detail.includes('estado')) {
            return new Error('Estado inválido. Use "Pendiente de instalación" o "Esperando equipo"');
          }
          return new Error(detail);
        case 500:
          return new Error('Error del servidor. Intente nuevamente');
        default:
          return new Error(detail);
      }
    } else if (error.request) {
      return new Error('Error de conexión. Verifique su internet');
    } else {
      return new Error('Error al procesar la solicitud');
    }
  }
}

export default new LeadsService();
```

---

## Validaciones

### Validación de Carnet de Identidad

```javascript
const validarCarnetIdentidad = (ci) => {
  // Debe tener exactamente 11 dígitos
  if (!ci || ci.length !== 11) {
    return 'El carnet de identidad debe tener 11 dígitos';
  }

  // Solo números
  if (!/^\d{11}$/.test(ci)) {
    return 'El carnet de identidad solo debe contener números';
  }

  return null; // Válido
};
```

### Validación de Estado

```javascript
const validarEstado = (estado) => {
  const estadosValidos = [
    'Pendiente de instalación',
    'Esperando equipo'
  ];

  if (!estadosValidos.includes(estado)) {
    return 'Estado inválido';
  }

  return null; // Válido
};
```

### Validación de Coordenadas

```javascript
const validarCoordenadas = (latitud, longitud) => {
  if (latitud && isNaN(parseFloat(latitud))) {
    return 'Latitud inválida';
  }

  if (longitud && isNaN(parseFloat(longitud))) {
    return 'Longitud inválida';
  }

  return null; // Válido
};
```

### Validación Completa

```javascript
const validarDatosConversion = (datos) => {
  const errores = [];

  // Carnet de identidad
  const errorCI = validarCarnetIdentidad(datos.carnet_identidad);
  if (errorCI) errores.push(errorCI);

  // Estado
  const errorEstado = validarEstado(datos.estado);
  if (errorEstado) errores.push(errorEstado);

  // Coordenadas (si se proporcionan)
  if (datos.latitud || datos.longitud) {
    const errorCoord = validarCoordenadas(datos.latitud, datos.longitud);
    if (errorCoord) errores.push(errorCoord);
  }

  return errores;
};
```

---

## Manejo de Errores

### Hook Personalizado

```javascript
import { useState } from 'react';

const useErrorHandler = () => {
  const [error, setError] = useState('');

  const handleError = (err) => {
    if (err.response) {
      const status = err.response.status;
      const detail = err.response.data?.detail;

      switch (status) {
        case 404:
          setError('Lead no encontrado');
          break;
        case 400:
          if (detail?.includes('ofertas')) {
            setError('El lead no tiene ofertas. No se puede generar código.');
          } else if (detail?.includes('provincia')) {
            setError('El lead no tiene provincia de montaje configurada.');
          } else if (detail?.includes('municipio')) {
            setError('El lead no tiene municipio configurado.');
          } else if (detail?.includes('estado')) {
            setError('Estado inválido. Debe ser "Pendiente de instalación" o "Esperando equipo".');
          } else {
            setError(detail || 'Datos inválidos');
          }
          break;
        case 500:
          setError('Error del servidor. Por favor, intente nuevamente.');
          break;
        default:
          setError('Error desconocido');
      }
    } else if (err.request) {
      setError('Error de conexión. Verifique su conexión a internet.');
    } else {
      setError('Error al procesar la solicitud.');
    }
  };

  const clearError = () => setError('');

  return { error, handleError, clearError };
};

export default useErrorHandler;
```

---

## Ejemplos Completos

### Ejemplo 1: Uso Básico

```javascript
import leadsService from './services/leadsService';

const handleConvertir = async (leadId) => {
  try {
    const resultado = await leadsService.convertirLeadCompleto(leadId, {
      carnet_identidad: '12345678901',
      estado: 'Pendiente de instalación'
    });

    console.log('Código generado:', resultado.codigo);
    console.log('Cliente creado:', resultado.cliente);
    
    // Mostrar notificación de éxito
    alert(`Cliente ${resultado.codigo} creado exitosamente`);
    
    // Redirigir o actualizar lista
    window.location.href = `/clientes/${resultado.codigo}`;
  } catch (error) {
    console.error('Error:', error.message);
    alert(error.message);
  }
};
```

### Ejemplo 2: Con Ubicación

```javascript
const handleConvertirConUbicacion = async (leadId) => {
  try {
    // Obtener ubicación del navegador
    navigator.geolocation.getCurrentPosition(async (position) => {
      const resultado = await leadsService.convertirLeadCompleto(leadId, {
        carnet_identidad: '12345678901',
        estado: 'Pendiente de instalación',
        latitud: position.coords.latitude.toString(),
        longitud: position.coords.longitude.toString()
      });

      console.log('Cliente creado con ubicación:', resultado.cliente);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

### Ejemplo 3: Integración con Tabla

```jsx
const TablaLeads = () => {
  const [leads, setLeads] = useState([]);
  const [leadSeleccionado, setLeadSeleccionado] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  const handleConvertir = (lead) => {
    setLeadSeleccionado(lead);
    setMostrarModal(true);
  };

  const handleConversionExitosa = (cliente) => {
    // Cerrar modal
    setMostrarModal(false);
    setLeadSeleccionado(null);

    // Actualizar lista de leads (remover el convertido)
    setLeads(leads.filter(l => l.id !== leadSeleccionado.id));

    // Mostrar notificación
    toast.success(`Lead convertido a cliente ${cliente.numero}`);

    // Opcional: redirigir al cliente
    // navigate(`/clientes/${cliente.numero}`);
  };

  return (
    <>
      <table className="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Estado</th>
            <th>Provincia</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => (
            <tr key={lead.id}>
              <td>{lead.nombre}</td>
              <td>{lead.telefono}</td>
              <td>{lead.estado}</td>
              <td>{lead.provincia_montaje}</td>
              <td>
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => handleConvertir(lead)}
                >
                  <i className="fas fa-user-plus"></i> Convertir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {mostrarModal && (
        <Modal onClose={() => setMostrarModal(false)}>
          <ConvertirLeadACliente
            leadId={leadSeleccionado.id}
            leadData={leadSeleccionado}
            onSuccess={handleConversionExitosa}
            onCancel={() => setMostrarModal(false)}
          />
        </Modal>
      )}
    </>
  );
};
```

### Ejemplo 4: Con React Query

```javascript
import { useMutation, useQuery } from 'react-query';
import leadsService from './services/leadsService';

const useConvertirLead = () => {
  return useMutation(
    ({ leadId, datos }) => leadsService.convertirLeadCompleto(leadId, datos),
    {
      onSuccess: (data) => {
        console.log('Conversión exitosa:', data);
        // Invalidar queries relacionadas
        queryClient.invalidateQueries('leads');
        queryClient.invalidateQueries('clientes');
      },
      onError: (error) => {
        console.error('Error en conversión:', error);
      }
    }
  );
};

// Uso en componente
const MiComponente = ({ leadId }) => {
  const { mutate, isLoading, error } = useConvertirLead();

  const handleConvertir = () => {
    mutate({
      leadId,
      datos: {
        carnet_identidad: '12345678901',
        estado: 'Pendiente de instalación'
      }
    });
  };

  return (
    <button onClick={handleConvertir} disabled={isLoading}>
      {isLoading ? 'Convirtiendo...' : 'Convertir a Cliente'}
    </button>
  );
};
```

---

## 📝 Checklist de Implementación

- [ ] Crear servicio API (`leadsService.js`)
- [ ] Crear componente de conversión (`ConvertirLeadACliente.jsx`)
- [ ] Agregar validaciones de formulario
- [ ] Implementar manejo de errores
- [ ] Agregar estilos CSS
- [ ] Integrar con tabla de leads
- [ ] Probar flujo completo
- [ ] Agregar notificaciones de éxito/error
- [ ] Actualizar listas después de conversión
- [ ] Agregar loading states

---

## 🚀 Notas Importantes

1. **El código se genera automáticamente** - No permitir edición manual
2. **Validar CI antes de enviar** - Exactamente 11 dígitos numéricos
3. **Estados son case-sensitive** - Usar exactamente como se especifica
4. **El lead se elimina automáticamente** - Actualizar listas después de conversión
5. **Campos opcionales pueden ser `undefined`** - No enviar `null` o strings vacíos
6. **El código puede crecer ilimitadamente** - Preparar UI para códigos de diferentes longitudes

---

## 📞 Soporte

Si tienes dudas sobre la implementación, revisa:
- `docs/CONVERSION_LEADS_A_CLIENTES.md` - Documentación técnica completa
- `docs/CODIGOS_CLIENTE_CRECIMIENTO_ILIMITADO.md` - Detalles del sistema de códigos
- `test/test_generar_codigo_cliente.http` - Ejemplos de requests HTTP

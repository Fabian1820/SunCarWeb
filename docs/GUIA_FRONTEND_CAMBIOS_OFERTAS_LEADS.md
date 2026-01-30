# Guía Frontend: Actualización para Soporte de Leads en Ofertas

## 📋 Resumen de Cambios Necesarios

El backend ahora soporta **tres tipos de contacto** para ofertas personalizadas:
1. **Cliente existente** - `cliente_numero`
2. **Lead existente** - `lead_id`
3. **Lead sin agregar** - `nombre_lead_sin_agregar` (solo nombre, sin validación)

---

## 🎯 Cambios Requeridos en el Frontend

### 1. Formulario de Crear Oferta

#### 1.1 Agregar Selector de Tipo de Contacto

**Antes:**
```jsx
// Solo había selector de cliente
<ClienteSelector 
  value={clienteNumero}
  onChange={setClienteNumero}
/>
```

**Después:**
```jsx
// Agregar selector de tipo de contacto
<FormControl>
  <FormLabel>Tipo de Contacto</FormLabel>
  <RadioGroup value={tipoContacto} onChange={(e) => setTipoContacto(e.target.value)}>
    <Radio value="cliente">Cliente Existente</Radio>
    <Radio value="lead">Lead Existente</Radio>
    <Radio value="nuevo">Persona Nueva (sin agregar)</Radio>
  </RadioGroup>
</FormControl>

{/* Mostrar selector según tipo */}
{tipoContacto === 'cliente' && (
  <ClienteSelector 
    value={clienteNumero}
    onChange={setClienteNumero}
  />
)}

{tipoContacto === 'lead' && (
  <LeadSelector 
    value={leadId}
    onChange={setLeadId}
  />
)}

{tipoContacto === 'nuevo' && (
  <Input
    placeholder="Nombre de la persona"
    value={nombreLeadSinAgregar}
    onChange={(e) => setNombreLeadSinAgregar(e.target.value)}
  />
)}
```

#### 1.2 Estado del Componente

```jsx
const [tipoOferta, setTipoOferta] = useState('personalizada'); // o 'generica'
const [tipoContacto, setTipoContacto] = useState('cliente'); // 'cliente', 'lead', 'nuevo'

// Campos de contacto
const [clienteNumero, setClienteNumero] = useState(null);
const [leadId, setLeadId] = useState(null);
const [nombreLeadSinAgregar, setNombreLeadSinAgregar] = useState('');
```

#### 1.3 Preparar Datos para Enviar

```jsx
const crearOferta = async () => {
  const ofertaData = {
    tipo_oferta: tipoOferta,
    almacen_id: almacenId,
    items: items,
    // ... otros campos
  };

  // Solo agregar el campo de contacto correspondiente
  if (tipoOferta === 'personalizada') {
    if (tipoContacto === 'cliente') {
      ofertaData.cliente_numero = clienteNumero;
    } else if (tipoContacto === 'lead') {
      ofertaData.lead_id = leadId;
    } else if (tipoContacto === 'nuevo') {
      ofertaData.nombre_lead_sin_agregar = nombreLeadSinAgregar;
    }
  }

  try {
    const response = await fetch('/ofertas/confeccion/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ofertaData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error creando oferta');
    }

    const result = await response.json();
    console.log('Oferta creada:', result.data);
  } catch (error) {
    console.error('Error:', error.message);
    // Mostrar error al usuario
  }
};
```

#### 1.4 Validaciones en el Frontend

```jsx
const validarFormulario = () => {
  const errores = [];

  if (tipoOferta === 'personalizada') {
    // Validar que hay un contacto
    const tieneContacto = 
      (tipoContacto === 'cliente' && clienteNumero) ||
      (tipoContacto === 'lead' && leadId) ||
      (tipoContacto === 'nuevo' && nombreLeadSinAgregar.trim());

    if (!tieneContacto) {
      errores.push('Debe seleccionar o ingresar un contacto');
    }
  }

  if (!almacenId) {
    errores.push('Debe seleccionar un almacén');
  }

  if (items.length === 0) {
    errores.push('Debe agregar al menos un material');
  }

  return errores;
};
```

---

### 2. Formulario de Editar Oferta

#### 2.1 Cargar Datos de la Oferta

```jsx
const cargarOferta = async (ofertaId) => {
  const response = await fetch(`/ofertas/confeccion/${ofertaId}`);
  const result = await response.json();
  const oferta = result.data;

  // Determinar tipo de contacto
  if (oferta.cliente_numero) {
    setTipoContacto('cliente');
    setClienteNumero(oferta.cliente_numero);
  } else if (oferta.lead_id) {
    setTipoContacto('lead');
    setLeadId(oferta.lead_id);
  } else if (oferta.nombre_lead_sin_agregar) {
    setTipoContacto('nuevo');
    setNombreLeadSinAgregar(oferta.nombre_lead_sin_agregar);
  }

  // Cargar otros campos...
  setTipoOferta(oferta.tipo_oferta);
  setAlmacenId(oferta.almacen_id);
  setItems(oferta.items);
  // ...
};
```

#### 2.2 Actualizar Oferta (Cambio de Contacto)

```jsx
const actualizarOferta = async () => {
  const updateData = {
    // Campos que cambiaron...
    items: items,
    precio_final: precioFinal,
    // ...
  };

  // IMPORTANTE: Solo enviar el campo de contacto activo
  // El backend limpiará automáticamente los otros
  if (tipoOferta === 'personalizada') {
    if (tipoContacto === 'cliente') {
      updateData.cliente_numero = clienteNumero;
      // No es necesario enviar lead_id: null, el backend lo hace
    } else if (tipoContacto === 'lead') {
      updateData.lead_id = leadId;
      // No es necesario enviar cliente_numero: null, el backend lo hace
    } else if (tipoContacto === 'nuevo') {
      updateData.nombre_lead_sin_agregar = nombreLeadSinAgregar;
      // No es necesario enviar los otros en null, el backend lo hace
    }
  }

  try {
    const response = await fetch(`/ofertas/confeccion/${ofertaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error actualizando oferta');
    }

    const result = await response.json();
    console.log('Oferta actualizada:', result.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

#### 2.3 Permitir Cambio de Tipo de Contacto

```jsx
// El usuario puede cambiar el tipo de contacto al editar
<FormControl>
  <FormLabel>Cambiar Tipo de Contacto</FormLabel>
  <RadioGroup value={tipoContacto} onChange={(e) => {
    const nuevoTipo = e.target.value;
    setTipoContacto(nuevoTipo);
    
    // Limpiar campos anteriores (opcional, el backend lo hace)
    if (nuevoTipo === 'cliente') {
      setLeadId(null);
      setNombreLeadSinAgregar('');
    } else if (nuevoTipo === 'lead') {
      setClienteNumero(null);
      setNombreLeadSinAgregar('');
    } else if (nuevoTipo === 'nuevo') {
      setClienteNumero(null);
      setLeadId(null);
    }
  }}>
    <Radio value="cliente">Cliente Existente</Radio>
    <Radio value="lead">Lead Existente</Radio>
    <Radio value="nuevo">Persona Nueva</Radio>
  </RadioGroup>
</FormControl>
```

---

### 3. Listado de Ofertas

#### 3.1 Mostrar Información de Contacto

**Respuesta del API:**
```json
{
  "ofertas": [
    {
      "id": "OF123",
      "numero_oferta": "OF-20260130-001",
      "tipo_oferta": "personalizada",
      "contacto_tipo": "cliente",
      "contacto_nombre": "Juan Pérez",
      "cliente_nombre": "Juan Pérez",  // Solo si es cliente
      "precio_final": 5000
    },
    {
      "id": "OF124",
      "numero_oferta": "OF-20260130-002",
      "tipo_oferta": "personalizada",
      "contacto_tipo": "lead",
      "contacto_nombre": "María García",
      "lead_nombre": "María García",  // Solo si es lead
      "precio_final": 3500
    },
    {
      "id": "OF125",
      "numero_oferta": "OF-20260130-003",
      "tipo_oferta": "personalizada",
      "contacto_tipo": "lead_sin_agregar",
      "contacto_nombre": "Pedro López",
      "precio_final": 4200
    }
  ]
}
```

**Componente de Tabla:**
```jsx
<Table>
  <Thead>
    <Tr>
      <Th>Número</Th>
      <Th>Tipo</Th>
      <Th>Contacto</Th>
      <Th>Precio</Th>
      <Th>Acciones</Th>
    </Tr>
  </Thead>
  <Tbody>
    {ofertas.map(oferta => (
      <Tr key={oferta.id}>
        <Td>{oferta.numero_oferta}</Td>
        <Td>
          <Badge colorScheme={oferta.tipo_oferta === 'generica' ? 'gray' : 'blue'}>
            {oferta.tipo_oferta === 'generica' ? 'Genérica' : 'Personalizada'}
          </Badge>
        </Td>
        <Td>
          {oferta.contacto_nombre ? (
            <VStack align="start" spacing={0}>
              <Text fontWeight="bold">{oferta.contacto_nombre}</Text>
              <Text fontSize="xs" color="gray.500">
                {oferta.contacto_tipo === 'cliente' && '👤 Cliente'}
                {oferta.contacto_tipo === 'lead' && '🎯 Lead'}
                {oferta.contacto_tipo === 'lead_sin_agregar' && '📝 Nuevo'}
              </Text>
            </VStack>
          ) : (
            <Text color="gray.400">Sin contacto</Text>
          )}
        </Td>
        <Td>${oferta.precio_final.toFixed(2)}</Td>
        <Td>
          <Button size="sm" onClick={() => verOferta(oferta.id)}>Ver</Button>
        </Td>
      </Tr>
    ))}
  </Tbody>
</Table>
```

---

### 4. Vista de Detalle de Oferta

#### 4.1 Mostrar Información Completa del Contacto

**Respuesta del API:**
```json
{
  "id": "OF123",
  "numero_oferta": "OF-20260130-001",
  "tipo_oferta": "personalizada",
  "cliente_numero": "CLI-2024-001",
  "lead_id": null,
  "nombre_lead_sin_agregar": null,
  
  // Información expandida del contacto
  "cliente": {
    "numero": "CLI-2024-001",
    "nombre": "Juan Pérez",
    "telefono": "+53 5555-1234",
    "direccion": "Calle 23 #456, La Habana"
  },
  
  // O si es lead:
  "lead": {
    "id": "507f1f77bcf86cd799439011",
    "nombre": "María García",
    "telefono": "+53 5555-5678",
    "estado": "Interesado",
    "direccion": "Ave 5ta #789",
    "provincia_montaje": "La Habana",
    "municipio": "Plaza"
  },
  
  // O si es lead sin agregar:
  "lead_sin_agregar": {
    "nombre": "Pedro López"
  }
}
```

**Componente de Detalle:**
```jsx
const DetalleOferta = ({ oferta }) => {
  const renderContacto = () => {
    if (oferta.cliente) {
      return (
        <Box>
          <Heading size="sm" mb={2}>Cliente</Heading>
          <VStack align="start" spacing={1}>
            <Text><strong>Nombre:</strong> {oferta.cliente.nombre}</Text>
            <Text><strong>Número:</strong> {oferta.cliente.numero}</Text>
            <Text><strong>Teléfono:</strong> {oferta.cliente.telefono}</Text>
            <Text><strong>Dirección:</strong> {oferta.cliente.direccion}</Text>
          </VStack>
        </Box>
      );
    }

    if (oferta.lead) {
      return (
        <Box>
          <Heading size="sm" mb={2}>Lead</Heading>
          <VStack align="start" spacing={1}>
            <Text><strong>Nombre:</strong> {oferta.lead.nombre}</Text>
            <Text><strong>Teléfono:</strong> {oferta.lead.telefono}</Text>
            <Text><strong>Estado:</strong> {oferta.lead.estado}</Text>
            <Text><strong>Dirección:</strong> {oferta.lead.direccion}</Text>
            <Text><strong>Provincia:</strong> {oferta.lead.provincia_montaje}</Text>
            <Text><strong>Municipio:</strong> {oferta.lead.municipio}</Text>
          </VStack>
        </Box>
      );
    }

    if (oferta.lead_sin_agregar) {
      return (
        <Box>
          <Heading size="sm" mb={2}>Persona Nueva</Heading>
          <Text><strong>Nombre:</strong> {oferta.lead_sin_agregar.nombre}</Text>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Esta persona aún no está registrada en el sistema
          </Text>
        </Box>
      );
    }

    return <Text color="gray.400">Sin contacto asociado</Text>;
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Oferta {oferta.numero_oferta}</Heading>
      
      <SimpleGrid columns={2} spacing={4}>
        <Box>
          <Heading size="sm" mb={2}>Información General</Heading>
          <Text><strong>Tipo:</strong> {oferta.tipo_oferta}</Text>
          <Text><strong>Estado:</strong> {oferta.estado}</Text>
          <Text><strong>Precio:</strong> ${oferta.precio_final}</Text>
        </Box>

        {oferta.tipo_oferta === 'personalizada' && (
          <Box>
            {renderContacto()}
          </Box>
        )}
      </SimpleGrid>

      {/* Resto de la información de la oferta */}
    </Box>
  );
};
```

---

### 5. Componente LeadSelector (Nuevo)

Necesitas crear un componente similar a `ClienteSelector` pero para leads:

```jsx
import { useState, useEffect } from 'react';
import { Select, Spinner, Text } from '@chakra-ui/react';

const LeadSelector = ({ value, onChange, placeholder = "Seleccionar lead..." }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarLeads();
  }, []);

  const cargarLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/leads/');
      const result = await response.json();
      
      // Filtrar solo leads activos o interesados
      const leadsActivos = result.filter(lead => 
        ['Interesado', 'En Negociación', 'Pendiente de Instalación'].includes(lead.estado)
      );
      
      setLeads(leadsActivos);
    } catch (err) {
      setError('Error cargando leads');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner size="sm" />;
  }

  if (error) {
    return <Text color="red.500">{error}</Text>;
  }

  return (
    <Select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder={placeholder}
    >
      {leads.map(lead => (
        <option key={lead.id} value={lead.id}>
          {lead.nombre} - {lead.telefono} ({lead.estado})
        </option>
      ))}
    </Select>
  );
};

export default LeadSelector;
```

---

### 6. Filtros en Listado

Agregar filtro por tipo de contacto:

```jsx
const [filtroTipoContacto, setFiltroTipoContacto] = useState('todos');

const ofertasFiltradas = ofertas.filter(oferta => {
  if (filtroTipoContacto === 'todos') return true;
  return oferta.contacto_tipo === filtroTipoContacto;
});

// En el UI
<Select value={filtroTipoContacto} onChange={(e) => setFiltroTipoContacto(e.target.value)}>
  <option value="todos">Todos los contactos</option>
  <option value="cliente">Solo Clientes</option>
  <option value="lead">Solo Leads</option>
  <option value="lead_sin_agregar">Solo Nuevos</option>
</Select>
```

---

## 🎨 Recomendaciones de UX

### 1. Iconos para Tipos de Contacto
```jsx
const ContactoIcon = ({ tipo }) => {
  const icons = {
    cliente: '👤',
    lead: '🎯',
    lead_sin_agregar: '📝'
  };
  return <span>{icons[tipo] || '❓'}</span>;
};
```

### 2. Colores para Badges
```jsx
const ContactoBadge = ({ tipo, nombre }) => {
  const colorScheme = {
    cliente: 'green',
    lead: 'blue',
    lead_sin_agregar: 'orange'
  };

  const label = {
    cliente: 'Cliente',
    lead: 'Lead',
    lead_sin_agregar: 'Nuevo'
  };

  return (
    <Badge colorScheme={colorScheme[tipo]}>
      {label[tipo]}: {nombre}
    </Badge>
  );
};
```

### 3. Tooltip Informativo
```jsx
<Tooltip label="Esta persona aún no está registrada como cliente o lead">
  <Badge colorScheme="orange">Nuevo: {nombre}</Badge>
</Tooltip>
```

---

## ⚠️ Manejo de Errores

### Errores Comunes del Backend

```jsx
const manejarError = (error) => {
  const mensajes = {
    'VALIDACION_CONTACTO': 'Debe seleccionar solo un tipo de contacto',
    'CLIENTE_NO_ENCONTRADO': 'El cliente seleccionado no existe',
    'LEAD_NO_ENCONTRADO': 'El lead seleccionado no existe',
    'STOCK_INSUFICIENTE': 'No hay suficiente stock para los materiales seleccionados'
  };

  // Extraer código de error si viene en el formato del backend
  const errorCode = error.error || 'ERROR_DESCONOCIDO';
  const mensaje = mensajes[errorCode] || error.message || 'Error desconocido';

  toast({
    title: 'Error',
    description: mensaje,
    status: 'error',
    duration: 5000,
    isClosable: true
  });
};
```

---

## 📝 Checklist de Implementación

### Crear Oferta
- [ ] Agregar selector de tipo de contacto (radio buttons)
- [ ] Agregar `LeadSelector` component
- [ ] Agregar input para "Persona Nueva"
- [ ] Actualizar lógica de envío de datos
- [ ] Agregar validaciones
- [ ] Manejar errores del backend

### Editar Oferta
- [ ] Cargar tipo de contacto actual
- [ ] Permitir cambio de tipo de contacto
- [ ] Actualizar lógica de envío (solo campo activo)
- [ ] Manejar errores del backend

### Listado
- [ ] Mostrar `contacto_tipo` y `contacto_nombre`
- [ ] Agregar iconos/badges por tipo
- [ ] Agregar filtro por tipo de contacto

### Detalle
- [ ] Mostrar información completa según tipo
- [ ] Diferenciar visualmente cada tipo
- [ ] Agregar tooltips informativos

### Componentes Nuevos
- [ ] Crear `LeadSelector`
- [ ] Crear `ContactoIcon`
- [ ] Crear `ContactoBadge`

---

## 🚀 Ejemplo Completo: Formulario de Crear Oferta

```jsx
import { useState } from 'react';
import {
  Box, FormControl, FormLabel, RadioGroup, Radio,
  Input, Button, VStack, useToast
} from '@chakra-ui/react';
import ClienteSelector from './ClienteSelector';
import LeadSelector from './LeadSelector';

const CrearOfertaForm = () => {
  const toast = useToast();
  
  // Estado
  const [tipoOferta, setTipoOferta] = useState('personalizada');
  const [tipoContacto, setTipoContacto] = useState('cliente');
  const [clienteNumero, setClienteNumero] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const [nombreLeadSinAgregar, setNombreLeadSinAgregar] = useState('');
  const [almacenId, setAlmacenId] = useState('');
  const [items, setItems] = useState([]);
  // ... otros campos

  const crearOferta = async () => {
    // Validar
    if (tipoOferta === 'personalizada') {
      const tieneContacto = 
        (tipoContacto === 'cliente' && clienteNumero) ||
        (tipoContacto === 'lead' && leadId) ||
        (tipoContacto === 'nuevo' && nombreLeadSinAgregar.trim());

      if (!tieneContacto) {
        toast({
          title: 'Error',
          description: 'Debe seleccionar o ingresar un contacto',
          status: 'error'
        });
        return;
      }
    }

    // Preparar datos
    const ofertaData = {
      tipo_oferta: tipoOferta,
      almacen_id: almacenId,
      items: items,
      // ... otros campos
    };

    // Agregar contacto según tipo
    if (tipoOferta === 'personalizada') {
      if (tipoContacto === 'cliente') {
        ofertaData.cliente_numero = clienteNumero;
      } else if (tipoContacto === 'lead') {
        ofertaData.lead_id = leadId;
      } else if (tipoContacto === 'nuevo') {
        ofertaData.nombre_lead_sin_agregar = nombreLeadSinAgregar;
      }
    }

    // Enviar
    try {
      const response = await fetch('/ofertas/confeccion/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ofertaData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail);
      }

      const result = await response.json();
      
      toast({
        title: 'Éxito',
        description: 'Oferta creada correctamente',
        status: 'success'
      });

      // Redirigir o limpiar formulario
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error'
      });
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Tipo de Oferta */}
      <FormControl>
        <FormLabel>Tipo de Oferta</FormLabel>
        <RadioGroup value={tipoOferta} onChange={setTipoOferta}>
          <Radio value="generica">Genérica</Radio>
          <Radio value="personalizada">Personalizada</Radio>
        </RadioGroup>
      </FormControl>

      {/* Tipo de Contacto (solo si es personalizada) */}
      {tipoOferta === 'personalizada' && (
        <>
          <FormControl>
            <FormLabel>Tipo de Contacto</FormLabel>
            <RadioGroup value={tipoContacto} onChange={setTipoContacto}>
              <VStack align="start">
                <Radio value="cliente">Cliente Existente</Radio>
                <Radio value="lead">Lead Existente</Radio>
                <Radio value="nuevo">Persona Nueva (sin agregar)</Radio>
              </VStack>
            </RadioGroup>
          </FormControl>

          {/* Selector según tipo */}
          {tipoContacto === 'cliente' && (
            <FormControl>
              <FormLabel>Cliente</FormLabel>
              <ClienteSelector 
                value={clienteNumero}
                onChange={setClienteNumero}
              />
            </FormControl>
          )}

          {tipoContacto === 'lead' && (
            <FormControl>
              <FormLabel>Lead</FormLabel>
              <LeadSelector 
                value={leadId}
                onChange={setLeadId}
              />
            </FormControl>
          )}

          {tipoContacto === 'nuevo' && (
            <FormControl>
              <FormLabel>Nombre de la Persona</FormLabel>
              <Input
                placeholder="Ej: Juan Pérez"
                value={nombreLeadSinAgregar}
                onChange={(e) => setNombreLeadSinAgregar(e.target.value)}
              />
            </FormControl>
          )}
        </>
      )}

      {/* Resto del formulario... */}

      <Button colorScheme="blue" onClick={crearOferta}>
        Crear Oferta
      </Button>
    </VStack>
  );
};

export default CrearOfertaForm;
```

---

## 📚 Recursos Adicionales

- **Documentación Backend:** `docs/BACKEND_CONFECCION_OFERTAS_SPEC.md`
- **Cambios Implementados:** `CAMBIOS_CONFECCION_OFERTAS_LEADS.md`
- **Cambio de Contacto:** `CAMBIO_CONTACTO_EDITAR_OFERTA.md`

---

¡Listo! Con estos cambios el frontend estará completamente integrado con el nuevo sistema de contactos múltiples. 🚀

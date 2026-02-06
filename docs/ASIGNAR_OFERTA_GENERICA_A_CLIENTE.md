# Asignar Oferta Genérica a Cliente

## Descripción

Este endpoint permite duplicar una oferta genérica aprobada y asignarla automáticamente a un cliente específico. Es útil cuando tienes ofertas genéricas pre-configuradas que quieres asignar rápidamente a clientes desde la tabla de gestión de clientes.

## Endpoint

```
POST /api/ofertas-confeccion/asignar-a-cliente
```

## Autenticación

Requiere token JWT en el header:
```
Authorization: Bearer {token}
```

## Request Body

```json
{
  "oferta_generica_id": "string",
  "cliente_numero": "string"
}
```

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `oferta_generica_id` | string | Sí | ID de la oferta genérica aprobada a duplicar |
| `cliente_numero` | string | Sí | Número del cliente al que se asignará la oferta |

## Response

### Success (200)

```json
{
  "success": true,
  "message": "Oferta genérica duplicada y asignada exitosamente a {nombre_cliente}",
  "oferta_original_id": "6789abcd1234567890abcdef",
  "oferta_nueva_id": "1234567890abcdef12345678",
  "oferta_nueva": {
    "id": "1234567890abcdef12345678",
    "numero_oferta": "OF-20250205-042",
    "nombre_automatico": "I-2x5kW, B-4x5.12kWh, P-12x590W",
    "nombre_completo": "Oferta de 2x 5.0kW Inversor Felicity Solar, 4x 5.12kWh Batería Felicity Solar y 12x 590W Paneles Evo Solar",
    "tipo_oferta": "personalizada",
    "cliente_numero": "CL-20250205-001",
    "estado": "en_revision",
    "materiales_reservados": false,
    "items": [...],
    "precio_final": 15000.0,
    "fecha_creacion": "2025-02-05T10:30:00Z",
    "notas": "Oferta duplicada de OF-20250205-001 y asignada a cliente Juan Pérez"
  },
  "cliente_numero": "CL-20250205-001",
  "cliente_nombre": "Juan Pérez"
}
```

### Error (400) - Validación

```json
{
  "detail": "La oferta {id} no es de tipo genérica"
}
```

```json
{
  "detail": "La oferta {id} no está aprobada para enviar. Estado actual: en_revision"
}
```

```json
{
  "detail": "Cliente {numero} no encontrado"
}
```

### Error (404)

```json
{
  "detail": "Oferta genérica {id} no encontrada"
}
```

## Flujo de Operación

1. **Validación de Oferta Genérica**
   - Verifica que la oferta existe
   - Verifica que es de tipo "genérica"
   - Verifica que está en estado "aprobada_para_enviar"

2. **Validación de Cliente**
   - Verifica que el cliente existe en el sistema

3. **Duplicación de Oferta**
   - Copia todos los datos de la oferta genérica
   - Cambia el tipo a "personalizada"
   - Asigna el `cliente_numero`
   - Limpia campos de lead (lead_id, nombre_lead_sin_agregar)

4. **Generación de Nueva Oferta**
   - Genera un nuevo número de oferta único
   - Establece estado inicial como "en_revision"
   - Resetea el estado de reserva (materiales_reservados = false)
   - Establece fechas de creación y actualización

5. **Creación de Nueva Oferta**
   - Genera un nuevo número de oferta único
   - Establece estado inicial como "en_revision"
   - Resetea el estado de reserva (materiales_reservados = false)
   - Establece fechas de creación y actualización
   - Agrega nota indicando que es una oferta duplicada

## Características Importantes

### ✅ Lo que SE duplica:
- Todos los items (materiales)
- Secciones personalizadas
- Elementos personalizados
- Componentes principales
- Nombres (automático y completo)
- Márgenes comerciales
- Descuentos
- Costos de transportación
- Configuración de pago (contribución, moneda, etc.)
- Foto de portada
- Almacén

### ❌ Lo que NO se duplica:
- ID de la oferta (se genera nuevo)
- Número de oferta (se genera nuevo)
- Estado de reserva de materiales
- Fechas (se establecen nuevas)
- Reserva ID

### 🔄 Lo que se modifica:
- `tipo_oferta`: Cambia de "generica" a "personalizada"
- `cliente_numero`: Se asigna el cliente especificado
- `lead_id`: Se limpia (null)
- `nombre_lead_sin_agregar`: Se limpia (null)
- `estado`: Se establece como "en_revision"
- `materiales_reservados`: Se establece como false
- `notas`: Se agrega nota de duplicación

## Casos de Uso

### 1. Desde Tabla de Clientes

En el frontend, en la tabla de gestión de clientes, cada fila tiene un botón "Asignar Oferta". Al hacer clic:

```javascript
// Frontend - Ejemplo de uso
async function asignarOfertaACliente(clienteNumero, ofertaGenericaId) {
  try {
    const response = await fetch('/api/ofertas-confeccion/asignar-a-cliente', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        oferta_generica_id: ofertaGenericaId,
        cliente_numero: clienteNumero
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Oferta asignada:', data.oferta_nueva_id);
      // Redirigir a la vista de la nueva oferta o mostrar mensaje de éxito
    }
  } catch (error) {
    console.error('Error asignando oferta:', error);
  }
}
```

### 2. Workflow Completo

```
1. Usuario ve lista de clientes
2. Usuario hace clic en "Asignar Oferta" para un cliente
3. Se muestra modal con ofertas genéricas aprobadas
4. Usuario selecciona una oferta genérica
5. Sistema llama al endpoint POST /asignar-a-cliente
6. Sistema duplica la oferta y la asigna al cliente
7. Usuario es redirigido a la nueva oferta para revisión
8. Usuario puede editar la oferta si es necesario
9. Usuario puede reservar materiales cuando esté lista
```

## Validaciones

### Oferta Genérica
- ✅ Debe existir
- ✅ Debe ser de tipo "generica"
- ✅ Debe estar en estado "aprobada_para_enviar"

### Cliente
- ✅ Debe existir en el sistema
- ✅ Debe tener un número válido

### Estado Final
- Nueva oferta en estado "en_revision"
- Sin materiales reservados
- Tipo "personalizada"
- Asignada al cliente especificado

## Notas Importantes

1. **Estado de Reserva**: La nueva oferta NO tendrá materiales reservados automáticamente. Si se desea reservar materiales, debe hacerse manualmente después de la creación.

2. **Estado Inicial**: La nueva oferta se crea en estado "en_revision" para permitir revisión antes de enviarla al cliente.

3. **Número de Oferta**: Se genera un nuevo número único siguiendo el formato `OF-YYYYMMDD-XXX`.

4. **Auditoría**: Se agrega una nota automática indicando que la oferta fue duplicada y de cuál oferta original proviene.

## Ejemplos de Uso

### Ejemplo 1: Asignación Básica

```bash
curl -X POST http://localhost:8000/api/ofertas-confeccion/asignar-a-cliente \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oferta_generica_id": "6789abcd1234567890abcdef",
    "cliente_numero": "CL-20250205-001"
  }'
```

### Ejemplo 2: Con Verificación Previa

```bash
# 1. Listar ofertas genéricas aprobadas
curl -X GET http://localhost:8000/api/ofertas-confeccion/genericas/aprobadas \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Asignar oferta seleccionada
curl -X POST http://localhost:8000/api/ofertas-confeccion/asignar-a-cliente \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oferta_generica_id": "6789abcd1234567890abcdef",
    "cliente_numero": "CL-20250205-001"
  }'

# 3. Verificar la nueva oferta
curl -X GET http://localhost:8000/api/ofertas-confeccion/NUEVA_OFERTA_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Integración con Frontend

### Componente de Tabla de Clientes

```typescript
// ClientesTable.tsx
interface Cliente {
  numero: string;
  nombre: string;
  // ... otros campos
}

function ClientesTable() {
  const [showOfertasModal, setShowOfertasModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  
  const handleAsignarOferta = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setShowOfertasModal(true);
  };
  
  return (
    <>
      <table>
        {/* ... columnas de la tabla ... */}
        <td>
          <button onClick={() => handleAsignarOferta(cliente)}>
            Asignar Oferta
          </button>
        </td>
      </table>
      
      {showOfertasModal && (
        <OfertasGenericasModal
          cliente={clienteSeleccionado}
          onClose={() => setShowOfertasModal(false)}
          onAsignar={handleOfertaAsignada}
        />
      )}
    </>
  );
}
```

### Modal de Selección de Ofertas

```typescript
// OfertasGenericasModal.tsx
interface Props {
  cliente: Cliente;
  onClose: () => void;
  onAsignar: (ofertaNuevaId: string) => void;
}

function OfertasGenericasModal({ cliente, onClose, onAsignar }: Props) {
  const [ofertas, setOfertas] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Cargar ofertas genéricas aprobadas
    fetch('/api/ofertas-confeccion/genericas/aprobadas')
      .then(res => res.json())
      .then(data => setOfertas(data.ofertas));
  }, []);
  
  const handleSeleccionar = async (ofertaId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/ofertas-confeccion/asignar-a-cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oferta_generica_id: ofertaId,
          cliente_numero: cliente.numero
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Oferta asignada a ${cliente.nombre}`);
        onAsignar(data.oferta_nueva_id);
        onClose();
      }
    } catch (error) {
      toast.error('Error asignando oferta');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal>
      <h2>Seleccionar Oferta para {cliente.nombre}</h2>
      <div className="ofertas-list">
        {ofertas.map(oferta => (
          <div key={oferta.id} className="oferta-card">
            <h3>{oferta.nombre_automatico}</h3>
            <p>{oferta.nombre_completo}</p>
            <p>Precio: ${oferta.precio_final}</p>
            <button 
              onClick={() => handleSeleccionar(oferta.id)}
              disabled={loading}
            >
              Asignar
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
```

## Troubleshooting

### Error: "La oferta no está aprobada para enviar"

**Causa**: La oferta genérica seleccionada no está en estado "aprobada_para_enviar".

**Solución**: 
1. Verificar el estado de la oferta genérica
2. Cambiar el estado a "aprobada_para_enviar" si es apropiado
3. Usar el endpoint PATCH /ofertas-confeccion/{id}/estado

### Error: "Cliente no encontrado"

**Causa**: El número de cliente proporcionado no existe en la base de datos.

**Solución**:
1. Verificar que el número de cliente es correcto
2. Verificar que el cliente existe en la colección de clientes
3. Usar el endpoint GET /api/clientes para listar clientes

### Error: "La oferta no es de tipo genérica"

**Causa**: Se intentó duplicar una oferta que no es genérica.

**Solución**:
1. Verificar que el ID corresponde a una oferta genérica
2. Usar el endpoint GET /ofertas-confeccion/genericas/aprobadas para obtener ofertas válidas

## Ver También

- [Documentación de Ofertas de Confección](./BACKEND_CONFECCION_OFERTAS_SPEC.md)
- [API de Ofertas Personalizadas](./API_OFERTAS_PERSONALIZADAS.md)
- [Gestión de Clientes](./CLIENTES.md)

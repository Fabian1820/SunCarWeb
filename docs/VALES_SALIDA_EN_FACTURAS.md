# Integración de Vales de Salida en Facturas de Instaladora

## Descripción General

Esta funcionalidad permite agregar vales de salida existentes a las facturas de instaladora de dos maneras:

1. **Manual**: Crear vales manualmente agregando items uno por uno (funcionalidad existente)
2. **Desde Vales de Salida**: Seleccionar vales de salida ya creados que cumplan ciertos criterios

## Criterios para Vales de Salida Disponibles

Un vale de salida puede ser agregado a una factura si cumple con:

1. ✅ La solicitud asociada está en estado `"facturado"`
2. ✅ El vale pertenece al cliente de la factura
3. ✅ El campo `facturado` del vale es `false` (no ha sido agregado a otra factura)
4. ✅ El vale no está anulado (`estado != "anulado"`)

## Estructura de Datos

### Vale de Salida (Backend)

```typescript
interface ValeSalida {
  id: string;
  codigo?: string;
  estado?: "usado" | "anulado" | string;
  facturado?: boolean; // Indica si ya fue agregado a una factura
  solicitud_material?: ValeSolicitudInfo | null;
  solicitud_venta?: ValeSolicitudInfo | null;
  materiales: ValeSalidaMaterialItemDetalle[];
  fecha_creacion?: string;
  // ... otros campos
}
```

### Vale en Factura (Frontend)

Cuando se agrega un vale de salida a una factura, se usa directamente el ID del vale de salida:

```typescript
interface Vale {
  id?: string; // ID del vale de salida (cuando proviene de un vale de salida)
  fecha: string; // fecha_creacion del vale de salida
  items: ItemVale[];
}

interface ItemVale {
  material_id: string;
  codigo: string;
  descripcion: string;
  precio: number;
  cantidad: number;
}
```

**Importante**: El `id` del vale en la factura ES el `id` del vale de salida. Esto permite:
- Mantener la trazabilidad sin campos adicionales
- Evitar duplicados (el backend puede verificar si ese ID ya existe en otra factura)
- No requiere cambios en el modelo de base de datos

## Flujo de Usuario

### 1. Agregar Vale a Factura

1. Usuario hace clic en "Agregar Vale" en una factura existente
2. Se muestra un diálogo con dos opciones:
   - **Crear Vale Manual**: Formulario tradicional para agregar items manualmente
   - **Desde Vales de Salida**: Seleccionar vales existentes (solo si la factura tiene cliente asignado)

### 2. Seleccionar Vales de Salida

1. Se abre el diálogo `SeleccionarValesSalidaDialog`
2. Se cargan los vales disponibles del cliente que cumplan los criterios
3. Usuario puede seleccionar uno o múltiples vales usando checkboxes
4. Al confirmar, los vales seleccionados se agregan a la factura

### 3. Conversión de Datos

Cada vale de salida seleccionado se convierte a un vale de factura usando el ID del vale de salida:

```typescript
const valeParaFactura: Vale = {
  id: valeSalida.id, // Usar el ID del vale de salida
  fecha: valeSalida.fecha_creacion,
  items: valeSalida.materiales.map(material => ({
    material_id: material.material_id,
    codigo: material.material_codigo || material.codigo,
    descripcion: material.material_descripcion || material.descripcion,
    precio: material.material?.precio || 0,
    cantidad: material.cantidad,
  })),
};
```

## Componentes Creados

### `SeleccionarValesSalidaDialog`

**Ubicación**: `components/feats/facturas/seleccionar-vales-salida-dialog.tsx`

**Props**:
- `open: boolean` - Controla la visibilidad del diálogo
- `onOpenChange: (open: boolean) => void` - Callback para cambiar visibilidad
- `clienteId: string | null` - ID del cliente de la factura
- `onValesSeleccionados: (vales: ValeSalida[]) => void` - Callback con vales seleccionados

**Funcionalidades**:
- Carga vales disponibles del cliente
- Muestra información resumida de cada vale (código, fecha, materiales, total)
- Permite selección múltiple con checkboxes
- Calcula y muestra el total de cada vale
- Valida que haya al menos un vale seleccionado antes de confirmar

## Modificaciones en Componentes Existentes

### `FacturasSection`

**Archivo**: `components/feats/facturas/facturas-section.tsx`

**Cambios**:

1. **Nuevo estado**:
```typescript
const [seleccionarValesSalidaDialogOpen, setSeleccionarValesSalidaDialogOpen] = useState(false);
```

2. **Nueva función**:
```typescript
const handleValesSalidaSeleccionados = async (vales: ValeSalida[]) => {
  // Convierte y agrega cada vale de salida a la factura
}
```

3. **Diálogo de agregar vale actualizado**:
   - Ahora muestra dos botones: "Crear Vale Manual" y "Desde Vales de Salida"
   - El botón "Desde Vales de Salida" está deshabilitado si la factura no tiene cliente

4. **Nuevo diálogo**:
```tsx
<SeleccionarValesSalidaDialog
  open={seleccionarValesSalidaDialogOpen}
  onOpenChange={setSeleccionarValesSalidaDialogOpen}
  clienteId={facturaForVale?.cliente_id || null}
  onValesSeleccionados={handleValesSalidaSeleccionados}
/>
```

## Cambios Requeridos en el Backend

### 1. Campo `facturado` en Vales de Salida

✅ **YA EXISTE** - El campo `facturado` (booleano) ya está implementado en el modelo `ValeSalida` del backend.

### 2. Actualizar Campo `facturado` al Agregar a Factura

⚠️ **IMPORTANTE**: El frontend envía el ID del vale de salida en el campo `id` del vale (NO en un campo separado `vale_salida_id`).

Cuando se agrega un vale de salida a una factura, el backend debe:

1. **Detectar** que el vale proviene de un vale de salida (campo `id` presente)
2. **Validar** que el vale no esté ya facturado (`facturado == false`)
3. **Validar** que no esté anulado (`estado != "anulado"`)
4. **Validar** que pertenezca al cliente de la factura
5. **Marcar** el vale como facturado (`facturado = true`)
6. **Guardar** la referencia del vale de salida en el vale de la factura

**Endpoint de Facturas**: `POST /api/facturas/{factura_id}/vales`

**Datos recibidos del frontend**:
```json
{
  "id": "vale_salida_abc123",  // ← ID del vale de salida
  "fecha": "2024-03-17T10:30:00Z",
  "items": [...]
}
```

**Lógica requerida**:
```python
@router.post("/{factura_id}/vales")
async def agregar_vale_a_factura(factura_id: str, vale_data: dict):
    # Detectar si el vale proviene de un vale de salida
    vale_salida_id = vale_data.get("id")
    
    if vale_salida_id:
        # Este vale proviene de un vale de salida
        vale_salida = await obtener_vale_salida(vale_salida_id)
        
        # Validaciones
        if vale_salida.facturado:
            raise HTTPException(400, "Este vale ya fue agregado a otra factura")
        
        if vale_salida.estado == "anulado":
            raise HTTPException(400, "No se puede agregar un vale anulado")
        
        # Verificar que pertenezca al cliente
        factura = await obtener_factura(factura_id)
        solicitud = vale_salida.solicitud_material or vale_salida.solicitud_venta
        cliente_vale = solicitud.cliente or solicitud.cliente_venta
        
        if cliente_vale.numero != factura.cliente_id:
            raise HTTPException(400, "El vale no pertenece al cliente de la factura")
        
        # ✅ MARCAR COMO FACTURADO
        await actualizar_vale_salida(vale_salida_id, {"facturado": True})
        
        # Agregar vale a factura con referencia
        nuevo_vale = {
            "id": generar_id_unico(),
            "vale_salida_id": vale_salida_id,  # ← Guardar referencia
            "fecha": vale_data.get("fecha"),
            "items": vale_data.get("items", [])
        }
        
        await agregar_vale_a_factura_db(factura_id, nuevo_vale)
    else:
        # Vale manual (sin vale de salida)
        nuevo_vale = {
            "id": generar_id_unico(),
            "vale_salida_id": None,
            "fecha": vale_data.get("fecha"),
            "items": vale_data.get("items", [])
        }
        
        await agregar_vale_a_factura_db(factura_id, nuevo_vale)
    
    return {"message": "Vale agregado correctamente"}
```

**Ver documentación completa**: `docs/BACKEND_VALES_SALIDA_EN_FACTURAS.md`

### 3. Endpoint para Obtener Vales Disponibles (Opcional pero Recomendado)

Crear un endpoint específico para obtener vales disponibles para facturar:

**Endpoint**: `GET /api/operaciones/vales-salida/disponibles-para-factura`

```python
@router.get("/disponibles-para-factura")
async def obtener_vales_disponibles_para_factura(
    cliente_id: str,
):
    """
    Retorna vales de salida que pueden ser agregados a una factura:
    - Pertenecen al cliente especificado
    - Solicitud en estado "facturado"
    - facturado = False
    - estado != "anulado"
    """
    vales = db.vales_salida.find({
        "facturado": False,
        "estado": {"$ne": "anulado"},
        "$or": [
            {"solicitud_material.cliente.id": cliente_id},
            {"solicitud_venta.cliente_venta.id": cliente_id}
        ]
    })
    
    # Filtrar por estado de solicitud
    vales_filtrados = [
        vale for vale in vales
        if (vale.solicitud_material and vale.solicitud_material.estado == "facturado") or
           (vale.solicitud_venta and vale.solicitud_venta.estado == "facturado")
    ]
    
    return vales_filtrados
```

### 4. Desmarcar Vale al Eliminar de Factura

Si se elimina un vale de una factura que proviene de un vale de salida, debe desmarcarse el campo `facturado`:

**Endpoint**: `DELETE /api/facturas/{factura_id}/vales/{vale_id}`

```python
@router.delete("/{factura_id}/vales/{vale_id}")
async def eliminar_vale_de_factura(factura_id: str, vale_id: str):
    # Obtener el vale de la factura
    factura = await obtener_factura(factura_id)
    vale = next((v for v in factura.vales if v.id == vale_id), None)
    
    if not vale:
        raise HTTPException(404, "Vale no encontrado")
    
    # Si el vale tiene vale_salida_id, desmarcar como facturado
    if vale.vale_salida_id:
        await actualizar_vale_salida(vale.vale_salida_id, {"facturado": False})
    
    # Eliminar el vale de la factura
    await eliminar_vale_de_factura_db(factura_id, vale_id)
    
    return {"message": "Vale eliminado correctamente"}
```

**Ver documentación completa**: `docs/BACKEND_VALES_SALIDA_EN_FACTURAS.md`

## Formato de Datos en Factura

Cuando se guarda una factura con vales de salida, el formato en el backend es:

```json
{
  "numero_factura": "F-2024-001",
  "tipo": "instaladora",
  "cliente_id": "cliente_123",
  "vales": [
    {
      "id": "vale_salida_abc123", // ID del vale de salida original
      "fecha": "2024-03-17T10:30:00Z",
      "items": [
        {
          "material_id": "mat_123",
          "codigo": "INV-001",
          "descripcion": "Inversor 10kW",
          "precio": 1500.00,
          "cantidad": 1
        }
      ]
    }
  ]
}
```

**Nota**: El `id` del vale en la factura es el mismo `id` del vale de salida. Esto permite al backend:
- Verificar si ese vale ya fue agregado a otra factura
- Marcar el campo `facturado = true` en el vale de salida
- Mantener la trazabilidad sin campos adicionales

## Validaciones

### Frontend

1. ✅ Solo mostrar opción "Desde Vales de Salida" si la factura tiene cliente asignado
2. ✅ Validar que se seleccione al menos un vale antes de confirmar
3. ✅ Mostrar mensaje si no hay vales disponibles

### Backend (Recomendado)

1. ✅ Validar que el vale no esté ya facturado antes de agregarlo
2. ✅ Validar que el vale pertenezca al cliente de la factura
3. ✅ Validar que la solicitud esté en estado "facturado"
4. ✅ Marcar automáticamente el vale como facturado al agregarlo

## Casos de Uso

### Caso 1: Factura con Cliente Asignado

1. Usuario crea factura para cliente "ABC Corp"
2. Usuario hace clic en "Agregar Vale"
3. Selecciona "Desde Vales de Salida"
4. Sistema muestra 3 vales disponibles del cliente
5. Usuario selecciona 2 vales
6. Sistema agrega ambos vales a la factura
7. Backend marca los vales como facturados

### Caso 2: Factura sin Cliente (Brigada)

1. Usuario crea factura tipo "brigada" sin cliente
2. Usuario hace clic en "Agregar Vale"
3. Opción "Desde Vales de Salida" está deshabilitada
4. Usuario solo puede crear vales manualmente

### Caso 3: No Hay Vales Disponibles

1. Usuario selecciona "Desde Vales de Salida"
2. Sistema no encuentra vales que cumplan los criterios
3. Se muestra mensaje: "No hay vales de salida disponibles para este cliente"

## Beneficios

1. ✅ **Eficiencia**: Evita duplicar datos manualmente
2. ✅ **Precisión**: Usa datos exactos de los vales de salida
3. ✅ **Trazabilidad**: Mantiene referencia al vale de salida original
4. ✅ **Control**: Evita facturar el mismo vale múltiples veces
5. ✅ **Flexibilidad**: Permite ambos métodos (manual y automático)

## Próximos Pasos

1. ✅ Implementar campo `facturado` en el modelo de backend
2. ✅ Crear endpoint para obtener vales disponibles
3. ✅ Implementar lógica para marcar vales como facturados
4. ✅ Agregar validaciones en el backend
5. ✅ Probar flujo completo end-to-end
6. ✅ Documentar en API docs del backend

## Notas Técnicas

- El componente usa `ValeSalidaService.getVales()` para obtener vales
- Actualmente filtra en el frontend, pero se recomienda agregar filtro por cliente en el backend
- El campo `facturado` debe agregarse al modelo de backend para evitar duplicados
- La conversión de datos preserva toda la información necesaria para la factura

# ✅ Implementación: Eliminar Oferta Confeccionada

## 📋 Resumen

Se implementó la funcionalidad completa para eliminar ofertas confeccionadas desde el frontend, siguiendo la documentación del backend.

## 🔧 Cambios Realizados

### 1. Hook `use-ofertas-confeccion.ts`

**Ya existía la función `eliminarOferta`:**

```typescript
const eliminarOferta = useCallback(async (id: string) => {
  try {
    await apiRequest(`/ofertas/confeccion/${id}`, { method: 'DELETE' })

    toast({
      title: 'Oferta eliminada',
      description: 'La oferta se eliminó correctamente',
    })

    await fetchOfertas()
  } catch (error: any) {
    console.error('Error deleting oferta:', error)
    toast({
      title: 'Error',
      description: error.message || 'No se pudo eliminar la oferta',
      variant: 'destructive',
    })
  }
}, [toast, fetchOfertas])
```

**Características:**
- ✅ Hace request DELETE al endpoint correcto
- ✅ Muestra toast de éxito
- ✅ Recarga la lista de ofertas automáticamente
- ✅ Maneja errores y muestra toast de error

---

### 2. Componente `ofertas-confeccionadas-view.tsx`

#### Estados Agregados

```typescript
const [mostrarDialogoEliminar, setMostrarDialogoEliminar] = useState(false)
const [ofertaParaEliminar, setOfertaParaEliminar] = useState<(typeof ofertas)[number] | null>(null)
const [eliminandoOferta, setEliminandoOferta] = useState(false)
```

#### Funciones Agregadas

```typescript
const abrirDialogoEliminar = (oferta: (typeof ofertas)[number]) => {
  setOfertaParaEliminar(oferta)
  setMostrarDialogoEliminar(true)
}

const confirmarEliminar = async () => {
  if (!ofertaParaEliminar) return

  setEliminandoOferta(true)
  try {
    await eliminarOferta(ofertaParaEliminar.id)
    setMostrarDialogoEliminar(false)
    setOfertaParaEliminar(null)
  } catch (error) {
    // El error ya se maneja en el hook
  } finally {
    setEliminandoOferta(false)
  }
}

const cancelarEliminar = () => {
  setMostrarDialogoEliminar(false)
  setOfertaParaEliminar(null)
}
```

#### Botón de Eliminar en la Tarjeta

```tsx
<Button
  variant="outline"
  size="sm"
  className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
  onClick={() => abrirDialogoEliminar(oferta)}
  title="Eliminar oferta"
>
  <Trash2 className="h-3.5 w-3.5" />
</Button>
```

**Características:**
- Color rojo para indicar acción destructiva
- Icono de papelera (Trash2)
- Hover con fondo rojo claro
- Tooltip explicativo

#### Diálogo de Confirmación

```tsx
<Dialog open={mostrarDialogoEliminar} onOpenChange={setMostrarDialogoEliminar}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2 text-red-600">
        <Trash2 className="h-5 w-5" />
        ¿Eliminar oferta?
      </DialogTitle>
      <DialogDescription className="pt-4 space-y-3">
        {/* Información de la oferta */}
        {/* Advertencia si está reservada */}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={cancelarEliminar}>
        Cancelar
      </Button>
      <Button variant="destructive" onClick={confirmarEliminar}>
        Eliminar oferta
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Características:**
- Muestra el nombre y número de la oferta
- Advertencia especial si la oferta está en estado "Reservada"
- Botón de cancelar
- Botón de confirmar con estado de carga
- Deshabilita botones durante la eliminación

---

## 🎨 Vista del Botón en la Tarjeta

### Antes
```
┌─────────────────────────────────┐
│ [Exportar] [✏️] [Ver detalle]   │
└─────────────────────────────────┘
```

### Después
```
┌─────────────────────────────────────────┐
│ [Exportar] [✏️] [🗑️] [Ver detalle]      │
└─────────────────────────────────────────┘
           ↑ Nuevo botón de eliminar
```

---

## 🎨 Diálogo de Confirmación

```
┌─────────────────────────────────────────┐
│ 🗑️ ¿Eliminar oferta?                    │
│                                         │
│ Estás a punto de eliminar la oferta:   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Oferta Solar Residencial            │ │
│ │ OFF-2024-001                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Esta acción no se puede deshacer.      │
│ La oferta será eliminada y se limpiará │
│ la referencia en el cliente o lead.    │
│                                         │
│ ⚠️ Advertencia: Esta oferta tiene      │
│ estado "Reservada". Verifica que no    │
│ tenga materiales reservados.           │
│                                         │
│           [Cancelar] [Eliminar oferta] │
└─────────────────────────────────────────┘
```

---

## 🔄 Flujo de Eliminación

```
1. Usuario hace clic en botón 🗑️
   ↓
2. Se abre diálogo de confirmación
   ↓
3. Usuario confirma eliminación
   ↓
4. Se muestra estado de carga
   ↓
5. Se hace request DELETE al backend
   ↓
6. Backend elimina la oferta
   ↓
7. Backend limpia referencia en cliente/lead
   ↓
8. Frontend muestra toast de éxito
   ↓
9. Frontend recarga lista de ofertas
   ↓
10. Diálogo se cierra automáticamente
```

---

## ⚠️ Manejo de Errores

### Error: Oferta con Materiales Reservados

**Backend responde:**
```json
{
  "detail": "No se puede eliminar una oferta con materiales reservados"
}
```

**Frontend muestra:**
```
❌ Error
No se puede eliminar una oferta con materiales reservados
```

### Error: Oferta No Encontrada

**Backend responde:**
```json
{
  "detail": "Oferta no encontrada"
}
```

**Frontend muestra:**
```
❌ Error
No se pudo eliminar la oferta
```

---

## ✅ Validaciones

### Frontend
- ✅ Requiere confirmación antes de eliminar
- ✅ Muestra advertencia si la oferta está reservada
- ✅ Deshabilita botones durante la eliminación
- ✅ Muestra estado de carga

### Backend (según documentación)
- ✅ No permite eliminar si tiene materiales reservados
- ✅ Limpia automáticamente la referencia en cliente/lead
- ✅ Elimina la oferta de la base de datos

---

## 🎯 Casos de Uso

### Caso 1: Eliminar Oferta Sin Reservas

**Pasos:**
1. Usuario hace clic en botón 🗑️
2. Se muestra diálogo de confirmación
3. Usuario confirma
4. Oferta se elimina exitosamente
5. Lista se actualiza automáticamente

**Resultado:** ✅ Éxito

---

### Caso 2: Eliminar Oferta con Reservas

**Pasos:**
1. Usuario hace clic en botón 🗑️
2. Se muestra diálogo de confirmación con advertencia
3. Usuario confirma
4. Backend rechaza la eliminación
5. Se muestra error

**Resultado:** ❌ Error (esperado)

**Mensaje:**
```
No se puede eliminar una oferta con materiales reservados
```

---

### Caso 3: Cancelar Eliminación

**Pasos:**
1. Usuario hace clic en botón 🗑️
2. Se muestra diálogo de confirmación
3. Usuario hace clic en "Cancelar"
4. Diálogo se cierra
5. No se elimina nada

**Resultado:** ✅ Cancelado correctamente

---

## 🧪 Testing

### Checklist de Pruebas

- [ ] El botón de eliminar aparece en todas las tarjetas
- [ ] El botón tiene color rojo y icono de papelera
- [ ] Al hacer clic se abre el diálogo de confirmación
- [ ] El diálogo muestra el nombre de la oferta
- [ ] El diálogo muestra advertencia si está reservada
- [ ] El botón "Cancelar" cierra el diálogo sin eliminar
- [ ] El botón "Eliminar" muestra estado de carga
- [ ] Se muestra toast de éxito al eliminar
- [ ] La lista se actualiza automáticamente
- [ ] Se muestra error si tiene materiales reservados
- [ ] Los botones se deshabilitan durante la eliminación

---

## 📝 Imports Agregados

```typescript
import { Trash2 } from "lucide-react"
import { DialogFooter } from "@/components/shared/molecule/dialog"
```

---

## 🎨 Estilos Aplicados

### Botón de Eliminar
```css
className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
```

### Título del Diálogo
```css
className="flex items-center gap-2 text-red-600"
```

### Botón de Confirmar
```css
variant="destructive"
className="bg-red-600 hover:bg-red-700"
```

---

## 📊 Comparación: Antes vs Después

### Antes
- ❌ No había forma de eliminar ofertas desde el frontend
- ❌ Había que eliminar manualmente desde la base de datos
- ❌ No había confirmación de eliminación

### Después
- ✅ Botón de eliminar visible en cada tarjeta
- ✅ Diálogo de confirmación con información clara
- ✅ Advertencia si la oferta está reservada
- ✅ Manejo de errores completo
- ✅ Actualización automática de la lista
- ✅ Feedback visual con toasts

---

## 🚀 Próximos Pasos (Opcionales)

### Mejoras Posibles

1. **Verificación de Reservas en el Frontend**
   - Deshabilitar botón si tiene materiales reservados
   - Mostrar tooltip explicativo

2. **Permisos por Rol**
   - Solo admin y gerente pueden eliminar
   - Ocultar botón para otros roles

3. **Confirmación Adicional**
   - Requerir escribir "ELIMINAR" para confirmar
   - Para ofertas con alto valor

4. **Historial de Eliminaciones**
   - Registrar quién eliminó qué y cuándo
   - Para auditoría

5. **Soft Delete**
   - Marcar como eliminada en lugar de borrar
   - Permitir recuperación

---

## 📚 Referencias

- **Documentación backend:** `docs/FRONTEND_ELIMINAR_OFERTA_CONFECCIONADA.md`
- **Hook modificado:** `hooks/use-ofertas-confeccion.ts`
- **Componente modificado:** `components/feats/ofertas/ofertas-confeccionadas-view.tsx`
- **Endpoint:** `DELETE /ofertas/confeccion/{oferta_id}`

---

**Fecha de implementación:** 30 de enero de 2026  
**Estado:** ✅ Completado  
**Probado:** ⏳ Pendiente de pruebas funcionales

# ✅ Feature: Eliminar Instalador

## Descripción

Se agregó la funcionalidad para eliminar instaladores desde la tabla de "Gestión de Instaladores".

---

## Cambios Implementados

### 1. Botón de Eliminar en la Tabla

Se agregó un botón rojo con ícono de papelera (🗑️) en cada fila de la tabla, tanto en vista móvil como en escritorio.

**Ubicación**: 
- Vista móvil: En la fila de botones de acciones
- Vista escritorio: En la columna "Acciones"

**Estilo**:
- Color: Rojo (`border-red-300 text-red-700 hover:bg-red-50`)
- Ícono: `Trash2` de lucide-react

---

### 2. Diálogo de Confirmación

Antes de eliminar, se muestra un diálogo de confirmación con:

- **Título**: "Confirmar eliminación de instalador"
- **Mensaje**: Muestra el nombre y CI del instalador a eliminar
- **Advertencia**: Texto en rojo indicando que la acción es permanente
- **Botones**:
  - Cancelar (outline)
  - Eliminar instalador (destructive/rojo)

---

### 3. Función handleDelete

```typescript
const handleDelete = async (worker: Trabajador) => {
  setIsDeleting(true)
  try {
    await TrabajadorService.eliminarTrabajador(worker.CI)
    toast({
      title: "Instalador eliminado",
      description: `El instalador ${worker.nombre} ha sido eliminado correctamente.`,
    })
    onRefresh()
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "No se pudo eliminar el instalador",
      variant: "destructive",
    })
  } finally {
    setIsDeleting(false)
    setConfirmDelete(null)
  }
}
```

---

## Endpoint Utilizado

### DELETE /api/trabajadores/{ci}

**Descripción**: Elimina completamente un trabajador del sistema.

**Request**:
```
DELETE /api/trabajadores/12345678
```

**Response exitosa**:
```json
{
  "success": true,
  "message": "Trabajador con CI 12345678 eliminado exitosamente."
}
```

**Response error**:
```json
{
  "detail": "Trabajador con CI 12345678 no encontrado."
}
```

---

## Flujo de Usuario

1. Usuario hace clic en el botón de eliminar (🗑️) en la tabla
2. Se abre un diálogo de confirmación
3. Usuario confirma la eliminación
4. Se llama al endpoint `DELETE /api/trabajadores/{ci}`
5. Se muestra un toast de éxito o error
6. Se refresca la tabla automáticamente

---

## Estados de la UI

### Estado Normal
- Botón de eliminar visible y habilitado

### Estado Eliminando
- Botón deshabilitado
- Texto cambia a "Eliminando..."
- No se puede cerrar el diálogo

### Estado Éxito
- Toast verde con mensaje de éxito
- Diálogo se cierra automáticamente
- Tabla se refresca y el instalador desaparece

### Estado Error
- Toast rojo con mensaje de error
- Diálogo permanece abierto
- Usuario puede reintentar o cancelar

---

## Consideraciones de Seguridad

1. **Confirmación obligatoria**: No se puede eliminar sin confirmar
2. **Advertencia clara**: Se indica que la acción es permanente
3. **Información visible**: Se muestra nombre y CI del instalador
4. **Feedback inmediato**: Toast confirma el resultado de la operación

---

## Archivos Modificados

### components/feats/worker/trabajadores-table.tsx

**Estados agregados**:
```typescript
const [confirmDelete, setConfirmDelete] = useState<Trabajador | null>(null)
const [isDeleting, setIsDeleting] = useState(false)
```

**Función agregada**:
- `handleDelete(worker: Trabajador)`

**UI agregada**:
- Botón de eliminar en vista móvil
- Botón de eliminar en vista escritorio
- Diálogo de confirmación de eliminación

---

## Testing Manual

### Caso 1: Eliminar instalador exitosamente
1. Ir a "Gestión de Instaladores"
2. Click en botón de eliminar (🗑️) de cualquier instalador
3. Confirmar en el diálogo
4. Verificar toast de éxito
5. Verificar que el instalador desaparece de la tabla

### Caso 2: Cancelar eliminación
1. Ir a "Gestión de Instaladores"
2. Click en botón de eliminar (🗑️)
3. Click en "Cancelar" en el diálogo
4. Verificar que el diálogo se cierra
5. Verificar que el instalador sigue en la tabla

### Caso 3: Error al eliminar
1. Desconectar el backend
2. Intentar eliminar un instalador
3. Verificar toast de error
4. Verificar que el diálogo permanece abierto

---

## Notas Importantes

- La eliminación es **permanente** y no se puede deshacer
- Se elimina el trabajador de la base de datos completamente
- Si el trabajador está en una brigada, también se elimina de ella
- El endpoint del backend ya existe y funciona correctamente

---

**Fecha**: Enero 2026  
**Estado**: ✅ Implementado  
**Módulo**: Gestión de Instaladores

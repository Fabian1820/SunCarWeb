# Duplicar Oferta - Nueva Ruta

## Cambio Implementado

Se ha modificado la funcionalidad de duplicar ofertas para que en lugar de abrir un diálogo modal, navegue a una nueva página dedicada.

## Ruta Nueva

- **URL**: `/ofertas-gestion/duplicar?id={ofertaId}`
- **Archivo**: `app/ofertas-gestion/duplicar/page.tsx`

## Flujo de Usuario

1. Usuario está en "Ver Ofertas Confeccionadas" (`/ofertas-gestion/ver-ofertas-confeccionadas`)
2. Usuario hace clic en el botón de duplicar (icono de copiar) en una tarjeta de oferta
3. La aplicación navega a `/ofertas-gestion/duplicar?id={ofertaId}`
4. Se carga la oferta original y se muestra el formulario de confección con los datos precargados
5. Usuario puede modificar los datos y guardar la nueva oferta
6. Al guardar exitosamente, se redirige a "Ver Ofertas Confeccionadas" con refresh automático

## Ventajas

- **Mejor UX**: El usuario tiene toda la pantalla para trabajar en la duplicación
- **Navegación clara**: Se puede usar el botón "Volver" del navegador
- **URL compartible**: Se puede compartir el enlace directo para duplicar una oferta específica
- **Menos complejidad**: No hay que manejar el estado del diálogo modal

## Archivos Modificados

### `components/feats/ofertas/ofertas-confeccionadas-view.tsx`

- Eliminado import de `DuplicarOfertaDialog`
- Agregado import de `useRouter` de Next.js
- Eliminado estado `mostrarDialogoDuplicar` y `ofertaParaDuplicar`
- Reemplazada función `abrirDuplicar` por `irADuplicar` que navega a la nueva ruta
- Eliminado el componente `<DuplicarOfertaDialog>` del render

### `app/ofertas-gestion/duplicar/page.tsx` (NUEVO)

- Nueva página que recibe el ID de la oferta por query parameter
- Carga la oferta desde el hook `useOfertasConfeccion`
- Muestra el componente `ConfeccionOfertasView` en modo duplicación
- Incluye botón "Volver" para regresar a la lista de ofertas
- Redirige automáticamente si no se encuentra la oferta

## Componente Obsoleto

El archivo `components/feats/ofertas/duplicar-oferta-dialog.tsx` ya no se utiliza y puede ser eliminado en el futuro si no hay otras referencias.

## Notas Técnicas

- La página de duplicación usa el mismo componente `ConfeccionOfertasView` que se usa para crear y editar ofertas
- El parámetro `ofertaParaDuplicar` se pasa al componente para precargar los datos
- El parámetro `modoEdicion={false}` indica que es una nueva oferta (duplicación)
- Al guardar exitosamente, se agrega `?refresh=true` a la URL de destino para forzar la recarga de la lista

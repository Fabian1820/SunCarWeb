# Guardado Automático de Recibos y Cierre de Caja

## Descripción General

El sistema ahora guarda automáticamente tanto los recibos de venta como el cierre de caja en una carpeta que el usuario selecciona al abrir la sesión de caja.

## Flujo de Trabajo

### 1. Apertura de Caja

Cuando el usuario abre una sesión de caja:

1. **Ingresa el efectivo de apertura** y notas opcionales
2. **Click en "Abrir caja registradora"**
3. **Aparece automáticamente el diálogo de selección de carpeta**

### 2. Selección de Carpeta

El usuario tiene dos opciones:

#### Opción A: Seleccionar Carpeta (Recomendado)
- Click en "Seleccionar carpeta"
- El navegador abre el selector de carpetas del sistema
- El usuario navega y selecciona la carpeta deseada
- El navegador solicita permisos para escribir en esa carpeta
- Click en "Permitir" o "Continuar"
- ✅ Carpeta configurada

**Ventajas:**
- Los recibos se guardan automáticamente sin interrupciones
- El cierre de caja se guarda automáticamente
- No hay ventanas emergentes de descarga
- Los archivos están organizados en una carpeta específica

#### Opción B: Omitir Selección
- Click en "Omitir"
- Los archivos se descargarán en la carpeta de descargas predeterminada
- Cada descarga mostrará una ventana emergente

### 3. Durante la Sesión

#### Recibos de Venta
Cuando se completa una venta:
- ✅ **Con carpeta seleccionada**: El recibo se guarda automáticamente
- ⚠️ **Sin carpeta**: El recibo se descarga en la carpeta de descargas

#### Cierre de Caja
Cuando se cierra la sesión:
- ✅ **Con carpeta seleccionada**: El cierre se guarda automáticamente
- ⚠️ **Sin carpeta**: El cierre se descarga en la carpeta de descargas

## Archivos Generados

### Recibos de Venta

**Nombre del archivo:**
```
recibo_[numero-orden]_[fecha]_[hora].pdf
```

**Ejemplo:**
```
recibo_20260121-001_20260121_143045.pdf
```

**Contenido:**
- Información de la tienda
- Número de orden y fecha
- Datos del cliente (si aplica)
- Lista de productos
- Totales (subtotal, impuestos, descuentos)
- Método de pago y detalles

### Cierre de Caja

**Nombre del archivo:**
```
cierre_caja_[numero-sesion]_[fecha]_[hora].pdf
```

**Ejemplo:**
```
cierre_caja_20260121-001_20260121_183045.pdf
```

**Contenido:**
- Información de la tienda
- Número de sesión y fecha de cierre
- Resumen de ventas (cantidad de órdenes y total)
- **Efectivo:**
  - Apertura
  - Pagos en efectivo
  - Entradas/Salidas
  - Esperado
  - Contado
  - Diferencia
- **Tarjeta:** Total
- **Transferencia:** Total
- **Total General**
- Notas de cierre (si hay)

## Formato del PDF de Cierre de Caja

El PDF del cierre de caja tiene el siguiente formato:

```
┌─────────────────────────────────┐
│      SUNCAR BOLIVIA             │
│      CIERRE DE CAJA             │
├─────────────────────────────────┤
│ Sesión: 20260121-001            │
│ Fecha: 21/01/2026               │
│ Hora: 18:30                     │
├─────────────────────────────────┤
│    RESUMEN DE VENTAS            │
│ Órdenes procesadas: 13          │
│ Total ventas: 2590.28 $         │
├─────────────────────────────────┤
│ EFECTIVO                        │
│   Apertura:          400.00 $   │
│   Pagos en Efectivo: 2590.28 $  │
│   Entradas/Salidas:  100.00 $   │
│   Esperado:          3090.28 $  │
│   Contado:           3090.28 $  │
│ ─────────────────────────────── │
│   Diferencia:        0.00 $     │
├─────────────────────────────────┤
│ TARJETA                         │
│   Total:             0.00 $     │
├─────────────────────────────────┤
│ TRANSFERENCIA                   │
│   Total:             0.00 $     │
├─────────────────────────────────┤
│ TOTAL GENERAL:       2590.28 $  │
├─────────────────────────────────┤
│ NOTAS:                          │
│ [Notas de cierre si hay]        │
├─────────────────────────────────┤
│ Cierre de caja registradora     │
│ Conserve este documento         │
└─────────────────────────────────┘
```

## Compatibilidad de Navegadores

### Navegadores con Guardado Automático (File System Access API)

✅ **Chrome 86+**
✅ **Edge 86+**
✅ **Opera 72+**

Estos navegadores soportan la selección de carpeta y guardado automático.

### Navegadores con Descarga Tradicional

⚠️ **Firefox**
⚠️ **Safari**
⚠️ **Navegadores móviles**

En estos navegadores, los archivos se descargarán en la carpeta de descargas predeterminada.

## Permisos

### Primera Vez
Cuando seleccionas una carpeta por primera vez, el navegador solicitará permisos:

```
[Nombre del sitio] quiere guardar cambios en archivos en [Carpeta]
[Bloquear] [Permitir]
```

Click en **"Permitir"** para habilitar el guardado automático.

### Sesiones Posteriores
Los permisos se mantienen durante la sesión del navegador. Si cierras el navegador, deberás volver a seleccionar la carpeta la próxima vez que abras una sesión de caja.

### Revocar Permisos
Puedes revocar los permisos desde la configuración del navegador:
- Chrome: Configuración > Privacidad y seguridad > Configuración de sitios > Permisos adicionales > Sistema de archivos

## Ventajas del Sistema

### Para el Usuario
1. **Sin interrupciones**: No hay ventanas emergentes de descarga
2. **Organización**: Todos los archivos en una carpeta específica
3. **Automático**: No hay que hacer click en "Guardar" cada vez
4. **Rápido**: Los archivos se guardan instantáneamente
5. **Confiable**: No se pierden archivos en la carpeta de descargas

### Para el Negocio
1. **Auditoría**: Todos los recibos y cierres en un solo lugar
2. **Respaldo**: Fácil de respaldar una sola carpeta
3. **Búsqueda**: Nombres de archivo descriptivos y únicos
4. **Profesional**: Sistema organizado y eficiente

## Casos de Uso

### Caso 1: Tienda con Computadora Dedicada
```
1. Seleccionar carpeta: C:\Recibos\Tienda_Centro\2026\Enero
2. Todos los recibos y cierres se guardan ahí automáticamente
3. Al final del día, respaldar la carpeta
```

### Caso 2: Tienda con Múltiples Turnos
```
1. Turno mañana: Seleccionar C:\Recibos\Turno_Mañana
2. Turno tarde: Seleccionar C:\Recibos\Turno_Tarde
3. Cada turno tiene sus archivos separados
```

### Caso 3: Tienda con Respaldo en Red
```
1. Seleccionar carpeta en red: \\Servidor\Recibos\Tienda_1
2. Los archivos se guardan directamente en el servidor
3. Accesibles desde cualquier computadora
```

## Solución de Problemas

### Problema: No aparece el diálogo de selección de carpeta
**Causa:** El navegador no soporta File System Access API
**Solución:** Usar Chrome, Edge u Opera. Los archivos se descargarán normalmente en otros navegadores.

### Problema: Error "No tienes permisos para escribir"
**Causa:** La carpeta seleccionada tiene restricciones de escritura
**Solución:** 
1. Seleccionar otra carpeta
2. O dar permisos de escritura a la carpeta desde el sistema operativo

### Problema: Los archivos no se guardan
**Causa:** Los permisos fueron revocados o la sesión del navegador expiró
**Solución:** 
1. Cerrar y volver a abrir la sesión de caja
2. Seleccionar la carpeta nuevamente

### Problema: Quiero cambiar la carpeta
**Solución:**
1. Cerrar la sesión de caja actual
2. Abrir una nueva sesión
3. Seleccionar la nueva carpeta cuando aparezca el diálogo

## Recomendaciones

### Organización de Carpetas
```
Recibos/
├── 2026/
│   ├── Enero/
│   │   ├── recibo_20260121-001_20260121_143045.pdf
│   │   ├── recibo_20260121-002_20260121_150230.pdf
│   │   └── cierre_caja_20260121-001_20260121_183045.pdf
│   ├── Febrero/
│   └── Marzo/
└── 2027/
```

### Respaldo
- Respaldar la carpeta de recibos diariamente
- Usar servicios de nube (Google Drive, Dropbox, OneDrive)
- O respaldar en un disco externo

### Seguridad
- No compartir la carpeta públicamente
- Mantener permisos de escritura solo para usuarios autorizados
- Respaldar regularmente para evitar pérdida de datos

## Flujo Técnico

### 1. Apertura de Caja
```javascript
// Usuario abre la caja
await abrirSesion(efectivoApertura, notaApertura)

// Automáticamente se muestra el diálogo de carpeta
setIsCarpetaDialogOpen(true)
```

### 2. Selección de Carpeta
```javascript
// Usuario selecciona carpeta
const directorio = await window.showDirectoryPicker({
  mode: 'readwrite',
  startIn: 'downloads',
})

// Se guarda la referencia
ReciboService.setDirectorioRecibos(directorio)
```

### 3. Guardado de Recibo
```javascript
// Al completar una venta
if (ReciboService.tieneCarpetaSeleccionada()) {
  await ReciboService.guardarReciboAutomatico({
    orden: resultadoPago.orden,
    nombreTienda: tienda.nombre,
    // ...
  })
} else {
  ReciboService.descargarRecibo({...})
}
```

### 4. Guardado de Cierre
```javascript
// Al cerrar la caja
if (ReciboService.tieneCarpetaSeleccionada()) {
  await ReciboService.guardarCierreCajaAutomatico(
    sesion,
    efectivoCierre,
    tienda.nombre
  )
} else {
  ReciboService.descargarCierreCaja(sesion, efectivoCierre, tienda.nombre)
}
```

## Conclusión

El sistema de guardado automático mejora significativamente la experiencia del usuario al eliminar interrupciones y mantener los archivos organizados. Es especialmente útil para tiendas que procesan muchas ventas diarias y necesitan mantener un registro ordenado de todas las transacciones.

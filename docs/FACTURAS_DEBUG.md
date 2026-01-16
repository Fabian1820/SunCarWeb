# Guía de Diagnóstico - Módulo de Facturas

## Problema Reportado
Error 500 al cargar facturas y estadísticas en el módulo de facturación.

## Errores Observados
```
api.suncarsrl.com/api/facturas?skip=0&limit=100:1 Failed to load resource: the server responded with a status of 500
api.suncarsrl.com/api/facturas/stats?: Failed to load resource: the server responded with a status of 500
```

## Cambios Realizados

### 1. Mejoras en el Hook `use-facturas.ts`
- ✅ Agregado logging detallado para rastrear el flujo de datos
- ✅ Validación de token antes de hacer peticiones
- ✅ Mejor manejo de errores con mensajes descriptivos

### 2. Mejoras en el Servicio `factura-service.ts`
- ✅ Logging de URLs y headers en cada petición
- ✅ Captura y logging de errores del backend
- ✅ Mejor extracción de mensajes de error del servidor

### 3. Mejoras en la UI `facturas-section.tsx`
- ✅ Mensaje de error más descriptivo con instrucciones
- ✅ Indicación visual mejorada para errores

## Pasos para Diagnosticar

### 1. Verificar la Consola del Navegador
Abre las herramientas de desarrollo (F12) y busca:

```
🔄 useFacturas - Token cambió: [Presente/Ausente]
✅ Configurando token en servicio de facturas
🔄 Token nuevo detectado, recargando datos
🔄 Cargando facturas con filtros: {...}
📡 Listando facturas: [URL completa]
🔐 Headers: {...}
📨 Response status: [código]
```

### 2. Verificar el Token de Autenticación
En la consola del navegador, ejecuta:
```javascript
localStorage.getItem('auth_token')
```

Si no hay token o está vacío, necesitas hacer login nuevamente.

### 3. Verificar la URL del Backend
En la consola del navegador, ejecuta:
```javascript
console.log(process.env.NEXT_PUBLIC_BACKEND_URL)
```

Debe coincidir con la URL de tu backend.

### 4. Verificar el Estado del Backend

#### Opción A: Backend Local (localhost)
Si estás usando `http://127.0.0.1:8000`, verifica que:
- El servidor backend esté corriendo
- Puedas acceder a `http://127.0.0.1:8000/docs` (FastAPI docs)

#### Opción B: Backend en Producción (api.suncarsrl.com)
Si estás usando el backend en producción:
- Verifica que `NEXT_PUBLIC_BACKEND_URL` en `.env.local` apunte a `https://api.suncarsrl.com`
- Verifica que el backend esté accesible

### 5. Probar el Endpoint Manualmente

#### Con curl:
```bash
# Reemplaza [TU_TOKEN] con tu token real
curl -H "Authorization: Bearer [TU_TOKEN]" https://api.suncarsrl.com/api/facturas?skip=0&limit=100
```

#### Con el navegador:
1. Abre las herramientas de desarrollo (F12)
2. Ve a la pestaña "Network" / "Red"
3. Recarga la página de facturas
4. Busca la petición a `/api/facturas`
5. Revisa:
   - Request Headers (debe incluir Authorization)
   - Response (debe mostrar el error detallado del servidor)

## Posibles Causas del Error 500

### 1. Token Inválido o Expirado
**Síntoma:** El backend rechaza la petición porque el token no es válido.
**Solución:** Cierra sesión y vuelve a iniciar sesión.

### 2. Error en el Backend
**Síntoma:** El backend tiene un error interno al procesar la petición.
**Solución:** Revisa los logs del backend para ver el error específico.

### 3. Base de Datos
**Síntoma:** El backend no puede conectarse a la base de datos o hay un error en la consulta.
**Solución:** Verifica la conexión a la base de datos en el backend.

### 4. Estructura de Datos Incorrecta
**Síntoma:** Los datos en la base de datos no coinciden con la estructura esperada.
**Solución:** Verifica que las facturas en la base de datos tengan la estructura correcta.

## Estructura de Datos Esperada

### Factura
```typescript
{
  id: string
  numero_factura: string
  tipo: 'instaladora' | 'cliente_directo'
  subtipo?: 'brigada' | 'cliente' | null
  cliente_id?: string | null
  nombre_cliente?: string
  fecha_creacion?: string  // ISO date
  vales: Vale[]
  pagada: boolean
  terminada: boolean
  total?: number
}
```

### Vale
```typescript
{
  id?: string
  fecha: string  // ISO date
  items: ItemVale[]
  total?: number
}
```

### ItemVale
```typescript
{
  material_id: string
  codigo: string
  descripcion: string
  precio: number
  cantidad: number
  subtotal?: number
}
```

## Próximos Pasos

1. **Revisa la consola del navegador** para ver los logs detallados
2. **Verifica el token** de autenticación
3. **Prueba el endpoint manualmente** con curl o Postman
4. **Revisa los logs del backend** para ver el error específico
5. **Verifica la estructura de datos** en la base de datos

## Información Adicional

- El módulo ahora incluye logging extensivo para facilitar el diagnóstico
- Todos los errores se capturan y se muestran en la consola
- La UI muestra mensajes de error más descriptivos

## Contacto

Si el problema persiste después de seguir estos pasos, proporciona:
1. Los logs completos de la consola del navegador
2. El código de estado HTTP exacto
3. El mensaje de error del backend (si está disponible)
4. La configuración de tu `.env.local`

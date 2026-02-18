# Guía Rápida: Resultados por Comercial

## ✅ Estado: Completamente Implementado

El módulo está listo para usar y utiliza el endpoint `/api/ofertas/confeccion/personalizadas-con-pagos` correctamente.

## Acceso Rápido

```
URL: /reportes-comercial/resultados-comercial
```

O navegar desde: `Reportes de Comercial` → `Resultados por Comercial`

## ¿Qué Hace Este Módulo?

Muestra todas las ofertas personalizadas que tienen al menos un pago registrado, organizadas por comercial asignado.

## Información Mostrada

### Tarjetas de Estadísticas
Cada comercial tiene una tarjeta con:
- Número de ofertas cerradas
- Margen total generado

### Tabla Detallada
Cada oferta muestra:
- Comercial asignado
- Número y nombre de la oferta
- Total de materiales
- Margen (% y $)
- Precio final
- Cliente/Lead
- Total pagado
- Fecha del primer pago
- Monto pendiente

## Filtros Disponibles

1. **Búsqueda**: Por oferta, cliente o comercial
2. **Comercial**: Ver solo ofertas de un comercial específico
3. **Mes**: Filtrar por mes del primer pago
4. **Año**: Filtrar por año del primer pago

## Uso del Endpoint

### Request
```typescript
GET /api/ofertas/confeccion/personalizadas-con-pagos
Headers: Authorization: Bearer <token>
```

### Campos Clave Utilizados
```typescript
{
  numero_oferta: string
  nombre_completo: string
  total_materiales: number
  margen_porcentaje: number
  margen_dolares: number
  precio_final: number
  monto_pendiente: number
  total_pagado: number
  fecha_primer_pago: string
  contacto: {
    tipo: string
    nombre: string
    comercial: string | null  // ← Campo principal usado
  }
}
```

## Ejemplo de Uso

### Ver Desempeño de un Comercial

1. Abrir el módulo
2. Seleccionar comercial en el filtro
3. Ver su tarjeta de estadísticas
4. Revisar sus ofertas en la tabla

### Buscar una Oferta Específica

1. Escribir el número de oferta en el buscador
2. Ver el resultado filtrado

### Analizar un Período

1. Seleccionar mes y año
2. Ver ofertas con pagos en ese período
3. Revisar totales en el resumen

## Casos Especiales

### Ofertas sin Comercial
- Se muestran como "Sin asignar"
- Tienen su propia tarjeta de estadísticas

### Pagos Pendientes
- Aparecen en rojo en la columna "Pendiente"
- Fácil identificación visual

## Resumen de Totales

En la parte inferior se muestra:
- Número de ofertas mostradas vs totales
- Total de margen generado
- Total pagado por clientes

## Actualización de Datos

Usar el botón "Actualizar" para recargar los datos más recientes del backend.

## Documentación Completa

Para más detalles, consultar:
- `docs/RESULTADOS_COMERCIAL_IMPLEMENTACION.md` - Detalles técnicos
- `docs/RESULTADOS_COMERCIAL_EJEMPLO_USO.md` - Ejemplos detallados
- `docs/API_OFERTAS_PERSONALIZADAS_CON_PAGOS.md` - Especificación del endpoint
- `docs/RESULTADOS_COMERCIAL_RESUMEN.md` - Resumen técnico

## Notas Importantes

1. Solo muestra ofertas personalizadas (no estándar)
2. Solo muestra ofertas con al menos un pago
3. El comercial es el asignado al cliente/lead
4. Los filtros de mes/año se basan en la fecha del primer pago
5. Todos los cálculos vienen del backend

## Soporte

Si encuentras algún problema:
1. Verificar que el endpoint esté disponible
2. Verificar que el token de autenticación sea válido
3. Revisar la consola del navegador para errores
4. Consultar la documentación técnica

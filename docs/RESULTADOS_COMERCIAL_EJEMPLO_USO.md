# Ejemplo de Uso: Resultados por Comercial

## Descripción

El módulo "Resultados por Comercial" muestra todas las ofertas personalizadas que tienen al menos un pago registrado, agrupadas por comercial asignado.

## Acceso al Módulo

```
URL: /reportes-comercial/resultados-comercial
```

## Ejemplo de Datos Mostrados

### Tarjetas de Estadísticas

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ María González              │  │ Carlos Rodríguez            │
│ Ofertas Cerradas: 8         │  │ Ofertas Cerradas: 5         │
│ Margen Total: $7,358.80     │  │ Margen Total: $5,420.00     │
└─────────────────────────────┘  └─────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ Ana Martínez                │  │ Sin asignar                 │
│ Ofertas Cerradas: 3         │  │ Ofertas Cerradas: 2         │
│ Margen Total: $3,460.00     │  │ Margen Total: $2,310.00     │
└─────────────────────────────┘  └─────────────────────────────┘
```

### Tabla de Ofertas

| Comercial | Oferta | Total Materiales | Margen | Precio Final | Cliente | Pagado | Fecha Pago | Pendiente |
|-----------|--------|------------------|--------|--------------|---------|--------|------------|-----------|
| María González | OF-20240115-001<br>Sistema Solar 5kW | $5,000.00 | 25.5%<br>$1,275.00 | $6,275.00 | Juan Pérez<br>cliente | $4,275.00 | 10 ene 2024 | $2,000.00 |
| María González | OF-20240120-003<br>Instalación Híbrida | $8,500.00 | 22.0%<br>$1,870.00 | $10,370.00 | Ana López<br>lead | $10,370.00 | 20 ene 2024 | $0.00 |
| Carlos Rodríguez | OF-20240125-005<br>Sistema Residencial | $3,200.00 | 28.0%<br>$896.00 | $4,096.00 | Pedro Gómez<br>cliente | $2,000.00 | 25 ene 2024 | $2,096.00 |

### Resumen de Totales

```
Mostrando 18 de 18 ofertas
Total Margen: $25,700.00    Total Pagado: $87,450.00
```

## Casos de Uso Comunes

### 1. Ver Desempeño de un Comercial Específico

**Objetivo**: Ver todas las ofertas cerradas por María González

**Pasos**:
1. Abrir el módulo
2. En el filtro "Comercial", seleccionar "María González"
3. Ver las tarjetas actualizadas con sus estadísticas
4. Revisar la tabla con todas sus ofertas

**Resultado**: 
- Tarjeta muestra: 8 ofertas cerradas, $10,200.00 de margen
- Tabla muestra solo las 8 ofertas de María

### 2. Analizar Resultados de un Mes Específico

**Objetivo**: Ver todas las ofertas con pagos en enero 2024

**Pasos**:
1. Abrir el módulo
2. En el filtro "Mes", seleccionar "Enero"
3. En el filtro "Año", seleccionar "2024"
4. Revisar las estadísticas y ofertas del período

**Resultado**:
- Muestra solo ofertas con primer pago en enero 2024
- Estadísticas actualizadas para ese período

### 3. Buscar una Oferta Específica

**Objetivo**: Encontrar la oferta OF-20240115-001

**Pasos**:
1. Abrir el módulo
2. En el campo de búsqueda, escribir "OF-20240115-001"
3. Ver el resultado filtrado

**Resultado**:
- Muestra solo la oferta buscada
- Mantiene visible el comercial asignado

### 4. Identificar Ofertas con Pagos Pendientes

**Objetivo**: Ver qué ofertas tienen saldo pendiente

**Pasos**:
1. Abrir el módulo
2. Revisar la columna "Pendiente"
3. Las ofertas con saldo pendiente aparecen en rojo

**Resultado**:
- Fácil identificación visual de ofertas con deuda
- Permite hacer seguimiento de cobros

### 5. Comparar Desempeño entre Comerciales

**Objetivo**: Ver qué comercial tiene mejor desempeño

**Pasos**:
1. Abrir el módulo
2. Revisar las tarjetas de estadísticas
3. Comparar número de ofertas y margen total

**Resultado**:
```
María González:    8 ofertas, $10,200.00 margen
Carlos Rodríguez:  5 ofertas, $7,500.00 margen
Ana Martínez:      3 ofertas, $4,800.00 margen
```

## Interpretación de los Datos

### Columnas de la Tabla

1. **Comercial**: Nombre del comercial asignado al cliente/lead
   - "Sin asignar" si no tiene comercial

2. **Oferta**: 
   - Línea 1: Número de oferta (ej: OF-20240115-001)
   - Línea 2: Nombre descriptivo del sistema

3. **Total Materiales**: Costo total de los materiales de la oferta

4. **Margen**:
   - Línea 1: Porcentaje de margen (ej: 25.5%)
   - Línea 2: Margen en dólares (ej: $1,275.00)

5. **Precio Final**: Precio total de la oferta al cliente

6. **Cliente**:
   - Línea 1: Nombre del cliente/lead
   - Línea 2: Tipo (cliente, lead, lead_sin_agregar)

7. **Pagado**: Total pagado por el cliente hasta la fecha

8. **Fecha Pago**: Fecha del primer pago registrado

9. **Pendiente**: Saldo que falta por pagar
   - Rojo: Tiene saldo pendiente
   - Gris: Pagado completamente

### Tarjetas de Estadísticas

Cada tarjeta representa un comercial y muestra:
- **Ofertas Cerradas**: Cantidad de ofertas con al menos un pago
- **Margen Total**: Suma de todos los márgenes de sus ofertas

## Filtros Disponibles

### 1. Búsqueda por Texto
Busca en:
- Número de oferta
- Nombre de la oferta
- Nombre del cliente
- Nombre del comercial

### 2. Filtro por Comercial
- "Todos los comerciales": Muestra todas las ofertas
- Seleccionar comercial específico: Muestra solo sus ofertas

### 3. Filtro por Mes
- "Todos los meses": Sin filtro de mes
- Seleccionar mes: Filtra por mes del primer pago

### 4. Filtro por Año
- "Todos los años": Sin filtro de año
- Seleccionar año: Filtra por año del primer pago

## Ejemplo de Flujo Completo

### Escenario: Revisar desempeño de María en enero 2024

1. **Abrir módulo**: Navegar a `/reportes-comercial/resultados-comercial`

2. **Aplicar filtros**:
   - Comercial: "María González"
   - Mes: "Enero"
   - Año: "2024"

3. **Revisar tarjeta**:
   ```
   María González
   Ofertas Cerradas: 3
   Margen Total: $4,500.00
   ```

4. **Analizar tabla**:
   - Ver las 3 ofertas cerradas en enero
   - Revisar márgenes individuales
   - Identificar pagos pendientes

5. **Revisar resumen**:
   ```
   Mostrando 3 de 18 ofertas
   Total Margen: $4,500.00
   Total Pagado: $15,200.00
   ```

6. **Conclusión**: María cerró 3 ofertas en enero con un margen total de $4,500

## Notas Importantes

1. **Solo Ofertas Personalizadas**: El módulo muestra únicamente ofertas personalizadas (no estándar)

2. **Requiere Pagos**: Solo aparecen ofertas que tienen al menos un pago registrado

3. **Fecha del Primer Pago**: El filtro de mes/año se basa en la fecha del primer pago, no de creación de la oferta

4. **Comercial del Contacto**: El comercial mostrado es el asignado al cliente/lead, no necesariamente quien creó la oferta

5. **Actualización en Tiempo Real**: Usar el botón "Actualizar" para recargar los datos más recientes

## Preguntas Frecuentes

**P: ¿Por qué una oferta no aparece en el módulo?**
R: Puede ser porque:
- No es una oferta personalizada (es estándar)
- No tiene ningún pago registrado
- El cliente/lead no tiene comercial asignado y estás filtrando por comercial

**P: ¿Cómo se calcula el margen?**
R: El margen se calcula en el backend como:
- Margen $ = Precio Final - Total Materiales
- Margen % = (Margen $ / Precio Final) × 100

**P: ¿Qué significa "Sin asignar"?**
R: Indica que el cliente o lead de esa oferta no tiene un comercial asignado en el sistema

**P: ¿Por qué el total pagado es mayor que el precio final?**
R: Puede ocurrir si el cliente pagó de más o si hubo ajustes en el precio después de registrar pagos

**P: ¿Puedo exportar estos datos?**
R: Actualmente no hay función de exportación, pero está en el roadmap de mejoras futuras

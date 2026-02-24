# Compensación y Asumido por Empresa - Frontend Implementado

## ✅ Funcionalidades Implementadas

### 1. Campos en Crear/Editar/Duplicar Ofertas

**Compensación:**
- ✅ Checkbox para activar/desactivar
- ✅ Toggle entre "Monto Fijo" y "% del Precio"
- ✅ Input para monto en USD (modo fijo)
- ✅ Input para porcentaje 0-100% (modo porcentaje)
- ✅ Cálculo automático del monto cuando se usa porcentaje
- ✅ Textarea para justificación (10-500 caracteres)
- ✅ Contador de caracteres
- ✅ Color naranja distintivo

**Asumido por Empresa:**
- ✅ Checkbox para activar/desactivar
- ✅ Toggle entre "Monto Fijo" y "% del Precio"
- ✅ Input para monto en USD (modo fijo)
- ✅ Input para porcentaje 0-100% (modo porcentaje)
- ✅ Cálculo automático del monto cuando se usa porcentaje
- ✅ Textarea para justificación (10-500 caracteres)
- ✅ Contador de caracteres
- ✅ Color azul distintivo

### 2. Cálculo Automático de Monto Pendiente

```typescript
montoPendiente = precioFinal - compensacion - asumidoPorEmpresa
```

- ✅ Se calcula automáticamente
- ✅ No es editable
- ✅ Se muestra en color naranja para diferenciarlo del precio final
- ✅ Fondo naranja claro con borde

### 3. Visualización en Resumen

En el panel derecho se muestra:
```
Precio Final: $10,000.00

- Compensación: $500.00
- Asumido por Empresa: $1,000.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Monto Pendiente: $8,500.00 (en naranja)
```

### 4. Ver Oferta (Diálogo)

Muestra información completa:
- ✅ Precio final
- ✅ Compensación (monto + justificación)
- ✅ Asumido por empresa (monto + justificación)
- ✅ Monto Pendiente Real calculado
- ✅ Formato resumido y claro

### 5. Persistencia de Datos

- ✅ Se guardan en localStorage durante la edición
- ✅ Se envían al backend al guardar
- ✅ Se cargan correctamente al editar una oferta existente
- ✅ Se copian al duplicar una oferta

## 🎨 Diseño de UI

### Toggle Monto/Porcentaje

```
[Monto Fijo] [% del Precio]
     ↓              ↓
  Activo        Inactivo
```

**Modo Monto Fijo:**
```
Monto (USD): [____0.00____]
```

**Modo Porcentaje:**
```
Porcentaje (%): [____25____]
Monto calculado: $2,500.00
```

### Colores

- **Compensación**: Naranja (#f97316)
  - Fondo: `bg-orange-50`
  - Borde: `border-orange-200`
  - Texto: `text-orange-700/900`

- **Asumido por Empresa**: Azul (#3b82f6)
  - Fondo: `bg-blue-50`
  - Borde: `border-blue-200`
  - Texto: `text-blue-700/900`

- **Monto Pendiente**: Naranja destacado
  - Fondo: `bg-orange-50`
  - Borde: `border-orange-200`
  - Texto: `text-orange-900`

## 📊 Ejemplo de Uso

### Caso 1: Compensación por Retraso

1. Usuario marca "Tiene Compensación"
2. Selecciona "% del Precio"
3. Ingresa 5% (de $10,000 = $500)
4. Escribe justificación: "Compensación por retraso de 2 semanas"
5. El monto pendiente se actualiza automáticamente a $9,500

### Caso 2: Descuento VIP

1. Usuario marca "Tiene Monto Asumido por Empresa"
2. Selecciona "Monto Fijo"
3. Ingresa $1,000
4. Escribe justificación: "Descuento VIP aprobado por gerencia"
5. El monto pendiente se actualiza automáticamente a $9,000

### Caso 3: Ambos

1. Compensación: 5% ($500)
2. Asumido: $1,000
3. Monto Pendiente: $10,000 - $500 - $1,000 = $8,500

## 🔄 Sincronización Automática

### Cuando cambia el precio final:
- Si está en modo porcentaje, el monto se recalcula automáticamente
- Si está en modo monto fijo, el monto permanece igual

### Cuando cambia el porcentaje:
- El monto se actualiza en tiempo real
- Se muestra el "Monto calculado" debajo del input

### Cuando cambia el monto manualmente:
- Solo afecta si está en modo "Monto Fijo"
- En modo porcentaje, el monto es de solo lectura (calculado)

## 📝 Validaciones

### Frontend:
- ✅ Justificación mínimo 10 caracteres
- ✅ Justificación máximo 500 caracteres
- ✅ Monto debe ser >= 0
- ✅ Porcentaje debe estar entre 0-100
- ✅ Solo se envía al backend si tiene monto > 0 y justificación válida

### Backend:
- ✅ Valida longitud de justificación (10-500)
- ✅ Valida que monto_usd sea positivo
- ✅ Calcula monto_pendiente automáticamente

## 🗂️ Archivos Modificados

### Frontend:
1. `components/feats/ofertas/confeccion-ofertas-view.tsx`
   - Agregados estados para compensación y asumido
   - Agregados estados para modo (monto/porcentaje)
   - Agregados useEffect para sincronización
   - Agregada UI con toggles
   - Actualizado cálculo de monto pendiente
   - Actualizado envío al backend

2. `components/feats/ofertas/ver-oferta-cliente-dialog.tsx`
   - Agregada visualización de compensación y asumido
   - Agregado cálculo de monto pendiente real

3. `hooks/use-ofertas-confeccion.ts`
   - Agregados tipos para compensacion y asumido_por_empresa
   - Actualizada función normalizeOfertaConfeccion

## 🚀 Próximos Pasos

- ✅ Implementado en frontend
- ✅ Implementado en backend
- ✅ Carga correctamente al editar
- ✅ Se muestra en ver oferta
- ⏳ Agregar vista resumida en tabla de ofertas (opcional)
- ⏳ Agregar filtros por ofertas con compensación/asumido (opcional)

## 💡 Notas Técnicas

### Cálculo de Porcentaje:
```typescript
const montoCalculado = (precioFinal * porcentaje) / 100;
setMonto(Math.round(montoCalculado * 100) / 100); // Redondear a 2 decimales
```

### Payload al Backend:
```typescript
if (tieneCompensacion && montoCompensacion > 0 && justificacion.trim()) {
  ofertaData.compensacion = {
    monto_usd: montoCompensacion,
    justificacion: justificacion.trim()
  };
}
```

### Monto Pendiente:
```typescript
const montoPendiente = Math.max(0, 
  precioFinal - 
  (compensacion?.monto_usd || 0) - 
  (asumido_por_empresa?.monto_usd || 0)
);
```

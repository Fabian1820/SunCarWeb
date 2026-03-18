# Debug: ID de Vale de Salida No Se Envía

## ⚠️ Problema Confirmado

1. ❌ El `id` del vale de salida NO se está enviando al backend
2. ❌ El backend NO está marcando los vales como `facturado = true`

**Causa**: Si el `id` no se envía, el backend no puede identificar que es un vale de salida y por lo tanto no lo marca como facturado.

## 🔍 Logs de Debugging Agregados

He agregado logs detallados en múltiples puntos del código para rastrear el ID del vale:

### 1. Al Cargar Vales del Backend (línea ~390)

```typescript
console.log('📥 Vales cargados del backend:', allVales.map(v => ({
  id: v.id,
  tipo_id: typeof v.id,
  codigo: v.codigo,
  tiene_id: !!v.id
})));
```

**Qué verifica**: Si los vales que vienen del backend tienen el campo `id`.

### 2. Al Filtrar Vales por Cliente (línea ~400)

```typescript
console.log('🔍 Vales filtrados para cliente:', filtered.map(v => ({
  id: v.id,
  tipo_id: typeof v.id,
  codigo: v.codigo,
  tiene_id: !!v.id
})));
```

**Qué verifica**: Si después de filtrar, los vales siguen teniendo el `id`.

### 3. Al Mapear Vale Original (línea ~183)

```typescript
console.log('🔍 mapValeToFacturaVale - Vale original:', {
  id: vale.id,
  tipo_id: typeof vale.id,
  codigo: vale.codigo,
  tiene_id: !!vale.id,
  vale_completo: vale
});
```

**Qué verifica**: El vale original antes de mapearlo.

### 4. Al Crear Vale Resultante (línea ~220)

```typescript
console.log('✅ mapValeToFacturaVale - Vale resultante:', {
  id: valeResultado.id,
  tipo_id: typeof valeResultado.id,
  tiene_id: !!valeResultado.id,
  fecha: valeResultado.fecha,
  items_count: valeResultado.items.length
});
```

**Qué verifica**: El vale después de mapearlo, antes de retornarlo.

### 5. Al Mapear Todos los Vales Seleccionados (línea ~430)

```typescript
console.log('🔄 Vales mapeados:', mappedVales.map(v => ({ 
  id: v.id, 
  fecha: v.fecha, 
  items_count: v.items.length 
})));
```

**Qué verifica**: Todos los vales después de mapearlos.

### 6. Al Enviar la Factura (línea ~470)

```typescript
console.log('📤 Datos de factura a enviar:', JSON.stringify(formData, null, 2));
console.log('📤 Vales con IDs:', formData.vales.map(v => ({ 
  id: v.id, 
  fecha: v.fecha, 
  items_count: v.items.length 
})));
```

**Qué verifica**: Los datos finales que se envían al backend.

## 🧪 Cómo Realizar la Prueba

1. **Abre la consola del navegador** (F12 → pestaña Console)

2. **Limpia la consola** (botón 🚫 o Ctrl+L)

3. **Crea una factura con vales de salida**:
   - Clic en "Nueva Factura"
   - Tipo: **Instaladora**
   - Subtipo: **Cliente**
   - Selecciona un **cliente**
   - Espera a que carguen los vales disponibles
   - **Selecciona uno o más vales** (checkbox)
   - Clic en **"Crear Factura"**

4. **Copia TODOS los logs** que aparecen en la consola

5. **Comparte los logs** para análisis

## 📊 Interpretación de Logs

### Secuencia Esperada (CORRECTA)

```javascript
// 1. Vales cargados del backend
📥 Vales cargados del backend: [
  { id: "65f8a1b2...", tipo_id: "string", codigo: "VS-001", tiene_id: true }
]

// 2. Vales filtrados por cliente
🔍 Vales filtrados para cliente: [
  { id: "65f8a1b2...", tipo_id: "string", codigo: "VS-001", tiene_id: true }
]

// 3. Vale original al mapear
🔍 mapValeToFacturaVale - Vale original: {
  id: "65f8a1b2...",
  tipo_id: "string",
  codigo: "VS-001",
  tiene_id: true
}

// 4. Vale resultante después de mapear
✅ mapValeToFacturaVale - Vale resultante: {
  id: "65f8a1b2...",
  tipo_id: "string",
  tiene_id: true,
  fecha: "2024-03-17T10:30:00Z",
  items_count: 3
}

// 5. Todos los vales mapeados
🔄 Vales mapeados: [
  { id: "65f8a1b2...", fecha: "2024-03-17T10:30:00Z", items_count: 3 }
]

// 6. Datos enviados al backend
📤 Datos de factura a enviar: {
  "vales": [
    {
      "id": "65f8a1b2...",  // ← ID PRESENTE
      "fecha": "2024-03-17T10:30:00Z",
      "items": [...]
    }
  ]
}
```

### Secuencia con Problema (INCORRECTA)

```javascript
// 1. Vales cargados SIN ID
📥 Vales cargados del backend: [
  { id: undefined, tipo_id: "undefined", codigo: "VS-001", tiene_id: false }
  // ❌ PROBLEMA: El backend no está enviando el campo 'id'
]

// O con ID pero se pierde después...

// 2. Vales filtrados SIN ID
🔍 Vales filtrados para cliente: [
  { id: undefined, tipo_id: "undefined", codigo: "VS-001", tiene_id: false }
  // ❌ PROBLEMA: Se perdió el ID al filtrar
]

// 3. Vale original SIN ID
🔍 mapValeToFacturaVale - Vale original: {
  id: undefined,
  tipo_id: "undefined",
  codigo: "VS-001",
  tiene_id: false
  // ❌ PROBLEMA: El vale no tiene ID
}

// 4. Vale resultante SIN ID
✅ mapValeToFacturaVale - Vale resultante: {
  id: undefined,
  tipo_id: "undefined",
  tiene_id: false
  // ❌ PROBLEMA: El vale mapeado no tiene ID
}

// 5. Vales mapeados SIN ID
🔄 Vales mapeados: [
  { id: undefined, fecha: "2024-03-17T10:30:00Z", items_count: 3 }
  // ❌ PROBLEMA: Los vales no tienen ID
]

// 6. Datos enviados SIN ID
📤 Datos de factura a enviar: {
  "vales": [
    {
      // ❌ PROBLEMA: Campo 'id' ausente (undefined se omite en JSON)
      "fecha": "2024-03-17T10:30:00Z",
      "items": [...]
    }
  ]
}
```

## Posibles Causas

### 1. Vale de Salida No Tiene ID

**Verificar**: En el log `🔄 Vales mapeados`, si `id: undefined`, significa que `vale.id` es undefined.

**Solución**: Verificar que los vales de salida cargados desde el backend tienen el campo `id`.

```typescript
// Agregar log al cargar vales disponibles
console.log('📥 Vales disponibles cargados:', valesDisponibles.map(v => ({ 
  id: v.id, 
  codigo: v.codigo 
})));
```

### 2. Función mapValeToFacturaVale No Incluye el ID

**Verificar**: Revisar que la función incluye `id: vale.id` en el return.

**Código actual** (línea ~181):
```typescript
return {
  id: vale.id, // ← Debe estar presente
  fecha: vale.fecha_creacion || new Date().toISOString(),
  items,
};
```

### 3. JSON.stringify Omite Campos Undefined

Si `vale.id` es `undefined`, `JSON.stringify` lo omitirá del JSON.

**Verificar**: En el log `📤 Datos de factura a enviar`, si el campo `id` no aparece en el JSON, significa que es `undefined`.

### 4. Tipo de Dato Incorrecto

**Verificar**: El ID debe ser un string, no un número u otro tipo.

```typescript
// Agregar log en mapValeToFacturaVale
console.log('🔍 Vale original:', { 
  id: vale.id, 
  tipo_id: typeof vale.id,
  codigo: vale.codigo 
});
```

## Solución Temporal: Forzar String

Si el ID existe pero es de tipo incorrecto, puedes forzarlo a string:

```typescript
return {
  id: vale.id ? String(vale.id) : undefined, // Forzar a string
  fecha: vale.fecha_creacion || new Date().toISOString(),
  items,
};
```

## Verificación en el Backend

Si el frontend envía el ID correctamente pero el backend no lo recibe:

1. **Verificar logs del backend** al recibir la solicitud POST
2. **Verificar que el modelo acepta el campo `id` en los vales**
3. **Verificar que no hay validación que elimine el campo**

## Próximos Pasos

1. ✅ Ejecutar la prueba con los logs agregados
2. ✅ Compartir los logs de la consola
3. ✅ Identificar en qué punto el ID se pierde
4. ✅ Aplicar la solución correspondiente

## Logs Adicionales Recomendados

Si necesitas más información, agrega estos logs:

### En la carga de vales disponibles

```typescript
// Después de cargar vales (línea ~370)
console.log('📥 Vales disponibles:', valesDisponibles.map(v => ({
  id: v.id,
  tipo_id: typeof v.id,
  codigo: v.codigo,
  tiene_materiales: v.materiales?.length || 0
})));
```

### En la función mapValeToFacturaVale

```typescript
// Al inicio de la función (línea ~181)
console.log('🔍 Mapeando vale:', {
  vale_id: vale.id,
  tipo_id: typeof vale.id,
  codigo: vale.codigo,
  fecha_creacion: vale.fecha_creacion
});
```

## Contacto

Una vez que tengas los logs de la consola, compártelos para identificar exactamente dónde se pierde el ID.

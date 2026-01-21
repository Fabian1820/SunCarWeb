# Instrucciones para el Frontend - Cierre de Caja

## ✅ Backend Listo

El backend ya está implementado y probado. Todos los endpoints de caja ahora incluyen los campos requeridos:

- `total_entradas`: Suma de movimientos tipo "entrada"
- `total_salidas`: Suma de movimientos tipo "salida"
- `cantidad_ordenes`: Cantidad de órdenes pagadas

## 📡 Endpoints Actualizados

### 1. GET `/caja/tiendas/{tienda_id}/sesion-activa`

Obtiene la sesión activa de una tienda con todos los campos calculados.

**Respuesta:**
```json
{
  "success": true,
  "message": "Sesión activa obtenida",
  "data": {
    "id": "696fc7bacf7de946ba8ed704",
    "tienda_id": "69652e50d497588c86da669e",
    "numero_sesion": "20260120-001",
    "fecha_apertura": "2026-01-20T08:00:00Z",
    "efectivo_apertura": 400.00,
    "total_ventas": 2590.28,
    "total_efectivo": 2590.28,
    "total_tarjeta": 0.00,
    "total_transferencia": 0.00,
    "total_entradas": 100.00,      // ✅ NUEVO
    "total_salidas": 0.00,         // ✅ NUEVO
    "cantidad_ordenes": 13,        // ✅ NUEVO
    "movimientos_efectivo": [...],
    "estado": "abierta"
  }
}
```

### 2. GET `/caja/sesiones/{sesion_id}`

Obtiene una sesión específica con todos los campos calculados.

### 3. GET `/caja/sesiones`

Lista todas las sesiones con todos los campos calculados.

### 4. POST `/caja/sesiones/{sesion_id}/cerrar`

Cierra una sesión y retorna la sesión cerrada con todos los campos.

### 5. POST `/caja/sesiones/{sesion_id}/movimientos-efectivo`

Registra un movimiento de efectivo. Después de registrar, obtén la sesión actualizada para ver los nuevos totales.

## 💰 Cálculo del Efectivo Esperado

El frontend debe calcular el efectivo esperado usando la siguiente fórmula:

```javascript
const efectivoEsperado = 
  sesion.efectivo_apertura + 
  sesion.total_efectivo + 
  sesion.total_entradas - 
  sesion.total_salidas;
```

### Ejemplo:

```javascript
// Datos de la sesión
const sesion = {
  efectivo_apertura: 400.00,
  total_efectivo: 2590.28,
  total_entradas: 100.00,
  total_salidas: 0.00
};

// Cálculo
const efectivoEsperado = 400 + 2590.28 + 100 - 0;
// Resultado: 3090.28
```

## 🔄 Actualización Automática

Los campos se calculan dinámicamente en cada petición, por lo que:

1. **Después de registrar un movimiento de entrada/salida:**
   - Vuelve a obtener la sesión activa
   - Los campos `total_entradas` y `total_salidas` estarán actualizados

2. **Después de pagar una orden:**
   - Vuelve a obtener la sesión activa
   - El campo `cantidad_ordenes` estará actualizado

## 📊 Ejemplo de Flujo Completo

### 1. Abrir Sesión
```javascript
const response = await fetch('/caja/sesiones', {
  method: 'POST',
  body: JSON.stringify({
    tienda_id: 'xxx',
    efectivo_apertura: 400.00,
    nota_apertura: 'Apertura del día'
  })
});

const { data: sesion } = await response.json();
console.log('Sesión abierta:', sesion.numero_sesion);
```

### 2. Registrar Movimiento de Entrada
```javascript
const response = await fetch(`/caja/sesiones/${sesionId}/movimientos-efectivo`, {
  method: 'POST',
  body: JSON.stringify({
    tipo: 'entrada',
    monto: 100.00,
    motivo: 'Fondo adicional'
  })
});

// Obtener sesión actualizada
const sesionResponse = await fetch(`/caja/tiendas/${tiendaId}/sesion-activa`);
const { data: sesionActualizada } = await sesionResponse.json();
console.log('Total entradas:', sesionActualizada.total_entradas); // 100.00
```

### 3. Registrar Movimiento de Salida
```javascript
const response = await fetch(`/caja/sesiones/${sesionId}/movimientos-efectivo`, {
  method: 'POST',
  body: JSON.stringify({
    tipo: 'salida',
    monto: 30.00,
    motivo: 'Compra de insumos'
  })
});

// Obtener sesión actualizada
const sesionResponse = await fetch(`/caja/tiendas/${tiendaId}/sesion-activa`);
const { data: sesionActualizada } = await sesionResponse.json();
console.log('Total salidas:', sesionActualizada.total_salidas); // 30.00
```

### 4. Pagar Orden
```javascript
const response = await fetch(`/caja/ordenes/${ordenId}/pagar`, {
  method: 'POST',
  body: JSON.stringify({
    metodo_pago: 'efectivo',
    pagos: [{
      metodo: 'efectivo',
      monto: 150.00,
      monto_recibido: 200.00
    }],
    almacen_id: 'xxx'
  })
});

// Obtener sesión actualizada
const sesionResponse = await fetch(`/caja/tiendas/${tiendaId}/sesion-activa`);
const { data: sesionActualizada } = await sesionResponse.json();
console.log('Cantidad órdenes:', sesionActualizada.cantidad_ordenes); // Se incrementa
console.log('Total efectivo:', sesionActualizada.total_efectivo); // Se incrementa
```

### 5. Cerrar Sesión
```javascript
// Obtener sesión activa para calcular efectivo esperado
const sesionResponse = await fetch(`/caja/tiendas/${tiendaId}/sesion-activa`);
const { data: sesion } = await sesionResponse.json();

// Calcular efectivo esperado
const efectivoEsperado = 
  sesion.efectivo_apertura + 
  sesion.total_efectivo + 
  sesion.total_entradas - 
  sesion.total_salidas;

console.log('Efectivo esperado:', efectivoEsperado);

// Mostrar diálogo de cierre con:
// - Efectivo esperado
// - Input para efectivo real
// - Diferencia (efectivo_real - efectivo_esperado)

// Cerrar sesión
const response = await fetch(`/caja/sesiones/${sesionId}/cerrar`, {
  method: 'POST',
  body: JSON.stringify({
    efectivo_cierre: 3090.28, // Efectivo real contado
    nota_cierre: 'Cierre del día'
  })
});

const { data: sesionCerrada } = await response.json();
console.log('Sesión cerrada:', sesionCerrada.numero_sesion);
```

## 🎨 Componente de Cierre de Caja (Ejemplo)

```javascript
function CierreCajaDialog({ sesion, onClose, onConfirm }) {
  const [efectivoReal, setEfectivoReal] = useState('');
  
  // Calcular efectivo esperado
  const efectivoEsperado = 
    sesion.efectivo_apertura + 
    sesion.total_efectivo + 
    sesion.total_entradas - 
    sesion.total_salidas;
  
  // Calcular diferencia
  const diferencia = parseFloat(efectivoReal || 0) - efectivoEsperado;
  
  return (
    <Dialog>
      <DialogTitle>Cerrar Caja - {sesion.numero_sesion}</DialogTitle>
      <DialogContent>
        <div>
          <h3>Resumen de Ventas</h3>
          <p>{sesion.cantidad_ordenes} órdenes: ${sesion.total_ventas.toFixed(2)}</p>
          
          <h3>Desglose por Método de Pago</h3>
          <p>Efectivo: ${sesion.total_efectivo.toFixed(2)}</p>
          <p>Tarjeta: ${sesion.total_tarjeta.toFixed(2)}</p>
          <p>Transferencia: ${sesion.total_transferencia.toFixed(2)}</p>
          
          <h3>Movimientos de Efectivo</h3>
          <p>Entradas: ${sesion.total_entradas.toFixed(2)}</p>
          <p>Salidas: ${sesion.total_salidas.toFixed(2)}</p>
          
          <h3>Efectivo Esperado</h3>
          <p>Apertura: ${sesion.efectivo_apertura.toFixed(2)}</p>
          <p>+ Ventas en efectivo: ${sesion.total_efectivo.toFixed(2)}</p>
          <p>+ Entradas: ${sesion.total_entradas.toFixed(2)}</p>
          <p>- Salidas: ${sesion.total_salidas.toFixed(2)}</p>
          <p><strong>= ${efectivoEsperado.toFixed(2)}</strong></p>
          
          <TextField
            label="Efectivo Real"
            type="number"
            value={efectivoReal}
            onChange={(e) => setEfectivoReal(e.target.value)}
            fullWidth
          />
          
          {efectivoReal && (
            <p style={{ color: diferencia === 0 ? 'green' : 'red' }}>
              Diferencia: ${diferencia.toFixed(2)}
              {diferencia > 0 && ' (Sobrante)'}
              {diferencia < 0 && ' (Faltante)'}
            </p>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={() => onConfirm(parseFloat(efectivoReal))}
          disabled={!efectivoReal}
        >
          Cerrar Caja
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

## ✅ Checklist de Implementación

- [ ] Actualizar el componente de cierre de caja para usar los nuevos campos
- [ ] Implementar el cálculo de efectivo esperado
- [ ] Mostrar `cantidad_ordenes` en el resumen
- [ ] Mostrar `total_entradas` y `total_salidas` en el desglose
- [ ] Calcular y mostrar la diferencia entre efectivo real y esperado
- [ ] Actualizar la sesión después de registrar movimientos
- [ ] Probar el flujo completo de apertura, movimientos y cierre

## 🧪 Pruebas

Para probar los cambios:

1. Abrir la consola del navegador (F12)
2. Ir a la pestaña "Network"
3. Realizar una petición a `/caja/tiendas/{tienda_id}/sesion-activa`
4. Verificar que la respuesta incluya:
   - `total_entradas`
   - `total_salidas`
   - `cantidad_ordenes`

## 📞 Soporte

Si encuentras algún problema o los campos no aparecen:

1. Verifica que estés usando la última versión del backend
2. Revisa la consola del navegador para errores
3. Verifica que la respuesta del endpoint incluya los campos
4. Contacta al equipo de backend si los campos no están presentes

## 🎉 ¡Listo!

El backend está completamente implementado y probado. Los campos se calculan automáticamente y siempre estarán actualizados. Solo necesitas actualizar el frontend para usar estos nuevos campos.

# Test: Asignar Oferta Genérica a Cliente

## 🧪 Guía de Prueba Rápida

### Pre-requisitos
1. ✅ Backend corriendo en `http://localhost:8000`
2. ✅ Frontend corriendo
3. ✅ Al menos una oferta genérica con estado "aprobada_para_enviar"
4. ✅ Al menos un cliente en el sistema

---

## 📋 Pasos de Prueba

### 1. Verificar Ofertas Genéricas Aprobadas

**Endpoint de prueba:**
```bash
curl -X GET http://localhost:8000/api/ofertas/confeccion/genericas/aprobadas \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Resultado esperado:**
```json
{
  "ofertas": [
    {
      "id": "...",
      "nombre_automatico": "I-2x5kW, B-4x5.12kWh, P-12x590W",
      "estado": "aprobada_para_enviar",
      "tipo_oferta": "generica",
      "precio_final": 15000.0
    }
  ]
}
```

Si no hay ofertas, crear una:
1. Ir a `/ofertas-gestion/confeccion`
2. Crear una oferta genérica
3. Cambiar estado a "aprobada_para_enviar"

---

### 2. Navegar a la Tabla de Clientes

1. Abrir el navegador
2. Ir a `/clientes`
3. Verificar que la tabla de clientes se carga correctamente

---

### 3. Identificar el Botón de Asignar Oferta

En cada fila de cliente, buscar el botón con:
- **Icono**: 📋 (FileCheck)
- **Color**: Púrpura
- **Posición**: Después del punto de prioridad, antes del botón de averías
- **Tooltip**: "Asignar oferta genérica"

```
[•] [📋] [⚠️] [👁️] [✏️] [🗑️]
 ↑    ↑
Prioridad  Asignar Oferta (NUEVO)
```

---

### 4. Abrir Modal de Selección

1. Hacer clic en el botón púrpura 📋
2. Verificar que se abre el modal
3. Verificar el título: "Asignar Oferta Genérica"
4. Verificar que muestra el nombre del cliente

**Verificaciones visuales:**
- ✅ Modal se abre correctamente
- ✅ Muestra nombre del cliente en la descripción
- ✅ Muestra spinner mientras carga ofertas
- ✅ Después de cargar, muestra lista de ofertas

---

### 5. Verificar Lista de Ofertas

Cada tarjeta de oferta debe mostrar:
- ✅ Número de oferta (ej: "OF-20250205-001")
- ✅ Nombre automático (título grande)
- ✅ Nombre completo (descripción)
- ✅ Lista de items (primeros 5)
- ✅ Badges: Moneda, Almacén, Estado "Aprobada"
- ✅ Precio final destacado en naranja
- ✅ Botón "Asignar" con icono

**Ejemplo visual esperado:**
```
┌─────────────────────────────────────────────────────┐
│ OF-20250205-001                                     │
│                                                     │
│ I-2x5kW, B-4x5.12kWh, P-12x590W                   │
│ Oferta de 2x 5.0kW Inversor Felicity Solar...     │
│                                                     │
│ • 2x Inversor Felicity Solar 5.0kW                │
│ • 4x Batería Felicity Solar 5.12kWh               │
│ • 12x Panel Evo Solar 590W                         │
│                                                     │
│ [USD] [Almacén: Principal] [Aprobada]             │
│                                                     │
│                              Precio Final          │
│                              $15,000.00            │
│                              [📋 Asignar]          │
└─────────────────────────────────────────────────────┘
```

---

### 6. Asignar Oferta

1. Hacer clic en el botón "Asignar" de una oferta
2. Verificar que el botón cambia a "Asignando..." con spinner
3. Esperar respuesta del servidor

**Verificaciones:**
- ✅ Botón muestra spinner
- ✅ Botón está deshabilitado durante la asignación
- ✅ Otros botones también están deshabilitados

---

### 7. Verificar Resultado Exitoso

Después de asignar, verificar:
- ✅ Toast de éxito aparece
- ✅ Mensaje: "Oferta asignada" / "La oferta se asignó correctamente al cliente"
- ✅ Modal se cierra automáticamente
- ✅ Tabla de clientes se refresca

---

### 8. Verificar en Backend

**Verificar que la oferta se creó:**
```bash
curl -X GET http://localhost:8000/api/ofertas/confeccion/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Buscar la nueva oferta con:**
- `tipo_oferta`: "personalizada"
- `cliente_numero`: El número del cliente seleccionado
- `estado`: "en_revision"
- `materiales_reservados`: false

---

## 🐛 Casos de Error a Probar

### Error 1: Sin Ofertas Genéricas Aprobadas

**Pasos:**
1. Asegurarse de que NO hay ofertas genéricas aprobadas
2. Hacer clic en "Asignar Oferta"

**Resultado esperado:**
```
┌─────────────────────────────────────┐
│ No hay ofertas genéricas aprobadas  │
│                                     │
│ Crea y aprueba ofertas genéricas   │
│ para poder asignarlas a clientes.  │
└─────────────────────────────────────┘
```

---

### Error 2: Error de Red

**Pasos:**
1. Detener el backend
2. Hacer clic en "Asignar Oferta"

**Resultado esperado:**
- Toast de error
- Mensaje: "No se pudieron cargar las ofertas genéricas"

---

### Error 3: Cliente No Encontrado

**Pasos:**
1. Modificar temporalmente el número de cliente en el código
2. Intentar asignar oferta

**Resultado esperado:**
- Toast de error
- Mensaje: "No se pudo asignar la oferta al cliente"

---

## ✅ Checklist de Prueba Completa

- [ ] Backend tiene ofertas genéricas aprobadas
- [ ] Tabla de clientes carga correctamente
- [ ] Botón "Asignar Oferta" es visible (púrpura, icono FileCheck)
- [ ] Modal se abre al hacer clic
- [ ] Modal muestra nombre del cliente
- [ ] Modal carga ofertas genéricas
- [ ] Ofertas se muestran con todos los detalles
- [ ] Botón "Asignar" funciona
- [ ] Spinner aparece durante asignación
- [ ] Toast de éxito aparece
- [ ] Modal se cierra automáticamente
- [ ] Tabla se refresca
- [ ] Nueva oferta se crea en backend
- [ ] Nueva oferta tiene tipo "personalizada"
- [ ] Nueva oferta tiene cliente_numero correcto
- [ ] Nueva oferta tiene estado "en_revision"
- [ ] Caso de error: Sin ofertas aprobadas
- [ ] Caso de error: Error de red

---

## 🎯 Prueba de Integración Completa

### Escenario: Asignar Oferta a Cliente Nuevo

1. **Crear cliente nuevo**
   - Ir a `/clientes`
   - Clic en "Crear Cliente"
   - Llenar formulario
   - Guardar

2. **Verificar cliente en tabla**
   - Buscar el cliente recién creado
   - Verificar que aparece en la tabla

3. **Asignar oferta genérica**
   - Clic en botón púrpura 📋
   - Seleccionar una oferta
   - Clic en "Asignar"

4. **Verificar resultado**
   - Toast de éxito
   - Modal cerrado
   - Tabla refrescada

5. **Verificar en ofertas de confección**
   - Ir a `/ofertas-gestion`
   - Buscar la nueva oferta
   - Verificar que tiene el cliente asignado
   - Verificar estado "en_revision"

---

## 📊 Métricas de Éxito

- ✅ Tiempo de carga del modal: < 2 segundos
- ✅ Tiempo de asignación: < 3 segundos
- ✅ Sin errores en consola
- ✅ Sin warnings de TypeScript
- ✅ Interfaz responsive (funciona en móvil)
- ✅ Accesibilidad: Tooltips y aria-labels presentes

---

## 🔍 Debugging

### Si el modal no se abre:
1. Verificar consola del navegador
2. Verificar que el hook `useOfertasConfeccion` está importado
3. Verificar que las funciones están exportadas

### Si no se muestran ofertas:
1. Verificar endpoint: `/api/ofertas/confeccion/genericas/aprobadas`
2. Verificar que hay ofertas con estado "aprobada_para_enviar"
3. Verificar token de autenticación

### Si la asignación falla:
1. Verificar endpoint: `/api/ofertas/confeccion/asignar-a-cliente`
2. Verificar payload: `oferta_generica_id` y `cliente_numero`
3. Verificar logs del backend
4. Verificar que el cliente existe

---

## 📝 Notas de Testing

- **Navegador recomendado**: Chrome/Edge (mejor DevTools)
- **Modo**: Desarrollo (para ver logs detallados)
- **Network tab**: Abierto para ver requests
- **Console tab**: Abierto para ver errores

---

**Última actualización**: 2025-02-05  
**Estado**: ✅ Listo para testing

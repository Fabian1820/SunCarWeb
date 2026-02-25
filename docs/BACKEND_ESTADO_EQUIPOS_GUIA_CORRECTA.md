# Guía Backend - Endpoint Estado de Equipos (CORRECTA)

## Endpoint a Crear

```
GET /reportes/estado-equipos
```

## ✅ Lógica Correcta

### Equipos a Incluir
**SOLO** equipos de estas 3 categorías:
- Inversores
- Baterías
- Paneles Solares (verificar nombre exacto en tu BD)

### Definiciones Clave

1. **VENDIDOS** = Equipos en `ofertas_confeccionadas` que tienen pagos (`pago_cliente = true`)
2. **ENTREGADOS** = Items donde `ofertas_confeccionadas_elementos.entregado = true`
3. **EN SERVICIO** = Entregados + Cliente con `estado = "Instalación completada"`
4. **PENDIENTES** = Vendidos - En Servicio (equipos que aún no están funcionando)

**Relaciones importantes:**
- `Vendidos = En Servicio + Pendientes`
- `En Servicio ≤ Entregados ≤ Vendidos`
- `Pendientes = Vendidos - En Servicio` (incluye no entregados + entregados sin instalar)

---

## Query Principal (TODO EN UNO)

```sql
SELECT 
  m.id,
  m.codigo,
  m.descripcion,
  m.categoria,
  m.tipo,
  oce.cantidad,
  oce.entregado,  -- CAMPO CLAVE: determina si está entregado
  oc.id as oferta_id,
  oc.codigo_cliente,
  c.id as cliente_id,
  c.codigo as cliente_codigo,
  c.nombre as cliente_nombre,
  c.telefono,
  c.direccion,
  c.provincia,
  c.estado as cliente_estado,
  c.fecha_instalacion
FROM materiales m
INNER JOIN ofertas_confeccionadas_elementos oce ON m.codigo = oce.material_codigo
INNER JOIN ofertas_confeccionadas oc ON oce.oferta_id = oc.id
LEFT JOIN clientes c ON oc.codigo_cliente = c.codigo
WHERE oc.id IN (
  SELECT DISTINCT oferta_id 
  FROM pagos 
  WHERE pago_cliente = true
)
AND m.categoria IN ('Inversores', 'Baterías', 'Paneles Solares')
ORDER BY m.categoria, m.descripcion, c.nombre
```

**IMPORTANTE**: El campo `oce.entregado` es el que determina si el equipo está entregado o no.
- `entregado = true/1` → Equipo entregado
- `entregado = false/0/NULL` → Equipo pendiente de entrega

**Nota**: Ajusta los nombres de categorías según tu BD. Pueden ser:
- "Inversor" / "Inversores"
- "Batería" / "Baterías"  
- "Panel Solar" / "Paneles Solares" / "Paneles"

---

## Lógica de Procesamiento en Backend

```javascript
async function getEstadoEquipos() {
  // 1. Ejecutar query principal
  const rows = await db.query(queryPrincipal)
  
  // 2. Procesar datos
  const equiposPorCodigo = {}
  
  rows.forEach(row => {
    const codigoEquipo = row.codigo
    
    // Inicializar equipo si no existe
    if (!equiposPorCodigo[codigoEquipo]) {
      equiposPorCodigo[codigoEquipo] = {
        id: row.id,
        codigo: row.codigo,
        nombre: row.descripcion,
        categoria: row.categoria,
        tipo: row.tipo || '',
        unidades_vendidas: 0,
        unidades_entregadas: 0,
        unidades_sin_entregar: 0,
        unidades_en_servicio: 0,
        clientes: {}
      }
    }
    
    const equipo = equiposPorCodigo[codigoEquipo]
    
    // Sumar cantidades
    equipo.unidades_vendidas += row.cantidad
    
    // Verificar si está entregado
    if (row.entregado === true || row.entregado === 1) {
      equipo.unidades_entregadas += row.cantidad
      
      // Si está entregado Y el cliente tiene instalación completada = en servicio
      if (row.cliente_estado === 'Instalación completada') {
        equipo.unidades_en_servicio += row.cantidad
      }
    }
    // No es necesario calcular sin_entregar aquí, se calcula después
    
    // Agregar cliente con información del estado de entrega del equipo
    if (row.cliente_id) {
      const codigoCliente = row.cliente_codigo
      const estaEntregado = row.entregado === true || row.entregado === 1
      const estaEnServicio = estaEntregado && row.cliente_estado === 'Instalación completada'
      
      // IMPORTANTE: Crear una key única que incluya el estado de entrega
      // Esto permite que el mismo cliente aparezca múltiples veces si tiene
      // equipos entregados Y pendientes del mismo tipo
      const clienteKey = `${codigoCliente}-${row.oferta_id}-${estaEntregado ? 'entregado' : 'pendiente'}`
      
      if (!equipo.clientes[clienteKey]) {
        equipo.clientes[clienteKey] = {
          id: row.cliente_id,
          codigo: row.cliente_codigo,
          nombre: row.cliente_nombre,
          telefono: row.telefono,
          direccion: row.direccion,
          provincia: row.provincia,
          estado: row.cliente_estado,
          fecha_instalacion: row.fecha_instalacion,
          cantidad_equipos: 0,
          // CAMPOS CRÍTICOS PARA EL FRONTEND
          equipo_entregado: estaEntregado,      // true si oce.entregado = true
          equipo_en_servicio: estaEnServicio    // true si entregado Y cliente.estado = 'Instalación completada'
        }
      }
      
      equipo.clientes[clienteKey].cantidad_equipos += row.cantidad
    }
  })
  
  // 3. Agrupar por categoría
  const categorias = {}
  
  Object.values(equiposPorCodigo).forEach(equipo => {
    // IMPORTANTE: Calcular pendientes como Vendidos - En Servicio
    // Esto incluye tanto los no entregados como los entregados pero no instalados
    equipo.unidades_sin_entregar = equipo.unidades_vendidas - equipo.unidades_en_servicio
    
    // Calcular porcentajes del equipo
    equipo.porcentaje_entregado = equipo.unidades_vendidas > 0 
      ? Math.round((equipo.unidades_entregadas / equipo.unidades_vendidas) * 100)
      : 0
    
    equipo.porcentaje_en_servicio = equipo.unidades_vendidas > 0
      ? Math.round((equipo.unidades_en_servicio / equipo.unidades_vendidas) * 100)
      : 0
    
    // Convertir clientes de objeto a array
    equipo.clientes = Object.values(equipo.clientes)
    
    // Agrupar por categoría
    const categoria = equipo.categoria
    
    if (!categorias[categoria]) {
      categorias[categoria] = {
        categoria: categoria,
        descripcion: getDescripcionCategoria(categoria),
        unidades_vendidas: 0,
        unidades_entregadas: 0,
        unidades_sin_entregar: 0,
        unidades_en_servicio: 0,
        porcentaje_entregado: 0,
        equipos: []
      }
    }
    
    categorias[categoria].equipos.push(equipo)
    categorias[categoria].unidades_vendidas += equipo.unidades_vendidas
    categorias[categoria].unidades_entregadas += equipo.unidades_entregadas
    categorias[categoria].unidades_sin_entregar += equipo.unidades_sin_entregar
    categorias[categoria].unidades_en_servicio += equipo.unidades_en_servicio
  })
  
  // 4. Calcular porcentajes por categoría
  Object.values(categorias).forEach(cat => {
    cat.porcentaje_entregado = cat.unidades_vendidas > 0
      ? Math.round((cat.unidades_entregadas / cat.unidades_vendidas) * 100)
      : 0
  })
  
  // 5. Calcular resumen global
  const resumen = {
    total_vendidos: 0,
    total_entregados: 0,
    total_sin_entregar: 0,
    total_en_servicio: 0,
    porcentaje_entregados: 0,
    porcentaje_en_servicio: 0,
    variacion_mensual: await calcularVariacionMensual()
  }
  
  Object.values(categorias).forEach(cat => {
    resumen.total_vendidos += cat.unidades_vendidas
    resumen.total_entregados += cat.unidades_entregadas
    resumen.total_sin_entregar += cat.unidades_sin_entregar
    resumen.total_en_servicio += cat.unidades_en_servicio
  })
  
  resumen.porcentaje_entregados = resumen.total_vendidos > 0
    ? Math.round((resumen.total_entregados / resumen.total_vendidos) * 100)
    : 0
  
  resumen.porcentaje_en_servicio = resumen.total_vendidos > 0
    ? Math.round((resumen.total_en_servicio / resumen.total_vendidos) * 100)
    : 0
  
  // 6. Retornar respuesta
  return {
    success: true,
    message: "Estado de equipos obtenido exitosamente",
    data: {
      resumen,
      categorias: Object.values(categorias),
      fecha_actualizacion: new Date().toISOString()
    }
  }
}

function getDescripcionCategoria(categoria) {
  const descripciones = {
    "Inversores": "Monofásicos y trifásicos",
    "Inversor": "Monofásicos y trifásicos",
    "Baterías": "Litio y AGM para almacenamiento",
    "Batería": "Litio y AGM para almacenamiento",
    "Paneles Solares": "Monocristalinos de alta eficiencia",
    "Panel Solar": "Monocristalinos de alta eficiencia",
    "Paneles": "Monocristalinos de alta eficiencia"
  }
  return descripciones[categoria] || categoria
}

async function calcularVariacionMensual() {
  // Ventas mes actual
  const mesActual = await db.query(`
    SELECT SUM(oce.cantidad) as total
    FROM ofertas_confeccionadas_elementos oce
    INNER JOIN ofertas_confeccionadas oc ON oce.oferta_id = oc.id
    INNER JOIN materiales m ON oce.material_codigo = m.codigo
    WHERE oc.id IN (SELECT DISTINCT oferta_id FROM pagos WHERE pago_cliente = true)
      AND m.categoria IN ('Inversores', 'Baterías', 'Paneles Solares')
      AND MONTH(oc.fecha_creacion) = MONTH(NOW())
      AND YEAR(oc.fecha_creacion) = YEAR(NOW())
  `)
  
  // Ventas mes anterior
  const mesAnterior = await db.query(`
    SELECT SUM(oce.cantidad) as total
    FROM ofertas_confeccionadas_elementos oce
    INNER JOIN ofertas_confeccionadas oc ON oce.oferta_id = oc.id
    INNER JOIN materiales m ON oce.material_codigo = m.codigo
    WHERE oc.id IN (SELECT DISTINCT oferta_id FROM pagos WHERE pago_cliente = true)
      AND m.categoria IN ('Inversores', 'Baterías', 'Paneles Solares')
      AND MONTH(oc.fecha_creacion) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH))
      AND YEAR(oc.fecha_creacion) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))
  `)
  
  const actual = mesActual[0]?.total || 0
  const anterior = mesAnterior[0]?.total || 0
  
  if (anterior === 0) return 0
  
  return Math.round(((actual - anterior) / anterior) * 100)
}
```

---

## Resumen de Campos Clave

### Tabla: `ofertas_confeccionadas_elementos`
- `material_codigo` - Código del equipo
- `cantidad` - Cantidad de unidades
- `entregado` - **CAMPO CLAVE**: `true`/`false` indica si está entregado

### Tabla: `ofertas_confeccionadas`
- `id` - ID de la oferta
- `codigo_cliente` - Código del cliente

### Tabla: `pagos`
- `oferta_id` - ID de la oferta
- `pago_cliente` - **FILTRO**: Solo `true` (ofertas vendidas)

### Tabla: `clientes`
- `estado` - Estado de la instalación
- `fecha_instalacion` - Fecha de instalación

### Tabla: `materiales`
- `codigo` - Código del material
- `descripcion` - Nombre del equipo
- `categoria` - **FILTRO**: Solo Inversores, Baterías, Paneles Solares
- `tipo` - Tipo/especificaciones

---

## Ejemplo de Respuesta

```json
{
  "success": true,
  "message": "Estado de equipos obtenido exitosamente",
  "data": {
    "resumen": {
      "total_vendidos": 348,
      "total_entregados": 261,
      "total_sin_entregar": 87,
      "total_en_servicio": 245,
      "porcentaje_entregados": 75,
      "porcentaje_en_servicio": 70,
      "variacion_mensual": 12
    },
    "categorias": [
      {
        "categoria": "Inversores",
        "descripcion": "Monofásicos y trifásicos",
        "unidades_vendidas": 96,
        "unidades_entregadas": 72,
        "unidades_sin_entregar": 24,
        "unidades_en_servicio": 68,
        "porcentaje_entregado": 75,
        "equipos": [
          {
            "id": "123",
            "codigo": "INV-8KW",
            "nombre": "Inversor Híbrido 8kW",
            "categoria": "Inversores",
            "tipo": "Monofásico",
            "unidades_vendidas": 15,
            "unidades_entregadas": 12,
            "unidades_sin_entregar": 3,
            "unidades_en_servicio": 10,
            "porcentaje_entregado": 80,
            "porcentaje_en_servicio": 67,
            "clientes": [
              {
                "id": "c1",
                "codigo": "CLI-001",
                "nombre": "Juan Pérez",
                "telefono": "555-1234",
                "direccion": "Calle 123",
                "provincia": "La Habana",
                "estado": "Instalación completada",
                "fecha_instalacion": "2024-01-15",
                "cantidad_equipos": 2,
                "equipo_entregado": true,
                "equipo_en_servicio": true
              },
              {
                "id": "c2",
                "codigo": "CLI-002",
                "nombre": "María García",
                "telefono": "555-5678",
                "direccion": "Avenida 456",
                "provincia": "Matanzas",
                "estado": "Instalación en proceso",
                "fecha_instalacion": null,
                "cantidad_equipos": 1,
                "equipo_entregado": true,
                "equipo_en_servicio": false
              },
              {
                "id": "c3",
                "codigo": "CLI-003",
                "nombre": "Pedro López",
                "telefono": "555-9012",
                "direccion": "Calle 789",
                "provincia": "Villa Clara",
                "estado": "Pendiente de instalación",
                "fecha_instalacion": null,
                "cantidad_equipos": 1,
                "equipo_entregado": false,
                "equipo_en_servicio": false
              }
            ]
          }
        ]
      }
    ],
    "fecha_actualizacion": "2026-02-24T10:30:00Z"
  }
}
```

### Explicación de los campos de cliente:

- **equipo_entregado**: `true` si `ofertas_confeccionadas_elementos.entregado = true` para este equipo
- **equipo_en_servicio**: `true` si `equipo_entregado = true` Y `clientes.estado = 'Instalación completada'`

### Caso especial: Cliente con equipos entregados Y pendientes

Si un cliente tiene 2 inversores entregados y 1 pendiente del mismo modelo, aparecerá DOS VECES en el array de clientes:

```json
{
  "clientes": [
    {
      "codigo": "CLI-004",
      "nombre": "Ana Martínez",
      "cantidad_equipos": 2,
      "equipo_entregado": true,
      "equipo_en_servicio": true
    },
    {
      "codigo": "CLI-004",
      "nombre": "Ana Martínez",
      "cantidad_equipos": 1,
      "equipo_entregado": false,
      "equipo_en_servicio": false
    }
  ]
}
```

Esto permite al frontend mostrar correctamente:
- En "Entregados": Ana Martínez con 2 unidades
- En "Pendientes": Ana Martínez con 1 unidad

---

## Checklist de Implementación

- [ ] Verificar nombres exactos de categorías en tu BD
- [ ] Confirmar que existe campo `entregado` en `ofertas_confeccionadas_elementos`
- [ ] Probar query principal con datos reales
- [ ] Implementar función de procesamiento
- [ ] Calcular variación mensual
- [ ] Probar con diferentes casos (con/sin clientes, entregados/no entregados)
- [ ] Optimizar con índices si es necesario
- [ ] Agregar caché (opcional, 1 hora)

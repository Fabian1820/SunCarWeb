# Sistema de Caja Registradora - Especificación Backend

## Modelos de Base de Datos

### Tabla: sesiones_caja

```sql
CREATE TABLE sesiones_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tienda_id UUID NOT NULL REFERENCES tiendas(id),
    numero_sesion VARCHAR(20) UNIQUE NOT NULL,
    fecha_apertura TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_cierre TIMESTAMP,
    efectivo_apertura DECIMAL(10,2) NOT NULL DEFAULT 0,
    efectivo_cierre DECIMAL(10,2),
    nota_apertura TEXT,
    nota_cierre TEXT,
    usuario_apertura VARCHAR(100) NOT NULL,
    usuario_cierre VARCHAR(100),
    estado VARCHAR(20) NOT NULL DEFAULT 'abierta',
    total_ventas DECIMAL(10,2) DEFAULT 0,
    total_efectivo DECIMAL(10,2) DEFAULT 0,
    total_tarjeta DECIMAL(10,2) DEFAULT 0,
    total_transferencia DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_estado CHECK (estado IN ('abierta', 'cerrada')),
    CONSTRAINT chk_efectivo_apertura CHECK (efectivo_apertura >= 0)
);

CREATE INDEX idx_sesiones_tienda ON sesiones_caja(tienda_id);
CREATE INDEX idx_sesiones_estado ON sesiones_caja(estado);
CREATE INDEX idx_sesiones_fecha ON sesiones_caja(fecha_apertura);
```

### Tabla: ordenes_compra

```sql
CREATE TABLE ordenes_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_orden VARCHAR(20) UNIQUE NOT NULL,
    sesion_caja_id UUID NOT NULL REFERENCES sesiones_caja(id),
    tienda_id UUID NOT NULL REFERENCES tiendas(id),
    cliente_id UUID REFERENCES clientes(id),
    cliente_nombre VARCHAR(200),
    cliente_telefono VARCHAR(20),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_pago TIMESTAMP,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    impuesto_porcentaje DECIMAL(5,2) DEFAULT 0,
    impuesto_monto DECIMAL(10,2) DEFAULT 0,
    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
    descuento_monto DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    metodo_pago VARCHAR(20),
    almacen_id UUID REFERENCES almacenes(id),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_estado_orden CHECK (estado IN ('pendiente', 'pagada', 'cancelada')),
    CONSTRAINT chk_metodo_pago CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'mixto')),
    CONSTRAINT chk_totales CHECK (subtotal >= 0 AND total >= 0)
);

CREATE INDEX idx_ordenes_sesion ON ordenes_compra(sesion_caja_id);
CREATE INDEX idx_ordenes_tienda ON ordenes_compra(tienda_id);
CREATE INDEX idx_ordenes_estado ON ordenes_compra(estado);
CREATE INDEX idx_ordenes_fecha ON ordenes_compra(fecha_creacion);
```

### Tabla: items_orden

```sql
CREATE TABLE items_orden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    material_codigo VARCHAR(50) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_precio CHECK (precio_unitario >= 0)
);

CREATE INDEX idx_items_orden ON items_orden(orden_id);
CREATE INDEX idx_items_material ON items_orden(material_codigo);
```

### Tabla: pagos_orden

```sql
CREATE TABLE pagos_orden (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    metodo VARCHAR(20) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    monto_recibido DECIMAL(10,2),
    cambio DECIMAL(10,2),
    referencia VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_metodo_pago CHECK (metodo IN ('efectivo', 'tarjeta', 'transferencia')),
    CONSTRAINT chk_monto CHECK (monto > 0)
);

CREATE INDEX idx_pagos_orden ON pagos_orden(orden_id);
```

### Tabla: movimientos_efectivo_caja

```sql
CREATE TABLE movimientos_efectivo_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_caja_id UUID NOT NULL REFERENCES sesiones_caja(id),
    tipo VARCHAR(20) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    motivo TEXT NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    usuario VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT chk_tipo CHECK (tipo IN ('entrada', 'salida')),
    CONSTRAINT chk_monto CHECK (monto > 0)
);

CREATE INDEX idx_movimientos_sesion ON movimientos_efectivo_caja(sesion_caja_id);
```

---

## Endpoints - Pseudocódigo

### POST /api/caja/sesiones

```python
def crear_sesion(request):
    """Abre una nueva sesión de caja"""
    data = request.json
    tienda_id = data['tienda_id']
    efectivo_apertura = data['efectivo_apertura']
    nota_apertura = data.get('nota_apertura', '')
    usuario = request.user.username
    
    # Validar que no haya sesión abierta
    sesion_abierta = db.query(SesionCaja).filter(
        SesionCaja.tienda_id == tienda_id,
        SesionCaja.estado == 'abierta'
    ).first()
    
    if sesion_abierta:
        raise HTTPException(400, "Ya existe una sesión abierta para esta tienda")
    
    # Validar efectivo
    if efectivo_apertura < 0:
        raise HTTPException(400, "El efectivo de apertura debe ser mayor o igual a 0")
    
    # Generar número de sesión
    fecha_hoy = datetime.now().strftime('%Y%m%d')
    sesiones_hoy = db.query(SesionCaja).filter(
        SesionCaja.numero_sesion.like(f'{fecha_hoy}-%')
    ).count()
    numero_sesion = f"{fecha_hoy}-{str(sesiones_hoy + 1).zfill(3)}"
    
    # Crear sesión
    sesion = SesionCaja(
        tienda_id=tienda_id,
        numero_sesion=numero_sesion,
        fecha_apertura=datetime.now(),
        efectivo_apertura=efectivo_apertura,
        nota_apertura=nota_apertura,
        usuario_apertura=usuario,
        estado='abierta'
    )
    
    db.add(sesion)
    db.commit()
    db.refresh(sesion)
    
    return sesion
```

### GET /api/caja/sesiones/activa

```python
def get_sesion_activa(tienda_id: str):
    """Obtiene la sesión activa de una tienda"""
    sesion = db.query(SesionCaja).filter(
        SesionCaja.tienda_id == tienda_id,
        SesionCaja.estado == 'abierta'
    ).first()
    
    if not sesion:
        return None
    
    # Cargar movimientos de efectivo
    movimientos = db.query(MovimientoEfectivoCaja).filter(
        MovimientoEfectivoCaja.sesion_caja_id == sesion.id
    ).all()
    
    sesion.movimientos_efectivo = movimientos
    
    return sesion
```

### PUT /api/caja/sesiones/{id}/cerrar

```python
def cerrar_sesion(sesion_id: str, request):
    """Cierra una sesión de caja"""
    data = request.json
    efectivo_cierre = data['efectivo_cierre']
    nota_cierre = data.get('nota_cierre', '')
    usuario = request.user.username
    
    # Obtener sesión
    sesion = db.query(SesionCaja).filter(
        SesionCaja.id == sesion_id
    ).first()
    
    if not sesion:
        raise HTTPException(404, "Sesión no encontrada")
    
    if sesion.estado != 'abierta':
        raise HTTPException(400, "La sesión ya está cerrada")
    
    # Actualizar sesión
    sesion.fecha_cierre = datetime.now()
    sesion.efectivo_cierre = efectivo_cierre
    sesion.nota_cierre = nota_cierre
    sesion.usuario_cierre = usuario
    sesion.estado = 'cerrada'
    
    db.commit()
    db.refresh(sesion)
    
    return sesion
```

### POST /api/caja/ordenes

```python
def crear_orden(request):
    """Crea una nueva orden de compra"""
    data = request.json
    sesion_caja_id = data['sesion_caja_id']
    tienda_id = data['tienda_id']
    items = data['items']
    impuesto_porcentaje = data.get('impuesto_porcentaje', 0)
    descuento_porcentaje = data.get('descuento_porcentaje', 0)
    
    # Validar sesión abierta
    sesion = db.query(SesionCaja).filter(
        SesionCaja.id == sesion_caja_id,
        SesionCaja.estado == 'abierta'
    ).first()
    
    if not sesion:
        raise HTTPException(400, "No hay sesión abierta")
    
    # Validar items
    if not items or len(items) == 0:
        raise HTTPException(400, "La orden debe tener al menos un item")
    
    # Generar número de orden
    fecha_hoy = datetime.now().strftime('%Y%m%d')
    ordenes_hoy = db.query(OrdenCompra).filter(
        OrdenCompra.numero_orden.like(f'{fecha_hoy}-%')
    ).count()
    numero_orden = f"{fecha_hoy}-{str(ordenes_hoy + 1).zfill(3)}"
    
    # Calcular totales
    subtotal = sum(item['cantidad'] * item['precio_unitario'] for item in items)
    descuento_monto = subtotal * (descuento_porcentaje / 100)
    base_imponible = subtotal - descuento_monto
    impuesto_monto = base_imponible * (impuesto_porcentaje / 100)
    total = base_imponible + impuesto_monto
    
    # Crear orden
    orden = OrdenCompra(
        numero_orden=numero_orden,
        sesion_caja_id=sesion_caja_id,
        tienda_id=tienda_id,
        cliente_id=data.get('cliente_id'),
        subtotal=subtotal,
        impuesto_porcentaje=impuesto_porcentaje,
        impuesto_monto=impuesto_monto,
        descuento_porcentaje=descuento_porcentaje,
        descuento_monto=descuento_monto,
        total=total,
        estado='pendiente'
    )
    
    db.add(orden)
    db.flush()
    
    # Crear items
    for item_data in items:
        item = ItemOrden(
            orden_id=orden.id,
            material_codigo=item_data['material_codigo'],
            descripcion=item_data['descripcion'],
            cantidad=item_data['cantidad'],
            precio_unitario=item_data['precio_unitario'],
            subtotal=item_data['cantidad'] * item_data['precio_unitario'],
            categoria=item_data.get('categoria')
        )
        db.add(item)
    
    db.commit()
    db.refresh(orden)
    
    # Cargar items
    orden.items = db.query(ItemOrden).filter(ItemOrden.orden_id == orden.id).all()
    
    return orden
```

### POST /api/caja/ordenes/{id}/pagar

```python
def pagar_orden(orden_id: str, request):
    """Procesa el pago de una orden y descuenta stock"""
    data = request.json
    metodo_pago = data['metodo_pago']
    pagos = data['pagos']
    almacen_id = data['almacen_id']
    usuario = request.user.username
    
    # Iniciar transacción
    with db.begin():
        # Obtener orden
        orden = db.query(OrdenCompra).filter(
            OrdenCompra.id == orden_id
        ).first()
        
        if not orden:
            raise HTTPException(404, "Orden no encontrada")
        
        if orden.estado != 'pendiente':
            raise HTTPException(400, "La orden ya fue procesada")
        
        # Validar almacén pertenece a la tienda
        tienda = db.query(Tienda).filter(Tienda.id == orden.tienda_id).first()
        if almacen_id != tienda.almacen_id:
            # Verificar si está en almacenes secundarios
            almacenes_tienda = db.query(TiendaAlmacen).filter(
                TiendaAlmacen.tienda_id == orden.tienda_id,
                TiendaAlmacen.almacen_id == almacen_id
            ).first()
            
            if not almacenes_tienda:
                raise HTTPException(400, "El almacén no pertenece a esta tienda")
        
        # Obtener items de la orden
        items = db.query(ItemOrden).filter(ItemOrden.orden_id == orden_id).all()
        
        # Validar stock disponible
        for item in items:
            stock = db.query(Stock).filter(
                Stock.almacen_id == almacen_id,
                Stock.material_codigo == item.material_codigo
            ).with_for_update().first()
            
            if not stock or stock.cantidad < item.cantidad:
                raise HTTPException(
                    400,
                    f"Stock insuficiente para {item.descripcion}. "
                    f"Disponible: {stock.cantidad if stock else 0}, "
                    f"Requerido: {item.cantidad}"
                )
        
        # Validar monto de pagos
        total_pagos = sum(p['monto'] for p in pagos)
        if abs(total_pagos - orden.total) > 0.01:  # Tolerancia de 1 centavo
            raise HTTPException(400, "El monto de pagos no coincide con el total")
        
        # Crear movimientos de inventario y descontar stock
        movimientos_inventario = []
        for item in items:
            # Crear movimiento
            movimiento = MovimientoInventario(
                tipo='venta',
                material_codigo=item.material_codigo,
                cantidad=item.cantidad,
                almacen_origen_id=almacen_id,
                tienda_id=orden.tienda_id,
                referencia=orden.numero_orden,
                motivo=f"Venta - Orden {orden.numero_orden}",
                fecha=datetime.now(),
                usuario=usuario
            )
            db.add(movimiento)
            movimientos_inventario.append(movimiento)
            
            # Descontar stock
            stock = db.query(Stock).filter(
                Stock.almacen_id == almacen_id,
                Stock.material_codigo == item.material_codigo
            ).first()
            
            stock.cantidad -= item.cantidad
            stock.actualizado_en = datetime.now()
        
        # Registrar pagos
        cambio = 0
        for pago_data in pagos:
            pago = PagoOrden(
                orden_id=orden_id,
                metodo=pago_data['metodo'],
                monto=pago_data['monto'],
                monto_recibido=pago_data.get('monto_recibido'),
                referencia=pago_data.get('referencia')
            )
            
            if pago_data['metodo'] == 'efectivo' and pago_data.get('monto_recibido'):
                pago.cambio = pago_data['monto_recibido'] - pago_data['monto']
                cambio = pago.cambio
            
            db.add(pago)
        
        # Actualizar orden
        orden.estado = 'pagada'
        orden.fecha_pago = datetime.now()
        orden.metodo_pago = metodo_pago
        orden.almacen_id = almacen_id
        
        # Actualizar totales de sesión
        sesion = db.query(SesionCaja).filter(
            SesionCaja.id == orden.sesion_caja_id
        ).first()
        
        sesion.total_ventas += orden.total
        
        if metodo_pago == 'efectivo':
            sesion.total_efectivo += orden.total
        elif metodo_pago == 'tarjeta':
            sesion.total_tarjeta += orden.total
        elif metodo_pago == 'transferencia':
            sesion.total_transferencia += orden.total
        elif metodo_pago == 'mixto':
            for pago in pagos:
                if pago['metodo'] == 'efectivo':
                    sesion.total_efectivo += pago['monto']
                elif pago['metodo'] == 'tarjeta':
                    sesion.total_tarjeta += pago['monto']
                elif pago['metodo'] == 'transferencia':
                    sesion.total_transferencia += pago['monto']
        
        db.commit()
        
        # Recargar orden con relaciones
        db.refresh(orden)
        orden.items = items
        orden.pagos = db.query(PagoOrden).filter(PagoOrden.orden_id == orden_id).all()
        
        return {
            "success": True,
            "orden": orden,
            "cambio": cambio,
            "movimientos_inventario": movimientos_inventario
        }
```

### POST /api/caja/sesiones/{id}/movimientos

```python
def crear_movimiento_efectivo(sesion_id: str, request):
    """Registra entrada o salida de efectivo"""
    data = request.json
    tipo = data['tipo']
    monto = data['monto']
    motivo = data['motivo']
    usuario = request.user.username
    
    # Validar sesión
    sesion = db.query(SesionCaja).filter(
        SesionCaja.id == sesion_id,
        SesionCaja.estado == 'abierta'
    ).first()
    
    if not sesion:
        raise HTTPException(400, "Sesión no encontrada o cerrada")
    
    # Validar monto
    if monto <= 0:
        raise HTTPException(400, "El monto debe ser mayor a 0")
    
    # Crear movimiento
    movimiento = MovimientoEfectivoCaja(
        sesion_caja_id=sesion_id,
        tipo=tipo,
        monto=monto,
        motivo=motivo,
        fecha=datetime.now(),
        usuario=usuario
    )
    
    db.add(movimiento)
    db.commit()
    db.refresh(movimiento)
    
    return movimiento
```

---

## Consideraciones Técnicas

### Transacciones
- Usar transacciones de base de datos para operaciones críticas
- El pago de orden debe ser atómico (todo o nada)
- Si falla el descuento de stock, revertir todo

### Locks
- Usar `SELECT ... FOR UPDATE` al validar stock
- Prevenir condiciones de carrera en stock

### Índices
- Crear índices en campos de búsqueda frecuente
- Índices compuestos para consultas complejas

### Auditoría
- Registrar usuario en todas las operaciones
- Mantener timestamps de creación y actualización
- No eliminar registros, marcar como cancelados

### Performance
- Cachear lista de materiales
- Paginar resultados de órdenes
- Optimizar consultas con joins

### Seguridad
- Validar permisos por tienda
- Sanitizar inputs
- Usar prepared statements
- Encriptar datos sensibles

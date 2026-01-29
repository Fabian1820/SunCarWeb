# Especificación Backend: Editar Oferta Confeccionada

## Resumen
El frontend ahora envía una petición PUT para actualizar ofertas existentes. Necesitas implementar el endpoint correspondiente en el backend.

## Endpoint Requerido

### PUT `/ofertas/confeccion/{oferta_id}`

Actualiza una oferta confeccionada existente.

#### URL Parameters
- `oferta_id` (string, required): ID o número de oferta a actualizar

#### Request Body
El mismo formato que el POST de creación:

```json
{
  "tipo_oferta": "generica" | "personalizada",
  "cliente_numero": "string (opcional, requerido si personalizada)",
  "almacen_id": "string",
  "foto_portada": "string (URL, opcional)",
  "foto_portada_url": "string (URL, opcional, compatibilidad)",
  "estado": "en_revision" | "aprobada_para_enviar" | "enviada_a_cliente" | "confirmada_por_cliente" | "reservada" | "rechazada" | "cancelada",
  
  "items": [
    {
      "material_codigo": "string",
      "descripcion": "string",
      "precio": number,
      "cantidad": number,
      "categoria": "string",
      "seccion": "string",
      "margen_asignado": number
    }
  ],
  
  "servicios": [
    {
      "id": "string",
      "descripcion": "string",
      "cantidad": number,
      "costo": number,
      "porcentaje_margen_origen": number
    }
  ],
  
  "secciones_personalizadas": [
    {
      "id": "string",
      "label": "string",
      "tipo": "materiales" | "extra",
      "tipo_extra": "escritura" | "costo" (opcional),
      "categorias_materiales": ["string"] (opcional),
      "contenido_escritura": "string" (opcional),
      "costos_extras": [
        {
          "id": "string",
          "descripcion": "string",
          "cantidad": number,
          "precio_unitario": number
        }
      ] (opcional)
    }
  ],
  
  "elementos_personalizados": [
    {
      "material_codigo": "string",
      "descripcion": "string",
      "precio": number,
      "cantidad": number,
      "categoria": "string"
    }
  ],
  
  "componentes_principales": {
    "inversor_seleccionado": "string (opcional)",
    "bateria_seleccionada": "string (opcional)",
    "panel_seleccionado": "string (opcional)"
  },
  
  "margen_comercial": number,
  "porcentaje_margen_materiales": number,
  "porcentaje_margen_instalacion": number,
  "margen_total": number,
  "margen_materiales": number,
  "margen_instalacion": number,
  "costo_transportacion": number,
  "total_materiales": number,
  "subtotal_con_margen": number,
  "total_elementos_personalizados": number,
  "total_costos_extras": number,
  "precio_final": number,
  "moneda_pago": "USD" | "EUR" | "CUP",
  "tasa_cambio": number,
  "pago_transferencia": boolean,
  "datos_cuenta": "string",
  "aplica_contribucion": boolean,
  "porcentaje_contribucion": number
}
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Oferta actualizada exitosamente",
  "data": {
    "id": "string",
    "numero_oferta": "string",
    "nombre_automatico": "string",
    "tipo": "generica" | "personalizada",
    "estado": "string",
    "almacen_id": "string",
    "cliente_id": "string (opcional)",
    "cliente_numero": "string (opcional)",
    "foto_portada": "string (opcional)",
    "precio_final": number,
    "total_materiales": number,
    "margen_comercial": number,
    "items": [...],
    "fecha_actualizacion": "ISO 8601 datetime"
  }
}
```

#### Response Error (400/404/500)
```json
{
  "success": false,
  "message": "Descripción del error",
  "error": "Detalles técnicos del error (opcional)"
}
```

## Lógica de Negocio Requerida

### 1. Validaciones
- ✅ Verificar que la oferta existe
- ✅ Verificar que el usuario tiene permisos para editar
- ✅ Validar que el almacén existe
- ✅ Validar que el cliente existe (si es personalizada)
- ✅ Validar stock disponible de materiales
- ✅ Validar que los materiales existen

### 2. Manejo de Stock
**IMPORTANTE**: Debes manejar correctamente el stock cuando se edita una oferta:

#### Si la oferta NO estaba reservada:
- No hay cambios en el stock, solo actualizar datos

#### Si la oferta YA estaba reservada (estado = "reservada"):
- **Paso 1**: Devolver al stock los materiales de la versión anterior
- **Paso 2**: Reservar los materiales de la nueva versión
- **Paso 3**: Validar que hay stock suficiente para la nueva versión

#### Si la oferta cambia a estado "reservada":
- Reservar los materiales (descontar del stock)

#### Si la oferta cambia desde "reservada" a otro estado:
- Devolver los materiales al stock

### 3. Actualización de Datos
- Actualizar todos los campos de la oferta
- Recalcular el nombre automático si cambian los componentes principales
- Actualizar fecha de modificación
- Mantener el historial de cambios (opcional pero recomendado)

### 4. Campos que NO se deben modificar
- `id`: El ID de la oferta no cambia
- `numero_oferta`: El número de oferta no cambia
- `fecha_creacion`: La fecha de creación original se mantiene

## Ejemplo de Implementación (Python/FastAPI)

```python
@router.put("/ofertas/confeccion/{oferta_id}")
async def actualizar_oferta_confeccion(
    oferta_id: str,
    oferta_data: OfertaConfeccionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza una oferta confeccionada existente
    """
    try:
        # 1. Buscar la oferta
        oferta = db.query(OfertaConfeccion).filter(
            OfertaConfeccion.id == oferta_id
        ).first()
        
        if not oferta:
            raise HTTPException(
                status_code=404,
                detail=f"Oferta {oferta_id} no encontrada"
            )
        
        # 2. Validar permisos (opcional)
        # if not tiene_permiso(current_user, "editar_ofertas"):
        #     raise HTTPException(status_code=403, detail="Sin permisos")
        
        # 3. Validar almacén
        almacen = db.query(Almacen).filter(
            Almacen.id == oferta_data.almacen_id
        ).first()
        
        if not almacen:
            raise HTTPException(
                status_code=400,
                detail=f"Almacén {oferta_data.almacen_id} no encontrado"
            )
        
        # 4. Validar cliente si es personalizada
        if oferta_data.tipo_oferta == "personalizada":
            if not oferta_data.cliente_numero:
                raise HTTPException(
                    status_code=400,
                    detail="Cliente requerido para ofertas personalizadas"
                )
            
            cliente = db.query(Cliente).filter(
                Cliente.numero == oferta_data.cliente_numero
            ).first()
            
            if not cliente:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cliente {oferta_data.cliente_numero} no encontrado"
                )
        
        # 5. Manejar stock si la oferta estaba/está reservada
        estado_anterior = oferta.estado
        estado_nuevo = oferta_data.estado
        
        # Si estaba reservada, devolver stock anterior
        if estado_anterior == "reservada":
            devolver_stock_oferta(db, oferta)
        
        # Si va a estar reservada, validar y reservar nuevo stock
        if estado_nuevo == "reservada":
            validar_stock_disponible(db, oferta_data.items, oferta_data.almacen_id)
            reservar_stock_oferta(db, oferta_data.items, oferta_data.almacen_id)
        
        # 6. Actualizar datos de la oferta
        oferta.tipo = oferta_data.tipo_oferta
        oferta.cliente_numero = oferta_data.cliente_numero
        oferta.almacen_id = oferta_data.almacen_id
        oferta.foto_portada = oferta_data.foto_portada or oferta_data.foto_portada_url
        oferta.estado = estado_nuevo
        
        # Actualizar items (eliminar anteriores y crear nuevos)
        db.query(OfertaItem).filter(
            OfertaItem.oferta_id == oferta.id
        ).delete()
        
        for item_data in oferta_data.items:
            item = OfertaItem(
                oferta_id=oferta.id,
                material_codigo=item_data.material_codigo,
                descripcion=item_data.descripcion,
                precio=item_data.precio,
                cantidad=item_data.cantidad,
                categoria=item_data.categoria,
                seccion=item_data.seccion,
                margen_asignado=item_data.margen_asignado
            )
            db.add(item)
        
        # Actualizar elementos personalizados
        if oferta_data.elementos_personalizados:
            db.query(OfertaElementoPersonalizado).filter(
                OfertaElementoPersonalizado.oferta_id == oferta.id
            ).delete()
            
            for elem_data in oferta_data.elementos_personalizados:
                elem = OfertaElementoPersonalizado(
                    oferta_id=oferta.id,
                    material_codigo=elem_data.material_codigo,
                    descripcion=elem_data.descripcion,
                    precio=elem_data.precio,
                    cantidad=elem_data.cantidad,
                    categoria=elem_data.categoria
                )
                db.add(elem)
        
        # Actualizar secciones personalizadas
        if oferta_data.secciones_personalizadas:
            oferta.secciones_personalizadas = json.dumps(
                [s.dict() for s in oferta_data.secciones_personalizadas]
            )
        
        # Actualizar componentes principales
        if oferta_data.componentes_principales:
            oferta.componentes_principales = json.dumps(
                oferta_data.componentes_principales.dict()
            )
        
        # Actualizar márgenes y costos
        oferta.margen_comercial = oferta_data.margen_comercial
        oferta.porcentaje_margen_materiales = oferta_data.porcentaje_margen_materiales
        oferta.porcentaje_margen_instalacion = oferta_data.porcentaje_margen_instalacion
        oferta.margen_total = oferta_data.margen_total
        oferta.margen_materiales = oferta_data.margen_materiales
        oferta.margen_instalacion = oferta_data.margen_instalacion
        oferta.costo_transportacion = oferta_data.costo_transportacion
        oferta.total_materiales = oferta_data.total_materiales
        oferta.subtotal_con_margen = oferta_data.subtotal_con_margen
        oferta.total_elementos_personalizados = oferta_data.total_elementos_personalizados
        oferta.total_costos_extras = oferta_data.total_costos_extras
        oferta.precio_final = oferta_data.precio_final
        
        # Actualizar datos de pago
        oferta.moneda_pago = oferta_data.moneda_pago
        oferta.tasa_cambio = oferta_data.tasa_cambio
        oferta.pago_transferencia = oferta_data.pago_transferencia
        oferta.datos_cuenta = oferta_data.datos_cuenta
        oferta.aplica_contribucion = oferta_data.aplica_contribucion
        oferta.porcentaje_contribucion = oferta_data.porcentaje_contribucion
        
        # Recalcular nombre automático
        oferta.nombre = generar_nombre_automatico(oferta_data)
        
        # Actualizar fecha de modificación
        oferta.fecha_actualizacion = datetime.utcnow()
        
        # 7. Guardar cambios
        db.commit()
        db.refresh(oferta)
        
        # 8. Retornar respuesta
        return {
            "success": True,
            "message": "Oferta actualizada exitosamente",
            "data": {
                "id": oferta.id,
                "numero_oferta": oferta.numero_oferta,
                "nombre_automatico": oferta.nombre,
                "tipo": oferta.tipo,
                "estado": oferta.estado,
                "almacen_id": oferta.almacen_id,
                "cliente_numero": oferta.cliente_numero,
                "foto_portada": oferta.foto_portada,
                "precio_final": oferta.precio_final,
                "total_materiales": oferta.total_materiales,
                "margen_comercial": oferta.margen_comercial,
                "fecha_actualizacion": oferta.fecha_actualizacion.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar oferta: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al actualizar oferta: {str(e)}"
        )


def devolver_stock_oferta(db: Session, oferta: OfertaConfeccion):
    """
    Devuelve al stock los materiales de una oferta reservada
    """
    items = db.query(OfertaItem).filter(
        OfertaItem.oferta_id == oferta.id
    ).all()
    
    for item in items:
        stock = db.query(Stock).filter(
            Stock.almacen_id == oferta.almacen_id,
            Stock.material_codigo == item.material_codigo
        ).first()
        
        if stock:
            stock.cantidad += item.cantidad
            stock.cantidad_reservada -= item.cantidad


def validar_stock_disponible(db: Session, items: list, almacen_id: str):
    """
    Valida que hay stock suficiente para todos los materiales
    """
    for item in items:
        stock = db.query(Stock).filter(
            Stock.almacen_id == almacen_id,
            Stock.material_codigo == item.material_codigo
        ).first()
        
        if not stock:
            raise HTTPException(
                status_code=400,
                detail=f"Material {item.material_codigo} no tiene stock en el almacén"
            )
        
        stock_disponible = stock.cantidad - stock.cantidad_reservada
        
        if stock_disponible < item.cantidad:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para {item.descripcion}. "
                       f"Disponible: {stock_disponible}, Requerido: {item.cantidad}"
            )


def reservar_stock_oferta(db: Session, items: list, almacen_id: str):
    """
    Reserva el stock de los materiales de la oferta
    """
    for item in items:
        stock = db.query(Stock).filter(
            Stock.almacen_id == almacen_id,
            Stock.material_codigo == item.material_codigo
        ).first()
        
        if stock:
            stock.cantidad -= item.cantidad
            stock.cantidad_reservada += item.cantidad


def generar_nombre_automatico(oferta_data: OfertaConfeccionUpdate) -> str:
    """
    Genera el nombre automático de la oferta basado en los componentes principales
    """
    componentes = []
    
    if oferta_data.componentes_principales:
        # Lógica para generar nombre basado en inversor, batería y panel
        # Similar a la lógica del frontend
        pass
    
    if not componentes:
        return "Oferta sin componentes principales"
    
    return " + ".join(componentes)
```

## Casos de Prueba

### 1. Actualizar oferta sin cambiar estado
```bash
PUT /ofertas/confeccion/OF-2024-001
{
  "tipo_oferta": "personalizada",
  "cliente_numero": "CLI-001",
  "almacen_id": "ALM-001",
  "estado": "en_revision",
  "items": [...],
  "precio_final": 5000
}
```
**Esperado**: Oferta actualizada, sin cambios en stock

### 2. Actualizar oferta y cambiar a reservada
```bash
PUT /ofertas/confeccion/OF-2024-001
{
  ...
  "estado": "reservada"
}
```
**Esperado**: Oferta actualizada, stock descontado

### 3. Actualizar oferta reservada con diferentes materiales
```bash
PUT /ofertas/confeccion/OF-2024-001
{
  ...
  "estado": "reservada",
  "items": [
    // Materiales diferentes a los originales
  ]
}
```
**Esperado**: Stock anterior devuelto, nuevo stock reservado

### 4. Actualizar oferta que no existe
```bash
PUT /ofertas/confeccion/OF-9999-999
```
**Esperado**: Error 404

### 5. Actualizar con stock insuficiente
```bash
PUT /ofertas/confeccion/OF-2024-001
{
  ...
  "estado": "reservada",
  "items": [
    {
      "material_codigo": "MAT-001",
      "cantidad": 1000 // Más de lo disponible
    }
  ]
}
```
**Esperado**: Error 400 con mensaje de stock insuficiente

## Notas Importantes

1. **Transacciones**: Usa transacciones de base de datos para asegurar que todos los cambios se apliquen o ninguno
2. **Logs**: Registra todas las actualizaciones para auditoría
3. **Historial**: Considera guardar un historial de cambios (opcional)
4. **Validaciones**: Valida todos los datos antes de actualizar
5. **Stock**: El manejo de stock es crítico, asegúrate de que sea atómico
6. **Permisos**: Verifica que el usuario tenga permisos para editar ofertas

## Endpoint Existente que Debes Mantener

### GET `/ofertas/confeccion/{oferta_id}`
Debe retornar todos los datos necesarios para la edición, incluyendo:
- items completos
- elementos_personalizados
- secciones_personalizadas
- componentes_principales
- Todos los campos de márgenes, costos y pago

El frontend ya está preparado para recibir estos datos del endpoint GET existente.

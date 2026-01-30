# Backend: Ofertas con Clientes o Leads

## Resumen
Las ofertas personalizadas ahora pueden estar asociadas a un **Cliente** o a un **Lead**. El frontend envía `cliente_numero` o `lead_id` según la selección del usuario.

## Cambios en el Request Body

### POST `/ofertas/confeccion/` y PUT `/ofertas/confeccion/{oferta_id}`

```json
{
  "tipo_oferta": "generica" | "personalizada",
  
  // Para ofertas personalizadas con CLIENTE
  "cliente_numero": "string (opcional)",
  
  // Para ofertas personalizadas con LEAD
  "lead_id": "string (opcional)",
  
  "almacen_id": "string",
  "items": [...],
  // ... resto de campos
}
```

## Validaciones Requeridas

### 1. Ofertas Personalizadas
Una oferta personalizada DEBE tener:
- `cliente_numero` (si es para un cliente), O
- `lead_id` (si es para un lead)

**NO puede tener ambos al mismo tiempo.**

```python
if tipo_oferta == "personalizada":
    if not cliente_numero and not lead_id:
        raise HTTPException(
            status_code=400,
            detail="Oferta personalizada requiere cliente_numero o lead_id"
        )
    
    if cliente_numero and lead_id:
        raise HTTPException(
            status_code=400,
            detail="Oferta personalizada no puede tener cliente y lead al mismo tiempo"
        )
```

### 2. Validar que el Lead existe
```python
if lead_id:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(
            status_code=400,
            detail=f"Lead {lead_id} no encontrado"
        )
```

## Modelo de Base de Datos

Agregar campo `lead_id` a la tabla de ofertas:

```python
class OfertaConfeccion(Base):
    __tablename__ = "ofertas_confeccion"
    
    id = Column(String, primary_key=True)
    numero_oferta = Column(String, unique=True)
    nombre = Column(String)
    tipo = Column(String)  # 'generica' | 'personalizada'
    estado = Column(String)
    
    # Cliente (opcional)
    cliente_numero = Column(String, ForeignKey("clientes.numero"), nullable=True)
    cliente = relationship("Cliente")
    
    # Lead (opcional) - NUEVO
    lead_id = Column(String, ForeignKey("leads.id"), nullable=True)
    lead = relationship("Lead")
    
    almacen_id = Column(String, ForeignKey("almacenes.id"))
    # ... resto de campos
```

## Response

### GET `/ofertas/confeccion/` y GET `/ofertas/confeccion/{oferta_id}`

```json
{
  "id": "string",
  "numero_oferta": "string",
  "nombre": "string",
  "tipo": "personalizada",
  "estado": "string",
  
  // Si es cliente
  "cliente_id": "string",
  "cliente_numero": "string",
  "cliente_nombre": "string",
  
  // Si es lead - NUEVO
  "lead_id": "string",
  "lead_nombre": "string",
  
  "almacen_id": "string",
  "items": [...],
  // ... resto de campos
}
```

## Ejemplo de Implementación

```python
@router.post("/ofertas/confeccion/")
async def crear_oferta_confeccion(
    oferta_data: OfertaConfeccionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validar tipo de oferta
    if oferta_data.tipo_oferta == "personalizada":
        # Validar que tenga cliente o lead
        if not oferta_data.cliente_numero and not oferta_data.lead_id:
            raise HTTPException(
                status_code=400,
                detail="Oferta personalizada requiere cliente_numero o lead_id"
            )
        
        # Validar que no tenga ambos
        if oferta_data.cliente_numero and oferta_data.lead_id:
            raise HTTPException(
                status_code=400,
                detail="Oferta no puede tener cliente y lead al mismo tiempo"
            )
        
        # Validar cliente si existe
        if oferta_data.cliente_numero:
            cliente = db.query(Cliente).filter(
                Cliente.numero == oferta_data.cliente_numero
            ).first()
            if not cliente:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cliente {oferta_data.cliente_numero} no encontrado"
                )
        
        # Validar lead si existe
        if oferta_data.lead_id:
            lead = db.query(Lead).filter(
                Lead.id == oferta_data.lead_id
            ).first()
            if not lead:
                raise HTTPException(
                    status_code=400,
                    detail=f"Lead {oferta_data.lead_id} no encontrado"
                )
    
    # 2. Crear oferta
    oferta = OfertaConfeccion(
        id=generar_id(),
        numero_oferta=generar_numero_oferta(),
        nombre=oferta_data.nombre or generar_nombre_automatico(oferta_data),
        tipo=oferta_data.tipo_oferta,
        estado=oferta_data.estado,
        cliente_numero=oferta_data.cliente_numero,
        lead_id=oferta_data.lead_id,  # NUEVO
        almacen_id=oferta_data.almacen_id,
        # ... resto de campos
    )
    
    db.add(oferta)
    
    # 3. Agregar items
    for item_data in oferta_data.items:
        item = OfertaItem(
            oferta_id=oferta.id,
            material_codigo=item_data.material_codigo,
            # ... resto de campos
        )
        db.add(item)
    
    db.commit()
    db.refresh(oferta)
    
    # 4. Retornar respuesta
    return {
        "success": True,
        "message": "Oferta creada exitosamente",
        "data": {
            "id": oferta.id,
            "numero_oferta": oferta.numero_oferta,
            "nombre": oferta.nombre,
            "tipo": oferta.tipo,
            "cliente_numero": oferta.cliente_numero,
            "lead_id": oferta.lead_id,  # NUEVO
            # ... resto de campos
        }
    }
```

## Serialización de Response

```python
def serialize_oferta(oferta: OfertaConfeccion) -> dict:
    data = {
        "id": oferta.id,
        "numero_oferta": oferta.numero_oferta,
        "nombre": oferta.nombre,
        "tipo": oferta.tipo,
        "estado": oferta.estado,
        "almacen_id": oferta.almacen_id,
        # ... resto de campos
    }
    
    # Agregar datos de cliente si existe
    if oferta.cliente_numero and oferta.cliente:
        data["cliente_id"] = oferta.cliente.id
        data["cliente_numero"] = oferta.cliente.numero
        data["cliente_nombre"] = oferta.cliente.nombre
    
    # Agregar datos de lead si existe - NUEVO
    if oferta.lead_id and oferta.lead:
        data["lead_id"] = oferta.lead.id
        data["lead_nombre"] = oferta.lead.nombre_completo or oferta.lead.nombre
    
    return data
```

## Casos de Uso

### 1. Crear oferta para un cliente
```json
POST /ofertas/confeccion/
{
  "tipo_oferta": "personalizada",
  "cliente_numero": "CLI-001",
  "almacen_id": "ALM-001",
  "items": [...]
}
```

### 2. Crear oferta para un lead
```json
POST /ofertas/confeccion/
{
  "tipo_oferta": "personalizada",
  "lead_id": "LEAD-123",
  "almacen_id": "ALM-001",
  "items": [...]
}
```

### 3. Editar oferta y cambiar de cliente a lead
```json
PUT /ofertas/confeccion/OF-001
{
  "tipo_oferta": "personalizada",
  "cliente_numero": null,
  "lead_id": "LEAD-456",
  "almacen_id": "ALM-001",
  "items": [...]
}
```

## Migraciones de Base de Datos

### Alembic Migration
```python
def upgrade():
    op.add_column('ofertas_confeccion', 
        sa.Column('lead_id', sa.String(), nullable=True)
    )
    op.create_foreign_key(
        'fk_ofertas_confeccion_lead_id',
        'ofertas_confeccion', 'leads',
        ['lead_id'], ['id']
    )

def downgrade():
    op.drop_constraint('fk_ofertas_confeccion_lead_id', 'ofertas_confeccion')
    op.drop_column('ofertas_confeccion', 'lead_id')
```

## Notas Importantes

1. **Exclusividad**: Una oferta personalizada solo puede tener cliente O lead, nunca ambos
2. **Validación**: Siempre validar que el lead existe antes de crear/actualizar
3. **Serialización**: Incluir datos del lead en las respuestas cuando exista
4. **Migración**: Agregar el campo `lead_id` a la tabla existente
5. **Relaciones**: Configurar correctamente la relación con la tabla de leads

## Frontend Implementado ✅

- Selector de tipo de contacto (Cliente/Lead)
- Carga de leads desde el backend
- Envío de `lead_id` en lugar de `cliente_numero` cuando se selecciona un lead
- Visualización de datos del lead seleccionado
- Soporte en modo edición para cargar ofertas con leads

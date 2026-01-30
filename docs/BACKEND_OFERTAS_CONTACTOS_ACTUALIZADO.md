# Backend: Ofertas con Cliente, Lead o Lead Sin Agregar

## Resumen
Las ofertas personalizadas ahora pueden estar asociadas a:
1. **Cliente** - Cliente existente en la base de datos
2. **Lead** - Lead existente en la base de datos  
3. **Lead Sin Agregar** - Nombre de contacto sin crear registro en la BD

## Request Body

### POST `/ofertas/confeccion/` y PUT `/ofertas/confeccion/{oferta_id}`

```json
{
  "tipo_oferta": "generica" | "personalizada",
  
  // OPCIÓN 1: Cliente existente
  "cliente_numero": "string (opcional)",
  
  // OPCIÓN 2: Lead existente
  "lead_id": "string (opcional)",
  
  // OPCIÓN 3: Lead sin agregar (solo nombre)
  "nombre_lead_sin_agregar": "string (opcional)",
  
  "almacen_id": "string",
  "items": [...],
  // ... resto de campos
}
```

## Validaciones Requeridas

### 1. Ofertas Personalizadas
Una oferta personalizada DEBE tener **EXACTAMENTE UNO** de estos campos:
- `cliente_numero`, O
- `lead_id`, O
- `nombre_lead_sin_agregar`

```python
if tipo_oferta == "personalizada":
    campos_contacto = [
        oferta_data.cliente_numero,
        oferta_data.lead_id,
        oferta_data.nombre_lead_sin_agregar
    ]
    
    # Contar cuántos campos tienen valor
    campos_con_valor = sum(1 for campo in campos_contacto if campo)
    
    if campos_con_valor == 0:
        raise HTTPException(
            status_code=400,
            detail="Oferta personalizada requiere cliente_numero, lead_id o nombre_lead_sin_agregar"
        )
    
    if campos_con_valor > 1:
        raise HTTPException(
            status_code=400,
            detail="Oferta personalizada solo puede tener un tipo de contacto"
        )
```

### 2. Validar Cliente si existe
```python
if cliente_numero:
    cliente = db.query(Cliente).filter(Cliente.numero == cliente_numero).first()
    if not cliente:
        raise HTTPException(
            status_code=400,
            detail=f"Cliente {cliente_numero} no encontrado"
        )
```

### 3. Validar Lead si existe
```python
if lead_id:
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(
            status_code=400,
            detail=f"Lead {lead_id} no encontrado"
        )
```

### 4. Validar nombre de lead sin agregar
```python
if nombre_lead_sin_agregar:
    if not nombre_lead_sin_agregar.strip():
        raise HTTPException(
            status_code=400,
            detail="El nombre del lead no puede estar vacío"
        )
    
    if len(nombre_lead_sin_agregar.strip()) < 3:
        raise HTTPException(
            status_code=400,
            detail="El nombre del lead debe tener al menos 3 caracteres"
        )
```

## Modelo de Base de Datos

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
    
    # Lead (opcional)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=True)
    lead = relationship("Lead")
    
    # Lead sin agregar (opcional) - NUEVO
    nombre_lead_sin_agregar = Column(String, nullable=True)
    
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
  
  // Si es lead
  "lead_id": "string",
  "lead_nombre": "string",
  
  // Si es lead sin agregar - NUEVO
  "nombre_lead_sin_agregar": "string",
  
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
        # Contar campos de contacto
        campos_contacto = [
            oferta_data.cliente_numero,
            oferta_data.lead_id,
            oferta_data.nombre_lead_sin_agregar
        ]
        campos_con_valor = sum(1 for campo in campos_contacto if campo)
        
        if campos_con_valor == 0:
            raise HTTPException(
                status_code=400,
                detail="Oferta personalizada requiere un tipo de contacto"
            )
        
        if campos_con_valor > 1:
            raise HTTPException(
                status_code=400,
                detail="Oferta solo puede tener un tipo de contacto"
            )
        
        # Validar cliente
        if oferta_data.cliente_numero:
            cliente = db.query(Cliente).filter(
                Cliente.numero == oferta_data.cliente_numero
            ).first()
            if not cliente:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cliente {oferta_data.cliente_numero} no encontrado"
                )
        
        # Validar lead
        if oferta_data.lead_id:
            lead = db.query(Lead).filter(
                Lead.id == oferta_data.lead_id
            ).first()
            if not lead:
                raise HTTPException(
                    status_code=400,
                    detail=f"Lead {oferta_data.lead_id} no encontrado"
                )
        
        # Validar nombre de lead sin agregar
        if oferta_data.nombre_lead_sin_agregar:
            nombre = oferta_data.nombre_lead_sin_agregar.strip()
            if not nombre:
                raise HTTPException(
                    status_code=400,
                    detail="El nombre del lead no puede estar vacío"
                )
            if len(nombre) < 3:
                raise HTTPException(
                    status_code=400,
                    detail="El nombre del lead debe tener al menos 3 caracteres"
                )
    
    # 2. Crear oferta
    oferta = OfertaConfeccion(
        id=generar_id(),
        numero_oferta=generar_numero_oferta(),
        nombre=oferta_data.nombre or generar_nombre_automatico(oferta_data),
        tipo=oferta_data.tipo_oferta,
        estado=oferta_data.estado,
        cliente_numero=oferta_data.cliente_numero,
        lead_id=oferta_data.lead_id,
        nombre_lead_sin_agregar=oferta_data.nombre_lead_sin_agregar,  # NUEVO
        almacen_id=oferta_data.almacen_id,
        # ... resto de campos
    )
    
    db.add(oferta)
    db.commit()
    db.refresh(oferta)
    
    # 3. Retornar respuesta
    return {
        "success": True,
        "message": "Oferta creada exitosamente",
        "data": serialize_oferta(oferta)
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
    
    # Agregar datos de lead si existe
    if oferta.lead_id and oferta.lead:
        data["lead_id"] = oferta.lead.id
        data["lead_nombre"] = oferta.lead.nombre_completo or oferta.lead.nombre
    
    # Agregar nombre de lead sin agregar si existe - NUEVO
    if oferta.nombre_lead_sin_agregar:
        data["nombre_lead_sin_agregar"] = oferta.nombre_lead_sin_agregar
    
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

### 3. Crear oferta para lead sin agregar
```json
POST /ofertas/confeccion/
{
  "tipo_oferta": "personalizada",
  "nombre_lead_sin_agregar": "Juan Pérez",
  "almacen_id": "ALM-001",
  "items": [...]
}
```

### 4. Editar oferta y cambiar tipo de contacto
```json
PUT /ofertas/confeccion/OF-001
{
  "tipo_oferta": "personalizada",
  "cliente_numero": null,
  "lead_id": null,
  "nombre_lead_sin_agregar": "María González",
  "almacen_id": "ALM-001",
  "items": [...]
}
```

## Migraciones de Base de Datos

### Alembic Migration
```python
def upgrade():
    # Agregar campo lead_id si no existe
    op.add_column('ofertas_confeccion', 
        sa.Column('lead_id', sa.String(), nullable=True)
    )
    op.create_foreign_key(
        'fk_ofertas_confeccion_lead_id',
        'ofertas_confeccion', 'leads',
        ['lead_id'], ['id']
    )
    
    # Agregar campo nombre_lead_sin_agregar - NUEVO
    op.add_column('ofertas_confeccion',
        sa.Column('nombre_lead_sin_agregar', sa.String(), nullable=True)
    )

def downgrade():
    op.drop_constraint('fk_ofertas_confeccion_lead_id', 'ofertas_confeccion')
    op.drop_column('ofertas_confeccion', 'lead_id')
    op.drop_column('ofertas_confeccion', 'nombre_lead_sin_agregar')
```

## Notas Importantes

1. **Exclusividad**: Una oferta personalizada solo puede tener UN tipo de contacto
2. **Validación**: Validar que cliente/lead existan, y que nombre_lead_sin_agregar no esté vacío
3. **Serialización**: Incluir el campo correspondiente en las respuestas
4. **Migración**: Agregar ambos campos nuevos a la tabla
5. **Lead sin agregar**: NO se crea registro en la tabla de leads, solo se guarda el nombre

## Frontend Implementado ✅

### Diseño Mejorado:
- ✅ Selector visual con 3 opciones en grid
- ✅ Iconos para cada tipo de contacto
- ✅ Buscador de leads similar al de clientes
- ✅ Campo de texto para lead sin agregar
- ✅ Tarjetas de información con colores distintivos:
  - Verde para clientes
  - Azul para leads
- ✅ Validaciones completas
- ✅ Soporte en modo edición

### Componentes Nuevos:
- `LeadSearchSelector` - Buscador de leads con autocompletado

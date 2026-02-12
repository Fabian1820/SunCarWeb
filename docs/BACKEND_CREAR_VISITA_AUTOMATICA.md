# Backend: Creación Automática de Visitas

## 📋 Resumen

Cuando un **lead** o **cliente** cambia su estado a **"Pendiente de visita"**, el backend debe:

1. ✅ Recibir el campo `motivo_visita` en el request body
2. ✅ Crear automáticamente un registro en la colección/tabla `visitas`
3. ✅ **NO** guardar el campo `motivo_visita` en el lead/cliente
4. ✅ Retornar el lead/cliente actualizado sin el campo `motivo_visita`

---

## 🎯 Modelo de Datos

### Colección: `visitas`

```python
class VisitaModel(BaseModel):
    id: Optional[str] = None
    tipo: str  # "lead" | "cliente"
    entidad_id: str  # ID del lead o número del cliente
    nombre: str  # Nombre del lead/cliente (para búsquedas rápidas)
    telefono: str  # Teléfono del lead/cliente
    direccion: Optional[str] = None
    estado: str  # "programada" | "completada" | "cancelada"
    motivo: str  # MOTIVO DE LA VISITA (viene de motivo_visita del frontend)
    fecha_programada: Optional[datetime] = None  # Fecha cuando se programa
    fecha_creacion: datetime  # Fecha de creación del registro
    fecha_completada: Optional[datetime] = None  # Fecha cuando se completa
    comercial: Optional[str] = None  # Comercial asignado
    notas: Optional[str] = None  # Notas adicionales
```

### Índices Recomendados

```javascript
db.visitas.createIndex({ entidad_id: 1 })
db.visitas.createIndex({ tipo: 1, estado: 1 })
db.visitas.createIndex({ fecha_programada: 1 })
```

---

## 🔧 Implementación

### 1. Endpoint: POST /api/leads (Crear Lead)

#### Request Body
```json
{
  "nombre": "Juan Pérez",
  "telefono": "+5355123456",
  "estado": "Pendiente de visita",
  "motivo_visita": "Cliente interesado en sistema de 5kW para casa",
  "direccion": "Calle 23 #456, Vedado",
  "fecha_contacto": "2025-02-01"
}
```

#### Lógica Backend

```python
@router.post("/leads/")
async def create_lead(lead_data: LeadCreate):
    # Extraer motivo_visita del request
    motivo_visita = lead_data.motivo_visita
    
    # Crear el lead SIN el campo motivo_visita
    lead_dict = lead_data.dict(exclude={"motivo_visita"})
    result = await db.leads.insert_one(lead_dict)
    lead_id = str(result.inserted_id)
    
    # Si el estado es "Pendiente de visita" y hay motivo
    if lead_data.estado == "Pendiente de visita" and motivo_visita:
        # Crear visita automáticamente
        visita = {
            "tipo": "lead",
            "entidad_id": lead_id,
            "nombre": lead_data.nombre,
            "telefono": lead_data.telefono,
            "direccion": lead_data.direccion,
            "estado": "programada",
            "motivo": motivo_visita,  # Aquí va el motivo
            "fecha_creacion": datetime.utcnow(),
            "comercial": lead_data.comercial,
            "notas": None
        }
        await db.visitas.insert_one(visita)
    
    # Retornar el lead creado (sin motivo_visita)
    return await db.leads.find_one({"_id": ObjectId(lead_id)})
```

---

### 2. Endpoint: PATCH /api/leads/{lead_id} (Editar Lead)

#### Request Body
```json
{
  "estado": "Pendiente de visita",
  "motivo_visita": "Revisión de instalación anterior",
  "comentario": "Cliente ya tiene paneles instalados"
}
```

#### Lógica Backend

```python
@router.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, lead_data: LeadUpdate):
    # Obtener el lead actual
    current_lead = await db.leads.find_one({"_id": ObjectId(lead_id)})
    if not current_lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Extraer motivo_visita del request
    motivo_visita = lead_data.motivo_visita
    estado_nuevo = lead_data.estado
    estado_anterior = current_lead.get("estado")
    
    # Crear el update dict SIN motivo_visita
    update_dict = lead_data.dict(exclude_unset=True, exclude={"motivo_visita"})
    
    # Si cambió a "Pendiente de visita" y hay motivo
    if (estado_nuevo == "Pendiente de visita" and 
        estado_anterior != "Pendiente de visita" and 
        motivo_visita):
        
        # Crear visita automáticamente
        visita = {
            "tipo": "lead",
            "entidad_id": lead_id,
            "nombre": current_lead.get("nombre"),
            "telefono": current_lead.get("telefono"),
            "direccion": current_lead.get("direccion"),
            "estado": "programada",
            "motivo": motivo_visita,
            "fecha_creacion": datetime.utcnow(),
            "comercial": current_lead.get("comercial"),
            "notas": None
        }
        await db.visitas.insert_one(visita)
    
    # Actualizar el lead
    await db.leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": update_dict}
    )
    
    # Retornar el lead actualizado
    return await db.leads.find_one({"_id": ObjectId(lead_id)})
```

---

### 3. Endpoint: POST /api/clientes (Crear Cliente)

#### Request Body
```json
{
  "numero": "H100500124",
  "nombre": "Ana López",
  "telefono": "+5355789012",
  "direccion": "Ave. 26 #789, Nuevo Vedado",
  "estado": "Pendiente de visita",
  "motivo_visita": "Instalación de sistema de respaldo con baterías"
}
```

#### Lógica Backend

```python
@router.post("/clientes/")
async def create_cliente(cliente_data: ClienteCreate):
    # Extraer motivo_visita del request
    motivo_visita = cliente_data.motivo_visita
    
    # Crear el cliente SIN el campo motivo_visita
    cliente_dict = cliente_data.dict(exclude={"motivo_visita"})
    result = await db.clientes.insert_one(cliente_dict)
    numero = cliente_dict.get("numero")
    
    # Si el estado es "Pendiente de visita" y hay motivo
    if cliente_data.estado == "Pendiente de visita" and motivo_visita:
        # Crear visita automáticamente
        visita = {
            "tipo": "cliente",
            "entidad_id": numero,  # Número del cliente
            "nombre": cliente_data.nombre,
            "telefono": cliente_data.telefono,
            "direccion": cliente_data.direccion,
            "estado": "programada",
            "motivo": motivo_visita,
            "fecha_creacion": datetime.utcnow(),
            "comercial": cliente_data.comercial,
            "notas": None
        }
        await db.visitas.insert_one(visita)
    
    # Retornar el cliente creado
    return await db.clientes.find_one({"numero": numero})
```

---

### 4. Endpoint: PATCH /api/clientes/{numero_cliente} (Editar Cliente)

Similar a la lógica de PATCH leads, pero usando `numero` en lugar de `_id`.

---

## 🔍 Endpoints Adicionales para Visitas

### GET /api/visitas (Listar todas las visitas)

```python
@router.get("/visitas/")
async def get_visitas(
    estado: Optional[str] = None,
    tipo: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    query = {}
    if estado:
        query["estado"] = estado
    if tipo:
        query["tipo"] = tipo
    
    visitas = await db.visitas.find(query).skip(skip).limit(limit).to_list()
    total = await db.visitas.count_documents(query)
    
    return {
        "visitas": visitas,
        "total": total
    }
```

### GET /api/visitas/lead/{lead_id} (Visitas de un lead)

```python
@router.get("/visitas/lead/{lead_id}")
async def get_visitas_lead(lead_id: str):
    visitas = await db.visitas.find({
        "tipo": "lead",
        "entidad_id": lead_id
    }).to_list()
    
    return visitas
```

### GET /api/visitas/cliente/{numero_cliente} (Visitas de un cliente)

```python
@router.get("/visitas/cliente/{numero_cliente}")
async def get_visitas_cliente(numero_cliente: str):
    visitas = await db.visitas.find({
        "tipo": "cliente",
        "entidad_id": numero_cliente
    }).to_list()
    
    return visitas
```

### PATCH /api/visitas/{visita_id} (Actualizar visita)

```python
@router.patch("/visitas/{visita_id}")
async def update_visita(visita_id: str, visita_data: VisitaUpdate):
    result = await db.visitas.update_one(
        {"_id": ObjectId(visita_id)},
        {"$set": visita_data.dict(exclude_unset=True)}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Visita not found")
    
    return await db.visitas.find_one({"_id": ObjectId(visita_id)})
```

---

## ✅ Validaciones Importantes

### 1. En Schemas de Pydantic

```python
class LeadCreate(BaseModel):
    nombre: str
    telefono: str
    estado: str
    motivo_visita: Optional[str] = None  # Campo opcional
    # ... otros campos
    
    @validator('motivo_visita')
    def validate_motivo_visita(cls, v, values):
        # Si estado es "Pendiente de visita", motivo_visita es OBLIGATORIO
        if values.get('estado') == "Pendiente de visita" and not v:
            raise ValueError('motivo_visita es obligatorio cuando estado es "Pendiente de visita"')
        return v
```

### 2. En MongoDB Schema

```javascript
db.createCollection("visitas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["tipo", "entidad_id", "nombre", "estado", "motivo", "fecha_creacion"],
      properties: {
        tipo: {
          enum: ["lead", "cliente"],
          description: "Tipo de entidad"
        },
        entidad_id: {
          bsonType: "string",
          description: "ID del lead o número del cliente"
        },
        estado: {
          enum: ["programada", "completada", "cancelada"],
          description: "Estado de la visita"
        },
        motivo: {
          bsonType: "string",
          minLength: 1,
          description: "Motivo de la visita (OBLIGATORIO)"
        }
      }
    }
  }
})
```

---

## 🧪 Casos de Prueba

### Test 1: Crear Lead con Estado "Pendiente de visita"

**Request:**
```bash
curl -X POST http://localhost:8000/api/leads/ \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test Lead",
    "telefono": "+5355111111",
    "estado": "Pendiente de visita",
    "motivo_visita": "Primera visita técnica",
    "fecha_contacto": "2025-02-01"
  }'
```

**Verificar:**
1. Lead creado SIN campo `motivo_visita`
2. Registro creado en `db.visitas` con `motivo = "Primera visita técnica"`

---

### Test 2: Cambiar Estado de Lead a "Pendiente de visita"

**Request:**
```bash
curl -X PATCH http://localhost:8000/api/leads/64abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "Pendiente de visita",
    "motivo_visita": "Seguimiento después de oferta"
  }'
```

**Verificar:**
1. Lead actualizado con nuevo estado
2. Nueva visita creada en `db.visitas`

---

### Test 3: Cambiar de "Pendiente de visita" a otro estado

**Request:**
```bash
curl -X PATCH http://localhost:8000/api/leads/64abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "Interesado"
  }'
```

**Verificar:**
1. Lead actualizado
2. NO se crea nueva visita
3. Visitas anteriores permanecen intactas

---

## 📊 Flujo de Datos Completo

```
Frontend (Create/Edit Lead)
         │
         ├─ estado: "Pendiente de visita"
         ├─ motivo_visita: "Texto del motivo"
         │
         ▼
Backend (POST/PATCH /leads)
         │
         ├─ Extrae motivo_visita del request
         ├─ Crea/actualiza lead SIN motivo_visita
         │
         ├─ ¿Estado = "Pendiente de visita"?
         │      │
         │      ├─ SÍ → Crear visita con motivo
         │      └─ NO → No hacer nada
         │
         ▼
MongoDB
         │
         ├─ Colección: leads (sin motivo_visita)
         └─ Colección: visitas (con campo motivo)
```

---

## 🚨 Errores Comunes a Evitar

### ❌ NO HACER ESTO:

```python
# MAL: Guardar motivo_visita en el lead
lead_dict = lead_data.dict()  # Incluye motivo_visita
await db.leads.insert_one(lead_dict)
```

### ✅ HACER ESTO:

```python
# BIEN: Excluir motivo_visita del lead
motivo_visita = lead_data.motivo_visita
lead_dict = lead_data.dict(exclude={"motivo_visita"})
await db.leads.insert_one(lead_dict)

# Crear visita separada
if lead_data.estado == "Pendiente de visita" and motivo_visita:
    await db.visitas.insert_one({"motivo": motivo_visita, ...})
```

---

## 📝 Checklist de Implementación

- [ ] Crear colección `visitas` en MongoDB
- [ ] Agregar índices a la colección `visitas`
- [ ] Crear modelo `VisitaModel` en Pydantic
- [ ] Agregar campo `motivo_visita: Optional[str]` en `LeadCreate` y `LeadUpdate`
- [ ] Agregar campo `motivo_visita: Optional[str]` en `ClienteCreate` y `ClienteUpdate`
- [ ] Implementar lógica de creación de visita en POST /leads
- [ ] Implementar lógica de creación de visita en PATCH /leads
- [ ] Implementar lógica de creación de visita en POST /clientes
- [ ] Implementar lógica de creación de visita en PATCH /clientes
- [ ] Crear endpoints GET /visitas
- [ ] Crear endpoints GET /visitas/lead/{id}
- [ ] Crear endpoints GET /visitas/cliente/{numero}
- [ ] Crear endpoint PATCH /visitas/{id}
- [ ] Agregar validación: motivo_visita obligatorio si estado = "Pendiente de visita"
- [ ] Probar creación de lead con visita
- [ ] Probar actualización de lead con visita
- [ ] Probar que motivo_visita NO se guarda en lead/cliente

---

## 🔗 Referencias

- `docs/leads copy.md` - Documentación de API Leads
- `docs/CLIENTES copy.md` - Documentación de API Clientes
- Frontend: `components/feats/leads/create-lead-dialog.tsx`
- Frontend: `components/feats/leads/edit-lead-dialog.tsx`

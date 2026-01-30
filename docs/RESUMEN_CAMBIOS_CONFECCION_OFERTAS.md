# Resumen de Cambios - Sistema de Confección de Ofertas

## ✅ Cambios Ya Implementados en Frontend

### 1. Componente Principal: `confeccion-ofertas-view.tsx`

**Nuevas Funcionalidades:**
- ✅ Selector compacto de tipo de contacto (Cliente / Lead / Nuevo)
- ✅ Soporte para 3 tipos de contacto:
  - Cliente existente (con `ClienteSearchSelector`)
  - Lead existente (con `LeadSearchSelector` actualizado)
  - Lead sin agregar (campo de texto simple)
- ✅ Foto de portada con subida de imagen
- ✅ Secciones personalizadas (materiales, texto, costos extras)
- ✅ Elementos personalizados
- ✅ Componentes principales (inversor, batería, panel)
- ✅ Configuración de pago:
  - Moneda (USD, EUR, CUP)
  - Tasa de cambio
  - Pago por transferencia con datos de cuenta
  - Contribución con porcentaje
- ✅ Cálculo automático de márgenes distribuidos
- ✅ Reserva de materiales (temporal/definitiva)
- ✅ Modo edición completo
- ✅ Exportación en 3 formatos (completo, sin precios, cliente con precios)

### 2. Componente de Búsqueda: `lead-search-selector.tsx`

**Actualizado para:**
- ✅ Mismo diseño que `ClienteSearchSelector`
- ✅ Búsqueda con dropdown
- ✅ Muestra lead seleccionado con botón de limpiar
- ✅ Estados de carga consistentes

### 3. Hook: `use-ofertas-confeccion.ts`

**Campos Soportados:**
- ✅ `nombre_lead_sin_agregar`
- ✅ `foto_portada`
- ✅ `secciones_personalizadas`
- ✅ `elementos_personalizados`
- ✅ `componentes_principales`
- ✅ `moneda_pago`, `tasa_cambio`
- ✅ `pago_transferencia`, `datos_cuenta`
- ✅ `aplica_contribucion`, `porcentaje_contribucion`
- ✅ `total_costos_extras`

### 4. Componente de Edición: `editar-oferta-dialog.tsx`

**Funcionalidad:**
- ✅ Usa `ConfeccionOfertasView` en modo edición
- ✅ Carga todos los datos de la oferta
- ✅ Permite modificar y guardar cambios
- ✅ Callback de éxito para refrescar lista

### 5. Componente de Visualización: `ofertas-confeccionadas-view.tsx`

**Funcionalidad:**
- ✅ Lista de ofertas con filtros
- ✅ Tarjetas con foto de portada
- ✅ Botón de editar que abre el diálogo
- ✅ Exportación en 3 formatos
- ✅ Vista de detalle completa
- ✅ Muestra información de pago y contribución

---

## 📋 Cambios Requeridos en Backend

### Endpoints Principales

#### 1. POST `/ofertas/confeccion/` - Crear Oferta
**Nuevos Campos a Soportar:**
```json
{
  // Contacto (solo uno debe estar presente)
  "cliente_numero": "string (opcional)",
  "lead_id": "string (opcional)",
  "nombre_lead_sin_agregar": "string (opcional)",
  
  // Foto
  "foto_portada": "string (URL, opcional)",
  
  // Secciones personalizadas
  "secciones_personalizadas": [
    {
      "id": "string",
      "label": "string",
      "tipo": "materiales" | "extra",
      "tipo_extra": "escritura" | "costo",
      "categorias_materiales": ["string"],
      "contenido_escritura": "string",
      "costos_extras": [
        {
          "id": "string",
          "descripcion": "string",
          "cantidad": number,
          "precio_unitario": number
        }
      ]
    }
  ],
  
  // Elementos personalizados
  "elementos_personalizados": [
    {
      "material_codigo": "string",
      "descripcion": "string",
      "precio": number,
      "cantidad": number,
      "categoria": "string"
    }
  ],
  
  // Componentes principales
  "componentes_principales": {
    "inversor_seleccionado": "string",
    "bateria_seleccionada": "string",
    "panel_seleccionado": "string"
  },
  
  // Pago
  "moneda_pago": "USD" | "EUR" | "CUP",
  "tasa_cambio": number,
  "pago_transferencia": boolean,
  "datos_cuenta": "string",
  "aplica_contribucion": boolean,
  "porcentaje_contribucion": number,
  
  // Totales
  "total_costos_extras": number
}
```

#### 2. PUT `/ofertas/confeccion/{id}` - Actualizar Oferta
**Mismo formato que crear oferta**

#### 3. POST `/ofertas/confeccion/upload-foto-portada` - Subir Foto
```
multipart/form-data
- foto: archivo de imagen
- tipo: "oferta_portada"
```

**Response:**
```json
{
  "success": true,
  "url": "string (URL completa)",
  "filename": "string",
  "size": number,
  "content_type": "string"
}
```

#### 4. POST `/ofertas/confeccion/{id}/reservar-materiales` - Reservar
```json
{
  "tipo_reserva": "temporal" | "definitiva",
  "dias_reserva": number (opcional, solo temporal),
  "notas": "string (opcional)"
}
```

#### 5. POST `/ofertas/confeccion/{id}/liberar-materiales` - Liberar
Sin body, solo libera las reservas activas.

---

## 🔧 Validaciones Requeridas en Backend

### 1. Tipo de Contacto
```python
# Ofertas personalizadas DEBEN tener exactamente uno de:
if tipo_oferta == "personalizada":
    contactos = [cliente_numero, lead_id, nombre_lead_sin_agregar]
    contactos_presentes = [c for c in contactos if c]
    
    if len(contactos_presentes) != 1:
        raise ValidationError("Debe especificar exactamente un tipo de contacto")

# Ofertas genéricas NO deben tener contacto
if tipo_oferta == "generica":
    if any([cliente_numero, lead_id, nombre_lead_sin_agregar]):
        raise ValidationError("Las ofertas genéricas no pueden tener contacto")
```

### 2. Secciones Personalizadas
```python
for seccion in secciones_personalizadas:
    if seccion["tipo"] == "materiales":
        if not seccion.get("categorias_materiales"):
            raise ValidationError("Secciones de materiales requieren categorías")
    
    elif seccion["tipo"] == "extra":
        if not seccion.get("tipo_extra"):
            raise ValidationError("Secciones extra requieren tipo_extra")
        
        if seccion["tipo_extra"] == "costo":
            # costos_extras puede estar vacío inicialmente
            pass
```

### 3. Pago
```python
if moneda_pago != "USD" and tasa_cambio <= 0:
    raise ValidationError("Debe especificar tasa de cambio para monedas diferentes a USD")

if aplica_contribucion and porcentaje_contribucion <= 0:
    raise ValidationError("Debe especificar porcentaje de contribución")
```

### 4. Foto de Portada
```python
# Validar en endpoint de subida
if file.size > 5 * 1024 * 1024:  # 5MB
    raise ValidationError("La imagen no debe superar 5MB")

if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
    raise ValidationError("Solo se permiten imágenes JPG, PNG o WebP")
```

---

## 📊 Modelos de Base de Datos

### Tabla: `ofertas_confeccion`
```sql
ALTER TABLE ofertas_confeccion ADD COLUMN nombre_lead_sin_agregar VARCHAR(255);
ALTER TABLE ofertas_confeccion ADD COLUMN foto_portada TEXT;
ALTER TABLE ofertas_confeccion ADD COLUMN moneda_pago VARCHAR(10) DEFAULT 'USD';
ALTER TABLE ofertas_confeccion ADD COLUMN tasa_cambio DECIMAL(10,4) DEFAULT 0;
ALTER TABLE ofertas_confeccion ADD COLUMN pago_transferencia BOOLEAN DEFAULT FALSE;
ALTER TABLE ofertas_confeccion ADD COLUMN datos_cuenta TEXT;
ALTER TABLE ofertas_confeccion ADD COLUMN aplica_contribucion BOOLEAN DEFAULT FALSE;
ALTER TABLE ofertas_confeccion ADD COLUMN porcentaje_contribucion DECIMAL(5,2) DEFAULT 0;
ALTER TABLE ofertas_confeccion ADD COLUMN total_costos_extras DECIMAL(10,2) DEFAULT 0;
```

### Tabla: `secciones_personalizadas`
```sql
CREATE TABLE secciones_personalizadas (
    id VARCHAR(50) PRIMARY KEY,
    oferta_id VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'materiales' o 'extra'
    tipo_extra VARCHAR(20), -- 'escritura' o 'costo'
    categorias_materiales JSON, -- Array de strings
    contenido_escritura TEXT,
    FOREIGN KEY (oferta_id) REFERENCES ofertas_confeccion(id) ON DELETE CASCADE
);
```

### Tabla: `costos_extras`
```sql
CREATE TABLE costos_extras (
    id VARCHAR(50) PRIMARY KEY,
    seccion_id VARCHAR(50) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (seccion_id) REFERENCES secciones_personalizadas(id) ON DELETE CASCADE
);
```

### Tabla: `elementos_personalizados`
```sql
CREATE TABLE elementos_personalizados (
    id VARCHAR(50) PRIMARY KEY,
    oferta_id VARCHAR(50) NOT NULL,
    material_codigo VARCHAR(50) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    cantidad INT NOT NULL,
    categoria VARCHAR(100),
    FOREIGN KEY (oferta_id) REFERENCES ofertas_confeccion(id) ON DELETE CASCADE
);
```

### Tabla: `componentes_principales`
```sql
CREATE TABLE componentes_principales (
    oferta_id VARCHAR(50) PRIMARY KEY,
    inversor_seleccionado VARCHAR(50),
    bateria_seleccionada VARCHAR(50),
    panel_seleccionado VARCHAR(50),
    FOREIGN KEY (oferta_id) REFERENCES ofertas_confeccion(id) ON DELETE CASCADE
);
```

---

## 🧪 Tests Requeridos

### 1. Tests de Creación
- ✅ Crear oferta genérica sin contacto
- ✅ Crear oferta personalizada con cliente
- ✅ Crear oferta personalizada con lead
- ✅ Crear oferta personalizada con lead sin agregar
- ❌ Rechazar oferta genérica con contacto
- ❌ Rechazar oferta personalizada sin contacto
- ❌ Rechazar oferta personalizada con múltiples contactos

### 2. Tests de Secciones Personalizadas
- ✅ Crear sección de materiales con categorías
- ✅ Crear sección de escritura con contenido
- ✅ Crear sección de costos con costos extras
- ❌ Rechazar sección de materiales sin categorías
- ❌ Rechazar sección extra sin tipo_extra

### 3. Tests de Pago
- ✅ Crear oferta con pago en USD
- ✅ Crear oferta con pago en EUR con tasa
- ✅ Crear oferta con pago en CUP con tasa
- ✅ Crear oferta con transferencia y datos de cuenta
- ✅ Crear oferta con contribución
- ❌ Rechazar EUR/CUP sin tasa de cambio
- ❌ Rechazar contribución sin porcentaje

### 4. Tests de Foto
- ✅ Subir foto JPG válida
- ✅ Subir foto PNG válida
- ✅ Subir foto WebP válida
- ❌ Rechazar archivo > 5MB
- ❌ Rechazar archivo no imagen

### 5. Tests de Edición
- ✅ Editar oferta existente
- ✅ Cambiar tipo de contacto
- ✅ Agregar/quitar secciones personalizadas
- ✅ Modificar elementos personalizados
- ✅ Actualizar configuración de pago

---

## 📝 Notas de Implementación

### Prioridad Alta
1. ✅ Soporte para `nombre_lead_sin_agregar` en crear/editar
2. ✅ Endpoint de subida de foto de portada
3. ✅ Soporte para secciones personalizadas
4. ✅ Soporte para configuración de pago (moneda, tasa, transferencia, contribución)

### Prioridad Media
5. ✅ Elementos personalizados
6. ✅ Componentes principales
7. ✅ Reserva de materiales

### Prioridad Baja
8. ✅ Optimización de imágenes al subir
9. ✅ Notificaciones de reservas por expirar
10. ✅ Historial de cambios en ofertas

---

## 🚀 Próximos Pasos

1. **Backend:**
   - Implementar soporte para nuevos campos en crear/editar
   - Crear endpoint de subida de fotos
   - Crear tablas para secciones y elementos personalizados
   - Implementar validaciones
   - Crear tests

2. **Frontend:**
   - ✅ Ya está completo y funcional
   - Esperar endpoints del backend para testing end-to-end

3. **Testing:**
   - Tests unitarios en backend
   - Tests de integración
   - Tests end-to-end con frontend

---

## 📚 Documentación Relacionada

- `FRONTEND_CONFECCION_OFERTAS.md` - Documentación completa del frontend
- `BACKEND_CONFECCION_OFERTAS_SPEC.md` - Especificación completa del backend
- `RESUMEN_CAMBIOS_CONFECCION_OFERTAS.md` - Este documento

---

**Última actualización:** 30 de enero de 2026

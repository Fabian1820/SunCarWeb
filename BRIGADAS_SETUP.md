# Configuración de Gestión de Brigadas

## Configuración del Backend

### 1. Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto con:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 2. Backend FastAPI
Asegúrate de que tu backend FastAPI esté ejecutándose en `http://localhost:8000` con los siguientes endpoints disponibles:

#### Endpoints de Brigadas:
- `GET /api/brigadas` - Listar todas las brigadas
- `GET /api/brigadas/{brigada_id}` - Obtener brigada específica
- `POST /api/brigadas` - Crear nueva brigada
- `PUT /api/brigadas/{brigada_id}` - Actualizar brigada
- `DELETE /api/brigadas/{brigada_id}` - Eliminar brigada

#### Endpoints de Trabajadores:
- `POST /api/brigadas/{brigada_id}/trabajadores` - Agregar trabajador
- `DELETE /api/brigadas/{brigada_id}/trabajadores/{trabajador_ci}` - Eliminar trabajador
- `PUT /api/brigadas/{brigada_id}/trabajadores/{trabajador_ci}` - Actualizar trabajador

## Estructura de Datos

### Backend (FastAPI):
```typescript
interface Trabajador {
  id: string
  nombre: string
  CI: string
  rol: "jefe" | "trabajador"
  telefono?: string
  email?: string
}

interface Brigada {
  lider_ci: string
  lider: Trabajador
  integrantes: Trabajador[]
}
```

### Frontend (Next.js):
```typescript
interface Worker {
  id: string
  name: string
  ci: string
  role: "jefe" | "trabajador"
  phone?: string
  email?: string
}

interface Brigade {
  id: string
  leader: Worker
  members: Worker[]
}
```

## Funcionalidades Implementadas

### ✅ Completado:
1. **Tipos y conversiones** entre frontend y backend
2. **Servicio de API** con manejo de errores
3. **Hook personalizado** para gestión de estado
4. **Página principal** conectada al backend
5. **Manejo de loading states** y errores
6. **Búsqueda** por nombre de jefe o trabajadores
7. **CRUD completo** de brigadas y trabajadores

### 🔧 Características:
- **Persistencia**: Todos los datos se guardan en el backend
- **Búsqueda en tiempo real**: Filtrado por nombre de jefe o trabajadores
- **Validación**: CI obligatorio para jefes y trabajadores
- **Manejo de errores**: Alertas visuales para errores de API
- **Loading states**: Indicadores de carga durante operaciones
- **Confirmaciones**: Diálogos de confirmación para eliminaciones

## Uso

1. **Iniciar el backend FastAPI**:
   ```bash
   cd backend
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

2. **Iniciar el frontend Next.js**:
   ```bash
   npm run dev
   ```

3. **Acceder a la gestión de brigadas**:
   ```
   http://localhost:3000/brigadas
   ```

## Notas Importantes

- Las brigadas se identifican por el **CI del líder**
- Los trabajadores requieren **nombre y CI obligatorios**
- La búsqueda funciona por **nombre de jefe o trabajadores**
- Los datos se **persisten automáticamente** en el backend
- Se incluye **manejo de errores** y **estados de carga** 
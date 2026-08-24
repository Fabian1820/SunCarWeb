# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Package Manager Support  
- `npm install` or `pnpm install` - Install dependencies (both package managers supported)

### Notes
- TypeScript and ESLint errors are ignored during builds (configured in next.config.mjs)
- Images are unoptimized for deployment flexibility
- Uses React 19 and Next.js 15 with App Router

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with custom SunCar brand colors
- **UI Components**: Radix UI primitives with custom shadcn/ui implementations
- **State Management**: React hooks with custom API services
- **Maps**: Leaflet/React-Leaflet for location picking
- **Forms**: React Hook Form with Zod validation
- **Export**: jsPDF, jspdf-autotable, xlsx for Excel and PDF exports

### Project Structure
```
app/                    # Next.js App Router pages
├── atencion-cliente/  # Customer service module
├── brigadas/          # Brigade management
├── clientes/          # Client management  
├── materiales/        # Materials catalog
├── reportes/          # Reports and forms
├── trabajadores/      # Worker management
└── formulario-h1114/  # Specific form type

components/
├── shared/            # Reusable UI components
│   ├── atom/         # Basic components (buttons, inputs, etc.)
│   ├── molecule/     # Compound components (cards, dialogs, etc.)
│   └── organism/     # Complex components (maps, location pickers)
└── feats/            # Feature-specific components
    ├── brigade/      # Brigade management components
    ├── customer-service/ # Customer service components
    ├── materials/    # Material management components
    ├── reports/      # Report components
    └── worker/       # Worker management components

lib/                   # Core utilities and services
├── api-services.ts   # API client methods (MaterialService, BrigadaService, etc.)
├── api-types.ts      # API type definitions and converters
├── api-config.ts     # API configuration and base URL
└── services/         # Domain-specific services
```

### API Integration
- **Backend**: FastAPI running on `http://localhost:8000/api`
- **Services**: Organized by domain (MaterialService, BrigadaService, TrabajadorService, ReporteService, ClienteService)
- **Types**: Backend/Frontend type conversion handled in `api-types.ts`
- **Config**: API base URL and headers centralized in `api-config.ts`

### Key Features
1. **Brigade Management**: Full CRUD for work brigades with leader/worker hierarchy
2. **Material Catalog**: Product categories and materials with inventory tracking
3. **Report System**: H1114 forms with PDF generation and photo attachments
4. **Worker Management**: Employee records with role-based permissions
5. **Location Services**: Interactive maps for address/coordinate selection
6. **Client Management**: Customer database integration with offers and custom elements
7. **Lead Management**: Lead tracking with conversion to clients
8. **Customer Service**: Message management system with mock data support
9. **Export System**: Centralized Excel and PDF export functionality with professional formatting

### Sistema de ofertas

El catálogo viejo de ofertas (`OfertasAsignacionFields`, `OfertasEmbebidasFields`,
`hooks/use-ofertas.ts` y `OfertaService`) **fue eliminado**. Si encuentras
documentación o código que los mencione, está obsoleto.

**Sistema vigente: confección de ofertas.**
- UI en `components/feats/ofertas/` (`confeccion-ofertas-view`, `editar-oferta-dialog`,
  `duplicar-oferta-dialog`, `asignar-oferta-generica-dialog`, ...).
- Estado en `hooks/use-ofertas-confeccion.ts`, tipo `OfertaConfeccion`.
- Lo consumen `leads-table`, `clients-table`, `ofertas-confeccionadas-view`,
  `ordenes-trabajo-operaciones-module` y `estado-instalacion-multiple-dialog`.
- `seleccionarOfertaConfirmada()` elige la oferta confirmada más reciente; en el
  módulo de planificación el equivalente tipado es
  `seleccionarOfertaTrabajoConfirmada()` en `planificacion/oferta-utils.ts`.

**Ofertas dentro de Lead y Cliente** (`lib/types/feats/leads/lead-types.ts`):

- `OfertaAsignacion` = `{ oferta_id, cantidad }`. Es lo que acepta
  `ClienteCreateData.ofertas` al crear.
- `OfertaEmbebida` es el snapshot **plano** que devuelve el backend al leer un lead
  o cliente. No tiene `id`, `descripcion`, `precio` ni `cantidad`: sus campos son
  `inversor_codigo` / `inversor_cantidad`, `bateria_*`, `panel_*`, `costo_oferta`,
  `costo_extra`, `costo_transporte`, `aprobada`, `pagada`,
  `elementos_personalizados` y `razon_costo_extra`. Los diálogos de lead/cliente
  leen esa forma directamente (`lead.ofertas?.[0]?.inversor_codigo`).

El backend nunca envía `nombre_completo`, `email` ni `provincia` en un Lead; el
campo de provincia es `provincia_montaje`.


### Export Functionality
The application includes a centralized export system for generating Excel and PDF reports:

- **Export Service** (`lib/export-service.ts`): Core functions for Excel and PDF generation
  - `exportToExcel()`: Generates .xlsx files with professional headers
  - `exportToPDF()`: Creates formatted PDF with company logo and branding
  - Automatic formatting for currencies, dates, and percentages

- **Export Buttons Component** (`components/shared/molecule/export-buttons.tsx`): Reusable UI
  - Dual buttons for Excel (green) and PDF (red) export
  - Loading states and toast notifications
  - Compact variant for space-constrained layouts

- **Current Implementation**: Recursos Humanos (HR) module
  - Two exportable views: By Worker and By Position
  - Includes calculated salaries and stimuli
  - Professional headers with company branding

- **Current Implementation**: Leads module
  - Exports 10 columns with lead information
  - Respects applied filters (state, source, date range, search)
  - Formatted states in Spanish and dates in DD/MM/YYYY format
  - Shows "N/A" for empty fields

- **Usage in Other Modules**: See `docs/EXPORT_FEATURE.md` for integration guide

### Component Architecture
- **Atomic Design**: Components organized by complexity (atom → molecule → organism)
- **Feature-based**: Domain components grouped by business feature
- **Radix Primitives**: Accessible, unstyled components as foundation
- **Custom Theming**: SunCar brand colors defined in tailwind.config.ts

### State Management Patterns
- **Custom Hooks**: Feature-specific hooks (use-brigadas.ts, use-materials.ts)
- **React Query Pattern**: Loading states and error handling in API services
- **Form State**: React Hook Form for complex forms with validation

### Environment Configuration
**IMPORTANTE**: Las variables de entorno son críticas para el funcionamiento en despliegues.

#### Configuración de Variables de Entorno
1. **Desarrollo Local**:
   - Copia `.env.example` a `.env.local`
   - Configura `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` para desarrollo local
   - El archivo `.env.local` tiene mayor prioridad que `.env`

2. **Despliegues (Railway, Vercel, etc.)**:
   - Configura `NEXT_PUBLIC_BACKEND_URL` en las variables de entorno del despliegue
   - Railway: Settings > Environment Variables
   - Vercel: Settings > Environment Variables
   - Ejemplo: `NEXT_PUBLIC_BACKEND_URL=https://sun-car-backend.vercel.app`

3. **Jerarquía de Prioridad**:
   - Variables de despliegue (Railway/Vercel) > `.env.local` > `.env` > fallback a localhost

4. **Debugging Variables de Entorno**:
   - Revisa la consola del navegador para logs de configuración API
   - Busca mensajes como: `🔧 API Configuration loaded`
   - Si ves `⚠️ Using default API URL` significa que no se encontró la variable de entorno
   - Verifica que la variable empiece con `NEXT_PUBLIC_` para ser accesible en el cliente

#### Backend URL Configuration
La aplicación usa variables de entorno para configurar la URL del backend API:

2. **Configuration Flow**:
   - `lib/api-config.ts` exports `API_BASE_URL` constant
   - Uses `process.env.NEXT_PUBLIC_BACKEND_URL` with fallback to localhost
   - All API services import and use this centralized configuration

3. **Usage Pattern**:
   - `apiRequest()` helper function in `api-config.ts` handles all HTTP requests
   - Services in `lib/api-services.ts` use this helper for consistent API calls
   - Components consume services through custom hooks (use-brigadas.ts, use-materials.ts, etc.)

4. **API Services Using Backend URL**:
   - MaterialService - Material catalog operations
   - BrigadaService - Brigade management operations  
   - TrabajadorService - Worker management operations
   - ReporteService - Report generation and management
   - ClienteService - Client database operations
   - AtencionClienteService - Customer service message management

### Mock Data and Development Support
- **Mock Data**: Located in `lib/mock-data/` for development and testing
- **Mock Services**: Available in `lib/mock-services/` for modules still in development
- **Customer Service Module**: Uses mock data (`lib/mock-data/customer-service.ts`) with mock service implementation

### Authentication and Permissions System
The application implements a complete JWT-based authentication system with **dynamic permission loading from backend**:

1. **Authentication Context** (`contexts/auth-context.tsx`):
   - Manages authentication state, token, and user data storage
   - Provides login/logout functionality with backend JWT integration
   - Stores JWT token in localStorage as 'auth_token' and user data as 'user_data'
   - Automatically includes bearer token in all API requests
   - Implements `hasPermission(module)` for dynamic access control based on backend permissions
   - **NO localStorage for permissions** - Modules are fetched fresh from backend on each dashboard load

2. **Login Endpoint Integration**:
   - POST `/api/auth/login-admin` with credentials: `{ "ci": "12345678", "adminPass": "contraseña" }`
   - Success response: `{ "success": true, "message": "Autenticación exitosa", "token": "jwt_token", "user": { "ci": "...", "nombre": "...", "rol": "...", "is_superAdmin": boolean } }`
   - Does NOT fetch modules during login - deferred until dashboard loads
   - Uses bcrypt password hashing on backend
   - Full JWT authentication as documented in `docs/AUTH_README.md`

3. **Dynamic Permission System**:
   - **No hardcoded role mappings** - All permissions are fetched from backend
   - **Real-time verification**: Dashboard calls `loadModulosPermitidos()` on mount via `useEffect`
   - Calls `PermisosService.getTrabajadorModulosNombres(ci)` to get allowed module names
   - Stores module names ONLY in state (`modulosPermitidos`) - **NOT in localStorage**
   - Modules are re-fetched from backend every time dashboard is loaded/refreshed
   - `hasPermission(module)` checks if module name exists in `modulosPermitidos` array
   - **SuperAdmin privileges**: Users with `is_superAdmin: true` have access to all modules (managed separately in dashboard)
   - **No permissions message**: Users without permissions see: "No tiene permisos de acceso aún o ha ocurrido algún cambio. Contacte con el equipo de informáticos para resolver el problema."

4. **Permissions Management Module** (SuperAdmin only):
   - Access restricted to `is_superAdmin: true` users only
   - **Module Management**: Create/delete system modules (`/api/modulos/`)
   - **Worker Permissions**: Assign/remove module access per worker by CI (`/api/permisos/trabajador/{ci}`)
   - Full CRUD for permissions with backend persistence
   - See `docs/ENDPOINTS_PERMISOS.md` for API documentation

5. **Global API Authentication**:
   - All API calls automatically include `Authorization: Bearer <token>` header
   - Centralized through `apiRequest()` function in `lib/api-config.ts`
   - Automatic token retrieval from localStorage for client-side requests

6. **Token Expiration Handling**:
   - Detects 401 responses with "Token inválido o expirado" message
   - Automatically clears localStorage and reloads page to show login
   - Preserves last used credentials for quick re-login
   - Implementation in `lib/api-config.ts` (lines 98-121)

7. **Authentication Components**:
   - `AuthGuard`: Global guard that protects entire app, shows login if not authenticated
   - `RouteGuard`: Protects individual routes based on required module permissions
   - `LoginForm`: Handles admin login with CI and adminPass fields, auto-fills last used credentials
   - `UserMenu`: Displays user info (name, CI, role) and logout button
   - Full integration with existing UI components and styling

8. **Dashboard Permission Filtering**:
   - Main dashboard (`app/page.tsx`) dynamically filters visible modules based on permissions from backend
   - Uses `hasPermission()` to show only authorized modules
   - SuperAdmin users see additional "Gestión de Permisos" module
   - Shows dynamic "No permissions" message if user has no module access

9. **Documentation**:
   - `docs/AUTH_README.md` - Backend JWT authentication system
   - `docs/PERMISSIONS_SYSTEM.md` - Frontend permissions implementation guide
   - `docs/ENDPOINTS_PERMISOS.md` - Permissions and modules API endpoints
   - Complete integration guide for protecting new routes and modules

### Backend Connectivity Solution
**CRITICAL**: Direct backend communication pattern established to fix "failed to fetch" and 401 errors.

#### Problem and Solution Summary
1. **Issue**: Frontend at `https://admin.suncarsrl.com` was unable to connect to backend at `https://api.suncarsrl.com`
2. **Root Cause**: Complex API Routes proxy system caused webpack compilation errors, leading to fallback to unauthenticated direct calls
3. **Solution**: Simplified to direct backend communication with automatic authentication through `lib/api-config.ts`

#### Key Implementation Details
1. **Environment Configuration**:
   ```bash
   NEXT_PUBLIC_BACKEND_URL=https://api.suncarsrl.com
   ```

2. **Authentication Flow** (`lib/api-config.ts`):
   - Dynamic token acquisition from `/auth/login-token` endpoint
   - Token caching with 5-minute expiry
   - Automatic retry with localStorage fallback
   - Bearer token included in all API requests

3. **Direct Backend Calls**:
   - All `fetch()` calls replaced with `apiRequest()` function
   - No API Routes middleware - direct communication only
   - Consistent error handling and logging
   - Support for both JSON and blob responses

4. **Fixed Files**:
   - `app/reportes/page.tsx`: Line 124 dynamic import fix
   - `components/feats/reports/create-report-dialog.tsx`: Lines 129, 184 replaced with apiRequest
   - `components/feats/brigade/brigades-table.tsx`: Lines 136, 159 replaced with apiRequest
   - All services now use centralized `apiRequest()` from `lib/api-config.ts`

#### Additional Fix: Service Duplication Issue
**Problem**: Some hooks were using duplicate service files that weren't using the correct `apiRequest()` function:
- `lib/services/brigada-service.ts` (duplicate, causing HTTPS->HTTP redirects)
- `lib/api-services.ts` (correct unified version)

**Solution**: Consolidated all service calls to use unified services in `lib/api-services.ts`:
- Updated `hooks/use-brigadas.ts` to use `BrigadaService.getAllBrigadas()` from `@/lib/api-services`
- Removed duplicate `lib/services/brigada-service.ts` file
- Ensured all modules use the same service architecture

#### Success Indicators
- ✅ Contactos, materiales, and clientes working correctly
- ✅ Brigadas, trabajadores, and reportes connectivity fixed  
- ✅ No more "failed to fetch" errors
- ✅ No more HTTPS->HTTP redirect errors
- ✅ Proper authentication with "suncar-token-2025"
- ✅ Clean development server startup without proxy errors
- ✅ Unified service architecture across all modules

### Testing and Quality
- No specific test framework configured - check package.json for any additions
- ESLint configured but errors ignored during builds
- TypeScript strict mode enabled


---

## Análisis del Problema: Nombre de Oferta Incorrecto (Baterías)

### Contexto
El usuario reporta que al crear una oferta con una batería de 16 kWh, el nombre generado muestra "0.01kWh" en lugar de "16kWh".

### Investigación Realizada

#### 1. Verificación en Base de Datos
- ✅ El valor en la tabla `materiales` es correcto: `potenciaKW = 16.0`
- ✅ El campo `potenciaKW` para baterías representa la capacidad en kWh (no en kW)

#### 2. Análisis del Código Frontend

**Generación de Nombres** (`components/feats/ofertas/confeccion-ofertas-view.tsx`):

El frontend genera dos tipos de nombres:

1. **`nombreAutomatico`** (líneas 1223-1303): Formato corto para UI
   - Ejemplo: "I-1x10kW, B-1x16kWh, P-20x590W"

2. **`nombreCompletoParaExportar`** (líneas 1305-1465): Formato largo con marcas
   - Ejemplo: "1x 10kW Inversor Growatt, 1x 16kWh Batería Pylontech, 20x 590W Paneles JA Solar"

**Código de Baterías (CORRECTO)**:
```typescript
// Líneas 1263-1276 - nombreAutomatico
if (bateriaSeleccionada) {
  const cantidad = bateriasDelTipo.reduce((sum, bat) => sum + bat.cantidad, 0)
  const potencia = obtenerPotencia(bateriaSeleccionada)
  
  if (potencia) {
    componentes.push(`B-${cantidad}x${formatearPotencia(potencia)}kWh`)
  }
}

// Líneas 1367-1382 - nombreCompletoParaExportar
if (bateriaSeleccionada) {
  const cantidad = bateriasDelTipo.reduce((sum, bat) => sum + bat.cantidad, 0)
  const potencia = obtenerPotencia(bateriaSeleccionada)
  const marca = obtenerMarca(bateriaSeleccionada)
  
  if (potencia && marca) {
    componentes.push(`${cantidad}x ${potencia}kWh Batería ${marca}`)
  }
}
```

**✅ El código usa directamente `material.potenciaKW` sin ninguna conversión para baterías.**

**Función `obtenerPotencia`**:
```typescript
const obtenerPotencia = (materialCodigo: string): number | null => {
  const material = materials.find(m => m.codigo.toString() === materialCodigo)
  return material?.potenciaKW || null
}
```

#### 3. Envío al Backend

El frontend envía ambos nombres al backend (líneas 3431-3432):
```typescript
ofertaData.nombre_oferta = nombreAutomatico // Nombre corto
ofertaData.nombre_completo = nombreCompletoParaExportar // Nombre largo
```

#### 4. Respuesta del Backend

**🔴 PROBLEMA IDENTIFICADO**: El backend devuelve un `nombre_completo` diferente al enviado.

En la línea 3498, el frontend recibe y guarda el nombre del backend:
```typescript
if (response.data.nombre_completo) {
  setNombreCompletoBackend(response.data.nombre_completo)
}
```

### Conclusión

#### El Problema Está en el BACKEND, NO en el Frontend

1. ✅ El frontend genera correctamente: "1x 16kWh Batería Pylontech"
2. ✅ El frontend envía este nombre al backend
3. 🔴 El backend devuelve: "1x 0.01kWh Batería Pylontech"
4. ❌ El frontend usa el nombre del backend para las exportaciones

#### Causa Raíz

El backend está regenerando el nombre de la oferta y aplicando una conversión incorrecta:
- Toma el valor 16 kWh de la base de datos
- Lo divide por 1000: `16 / 1000 = 0.016`
- Lo formatea como "0.01kWh"

### Solución

Necesitas corregir el código del BACKEND que genera el `nombre_completo`. Busca en tu backend:

1. **Archivo/función que genera nombres de ofertas**
2. **Lógica que procesa baterías**
3. **Conversión incorrecta**: `potenciaKW / 1000` para baterías

#### Regla Correcta para el Backend:
- **Inversores**: `potenciaKW` directamente (ya en kW) → "10kW"
- **Baterías**: `potenciaKW` directamente (ya en kWh) → "16kWh" ← NO DIVIDIR
- **Paneles**: `potenciaKW * 1000` (convertir kW a W) → "590W"

### Información Necesaria del Backend

Para ayudarte a corregir el backend, necesito:

1. El código del backend que genera `nombre_completo`
2. El endpoint que recibe la oferta (probablemente `/ofertas/confeccion/`)
3. El lenguaje/framework del backend (Python/Django, Node.js, etc.)

### Verificación Rápida

Puedes verificar esto agregando un log temporal en el frontend (línea 3432):
```typescript
console.log('📤 Nombre enviado al backend:', nombreCompletoParaExportar)
console.log('📥 Nombre recibido del backend:', response.data.nombre_completo)
```

Si los valores son diferentes, confirma que el backend está regenerando el nombre incorrectamente.

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
6. **Client Management**: Customer database integration
7. **Customer Service**: Message management system with mock data support
8. **Export System**: Centralized Excel and PDF export functionality with professional formatting

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
The application implements a complete JWT-based authentication system with role-based permissions:

1. **Authentication Context** (`contexts/auth-context.tsx`):
   - Manages authentication state, token, and user data storage
   - Provides login/logout functionality with backend JWT integration
   - Stores JWT token in localStorage as 'auth_token' and user data as 'user_data'
   - Automatically includes bearer token in all API requests
   - Implements `hasPermission(module)` for role-based access control

2. **Login Endpoint Integration**:
   - POST `/api/auth/login-admin` with credentials: `{ "ci": "12345678", "adminPass": "contraseña" }`
   - Success response: `{ "success": true, "message": "Autenticación exitosa", "token": "jwt_token", "user": { "ci": "...", "nombre": "...", "rol": "..." } }`
   - Uses bcrypt password hashing on backend
   - Full JWT authentication as documented in `docs/AUTH_README.md`

3. **Role-Based Permissions Matrix**:
   - **Director General / Subdirector(a)** → All modules
   - **Especialista en Gestión Económica / RR.HH.** → `recursos-humanos`
   - **Especialista/Técnico en Gestión Comercial** → `leads`, `clientes`, `ofertas`, `materiales`
   - **Especialista en Redes y Sistemas** → `blog`
   - **Jefe de Operaciones** → `brigadas`, `trabajadores`, `materiales`, `clientes`, `ordenes-trabajo`

4. **Global API Authentication**:
   - All API calls automatically include `Authorization: Bearer <token>` header
   - Centralized through `apiRequest()` function in `lib/api-config.ts`
   - Automatic token retrieval from localStorage for client-side requests

5. **Authentication Components**:
   - `AuthGuard`: Global guard that protects entire app, shows login if not authenticated
   - `RouteGuard`: Protects individual routes based on required module permissions
   - `LoginForm`: Handles admin login with CI and adminPass fields
   - `UserMenu`: Displays user info (name, CI, role) and logout button
   - Full integration with existing UI components and styling

6. **Dashboard Permission Filtering**:
   - Main dashboard (`app/page.tsx`) dynamically filters visible modules based on user role
   - Uses `hasPermission()` to show only authorized modules
   - Shows "No permissions" message if user has no module access

7. **Documentation**:
   - `docs/AUTH_README.md` - Backend JWT authentication system
   - `docs/PERMISSIONS_SYSTEM.md` - Frontend permissions implementation guide
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
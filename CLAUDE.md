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
   - Configura `NEXT_PUBLIC_API_URL=http://localhost:8000/api` para desarrollo local
   - El archivo `.env.local` tiene mayor prioridad que `.env`

2. **Despliegues (Railway, Vercel, etc.)**:
   - Configura `NEXT_PUBLIC_API_URL` en las variables de entorno del despliegue
   - Railway: Settings > Environment Variables
   - Vercel: Settings > Environment Variables
   - Ejemplo: `NEXT_PUBLIC_API_URL=https://sun-car-backend.vercel.app/api`

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
   - Uses `process.env.NEXT_PUBLIC_API_URL` with fallback to localhost
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

### Authentication System
The application implements a complete authentication system with bearer token management:

1. **Authentication Context** (`contexts/auth-context.tsx`):
   - Manages authentication state and token storage
   - Provides login/logout functionality with API integration
   - Stores JWT token in localStorage as 'suncar-token'
   - Automatically includes bearer token in API requests

2. **Login Endpoint Integration**:
   - POST `/api/auth/login-token` with credentials: `{ "usuario": "admin", "contrasena": "admin123" }`
   - Success response: `{ "success": true, "message": "Login exitoso", "token": "suncar-token-2025" }`
   - Error response: `{ "success": false, "message": "Credenciales incorrectas", "token": null }`

3. **Global API Authentication**:
   - All API calls automatically include `Authorization: Bearer <token>` header
   - Centralized through `apiRequest()` function in `lib/api-config.ts`
   - Automatic token retrieval from localStorage for client-side requests

4. **Authentication Components**:
   - `AuthGuard`: Protects routes, shows login form if not authenticated
   - `LoginForm`: Handles user login with error display and loading states
   - Full integration with existing UI components and styling

5. **API Services Migration**:
   - All services (MaterialService, BrigadaService, TrabajadorService, etc.) use centralized `apiRequest()`
   - Consistent error handling and logging across all API calls
   - Environment variable support for different deployment targets (localhost, Railway, Vercel)

### Testing and Quality
- No specific test framework configured - check package.json for any additions
- ESLint configured but errors ignored during builds
- TypeScript strict mode enabled
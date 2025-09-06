# Guía Completa de Comunicación con Backend - Proyecto Suncar

## 📋 Índice
1. [Arquitectura General](#arquitectura-general)
2. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
3. [Estructura de Servicios](#estructura-de-servicios)
4. [Autenticación y Autorización](#autenticación-y-autorización)
5. [Endpoints API](#endpoints-api)
6. [Manejo de Errores](#manejo-de-errores)
7. [Guía de Implementación para Otros Frontends](#guía-de-implementación-para-otros-frontends)
8. [Patrones y Mejores Prácticas](#patrones-y-mejores-prácticas)

---

## 🏗️ Arquitectura General

El proyecto Suncar utiliza una **arquitectura híbrida** con Next.js API Routes que actúan como **proxy/middleware** entre el frontend y el backend real:

```
Frontend (React) → Next.js API Routes → Backend Real (FastAPI/Django)
```

### Ventajas de esta Arquitectura:
- **Seguridad**: Variables de entorno del backend no se exponen al cliente
- **Flexibilidad**: Transformación de datos entre frontend y backend
- **Caching**: Posibilidad de implementar cache en las API routes
- **Error Handling**: Manejo unificado de errores
- **Debugging**: Logs centralizados en el servidor Next.js

---

## 🔧 Configuración de Variables de Entorno

### Archivo `.env` (Configuración Actual)
```bash
# URL del Backend Real
NEXT_PUBLIC_BACKEND_URL=https://api.suncarsrl.com

# URL del Juego (Adicional)
NEXT_PUBLIC_GAME_URL=https://game.suncarsrl.com
```

### Explicación de Variables:

#### `NEXT_PUBLIC_BACKEND_URL`
- **Propósito**: URL base del backend real
- **Acceso**: Disponible tanto en servidor como en cliente (prefijo `NEXT_PUBLIC_`)
- **Uso**: Se utiliza en las API Routes de Next.js para hacer llamadas al backend
- **Valor por defecto**: `https://api.suncarsrl.com`

#### `NEXT_PUBLIC_GAME_URL`
- **Propósito**: URL del sistema de juego/gamificación
- **Acceso**: Disponible en cliente y servidor
- **Uso**: Para funcionalidades de gamificación futuras

### Configuración en Diferentes Entornos:

#### Desarrollo Local:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_GAME_URL=http://localhost:3001
```

#### Staging:
```bash
NEXT_PUBLIC_BACKEND_URL=https://api-staging.suncarsrl.com
NEXT_PUBLIC_GAME_URL=https://game-staging.suncarsrl.com
```

#### Producción (Railway):
```bash
NEXT_PUBLIC_BACKEND_URL=https://api.suncarsrl.com
NEXT_PUBLIC_GAME_URL=https://game.suncarsrl.com
```

---

## 🏭 Estructura de Servicios

### Directorio `services/`
```
services/
├── api/                          # Servicios de comunicación con API
│   ├── baseApiService.ts         # Servicio base con funcionalidades comunes
│   ├── authService.ts            # Autenticación y manejo de tokens
│   ├── contactoService.ts        # Operaciones CRUD de contactos
│   ├── clientVerificationService.ts # Verificación de clientes
│   ├── cotizacionApiService.ts   # Envío de cotizaciones
│   └── clientCotizacionService.ts # Cotizaciones de clientes
├── domain/                       # Interfaces y tipos del dominio
│   └── interfaces/
│       └── cotizacionInterfaces.ts
├── application/                  # Casos de uso y lógica de negocio
│   └── useCases/
│       └── cotizacionUseCase.ts
└── index.ts                     # Exportaciones centralizadas
```

### Servicio Base (`baseApiService.ts`)

```typescript
class BaseApiService {
  private readonly baseUrl: string;

  constructor() {
    // Usa rutas API internas de Next.js como proxy
    this.baseUrl = '/api';
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer suncar-token-2025',
    };

    // Manejo de errores y respuestas...
  }
}
```

**Características Clave:**
- Usa rutas internas `/api/*` como proxy
- Headers predeterminados incluyen autenticación
- Manejo centralizado de errores
- Métodos HTTP estándar (GET, POST, PUT, DELETE)

---

## 🔐 Autenticación y Autorización

### Token Estático
El sistema actualmente usa un **token estático** para simplificar el desarrollo:

```typescript
const STATIC_TOKEN = 'suncar-token-2025';
```

### Implementación en Servicios:
```typescript
const defaultHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer suncar-token-2025',
};
```

### AuthService (`authService.ts`)
```typescript
class AuthService {
  private staticToken = 'suncar-token-2025';

  async ensureAuthenticated(): Promise<string> {
    // Retorna el token estático
    return this.staticToken;
  }

  // Métodos para futuro sistema de login dinámico
  async login(credentials: LoginCredentials): Promise<string>
  getToken(): string | null
  isAuthenticated(): boolean
  logout(): void
}
```

### Evolución Futura del Sistema de Autenticación:
Para implementar autenticación dinámica, modificar:

1. **Variables de entorno**:
```bash
JWT_SECRET=tu-secret-key
TOKEN_EXPIRY=24h
```

2. **Flujo de login**:
```typescript
// POST /api/auth/login
{
  "usuario": "admin",
  "contrasena": "password"
}
```

3. **Respuesta esperada**:
```typescript
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login exitoso"
}
```

---

## 🔌 Endpoints API

### Next.js API Routes (Proxy Layer)

#### 1. Verificación de Clientes
**Archivo**: `app/api/clientes/verificar/route.ts`
```typescript
// POST /api/clientes/verificar
{
  "identifier": "12345" // Número de cliente o teléfono
}
```

**Flujo**:
1. Frontend → `/api/clientes/verificar`
2. Next.js API Route → `${NEXT_PUBLIC_BACKEND_URL}/api/clientes/verificar`
3. Backend procesa y responde
4. Next.js transforma datos si es necesario
5. Respuesta al frontend

#### 2. Cotizaciones
**Archivo**: `app/api/cotizacion/route.ts`
```typescript
// POST /api/cotizacion
{
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "telefono": "+53 12345678",
  "electrodomesticos": [...],
  "latitude": 23.1136,
  "longitude": -82.3666
}
```

**Procesamiento**:
1. Validación de datos requeridos
2. Formateo mediante `CotizacionFormatter`
3. Envío al backend con datos transformados:
```typescript
{
  "mensaje": "Texto formateado elegantemente...",
  "latitud": 23.1136,
  "longitud": -82.3666
}
```

#### 3. Contactos
**Archivo**: `app/api/contactos/route.ts`
```typescript
// GET /api/contactos
// Obtiene el primer contacto disponible del backend
```

### Backend Real (Endpoints Esperados)

#### Base URL: `https://api.suncarsrl.com`

#### Endpoints Documentados:
1. **`POST /api/clientes/verificar`**
    - Input: `{ identifier: string }`
    - Output: `{ success: boolean, message: string, data: ClientData }`

2. **`POST /api/cotizacion`**
    - Input: `{ mensaje: string, latitud: number, longitud: number }`
    - Output: `{ success: boolean, message: string, data: any }`

3. **`GET /api/contactos/first`**
    - Output: `{ success: boolean, message: string, data: Contacto }`

---

## ⚠️ Manejo de Errores

### Clases de Error Personalizadas
```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

### Estrategias de Error Handling:

#### 1. En API Routes:
```typescript
try {
  const backendResponse = await fetch(targetUrl, config);
  
  if (!backendResponse.ok) {
    const errorText = await backendResponse.text();
    return NextResponse.json({
      success: false,
      message: `Error del backend: ${backendResponse.status}`,
      details: { status, statusText, body: errorText }
    }, { status: 500 });
  }
} catch (error) {
  return NextResponse.json({
    success: false,
    message: `Error: ${error.message}`,
    timestamp: new Date().toISOString()
  }, { status: 500 });
}
```

#### 2. En Servicios Frontend:
```typescript
try {
  const response = await this.request(endpoint, options);
  return response;
} catch (error) {
  if (error instanceof ApiError) {
    throw error;
  }
  throw new ApiError('Network error', 0, 'Network Error');
}
```

#### 3. En Componentes React:
```typescript
const [error, setError] = useState<string | null>(null);

try {
  const result = await clientVerificationService.verificarCliente(identifier);
  if (!result.success) {
    setError(result.message || 'Error al verificar cliente');
    return;
  }
  // Procesar resultado exitoso...
} catch (err) {
  setError(err instanceof Error ? err.message : 'Error desconocido');
}
```

---

## 🚀 Guía de Implementación para Otros Frontends

### Pasos para Consumir el Mismo Backend:

#### 1. Configuración de Variables de Entorno
```bash
# Para frameworks diferentes a Next.js
REACT_APP_BACKEND_URL=https://api.suncarsrl.com  # React
VUE_APP_BACKEND_URL=https://api.suncarsrl.com    # Vue.js
VITE_BACKEND_URL=https://api.suncarsrl.com       # Vite
```

#### 2. Servicio Base HTTP (Ejemplo genérico)
```typescript
class HttpService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = process.env.REACT_APP_BACKEND_URL || 'https://api.suncarsrl.com';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer suncar-token-2025'
    };
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}
```

#### 3. Implementación de Servicios Específicos

**Verificación de Clientes:**
```typescript
class ClientService extends HttpService {
  async verificarCliente(identifier: string) {
    return this.request('/clientes/verificar', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  }
}
```

**Cotizaciones:**
```typescript
class CotizacionService extends HttpService {
  async enviarCotizacion(data: CotizacionData) {
    // Formatear datos según el formato esperado por el backend
    const payload = {
      mensaje: this.formatCotizacionText(data),
      latitud: data.latitude,
      longitud: data.longitude
    };

    return this.request('/cotizacion', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  private formatCotizacionText(data: CotizacionData): string {
    // Implementar el mismo formato que usa el frontend actual
    return `Solicitud de cotización solar...`;
  }
}
```

#### 4. Interfaces TypeScript Compartidas
```typescript
// Copiar estas interfaces del proyecto actual
export interface ClientData {
  numero: string;
  nombre: string;
  telefono?: string;
  email?: string;
}

export interface CotizacionData {
  nombre: string;
  email: string;
  telefono: string;
  electrodomesticos: ElectrodomesticoSeleccionado[];
  latitude?: number;
  longitude?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}
```

### Frameworks Específicos:

#### React (Create React App)
```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL + '/api',
  headers: {
    'Authorization': 'Bearer suncar-token-2025'
  }
});

export const clientService = {
  verificar: (identifier: string) => 
    api.post('/clientes/verificar', { identifier })
};
```

#### Vue.js
```typescript
// src/services/api.ts
import { ref } from 'vue';

export const useApi = () => {
  const baseURL = import.meta.env.VITE_BACKEND_URL + '/api';
  
  const request = async (endpoint: string, options: any = {}) => {
    const response = await fetch(`${baseURL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer suncar-token-2025',
        ...options.headers
      },
      ...options
    });
    
    return response.json();
  };

  return { request };
};
```

#### Angular
```typescript
// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseURL = environment.backendUrl + '/api';
  private headers = new HttpHeaders({
    'Authorization': 'Bearer suncar-token-2025'
  });

  constructor(private http: HttpClient) {}

  verificarCliente(identifier: string) {
    return this.http.post(`${this.baseURL}/clientes/verificar`, 
      { identifier }, 
      { headers: this.headers }
    );
  }
}
```

---

## 📋 Patrones y Mejores Prácticas

### 1. Patrón Repository
```typescript
interface ClientRepository {
  verificar(identifier: string): Promise<ClientData>;
  obtener(id: string): Promise<ClientData>;
}

class ApiClientRepository implements ClientRepository {
  constructor(private httpService: HttpService) {}

  async verificar(identifier: string): Promise<ClientData> {
    const response = await this.httpService.request('/clientes/verificar', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
    return response.data;
  }
}
```

### 2. Manejo de Estado
```typescript
// React con hooks
export const useClientVerification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);

  const verificar = async (identifier: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await clientService.verificar(identifier);
      setClient(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, client, verificar };
};
```

### 3. Interceptores de Request/Response
```typescript
class ApiService {
  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.addRequestInterceptor((config) => {
      console.log(`🚀 Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Response interceptor
    this.addResponseInterceptor(
      (response) => {
        console.log(`✅ Response: ${response.status} ${response.url}`);
        return response;
      },
      (error) => {
        console.error(`❌ Error: ${error.message}`);
        return Promise.reject(error);
      }
    );
  }
}
```

### 4. Validación de Datos
```typescript
import { z } from 'zod';

const CotizacionSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(8, 'Teléfono debe tener al menos 8 dígitos'),
  electrodomesticos: z.array(z.any()).min(1, 'Seleccione al menos un electrodoméstico')
});

export const validateCotizacion = (data: unknown) => {
  return CotizacionSchema.parse(data);
};
```

### 5. Retry Logic
```typescript
class ApiService {
  async requestWithRetry<T>(
    endpoint: string, 
    options: RequestInit = {}, 
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await this.request<T>(endpoint, options);
      } catch (error) {
        lastError = error as Error;
        
        if (i === maxRetries) break;
        
        // Backoff exponencial
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}
```

---

## 🔍 Debugging y Monitoreo

### Logging en Desarrollo
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  static debug(message: string, data?: any) {
    if (isDevelopment) {
      console.log(`🐛 [DEBUG] ${message}`, data);
    }
  }

  static error(message: string, error?: any) {
    console.error(`❌ [ERROR] ${message}`, error);
  }

  static api(method: string, url: string, data?: any) {
    if (isDevelopment) {
      console.log(`🌐 [API] ${method} ${url}`, data);
    }
  }
}
```

### Monitoreo de Performance
```typescript
class ApiService {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, config);
      const endTime = performance.now();
      
      Logger.api('RESPONSE', endpoint, {
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        status: response.status
      });
      
      return response.json();
    } catch (error) {
      const endTime = performance.now();
      Logger.error('API_ERROR', {
        endpoint,
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        error: error.message
      });
      throw error;
    }
  }
}
```

---

## 📚 Recursos Adicionales

### Herramientas Recomendadas:
1. **Postman/Insomnia**: Testing de endpoints
2. **React Query/SWR**: Manejo de estado servidor
3. **Axios**: Cliente HTTP alternativo a fetch
4. **Zod**: Validación de schemas
5. **MSW**: Mock Service Worker para testing

### Enlaces Útiles:
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Fetch API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---
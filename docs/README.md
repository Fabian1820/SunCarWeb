# 📚 Documentación - SunCar Admin Panel

## Índice de Documentación

### 🔐 Sistema de Autenticación y Permisos

#### Para Empezar (Recomendado)
1. **[RESUMEN_IMPLEMENTACION.md](../RESUMEN_IMPLEMENTACION.md)**
   - Resumen ejecutivo del sistema
   - ¿Qué se implementó?
   - Cómo usar
   - Próximos pasos
   - **📍 COMIENZA AQUÍ**

2. **[SISTEMA_PERMISOS.md](./SISTEMA_PERMISOS.md)**
   - Guía rápida para desarrolladores (español)
   - Ejemplos prácticos
   - Cómo proteger páginas
   - Configuración de permisos
   - **📍 REFERENCIA RÁPIDA**

#### Documentación Técnica
3. **[PERMISSIONS_SYSTEM.md](./PERMISSIONS_SYSTEM.md)**
   - Arquitectura completa del sistema
   - Componentes detallados
   - Flujo de autenticación
   - Integración con API
   - Troubleshooting avanzado

4. **[AUTH_README.md](./AUTH_README.md)**
   - Documentación del backend JWT
   - Configuración de variables de entorno
   - Endpoints de autenticación
   - Estructura de tokens
   - Manejo de contraseñas

#### Testing y QA
5. **[TESTING_PERMISOS.md](./TESTING_PERMISOS.md)**
   - Guía completa de pruebas
   - 10 casos de prueba definidos
   - Matriz de resultados esperados
   - Troubleshooting común
   - Criterios de aceptación

#### Historial
6. **[CHANGELOG_PERMISOS.md](./CHANGELOG_PERMISOS.md)**
   - Lista completa de cambios
   - Archivos modificados/creados
   - Próximos pasos sugeridos
   - Métricas de implementación

### 📦 Otras Características

#### Exportación de Datos
7. **[EXPORT_FEATURE.md](./EXPORT_FEATURE.md)**
   - Sistema de exportación Excel/PDF
   - Cómo integrar en otros módulos
   - Ejemplos de uso

## 🗺️ Navegación Rápida

### Soy nuevo en el proyecto
1. Lee [CLAUDE.md](../CLAUDE.md) - Arquitectura general
2. Lee [RESUMEN_IMPLEMENTACION.md](../RESUMEN_IMPLEMENTACION.md) - Sistema de permisos
3. Configura variables de entorno según [AUTH_README.md](./AUTH_README.md)
4. Sigue ejemplos en [SISTEMA_PERMISOS.md](./SISTEMA_PERMISOS.md)

### Quiero proteger una nueva página
1. Ver ejemplo en `app/brigadas/page.tsx`
2. Seguir guía en [SISTEMA_PERMISOS.md](./SISTEMA_PERMISOS.md) → "Cómo Proteger una Página"
3. Agregar módulo al dashboard en `app/page.tsx`

### Quiero agregar un nuevo rol
1. Editar `contexts/auth-context.tsx` → objeto `rolePermissions`
2. Verificar que el cargo coincide con backend
3. Probar según [TESTING_PERMISOS.md](./TESTING_PERMISOS.md)

### Tengo un problema
1. Revisar sección Troubleshooting en [PERMISSIONS_SYSTEM.md](./PERMISSIONS_SYSTEM.md)
2. Verificar consola del navegador (DevTools)
3. Revisar casos comunes en [TESTING_PERMISOS.md](./TESTING_PERMISOS.md)

### Quiero hacer testing
1. Seguir [TESTING_PERMISOS.md](./TESTING_PERMISOS.md) paso a paso
2. Usar matriz de resultados esperados
3. Reportar issues encontrados

## 📊 Matriz de Permisos Rápida

| Cargo | Acceso |
|-------|--------|
| Director General | 🟢 Todos los módulos |
| Subdirector(a) | 🟢 Todos los módulos |
| Esp. Gestión Económica | 🟡 Solo RR.HH. |
| Esp. Gestión RR.HH. | 🟡 Solo RR.HH. |
| Esp. Gestión Comercial | 🟡 Leads, Clientes, Ofertas, Materiales |
| Téc. Gestión Comercial | 🟡 Leads, Clientes, Ofertas, Materiales |
| Téc. Comercial | 🟡 Leads, Clientes, Ofertas, Materiales |
| Esp. Redes y Sistemas | 🟡 Solo Blog |
| Jefe de Operaciones | 🟡 Brigadas, Trabajadores, Materiales, Clientes, Órdenes |

## 🔧 Archivos Clave del Código

### Autenticación
```
contexts/auth-context.tsx           # Context principal
components/auth/auth-guard.tsx      # Guard global
components/auth/route-guard.tsx     # Guard por ruta
components/auth/login-form.tsx      # Formulario de login
components/auth/user-menu.tsx       # Menú de usuario
```

### Configuración
```
lib/api-config.ts                   # Config API + token JWT
.env.local                          # Variables de entorno frontend
backend/.env                        # Variables de entorno backend
```

### Ejemplos de Uso
```
app/page.tsx                        # Dashboard con filtrado
app/brigadas/page.tsx               # Página protegida con RouteGuard
```

## 📖 Convenciones de Documentación

- **📍** = Punto de partida recomendado
- **🟢** = Acceso completo
- **🟡** = Acceso limitado
- **❌** = Sin acceso
- **✅** = Completado/Implementado
- **⚠️** = Advertencia importante
- **🔧** = Configuración requerida

## 🆘 Ayuda y Soporte

### Orden de Consulta
1. **README.md** (este archivo) - Navegación
2. **RESUMEN_IMPLEMENTACION.md** - Overview
3. **SISTEMA_PERMISOS.md** - Guía rápida
4. **PERMISSIONS_SYSTEM.md** - Detalles técnicos
5. **TESTING_PERMISOS.md** - Pruebas

### Para Reportar Issues
Incluir:
- Descripción del problema
- Cargo del usuario probando
- Módulo intentando acceder
- Logs de consola (DevTools)
- Valor de `localStorage.getItem('user_data')`

## 🎯 Checklist de Desarrollo

### Para Nueva Funcionalidad
- [ ] Leer documentación relevante
- [ ] Ver ejemplos de código existente
- [ ] Implementar según patrones establecidos
- [ ] Actualizar documentación si necesario
- [ ] Probar según guía de testing

### Para Nueva Página Protegida
- [ ] Importar RouteGuard
- [ ] Envolver contenido con RouteGuard
- [ ] Agregar al dashboard si necesario
- [ ] Configurar permisos en auth-context
- [ ] Probar con diferentes roles

### Para Nuevo Rol
- [ ] Agregar a `rolePermissions` en auth-context
- [ ] Documentar en SISTEMA_PERMISOS.md
- [ ] Actualizar matriz de permisos
- [ ] Crear usuario de prueba
- [ ] Ejecutar casos de prueba

## 📅 Última Actualización

**Fecha**: 2025-10-21  
**Versión**: 1.0.0  
**Estado**: ✅ Completo

---

## 🚀 Quick Start

```bash
# 1. Configurar entorno
cp .env.example .env.local
# Editar .env.local con NEXT_PUBLIC_BACKEND_URL

# 2. Instalar dependencias
npm install

# 3. Iniciar desarrollo
npm run dev

# 4. Probar sistema
# - Abrir http://localhost:3000
# - Login con CI y adminPass
# - Verificar permisos según cargo
```

**¡Listo para desarrollar!** 🎉

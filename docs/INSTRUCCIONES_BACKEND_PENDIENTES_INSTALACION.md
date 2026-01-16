# Instrucciones para Implementar el Endpoint en el Backend

## Problema Actual

El frontend está intentando consumir el endpoint `/api/pendientes-instalacion/` pero el backend aún no lo tiene implementado, por lo que devuelve un error 404.

## Solución

Necesitas crear el endpoint en el backend siguiendo la documentación en `PENDIENTES_INSTALACION_API.md`.

## Pasos para Implementar en el Backend

### 1. Crear el Endpoint

Crea un nuevo archivo en tu backend (Django/FastAPI) con la siguiente estructura:

**Ruta del endpoint:** `/api/pendientes-instalacion/`
**Método:** GET
**Autenticación:** Requerida (Bearer Token)

### 2. Lógica del Endpoint

El endpoint debe:

1. Filtrar **leads** con estado "Pendiente de Instalación"
2. Filtrar **clientes** con estado "Pendiente de Instalación"
3. Devolver ambos en un solo objeto JSON

### 3. Estructura de Respuesta Esperada

```json
{
  "leads": [
    {
      "id": "string",
      "fecha_contacto": "string",
      "nombre": "string",
      "telefono": "string",
      "telefono_adicional": "string | null",
      "estado": "string",
      "fuente": "string | null",
      "referencia": "string | null",
      "direccion": "string | null",
      "pais_contacto": "string | null",
      "comentario": "string | null",
      "provincia_montaje": "string | null",
      "municipio": "string | null",
      "comercial": "string | null",
      "ofertas": [],
      "comprobante_pago_url": "string | null",
      "metodo_pago": "string | null",
      "moneda": "string | null"
    }
  ],
  "clientes": [
    {
      "id": "string",
      "numero": "string",
      "nombre": "string",
      "telefono": "string | null",
      "telefono_adicional": "string | null",
      "direccion": "string",
      "fecha_contacto": "string | null",
      "estado": "string | null",
      "falta_instalacion": "string | null",
      "fuente": "string | null",
      "referencia": "string | null",
      "pais_contacto": "string | null",
      "comentario": "string | null",
      "provincia_montaje": "string | null",
      "municipio": "string | null",
      "comercial": "string | null",
      "ofertas": [],
      "latitud": "string | null",
      "longitud": "string | null",
      "carnet_identidad": "string | null",
      "fecha_instalacion": "string | null",
      "fecha_montaje": "string | null",
      "comprobante_pago_url": "string | null",
      "metodo_pago": "string | null",
      "moneda": "string | null"
    }
  ],
  "total_leads": 0,
  "total_clientes": 0,
  "total_general": 0
}
```

### 4. Ejemplo de Implementación (Django)

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Lead, Cliente
from .serializers import LeadSerializer, ClienteSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pendientes_instalacion(request):
    """
    Obtiene todos los leads y clientes con estado 'Pendiente de Instalación'
    """
    try:
        # Filtrar leads con estado "Pendiente de Instalación"
        leads = Lead.objects.filter(estado="Pendiente de Instalación").order_by('-fecha_contacto')
        leads_serializer = LeadSerializer(leads, many=True)
        
        # Filtrar clientes con estado "Pendiente de Instalación"
        clientes = Cliente.objects.filter(estado="Pendiente de Instalación").order_by('-fecha_contacto')
        clientes_serializer = ClienteSerializer(clientes, many=True)
        
        # Contar totales
        total_leads = leads.count()
        total_clientes = clientes.count()
        total_general = total_leads + total_clientes
        
        return Response({
            'leads': leads_serializer.data,
            'clientes': clientes_serializer.data,
            'total_leads': total_leads,
            'total_clientes': total_clientes,
            'total_general': total_general
        })
    except Exception as e:
        return Response(
            {'detail': f'Error al obtener pendientes de instalación: {str(e)}'},
            status=500
        )
```

### 5. Registrar la Ruta

Agrega la ruta en tu archivo de URLs:

```python
from django.urls import path
from . import views

urlpatterns = [
    # ... otras rutas
    path('pendientes-instalacion/', views.pendientes_instalacion, name='pendientes-instalacion'),
]
```

## Verificación

Una vez implementado el endpoint, verifica que:

1. ✅ El endpoint responde en `/api/pendientes-instalacion/`
2. ✅ Requiere autenticación (Bearer Token)
3. ✅ Devuelve la estructura JSON correcta
4. ✅ Incluye los campos `total_leads`, `total_clientes`, `total_general`
5. ✅ Los arrays `leads` y `clientes` contienen los datos correctos

## Prueba Manual

Puedes probar el endpoint con curl:

```bash
curl -X GET "https://api.suncarsrl.com/api/pendientes-instalacion/" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json"
```

## Documentación Completa

Consulta `PENDIENTES_INSTALACION_API.md` para ver la documentación completa del endpoint con todos los campos y ejemplos.

## Estado Actual del Frontend

El frontend ya está listo y esperando que el backend implemente este endpoint. Una vez que el endpoint esté disponible, la página de "Instalaciones Nuevas" cargará automáticamente los datos.

## Logs en el Frontend

Cuando abras la consola del navegador (F12), verás logs que indican:
- 🔄 Intentando cargar pendientes de instalación...
- ❌ Error si el endpoint no existe (404)
- ✅ Datos recibidos si el endpoint funciona correctamente

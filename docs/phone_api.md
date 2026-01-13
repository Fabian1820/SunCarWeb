# API de Teléfono

API para obtener información del país a partir de un número de teléfono.

## Endpoints

### Obtener País por Número de Teléfono

**Endpoint:** `GET /api/phone/country`

**Descripción:** Retorna información del país, código de país y operador a partir de un número de teléfono en formato internacional.

**Query Parameters:**
- `phone_number` (string, requerido): Número de teléfono en formato internacional (debe incluir código de país con +)

**Ejemplos de números válidos:**
- `+53 5 1234567` → Cuba
- `+1 555 1234567` → Estados Unidos/Canadá
- `+34 612 345 678` → España
- `+52 55 1234 5678` → México
- `+54 11 1234 5678` → Argentina

**Response exitoso (200):**
```json
{
  "success": true,
  "message": "País identificado: Cuba",
  "data": {
    "phone_number": "+53 5 1234567",
    "formatted_number": "+53 5 1234567",
    "e164_format": "+5351234567",
    "country_code": "+53",
    "country_iso": "CU",
    "country_name": "Cuba",
    "carrier": "ETECSA",
    "is_valid": true
  }
}
```

**Campos de respuesta:**
- `phone_number`: Número de teléfono original
- `formatted_number`: Número formateado en formato internacional
- `e164_format`: Número en formato E164 (sin espacios ni guiones)
- `country_code`: Código de país con + (ej: '+53', '+1')
- `country_iso`: Código ISO del país de 2 letras (ej: 'CU', 'US', 'ES')
- `country_name`: Nombre del país en español
- `carrier`: Nombre del operador telefónico (puede ser null si no está disponible)
- `is_valid`: Booleano que indica si el número es válido

**Errores:**

**400 Bad Request** - Número inválido:
```json
{
  "detail": "Formato de número inválido: ..."
}
```

**400 Bad Request** - Número no válido:
```json
{
  "detail": "El número de teléfono no es válido"
}
```

**500 Internal Server Error** - Error del servidor:
```json
{
  "detail": "Error al procesar el número de teléfono"
}
```

## Uso en el Frontend

### Ejemplo con fetch (JavaScript/TypeScript):

```javascript
// Función para obtener el país de un número de teléfono
async function getCountryFromPhone(phoneNumber) {
  try {
    const response = await fetch(
      `/api/phone/country?phone_number=${encodeURIComponent(phoneNumber)}`
    );
    
    if (!response.ok) {
      throw new Error('Error al obtener información del país');
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('País:', result.data.country_name);
      console.log('Código ISO:', result.data.country_iso);
      console.log('Código de país:', result.data.country_code);
      console.log('Operador:', result.data.carrier);
      return result.data;
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Uso
getCountryFromPhone('+53 5 1234567')
  .then(data => {
    console.log('Información del país:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### Ejemplo con axios:

```javascript
import axios from 'axios';

async function getCountryFromPhone(phoneNumber) {
  try {
    const response = await axios.get('/api/phone/country', {
      params: {
        phone_number: phoneNumber
      }
    });
    
    if (response.data.success) {
      return response.data.data;
    }
  } catch (error) {
    if (error.response) {
      // El servidor respondió con un código de error
      console.error('Error del servidor:', error.response.data.detail);
    } else {
      // Error de red o configuración
      console.error('Error:', error.message);
    }
    throw error;
  }
}

// Uso
getCountryFromPhone('+34 612 345 678')
  .then(data => {
    console.log('País:', data.country_name); // "España"
    console.log('ISO:', data.country_iso);   // "ES"
  });
```

### Ejemplo con React y react-phone-number-input:

```jsx
import React, { useState } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

function PhoneCountryDetector() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryInfo, setCountryInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePhoneChange = async (value) => {
    setPhoneNumber(value);
    
    // Solo hacer la petición si el número tiene al menos 8 caracteres
    if (value && value.length >= 8) {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `/api/phone/country?phone_number=${encodeURIComponent(value)}`
        );
        
        if (!response.ok) {
          throw new Error('Número inválido');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setCountryInfo(result.data);
        }
      } catch (err) {
        setError(err.message);
        setCountryInfo(null);
      } finally {
        setLoading(false);
      }
    } else {
      setCountryInfo(null);
    }
  };

  return (
    <div>
      <PhoneInput
        international
        defaultCountry="CU"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder="Ingrese número de teléfono"
      />
      
      {loading && <p>Detectando país...</p>}
      
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      {countryInfo && (
        <div>
          <h3>Información del número:</h3>
          <p><strong>País:</strong> {countryInfo.country_name}</p>
          <p><strong>Código ISO:</strong> {countryInfo.country_iso}</p>
          <p><strong>Código de país:</strong> {countryInfo.country_code}</p>
          <p><strong>Número formateado:</strong> {countryInfo.formatted_number}</p>
          {countryInfo.carrier && (
            <p><strong>Operador:</strong> {countryInfo.carrier}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default PhoneCountryDetector;
```

## Notas Importantes

1. **Formato del número:** El número DEBE incluir el código de país precedido por '+'. Sin esto, la API no podrá identificar el país.

2. **Validación:** La API valida que el número sea válido según las reglas internacionales de numeración telefónica.

3. **Operador:** El campo `carrier` puede ser `null` si la información del operador no está disponible para ese número.

4. **Códigos de país comunes:**
   - Cuba: +53
   - Estados Unidos/Canadá: +1
   - España: +34
   - México: +52
   - Argentina: +54
   - Colombia: +57
   - Venezuela: +58

5. **Instalación de dependencias:** Asegúrate de instalar la librería `phonenumbers` en el backend:
   ```bash
   pip install phonenumbers
   ```

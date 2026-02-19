# Configuración de Stripe para Links de Pago

## Descripción
Este documento explica cómo configurar Stripe para generar links de pago en ofertas confeccionadas y ofertas personalizadas.

## Requisitos
1. Cuenta de Stripe (crear en https://stripe.com)
2. Clave secreta de Stripe (Secret Key)

## Pasos de Configuración

### 1. Obtener la Clave Secreta de Stripe

1. Inicia sesión en tu cuenta de Stripe: https://dashboard.stripe.com
2. Ve a **Developers** > **API keys**
3. Copia tu clave secreta:
   - Para desarrollo/pruebas: `sk_test_...`
   - Para producción: `sk_live_...`

### 2. Configurar Variable de Entorno

1. Crea o edita el archivo `.env.local` en la raíz del proyecto
2. Agrega la siguiente línea:

```env
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui
```

3. Reemplaza `sk_test_tu_clave_secreta_aqui` con tu clave real de Stripe

### 3. Reiniciar el Servidor

Después de configurar la variable de entorno, reinicia el servidor de desarrollo:

```bash
# Detener el servidor (Ctrl+C)
# Iniciar nuevamente
npm run dev
```

## Uso

Una vez configurado, los botones de "Generar Link de Pago (+5% Stripe)" funcionarán en:

- **Ofertas Confeccionadas**: En los cards de cada oferta en "Gestionar Ofertas"
- **Ofertas Personalizadas**: En el diálogo de detalles de oferta

## Características

- **Recargo automático**: Se agrega un 5% al precio para cubrir las comisiones de Stripe
- **Monedas soportadas**: USD y EUR (CUP se convierte automáticamente a USD)
- **Métodos de pago**:
  - USD: Tarjeta de crédito/débito, Link
  - EUR: Tarjeta de crédito/débito, Link, Klarna, Billie
- **Metadata**: Cada link incluye IDs de oferta, cliente y lead para tracking

## Solución de Problemas

### Error: "Stripe no está configurado"
- Verifica que el archivo `.env.local` existe en la raíz del proyecto
- Verifica que la variable `STRIPE_SECRET_KEY` está correctamente configurada
- Reinicia el servidor de desarrollo

### Error: "Invalid API Key"
- Verifica que copiaste la clave completa (empieza con `sk_test_` o `sk_live_`)
- Verifica que no hay espacios antes o después de la clave
- Verifica que la clave es válida en tu dashboard de Stripe

### Error: "Moneda inválida"
- Stripe solo acepta USD y EUR
- Las ofertas con CUP se convierten automáticamente a USD

## Seguridad

⚠️ **IMPORTANTE**: 
- Nunca compartas tu clave secreta de Stripe
- Nunca subas el archivo `.env.local` a Git (ya está en `.gitignore`)
- Usa claves de prueba (`sk_test_`) en desarrollo
- Usa claves de producción (`sk_live_`) solo en producción

## Referencias

- Dashboard de Stripe: https://dashboard.stripe.com
- Documentación de API Keys: https://stripe.com/docs/keys
- Documentación de Payment Links: https://stripe.com/docs/payment-links

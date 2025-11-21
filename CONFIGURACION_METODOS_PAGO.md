# Configuración de Métodos de Pago

Esta guía explica cómo configurar correctamente los métodos de pago Stripe y Mercado Pago Argentina en el panel de administración.

## Stripe

### Obtener las Claves de API

1. **Crear cuenta en Stripe**:
   - Visita [https://stripe.com](https://stripe.com)
   - Crea una cuenta o inicia sesión

2. **Obtener las claves**:
   - Ve a Dashboard → Developers → API keys
   - Copia la **Publishable key** (comienza con `pk_test_` o `pk_live_`)
   - Copia la **Secret key** (comienza con `sk_test_` o `sk_live_`)

3. **Configurar en el panel**:
   - **Publishable Key**: `pk_test_...` (para pruebas) o `pk_live_...` (para producción)
   - **Secret Key**: `sk_test_...` (para pruebas) o `sk_live_...` (para producción)
   - **Webhook Secret**: Opcional, para verificar webhooks

### Configuración de Webhooks (Opcional)

1. En Stripe Dashboard → Developers → Webhooks
2. Crear endpoint: `https://tu-dominio.com/api/webhooks/stripe`
3. Seleccionar eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copiar el **Signing secret** (comienza con `whsec_`)

## Mercado Pago Argentina

### Obtener las Claves de API

1. **Crear cuenta en Mercado Pago**:
   - Visita [https://www.mercadopago.com.ar](https://www.mercadopago.com.ar)
   - Crea una cuenta de vendedor

2. **Acceder a las credenciales**:
   - Ve a Tu cuenta → Credenciales
   - O visita [https://www.mercadopago.com.ar/developers/panel/credentials](https://www.mercadopago.com.ar/developers/panel/credentials)

3. **Obtener las claves**:
   - **Public Key**: `APP_USR-...` (para el frontend)
   - **Access Token**: `APP_USR-...` (para el backend)

4. **Configurar en el panel**:
   - **Public Key**: `APP_USR-...` (clave pública)
   - **Access Token**: `APP_USR-...` (token de acceso)
   - **Webhook Secret**: Opcional, para verificar webhooks

### Configuración de Webhooks (Opcional)

1. En Mercado Pago → Developers → Webhooks
2. Crear webhook: `https://tu-dominio.com/api/webhooks/mercadopago`
3. Seleccionar eventos: `payment`, `merchant_order`
4. Configurar el secreto del webhook

## Monedas Soportadas

### Stripe
- USD (Dólar estadounidense)
- EUR (Euro)
- ARS (Peso argentino)
- Y muchas más...

### Mercado Pago Argentina
- ARS (Peso argentino) - Principal
- USD (Dólar estadounidense) - Limitado

## Configuración en el Panel de Administración

1. **Acceder al panel**:
   - Ir a `/admin/payment-methods`
   - Solo disponible para superadministradores

2. **Configurar Stripe**:
   - Seleccionar "Stripe" como proveedor
   - Ingresar Publishable Key en el campo "Publishable Key"
   - Ingresar Secret Key en el campo "Secret Key"
   - Opcionalmente, configurar Webhook Secret
   - Activar el método de pago

3. **Configurar Mercado Pago**:
   - Seleccionar "Mercado Pago Argentina" como proveedor
   - Ingresar Public Key en el campo "Public Key"
   - Ingresar Access Token en el campo "Access Token"
   - Opcionalmente, configurar Webhook Secret
   - Activar el método de pago

## Validaciones Implementadas

El sistema incluye validaciones automáticas:

- **Stripe**: Las claves deben comenzar con `pk_` y `sk_` respectivamente
- **Mercado Pago**: Las claves deben comenzar con `APP_USR-`
- **Campos requeridos**: Nombre, proveedor, claves de API

## Seguridad

- Las claves se almacenan de forma segura en la base de datos
- Solo los superadministradores pueden ver y modificar las configuraciones
- Las claves se muestran como campos de contraseña en el formulario
- Se recomienda usar claves de prueba durante el desarrollo

## Troubleshooting

### Error: "La clave pública de Stripe debe comenzar con 'pk_'"
- Verificar que estás usando la Publishable Key correcta
- La clave debe comenzar con `pk_test_` o `pk_live_`

### Error: "El access token de Mercado Pago debe comenzar con 'APP_USR-'"
- Verificar que estás usando el Access Token correcto
- La clave debe comenzar con `APP_USR-`

### Error: "No se pudo guardar el método de pago"
- Verificar que la tabla `payment_methods` existe en la base de datos
- Ejecutar el script SQL proporcionado: `create_payment_methods_table.sql`
- Verificar permisos de base de datos

### Error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
- Este error indica que falta el índice único en el campo `provider`

**Opción 1: Script simple (Recomendado)**
- Ejecutar el script: `add_unique_index.sql`
- Este script agregará solo el índice único necesario
- Insertará los métodos de pago por defecto usando UPSERT

**Opción 2: Script completo**
- Ejecutar el script de corrección: `fix_payment_methods_conflict.sql`
- Este script creará la tabla completa con el índice único necesario
- También insertará los métodos de pago por defecto usando UPSERT

```sql
-- El índice único necesario:
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_provider_unique 
ON public.payment_methods(provider);
```

## Scripts SQL

Si la tabla no existe, ejecutar el archivo `create_payment_methods_table.sql` en la consola SQL de Supabase.

## Soporte

Para más información:
- **Stripe**: [https://stripe.com/docs](https://stripe.com/docs)
- **Mercado Pago**: [https://www.mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
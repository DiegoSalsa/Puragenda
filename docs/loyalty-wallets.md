# Tarjetas de fidelización en Wallet

Cada cliente conserva una credencial estable por negocio. El código QR contiene
solo un token opaco y las rutas que emiten el pase requieren la sesión privada
del portal de cliente. Cuando se suma un timbre o se canjea un premio, el pase
se sincroniza sin afectar la reserva si alguno de los proveedores está caído.

## Despliegue

1. Aplica la migración con `npm run db:migrate:deploy`.
2. Configura al menos una de las plataformas en las variables de entorno. Los
   enlaces de esa plataforma se muestran automáticamente en **Mi agenda** y en
   **Mis premios**; si no hay credenciales, la interfaz permanece oculta.
3. Prueba primero con un cliente de prueba y una cita completada. Para Apple,
   prueba las actualizaciones en un iPhone físico, no en el simulador.

## Google Wallet

1. Crea la cuenta de emisor y completa el onboarding de Google Wallet.
2. Crea una service account con acceso a la API de Wallet y configura:

   ```text
   GOOGLE_WALLET_ISSUER_ID
   GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL
   GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY
   ```

3. El primer acceso crea la clase genérica de fidelización y el objeto único
   del cliente. En modo demo, Google solo permite emitir pases para cuentas de
   prueba o miembros del emisor; solicita acceso de publicación antes de abrir
   el flujo a clientes reales.

La integración sigue el modelo de clase + objeto y emite el enlace firmado
`https://pay.google.com/gp/v/save/...` conforme a la documentación de
[Google Wallet](https://developers.google.com/wallet/generic/overview/how-classes-objects-work).

## Apple Wallet

1. En Apple Developer registra un Pass Type ID, por ejemplo
   `pass.cl.puragenda.loyalty`, y crea su certificado. El identificador debe
   coincidir con el certificado que firma los pases.
2. Exporta a PEM el certificado del pase, su clave privada y el certificado
   intermedio WWDR. Codifica cada archivo completo en base64 y guarda los
   resultados exclusivamente en el gestor de secretos:

   ```text
   APPLE_WALLET_PASS_TYPE_IDENTIFIER
   APPLE_WALLET_TEAM_IDENTIFIER
   APPLE_WALLET_SIGNER_CERT_BASE64
   APPLE_WALLET_SIGNER_KEY_BASE64
   APPLE_WALLET_WWDR_CERT_BASE64
   APPLE_WALLET_SIGNER_KEY_PASSPHRASE   # solo si corresponde
   ```

   En PowerShell se puede obtener un valor con:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ruta\certificado.pem"))
   ```

3. El sitio público debe usar HTTPS. El pase incluye el servicio web de Apple,
   registra los dispositivos que lo instalan y envía una notificación APNs al
   cambiar los timbres o premios. Wallet solicita entonces la nueva versión
   firmada del mismo pase.

Apple exige un Pass Type ID y certificado de pase para distribuir y actualizar
pases; consulta su guía de [identificadores y certificados](https://developer.apple.com/help/account/capabilities/create-wallet-identifiers-and-certificates)
y el [protocolo de actualizaciones](https://developer.apple.com/documentation/WalletPasses/adding-a-web-service-to-update-passes).

## Marca de las billeteras

Los enlaces actuales llevan a los flujos oficiales sin imitar sus botones. Antes
de una salida comercial, descarga e incorpora los badges oficiales localizados
de [Apple](https://developer.apple.com/wallet/add-to-apple-wallet-guidelines/)
y [Google](https://developers.google.com/wallet/generic/resources/brand-guidelines)
en lugar de diseñar versiones propias.

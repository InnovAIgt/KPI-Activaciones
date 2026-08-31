# KPI Activaciones

Dashboard React para consultar preofertas mediante un proxy Node.js.

## Verlo de inmediato

```bash
npm install
npm run dev
```

Abrir http://localhost:5173/

El proyecto inicia en modo demo por defecto si no existe un token. La data demo no representa información real y puede subirse a GitHub.

## Conectar la API real

1. Copiar `.env.example` como `.env`.
2. Configurar `DASHBOARD_API_KEY` con la clave fija entregada por el proveedor.
3. Cambiar `DEMO_MODE=false`.
4. Reiniciar el backend.

La clave se lee únicamente en `server/index.js`; nunca debe colocarse en React ni versionarse. Guardarla sin `Bearer` y sin comillas. El backend agrega `Bearer` al encabezado HTTP. Para GitHub Actions, Render, Railway, Azure o similar, configurarla como secret/variable de entorno.

## Publicar en GitHub y desplegar

GitHub guarda el código. Para ejecutarlo se puede conectar el repositorio a Render:

1. Crear un repositorio nuevo en GitHub y subir este proyecto.
2. En Render, elegir `New > Blueprint` y seleccionar el repositorio.
3. Configurar `DASHBOARD_API_KEY` como secret en Render.
4. Mantener `DEMO_MODE=false` para consultar la API real.

El archivo `render.yaml` deja configurados el build y el inicio del servicio. Express sirve el frontend compilado y el proxy API desde la misma URL.

## Token diario

No se debe generar un token diario usando un usuario y contraseña dentro de GitHub. La opción correcta depende de que el proveedor entregue un endpoint oficial de autenticación, idealmente OAuth2 o `client_credentials`. En ese caso se puede implementar una función programada que renueve el token antes de que expire y lo mantenga en memoria o en un secreto administrado.

Si el portal solo permite iniciar sesión con usuario y contraseña, necesitamos el contrato oficial del login y confirmar sus políticas de automatización. No se deben automatizar credenciales si el flujo requiere CAPTCHA, MFA o prohíbe accesos programáticos.

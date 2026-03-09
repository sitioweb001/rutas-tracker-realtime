
# Rutas Tracker Realtime

Plantilla lista para usar que permite **compartir y ver la ubicación en tiempo real** de uno o varios transportes (bus, ruta escolar, etc.) en un mapa.

- **Frontend:** HTML/JS estático con [Leaflet](https://leafletjs.com/) + cliente de Socket.IO
- **Backend:** Node.js (Express + Socket.IO) con autenticación **JWT** y roles (**admin**, **tracker**, **viewer**)
- **Mapa:** OpenStreetMap vía Leaflet (gratis)

> ⚠️ Esta plantilla usa memoria en el servidor para simplificar. Para producción, cambia el almacenamiento por una DB (MongoDB, Postgres) y añade HTTPS y dominios confiables.

## Funciones
- Admin crea/gestiona transportes y asigna quién los rastrea.
- Conductores/trackers envían su ubicación desde el teléfono.
- Los usuarios ven en tiempo real la ubicación en un mapa.

## Estructura
```
rutas-tracker-realtime/
├─ backend/
│  ├─ src/
│  │  ├─ routes/
│  │  │  ├─ authRoutes.js
│  │  │  ├─ transportRoutes.js
│  │  │  └─ locationRoutes.js
│  │  ├─ middleware/
│  │  │  ├─ auth.js
│  │  │  └─ roles.js
│  │  ├─ services/
│  │  │  └─ store.js
│  │  └─ server.js
│  ├─ package.json
│  └─ .env.example
└─ frontend/
   ├─ index.html
   ├─ viewer.html
   ├─ tracker.html
   ├─ admin.html
   ├─ css/styles.css
   └─ js/{viewer.js,tracker.js,admin.js,common.js}
```

## Requisitos
- Node.js 18+

## Configuración y ejecución local
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
El servidor arranca en `http://localhost:3000` y sirve el frontend en `http://localhost:3000/`.

> La API de Geolocalización de los navegadores **exige HTTPS** en teléfonos. En **localhost** funciona sin HTTPS para desarrollo. Para pruebas desde el móvil en la misma red, usa un túnel como `ngrok` o despliega en Render/Railway.

## Usuarios de ejemplo
- Admin: `admin@demo.com` / `admin123`
- Tracker: `driver@demo.com` / `driver123` (asignado al Transporte `t1`)
- Viewer: puede entrar directo a `viewer.html?transport=t1`

## Rutas útiles
- **Viewer:** `http://localhost:3000/frontend/viewer.html?transport=t1`
- **Tracker:** `http://localhost:3000/frontend/tracker.html`
- **Admin:** `http://localhost:3000/frontend/admin.html`

## Despliegue rápido
1. Sube este proyecto a GitHub.
2. Despliega `/backend` en [Render](https://render.com) o [Railway](https://railway.app). Configura variable `JWT_SECRET`.
3. Asegúrate de servir `/frontend` como estático desde el backend (ya viene incluido). Dominios HTTPS listos.

## Notas de seguridad y privacidad
- Obtén consentimiento del conductor antes de rastrear.
- Expira tokens frecuentemente, usa HTTPS siempre, y limita quién puede ver cada transporte.
- Para producción usa DB (p.ej. MongoDB Atlas) y cache (Redis) para *rooms* de Socket.IO.

## Licencia
MIT

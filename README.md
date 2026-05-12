# 🚀 OptiRuta

Aplicación web PWA para enfermeras y profesionales de salud en visita domiciliaria. Optimiza la ruta diaria de pacientes calculando el orden más eficiente de visitas, con tiempos reales de tránsito en carretera.

**Demo en producción:** https://optiruta-topaz.vercel.app

---

## ✨ Funcionalidades

- **Gestión de pacientes** — Agrega, edita y elimina pacientes con nombre, dirección y duración estimada de visita
- **Importar / Exportar Excel** — Carga masiva de pacientes desde `.xlsx` y exportación de la lista
- **Planificación diaria** — Selecciona los pacientes a visitar en el día y paradas manuales adicionales
- **Optimización de ruta** — Algoritmo de vecino más cercano con matriz de duraciones reales (OpenRouteService)
- **Soporte multimodal** — Carro 🚗 o a pie 🚶
- **Mapa interactivo** — Visualización de la ruta sobre Leaflet / OpenStreetMap
- **Horarios automáticos** — Calcula la hora estimada de llegada a cada parada según hora de inicio y duración de visita
- **Navegar con Google Maps o Waze** — Un clic abre la app de navegación con todas las paradas
- **Exportar resumen por WhatsApp** — Copia el itinerario del día listo para pegar
- **PWA instalable** — Funciona como app nativa en el celular (Android / iOS)
- **Datos locales** — Todo se guarda en `localStorage`, sin servidor ni login

---

## 🛠️ Stack técnico

| Tecnología | Uso |
|---|---|
| React 19 + Vite 8 | UI y bundler |
| React Router v7 | Navegación SPA |
| Leaflet + React Leaflet | Mapa interactivo |
| OpenRouteService API | Geocodificación y matriz de tiempos |
| XLSX (SheetJS) | Importar/exportar Excel |
| Turf.js | Utilidades geoespaciales |
| Vercel | Hosting y deploy automático |

---

## 🚀 Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build de producción
npm run build
```

---

## 📁 Estructura del proyecto

```
src/
├── components/       # Componentes reutilizables (mapa, modal, nav)
├── config/           # Configuración de la app (personal.js con flag de modo personal)
├── context/          # Contextos React (pacientes, toasts)
├── modules/          # Lógica de negocio (geocoder, optimizer, routing, exporter...)
└── views/            # Vistas principales (Home, Pacientes, Planificar, Ruta)
```

---

## ⚙️ Configuración personal

En `src/config/personal.js` hay un flag `PERSONAL_MODE` que activa mensajes personalizados y motivacionales. Cambiar a `false` para modo genérico al masificar la app.

---

## 📦 Deploy

El proyecto está conectado a Vercel con deploy automático en cada push a `main`.

```bash
# Deploy manual
vercel --prod
```

# 📖 Devocional Diario

**Devocional Diario** es un portal web interactivo de reflexión y lectura bíblica diseñado con un enfoque minimalista y prémium. Ofrece un espacio relajante y sin distracciones, ideal para la meditación de la palabra todos los días. 

El portal está optimizado con un diseño responsivo adaptado para dispositivos móviles, tabletas y computadoras de escritorio, y cuenta con un sistema híbrido que permite consultar las Sagradas Escrituras de forma local o desde la nube con **Firebase Firestore**.

---

## ✨ Características Principales

### 🧘 Entorno de Lectura Prémium
* **Diseño Centrado y Limpio**: Se removieron elementos ruidosos (como insignias innecesarias) y se alineó el título y el versículo al centro para facilitar una lectura inmersiva.
* **Ajustes Rápidos de Accesibilidad**: Barra sutil de ajustes directamente debajo del versículo que permite:
  * Cambiar de versión bíblica (Reina Valera 1960 predeterminada).
  * Escalar el tamaño del texto desde `80%` hasta `180%`.
  * Alternar entre tres temas visuales relajantes (**Claro**, **Sepia** para descanso visual, y **Oscuro** para lecturas nocturnas).

### 📝 Mi Reflexión (Diario Personal Integrado)
* **Combinación Meditación/Reflexión**: El diario personal está integrado directamente en la tarjeta de lectura, justo debajo de la meditación diaria.
* **Autoguardado Automático**: Guarda tus notas locales en tiempo real utilizando la base de datos del navegador (**IndexedDB**) a través de la clave de fecha (`YYYY-MM-DD`).
* **Exportación de Notas**: Un botón integrado te permite descargar todas tus notas históricas compiladas en un archivo de texto plano (`.txt`).

### 📅 Historial Deslizable (Side Drawer) y Vista en Modal
* **Acceso desde Cabecera**: El historial se despliega lateralmente como un panel flotante desde el lado derecho con un elegante efecto de desenfoque de fondo.
* **Agrupación Mensual**: Los días leídos se ordenan automáticamente bajo títulos por mes (ej. *"Junio 2026"*).
* **Vista en Modal Emergente**: Al hacer clic en un día del historial, se despliega un modal animado que muestra el versículo y reflexión del día seleccionado de forma completa, con la opción de cargarlo en la tarjeta principal.

### 📻 Radio en Vivo y Audio TTS
* **Escritura y Lectura con Música**: Botón de sintonización en el cabezal que activa un reproductor de radio cristiana en vivo flotante en el pie de página.
* **Reproducción Continua**: Al ser una aplicación de página única (SPA), la radio sigue sonando sin interrupciones mientras navegas entre fechas, escribes en el diario o cargas versículos.
* **Lectura de Voz (TTS)**: Un botón con la API de síntesis de voz (`SpeechSynthesis`) lee el devocional y meditación diaria con una velocidad reflexiva.

---

## ⚙️ Arquitectura de Datos (Modo Híbrido)

El portal está diseñado para funcionar en dos modos, configurable en el archivo [js/firebase-config.js](js/firebase-config.js):

1. **Modo Firebase Firestore (`USE_FIREBASE = true`)**:
   * **Optimización de Costos**: Las consultas se estructuran por **Capítulos** en lugar de versículos individuales. Al consultar un capítulo (ej. `rut_1`), se consume únicamente **1 lectura de documento** en Firestore en lugar de 20 o 30, permitiendo que el sitio funcione completamente gratis dentro de la cuota Spark de Firebase.
   * **Caché en Memoria**: Los capítulos consultados se guardan temporalmente en caché para evitar lecturas duplicadas en la base de datos.
2. **Modo Local Offline (`USE_FIREBASE = false`)**:
   * Funciona de manera autónoma sin configuraciones iniciales. Realiza llamadas `fetch` asíncronas para descargar archivos de texto locales estructurados en formato de tupla SQL (ej. [data/rv1960/rut.txt](data/rv1960/rut.txt)) bajo demanda.

---

## 📁 Estructura del Directorio

```bash
DevocionalDiario/
├── css/
│   └── style.css                 # Estilos prémium, variables de temas y animaciones
├── data/
│   ├── rv1960/                   # Libros locales de la Biblia en formato tupla SQL (.txt)
│   │   └── rut.txt               # Muestra del libro de Rut (capítulos 1-4)
│   └── rv1960_placeholder.json   # Índice anual de devocionales, títulos y reflexiones
├── js/
│   ├── app.js                    # Lógica principal de IndexedDB, TTS, Radio, Drawer y Modales
│   └── firebase-config.js        # Credenciales de Firebase y toggle de base de datos
├── scripts/
│   ├── upload_to_firestore.js    # Script en Node.js para migrar la Biblia local a Firestore
│   └── serviceAccountKey.json    # Clave privada de Firebase Admin (IGNORADA en git por seguridad)
├── index.html                    # Estructura del portal optimizada para SEO y accesibilidad
├── README.md                     # Documentación general del portal
└── .gitignore                    # Reglas de exclusión para no subir credenciales o dependencias
```

---

## 🚀 Guía de Instalación y Configuración

### 1. Ejecutar el Proyecto Localmente
Para servir el proyecto de forma local y permitir llamadas asíncronas de archivos de datos locales, abre tu terminal en la carpeta raíz y ejecuta un servidor HTTP simple (ej. con `npx`):

```bash
# Servir en el puerto predeterminado (usualmente http://localhost:8080)
npx http-server
```

### 2. Configurar Firebase Firestore (Opcional)
Para mover tus consultas bíblicas a la nube de Firestore:

1. Ve a [Firebase Console](https://console.firebase.google.com/) y crea un proyecto.
2. Crea una base de datos de **Cloud Firestore** en **Modo de prueba** (habilita lecturas públicas).
3. Agrega una aplicación Web a tu proyecto Firebase, copia tus credenciales y pégalas en:
   👉 [js/firebase-config.js](js/firebase-config.js)
4. En Firebase Console, ve a Configuración del proyecto > **Cuentas de servicio** y genera una **nueva clave privada**.
5. Descarga el archivo JSON, renómbralo a `serviceAccountKey.json` y guárdalo dentro de la carpeta `scripts/`.
6. En tu terminal instala la dependencia de Node.js:
   ```bash
   npm install firebase-admin
   ```
7. Ejecuta el script de migración para subir tus archivos de la Biblia de la carpeta `data/rv1960/` a Firestore:
   ```bash
   node scripts/upload_to_firestore.js
   ```
8. Cambia la variable `USE_FIREBASE` a `true` en tu archivo de configuración de Firebase en el frontend.

---

## 🛠️ Tecnologías Utilizadas

* **Estructura**: HTML5 semántico optimizado para accesibilidad (lectores de pantalla e IDs únicos).
* **Estilos**: CSS3 nativo (Variables CSS, Flexbox, Grid, Glassmorphism y animaciones de keyframes).
* **Lógica**: Vanilla JavaScript (ES6).
* **Almacenamiento Local**: IndexedDB nativo de HTML5 para persistencia de notas e historial.
* **Audio y TTS**: HTML5 Web Speech API (`SpeechSynthesis`) y HTML5 Audio Element.
* **Backend como Servicio (BaaS)**: Google Firebase (Cloud Firestore SDK Compat v9).

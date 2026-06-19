/* ==========================================================================
   PORTAL DE DEVOCIONAL DIARIO - CONFIGURACIÓN DE FIREBASE
   ========================================================================== */

// Reemplaza estos valores con las credenciales de tu proyecto de Firebase.
// Puedes encontrarlas en: Consola de Firebase > Configuración de Proyecto > Tus Aplicaciones.
const firebaseConfig = {
  apiKey: "REEMPLAZA_CON_TU_API_KEY",
  authDomain: "REEMPLAZA_CON_TU_PROJECT_ID.firebaseapp.com",
  projectId: "REEMPLAZA_CON_TU_PROJECT_ID",
  storageBucket: "REEMPLAZA_CON_TU_PROJECT_ID.appspot.com",
  messagingSenderId: "REEMPLAZA_CON_TU_MESSAGING_SENDER_ID",
  appId: "REEMPLAZA_CON_TU_APP_ID"
};

/**
 * CONTROL DE MIGRACIÓN:
 * - false: El portal leerá los archivos bíblicos locales de 'data/rv1960/' (Recomendado hasta que configures Firebase).
 * - true: El portal leerá la base de datos directamente desde Cloud Firestore en la nube.
 */
const USE_FIREBASE = false;

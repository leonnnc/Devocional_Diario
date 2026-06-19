/* ==========================================================================
   PORTAL DE DEVOCIONAL DIARIO - SCRIPT DE MIGRACIÓN PARA FIREBASE FIRESTORE
   ========================================================================== */

/**
 * INSTRUCCIONES DE USO:
 * 1. Abre una terminal e instala el SDK de Firebase Admin en la carpeta del proyecto:
 *    npm install firebase-admin
 * 
 * 2. Genera una clave de cuenta de servicio:
 *    - Ve a la Consola de Firebase (https://console.firebase.google.com/).
 *    - Selecciona tu proyecto.
 *    - Haz clic en el ícono de engranaje (Configuración del proyecto) > "Cuentas de servicio".
 *    - Selecciona "Node.js" y haz clic en "Generar nueva clave privada".
 *    - Descarga el archivo JSON, renombralo a "serviceAccountKey.json" y colócalo
 *      dentro de esta misma carpeta "scripts".
 * 
 * 3. Ejecuta este script desde la carpeta raíz del proyecto con Node.js:
 *    node scripts/upload_to_firestore.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Cargar la clave de cuenta de servicio
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error("\n❌ ERROR: Falta el archivo de credenciales de Firebase.");
  console.log("Por favor, descarga tu clave privada de servicio desde la consola de Firebase,");
  console.log("renómbrala a 'serviceAccountKey.json' y colócala en esta ubicación:");
  console.log(`👉 ${serviceAccountPath}\n`);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Inicializar la aplicación de Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Directorio de los archivos bíblicos de origen
const dataDir = path.join(__dirname, '..', 'data', 'rv1960');

// Mapeo inverso de nombres de archivos a nombres de libros formales en español
const bookNamesMap = {
  "genesis": "Génesis", "exodo": "Éxodo", "levitico": "Levítico", "numeros": "Números", "deuteronomio": "Deuteronomio",
  "josue": "Josué", "jueces": "Jueces", "rut": "Rut", "1_samuel": "1 Samuel", "2_samuel": "2 Samuel",
  "1_reyes": "1 Reyes", "2_reyes": "2 Reyes", "1_cronicas": "1 Crónicas", "2_cronicas": "2 Crónicas",
  "esdras": "Esdras", "nehemias": "Nehemías", "ester": "Ester", "job": "Job", "salmos": "Salmos",
  "proverbios": "Proverbios", "eclesiastes": "Eclesiastés", "cantares": "Cantares", "isaias": "Isaías",
  "jeremias": "Jeremías", "lamentaciones": "Lamentaciones", "ezequiel": "Ezequiel", "daniel": "Daniel",
  "oseas": "Oseas", "joel": "Joel", "amos": "Amós", "abdias": "Abdías", "jonas": "Jonás",
  "miqueas": "Miqueas", "nahum": "Nahúm", "habacuc": "Habacuc", "sofonias": "Sofonías", "hageo": "Hageo",
  "zacarias": "Zacarías", "malaquias": "Malaquías", "mateo": "Mateo", "marcos": "Marcos", "lucas": "Lucas",
  "juan": "Juan", "hechos": "Hechos", "romanos": "Romanos", "1_corintios": "1 Corintios", "2_corintios": "2 Corintios",
  "galatas": "Gálatas", "efesios": "Efesios", "filipenses": "Filipenses", "colosenses": "Colosenses",
  "1_tesalonicenses": "1 Tesalonicenses", "2_tesalonicenses": "2 Tesalonicenses", "1_timoteo": "1 Timoteo",
  "2_timoteo": "2 Timoteo", "tito": "Tito", "filemon": "Filemón", "hebreos": "Hebreos", "santiago": "Santiago",
  "1_pedro": "1 Pedro", "2_pedro": "2 Pedro", "1_juan": "1 Juan", "2_juan": "2 Juan", "3_juan": "3 Juan",
  "judas": "Judas", "apocalipsis": "Apocalipsis"
};

async function uploadBibleData() {
  console.log("=== INICIANDO MIGRACIÓN DE LA BIBLIA A FIRESTORE ===");
  
  if (!fs.existsSync(dataDir)) {
    console.error(`❌ ERROR: No se encontró la carpeta de datos bíblicos locales en: ${dataDir}`);
    console.log("Por favor, asegúrate de colocar tus archivos .txt bajo dicha estructura.");
    process.exit(1);
  }

  // Leer todos los archivos .txt de libros disponibles
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.txt'));
  console.log(`Se detectaron ${files.length} archivos de libros locales para procesar.`);

  if (files.length === 0) {
    console.log("⚠️ No se encontraron archivos de texto en la carpeta. Carga cancelada.");
    process.exit(0);
  }

  for (const file of files) {
    const bookFileKey = file.replace('.txt', '');
    const bookDisplayName = bookNamesMap[bookFileKey] || bookFileKey;
    const filePath = path.join(dataDir, file);
    
    console.log(`📖 Leyendo e indexando: ${bookDisplayName}...`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(l => l.trim().length > 0);

    // Agrupar los versículos del libro por capítulos
    // Estructura: { chapterNumber: { verseNumber: verseText } }
    const chaptersMap = {};

    for (const line of lines) {
      // Expresión regular para parsear la tupla: (book_id, chapter, verse, 'text')
      const match = line.match(/\(\d+,\s*(\d+),\s*(\d+),\s*'(.*?)'\)/);
      if (match) {
        const [_, chapterStr, verseStr, verseText] = match;
        const chapterNum = parseInt(chapterStr);
        const verseNum = parseInt(verseStr);
        
        if (!chaptersMap[chapterNum]) {
          chaptersMap[chapterNum] = {};
        }
        // Guardar limpiando caracteres de escape si existen
        chaptersMap[chapterNum][verseNum] = verseText.replace(/\\'/g, "'");
      }
    }

    // Subir los capítulos del libro a Firestore
    const chapterKeys = Object.keys(chaptersMap).map(Number);
    console.log(`   -> Subiendo ${chapterKeys.length} capítulos a Firestore...`);
    
    let batch = db.batch();
    let currentBatchSize = 0;

    for (const chapterNum of chapterKeys) {
      const docId = `${bookFileKey}_${chapterNum}`;
      const docRef = db.collection('bible_rv1960').doc(docId);
      
      const docData = {
        book: bookDisplayName,
        chapter: chapterNum,
        verses: chaptersMap[chapterNum]
      };

      batch.set(docRef, docData);
      currentBatchSize++;

      // Firestore limita los batches a 500 operaciones. Usamos 400 por seguridad.
      if (currentBatchSize === 400) {
        await batch.commit();
        console.log(`      ✓ Subido lote parcial de 400 capítulos.`);
        batch = db.batch();
        currentBatchSize = 0;
      }
    }

    // Enviar los elementos restantes
    if (currentBatchSize > 0) {
      await batch.commit();
    }
    
    console.log(`   ✅ Libro ${bookDisplayName} migrado por completo.`);
  }

  console.log("\n=======================================================");
  console.log("🎉 ¡PROCESO FINALIZADO CON ÉXITO!");
  console.log("Toda la base de datos bíblica ha sido subida a Cloud Firestore.");
  console.log("=======================================================\n");
  process.exit(0);
}

uploadBibleData().catch(err => {
  console.error("\n❌ Ocurrió un error inesperado durante la migración:", err);
  process.exit(1);
});

/* ==========================================================================
   PORTAL DE DEVOCIONAL DIARIO - LÓGICA DE APLICACIÓN AVANZADA (JAVASCRIPT)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // --- CONFIGURACIÓN Y ESTADO GLOBAL ---
  let bibleData = [];
  let currentDevotional = null;
  let activeDevotionalDateStr = ''; // Formato: YYYY-MM-DD
  
  // Elementos del DOM - Contenido
  const elDevotionalTitle = document.getElementById('devotional-title');
  const elDevotionalDate = document.getElementById('devotional-date');
  const elBibleVerseText = document.getElementById('bible-verse-text');
  const elBibleVerseReference = document.getElementById('bible-verse-reference');
  const elReflectionText = document.getElementById('devotional-reflection-text');
  
  // Elementos del DOM - Botones Acciones
  const btnCopyVerse = document.getElementById('btn-copy-verse');
  const btnShareVerse = document.getElementById('btn-share-verse');
  const btnMarkRead = document.getElementById('btn-mark-read');
  const btnTtsRead = document.getElementById('btn-tts-read');
  
  // Elementos del DOM - Diario
  const txtJournal = document.getElementById('journal-textarea');
  const elSaveStatus = document.getElementById('journal-save-status');
  const btnExportJournal = document.getElementById('btn-export-journal');
  
  // Elementos del DOM - Historial
  const elHistoryList = document.getElementById('history-list');
  
  // Elementos del DOM - Controles de Lectura
  const btnFontDecrease = document.getElementById('btn-font-decrease');
  const btnFontIncrease = document.getElementById('btn-font-increase');
  const elFontSizeDisplay = document.getElementById('font-size-display');
  
  const btnThemeLight = document.getElementById('btn-theme-light');
  const btnThemeSepia = document.getElementById('btn-theme-sepia');
  const btnThemeDark = document.getElementById('btn-theme-dark');

  // Elementos del DOM - Reproductor de Radio
  const btnRadioToggle = document.getElementById('btn-radio-toggle');
  const floatingRadioBar = document.getElementById('floating-radio-bar');
  const btnRadioBarClose = document.getElementById('btn-radio-bar-close');
  const btnRadioPlay = document.getElementById('btn-radio-play');
  const radioVolumeSlider = document.getElementById('radio-volume-slider');
  const equalizerBars = document.getElementById('equalizer-bars');
  const radioStatusText = document.querySelector('.radio-bar-status-text');

  // Elementos del DOM - Panel Lateral Historial y Modal
  const btnHistoryToggle = document.getElementById('btn-history-toggle');
  const historyDrawer = document.getElementById('history-drawer');
  const btnHistoryDrawerClose = document.getElementById('btn-history-drawer-close');
  const drawerOverlay = document.getElementById('drawer-overlay');
  
  const historyModal = document.getElementById('history-modal');
  const btnModalClose = document.getElementById('btn-modal-close');
  const btnModalLoad = document.getElementById('btn-modal-load');

  // --- 1. INDEXEDDB STORAGE SERVICE ---
  const DB_NAME = 'DevocionalLocalDB';
  const DB_VERSION = 1;
  let dbInstance = null;

  function initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Almacenar reflexiones del diario personal escritas por fecha
        if (!db.objectStoreNames.contains('user_notes')) {
          db.createObjectStore('user_notes', { keyPath: 'dateKey' });
        }
        // Almacenar historial de versículos leídos
        if (!db.objectStoreNames.contains('read_history')) {
          db.createObjectStore('read_history', { keyPath: 'dateKey' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.error("Error al abrir IndexedDB:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  async function getDBInstance() {
    if (dbInstance) return dbInstance;
    return initDatabase();
  }

  async function saveUserNoteDB(dateKey, noteObject) {
    const db = await getDBInstance();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['user_notes'], 'readwrite');
      const store = transaction.objectStore('user_notes');
      const request = store.put({ dateKey, ...noteObject });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getUserNoteDB(dateKey) {
    const db = await getDBInstance();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['user_notes'], 'readonly');
      const store = transaction.objectStore('user_notes');
      const request = store.get(dateKey);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteUserNoteDB(dateKey) {
    const db = await getDBInstance();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['user_notes'], 'readwrite');
      const store = transaction.objectStore('user_notes');
      const request = store.delete(dateKey);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getAllUserNotesDB() {
    const db = await getDBInstance();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['user_notes'], 'readonly');
      const store = transaction.objectStore('user_notes');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveHistoryEntryDB(dateKey, historyObject) {
    const db = await getDBInstance();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['read_history'], 'readwrite');
      const store = transaction.objectStore('read_history');
      const request = store.put({ dateKey, ...historyObject });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getHistoryEntriesDB() {
    const db = await getDBInstance();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['read_history'], 'readonly');
      const store = transaction.objectStore('read_history');
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result;
        results.sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey));
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- 2. LÓGICA DE TEMAS Y ACCESIBILIDAD ---

  // Inicializar Tema
  const savedTheme = localStorage.getItem('reader-theme') || 'theme-sepia';
  setTheme(savedTheme);

  btnThemeLight.addEventListener('click', () => setTheme('theme-light'));
  btnThemeSepia.addEventListener('click', () => setTheme('theme-sepia'));
  btnThemeDark.addEventListener('click', () => setTheme('theme-dark'));

  function setTheme(themeName) {
    document.body.className = '';
    document.body.classList.add(themeName);
    localStorage.setItem('reader-theme', themeName);
    
    [btnThemeLight, btnThemeSepia, btnThemeDark].forEach(btn => btn.classList.remove('active'));
    if (themeName === 'theme-light') btnThemeLight.classList.add('active');
    if (themeName === 'theme-sepia') btnThemeSepia.classList.add('active');
    if (themeName === 'theme-dark') btnThemeDark.classList.add('active');
  }

  // Inicializar Tamaño de Fuente
  let fontScale = parseFloat(localStorage.getItem('reader-font-scale')) || 1.0;
  updateFontScale(fontScale);

  btnFontDecrease.addEventListener('click', () => {
    if (fontScale > 0.8) {
      fontScale = parseFloat((fontScale - 0.1).toFixed(1));
      updateFontScale(fontScale);
    }
  });

  btnFontIncrease.addEventListener('click', () => {
    if (fontScale < 1.8) {
      fontScale = parseFloat((fontScale + 0.1).toFixed(1));
      updateFontScale(fontScale);
    }
  });

  function updateFontScale(scale) {
    document.documentElement.style.setProperty('--font-scale', scale);
    elFontSizeDisplay.textContent = `${Math.round(scale * 100)}%`;
    localStorage.setItem('reader-font-scale', scale);
  }

  // --- 3. INICIALIZACIÓN DE FIREBASE Y DYNAMIC BIBLE LOADER ---

  let firestoreDb = null;
  if (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE) {
    try {
      firebase.initializeApp(firebaseConfig);
      firestoreDb = firebase.firestore();
      console.log("Firebase Firestore inicializado correctamente.");
    } catch (e) {
      console.error("Error al inicializar Firebase:", e);
    }
  }

  const bookMapping = {
    "Génesis": "genesis", "Éxodo": "exodo", "Levítico": "levitico", "Números": "numeros", "Deuteronomio": "deuteronomio",
    "Josué": "josue", "Jueces": "jueces", "Rut": "rut", "1 Samuel": "1_samuel", "2 Samuel": "2_samuel",
    "1 Reyes": "1_reyes", "2 Reyes": "2_reyes", "1 Crónicas": "1_cronicas", "2 Crónicas": "2_cronicas",
    "Esdras": "esdras", "Nehemías": "nehemias", "Ester": "ester", "Job": "job", "Salmos": "salmos",
    "Proverbios": "proverbios", "Eclesiastés": "eclesiastes", "Cantares": "cantares", "Isaías": "isaias",
    "Jeremías": "jeremias", "Lamentaciones": "lamentaciones", "Ezequiel": "ezequiel", "Daniel": "daniel",
    "Oseas": "oseas", "Joel": "joel", "Amós": "amos", "Abdías": "abdias", "Jonás": "jonas",
    "Miqueas": "miqueas", "Nahúm": "nahum", "Habacuc": "habacuc", "Sofonías": "sofonias", "Hageo": "hageo",
    "Zacarías": "zacarias", "Malaquías": "malaquias", "Mateo": "mateo", "Marcos": "marcos", "Lucas": "lucas",
    "Juan": "juan", "Hechos": "hechos", "Romanos": "romanos", "1 Corintios": "1_corintios", "2 Corintios": "2_corintios",
    "Gálatas": "galatas", "Efesios": "efesios", "Filipenses": "filipenses", "Colosenses": "colosenses",
    "1 Tesalonicenses": "1_tesalonicenses", "2 Tesalonicenses": "2_tesalonicenses", "1 Timoteo": "1_timoteo",
    "2 Timoteo": "2_timoteo", "Tito": "tito", "Filemón": "filemon", "Hebreos": "hebreos", "Santiago": "santiago",
    "1 Pedro": "1_pedro", "2 Pedro": "2_pedro", "1 Juan": "1_juan", "2 Juan": "2_juan", "3 Juan": "3_juan",
    "Judas": "judas", "Apocalipsis": "apocalipsis"
  };

  const loadedBooksCache = new Map(); // Guarda textos de libros para modo local, u objetos de capítulo para modo Firebase

  async function fetchBibleVerse(book, chapter, verse) {
    const filename = bookMapping[book];
    if (!filename) {
      console.error(`Libro no soportado: ${book}`);
      return null;
    }

    // --- MODO FIREBASE ---
    if (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE && firestoreDb) {
      const docId = `${filename}_${chapter}`;
      let chapterData = null;

      // Intentar recuperar de caché en memoria primero
      if (loadedBooksCache.has(docId)) {
        chapterData = loadedBooksCache.get(docId);
      } else {
        try {
          console.log(`Buscando capítulo en Firestore: ${docId}`);
          const docRef = firestoreDb.collection('bible_rv1960').doc(docId);
          const docSnap = await docRef.get();
          if (docSnap.exists) {
            chapterData = docSnap.data();
            loadedBooksCache.set(docId, chapterData); // Guardar en caché
          } else {
            console.warn(`No se encontró el documento ${docId} en Firestore.`);
          }
        } catch (err) {
          console.error("Error al leer desde Cloud Firestore:", err);
        }
      }

      if (chapterData && chapterData.verses) {
        if (verse.includes('-')) {
          const [startVerse, endVerse] = verse.split('-').map(v => parseInt(v.trim()));
          const matchedVerses = [];
          for (let vNum = startVerse; vNum <= endVerse; vNum++) {
            const verseText = chapterData.verses[String(vNum)];
            if (verseText) matchedVerses.push(verseText);
          }
          return matchedVerses.length > 0 ? matchedVerses.join(' ') : null;
        } else {
          return chapterData.verses[verse] || chapterData.verses[String(parseInt(verse))] || null;
        }
      }
      console.log("Firestore falló o está vacío, usando archivos locales de respaldo...");
    }

    // --- MODO ARCHIVOS LOCALES (PLAN B) ---
    let bookText = "";
    if (loadedBooksCache.has(filename)) {
      bookText = loadedBooksCache.get(filename);
    } else {
      try {
        const response = await fetch(`data/rv1960/${filename}.txt?v=1.0.1`);
        if (!response.ok) {
          throw new Error(`Código de estado HTTP: ${response.status}`);
        }
        bookText = await response.text();
        loadedBooksCache.set(filename, bookText);
      } catch (err) {
        console.error(`Error al cargar el archivo de la Biblia para ${book}:`, err);
        return null;
      }
    }

    // Dividir líneas
    const lines = bookText.split('\n').filter(l => l.trim().length > 0);
    
    // Procesar rango de versículos
    if (verse.includes('-')) {
      const [startVerse, endVerse] = verse.split('-').map(v => parseInt(v.trim()));
      const matchedVerses = [];
      for (const line of lines) {
        const match = line.match(/\(\d+,\s*(\d+),\s*(\d+),\s*'(.*?)'\)/);
        if (match) {
          const [_, lineChapter, lineVerse, lineText] = match;
          const cNum = parseInt(lineChapter);
          const vNum = parseInt(lineVerse);
          if (cNum === chapter && vNum >= startVerse && vNum <= endVerse) {
            matchedVerses.push({ num: vNum, text: lineText });
          }
        }
      }
      matchedVerses.sort((a, b) => a.num - b.num);
      if (matchedVerses.length > 0) {
        return matchedVerses.map(v => v.text).join(' ');
      }
    } else {
      // Procesar un solo versículo
      const vNumTarget = parseInt(verse);
      for (const line of lines) {
        const match = line.match(/\(\d+,\s*(\d+),\s*(\d+),\s*'(.*?)'\)/);
        if (match) {
          const [_, lineChapter, lineVerse, lineText] = match;
          if (parseInt(lineChapter) === chapter && parseInt(lineVerse) === vNumTarget) {
            return lineText;
          }
        }
      }
    }

    return null;
  }

  // --- 4. CARGA Y PROCESADO DEL DEVOCIONAL DIARIO ---

  // Inicialización principal
  initDatabase().then(() => {
    // Cargar datos JSON de devocionales
    return fetch('data/rv1960_placeholder.json');
  })
  .then(response => {
    if (!response.ok) throw new Error('No se pudo cargar el índice de devocionales.');
    return response.json();
  })
  .then(data => {
    bibleData = data;
    
    // Procesar enrutamiento dinámico por URL (?date=YYYY-MM-DD)
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    let initialDate = new Date();

    if (dateParam) {
      const dateParts = dateParam.split('-');
      if (dateParts.length === 3) {
        const parsedYear = parseInt(dateParts[0]);
        const parsedMonth = parseInt(dateParts[1]) - 1;
        const parsedDay = parseInt(dateParts[2]);
        const parsedDate = new Date(parsedYear, parsedMonth, parsedDay);
        if (!isNaN(parsedDate.getTime())) {
          initialDate = parsedDate;
        }
      }
    }

    loadDailyDevotional(initialDate);
    renderRecentVersesHistory();
  })
  .catch(error => {
    console.error(error);
    loadFallbackDevotional();
  });

  // Carga devocional según fecha
  function loadDailyDevotional(dateObj) {
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const dateKey = getFormattedDateKey(dateObj);
    activeDevotionalDateStr = dateKey;
    
    // Detener audio TTS si estaba reproduciéndose
    if (isTtsSpeaking) {
      window.speechSynthesis.cancel();
      isTtsSpeaking = false;
      btnTtsRead.innerHTML = '<span class="icon">🔊</span> Escuchar';
    }

    let devotional = bibleData.find(item => item.month === month && item.day === day);
    
    // Algoritmo cíclico si no hay coincidencia exacta de fecha en desarrollo
    if (!devotional && bibleData.length > 0) {
      const dayOfYear = getDayOfYear(dateObj);
      const index = dayOfYear % bibleData.length;
      devotional = bibleData[index];
    }
    
    if (devotional) {
      currentDevotional = devotional;
      
      // Lógica de carga dinámica de base de datos bíblica local
      if (!devotional.text || devotional.text.trim() === "" || devotional.text === "...") {
        elBibleVerseText.textContent = "Cargando texto sagrado...";
        fetchBibleVerse(devotional.book, devotional.chapter, devotional.verse)
          .then(fetchedText => {
            if (fetchedText) {
              devotional.text = fetchedText;
              elBibleVerseText.textContent = fetchedText;
            } else {
              elBibleVerseText.textContent = "No se pudo recuperar el texto bíblico local. Verifica los archivos en data/rv1960/.";
            }
          });
      }
      
      displayDevotional(devotional, dateObj);
      loadJournalNote(dateKey);
      updateReadStatusUI(dateKey);
      saveToHistoryLog(devotional, dateObj);
    } else {
      loadFallbackDevotional();
    }
  }

  function displayDevotional(devotional, dateObj) {
    elDevotionalTitle.textContent = devotional.devotional_title;
    elDevotionalDate.textContent = formatDateSpanish(dateObj);
    elBibleVerseText.textContent = devotional.text || "Cargando...";
    elBibleVerseReference.textContent = `${devotional.book} ${devotional.chapter}:${devotional.verse}`;
    elReflectionText.textContent = devotional.reflection;
  }

  function loadFallbackDevotional() {
    const fallback = {
      book: "Salmos",
      chapter: 23,
      verse: "1",
      text: "Jehová es mi pastor; nada me faltará.",
      devotional_title: "La Provisión Divina",
      reflection: "Hoy descansa en la promesa de que Dios es tu Pastor. Él conoce cada una de tus necesidades y te guiará con amor y cuidado perfecto."
    };
    currentDevotional = fallback;
    displayDevotional(fallback, new Date());
    loadJournalNote(activeDevotionalDateStr);
    updateReadStatusUI(activeDevotionalDateStr);
  }

  // --- 5. DIARIO DE REFLEXIÓN CON INDEXEDDB ---
  let saveTimeout;

  txtJournal.addEventListener('input', () => {
    elSaveStatus.textContent = 'Escribiendo...';
    elSaveStatus.classList.add('saving');
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveJournalNote();
    }, 1000);
  });

  async function saveJournalNote() {
    const text = txtJournal.value.trim();
    
    if (text === '') {
      await deleteUserNoteDB(activeDevotionalDateStr);
    } else {
      const noteObject = {
        formattedDate: elDevotionalDate.textContent,
        title: elDevotionalTitle.textContent,
        reference: elBibleVerseReference.textContent,
        note: text
      };
      await saveUserNoteDB(activeDevotionalDateStr, noteObject);
    }
    
    elSaveStatus.textContent = 'Guardado automáticamente';
    elSaveStatus.classList.remove('saving');
  }

  async function loadJournalNote(dateKey) {
    try {
      const savedNote = await getUserNoteDB(dateKey);
      if (savedNote) {
        txtJournal.value = savedNote.note;
      } else {
        txtJournal.value = '';
      }
      elSaveStatus.textContent = 'Guardado automáticamente';
    } catch (e) {
      console.error("Error al cargar nota de IndexedDB:", e);
      txtJournal.value = '';
    }
  }

  // Exportar todas las notas guardadas
  btnExportJournal.addEventListener('click', async () => {
    let allNotesText = "--- MI DIARIO DE REFLEXIONES DIARIAS ---\n\n";
    
    try {
      const notes = await getAllUserNotesDB();
      if (notes.length === 0) {
        alert("Aún no tienes notas guardadas en tu diario.");
        return;
      }
      
      notes.forEach(noteObj => {
        allNotesText += `Fecha: ${noteObj.formattedDate}\n`;
        allNotesText += `Devocional: ${noteObj.title}\n`;
        allNotesText += `Cita Bíblica: ${noteObj.reference}\n`;
        allNotesText += `Reflexión Personal:\n${noteObj.note}\n`;
        allNotesText += `-----------------------------------------------\n\n`;
      });
      
      const blob = new Blob([allNotesText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Diario_Devocionales_${getFormattedDateKey(new Date())}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error al exportar notas de IndexedDB:", e);
      alert("Hubo un error al exportar tus reflexiones.");
    }
  });

  // --- 6. COMPLETAR DEVOCIONAL Y COMPARTIR ---

  btnMarkRead.addEventListener('click', () => {
    const key = `devotional_read_${activeDevotionalDateStr}`;
    const isRead = localStorage.getItem(key) === 'true';
    
    if (isRead) {
      localStorage.removeItem(key);
      updateReadStatusUI(activeDevotionalDateStr);
    } else {
      localStorage.setItem(key, 'true');
      updateReadStatusUI(activeDevotionalDateStr);
      triggerCardBounce();
    }
  });

  function updateReadStatusUI(dateKey) {
    const key = `devotional_read_${dateKey}`;
    const isRead = localStorage.getItem(key) === 'true';
    
    if (isRead) {
      btnMarkRead.innerHTML = '<span class="icon">✓</span> Devocional Completado';
      btnMarkRead.style.backgroundColor = 'var(--text-secondary)';
      btnMarkRead.style.boxShadow = 'none';
    } else {
      btnMarkRead.innerHTML = '<span class="icon">✓</span> Completar Devocional';
      btnMarkRead.style.backgroundColor = 'var(--accent-color)';
      btnMarkRead.style.boxShadow = '0 4px 12px rgba(178, 94, 26, 0.2)';
    }
  }

  function triggerCardBounce() {
    const card = document.getElementById('devotional-display-card');
    card.style.transform = 'scale(1.015)';
    setTimeout(() => {
      card.style.transform = 'scale(1)';
    }, 180);
  }

  btnCopyVerse.addEventListener('click', () => {
    const verseText = elBibleVerseText.textContent;
    const reference = elBibleVerseReference.textContent;
    const textToCopy = `"${verseText}" - ${reference} (Reina Valera 1960)`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalText = btnCopyVerse.innerHTML;
      btnCopyVerse.innerHTML = '✨ ¡Copiado!';
      setTimeout(() => {
        btnCopyVerse.innerHTML = originalText;
      }, 1500);
    }).catch(err => {
      console.error("Error al copiar texto:", err);
    });
  });

  btnShareVerse.addEventListener('click', () => {
    const verseText = elBibleVerseText.textContent;
    const reference = elBibleVerseReference.textContent;
    
    // Generar ruta dinámica incorporando la fecha activa
    const origin = window.location.origin;
    const path = window.location.pathname;
    const shareUrl = `${origin}${path}?date=${activeDevotionalDateStr}`;

    const shareData = {
      title: 'Devocional Diario',
      text: `"${verseText}" - ${reference} (Reina Valera 1960)`,
      url: shareUrl
    };
    
    if (navigator.share) {
      navigator.share(shareData)
        .catch(err => console.log('Acción cancelar o error al compartir:', err));
    } else {
      // Fallback
      navigator.clipboard.writeText(`${shareData.text} ${shareUrl}`).then(() => {
        const originalText = btnShareVerse.innerHTML;
        btnShareVerse.innerHTML = '🔗 Link Copiado';
        setTimeout(() => {
          btnShareVerse.innerHTML = originalText;
        }, 1500);
      });
    }
  });

  // --- 7. LÓGICA TEXT-TO-SPEECH (LECTOR DE VOZ) ---
  let ttsUtterance = null;
  let isTtsSpeaking = false;

  btnTtsRead.addEventListener('click', () => {
    if ('speechSynthesis' in window) {
      if (isTtsSpeaking) {
        window.speechSynthesis.cancel();
        isTtsSpeaking = false;
        btnTtsRead.innerHTML = '<span class="icon">🔊</span> Escuchar';
        btnTtsRead.title = "Escuchar devocional en voz alta";
      } else {
        const title = elDevotionalTitle.textContent;
        const dateText = elDevotionalDate.textContent;
        const reference = elBibleVerseReference.textContent;
        const verseText = elBibleVerseText.textContent;
        const reflection = elReflectionText.textContent;

        const speakText = `Devocional para hoy. Título: ${title}. Versículo bíblico tomado de ${reference}: ${verseText}. Meditación del día: ${reflection}`;
        
        window.speechSynthesis.cancel();
        
        ttsUtterance = new SpeechSynthesisUtterance(speakText);
        ttsUtterance.lang = 'es-ES';
        ttsUtterance.rate = 0.95; // Velocidad reflexiva
        ttsUtterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice => voice.lang.startsWith('es') || voice.lang.startsWith('es-'));
        if (spanishVoice) {
          ttsUtterance.voice = spanishVoice;
        }

        ttsUtterance.onstart = () => {
          isTtsSpeaking = true;
          btnTtsRead.innerHTML = '<span class="icon">⏸</span> Detener';
          btnTtsRead.title = "Detener la voz";
        };

        ttsUtterance.onend = () => {
          isTtsSpeaking = false;
          btnTtsRead.innerHTML = '<span class="icon">🔊</span> Escuchar';
          btnTtsRead.title = "Escuchar devocional en voz alta";
        };

        ttsUtterance.onerror = () => {
          isTtsSpeaking = false;
          btnTtsRead.innerHTML = '<span class="icon">🔊</span> Escuchar';
        };

        window.speechSynthesis.speak(ttsUtterance);
      }
    } else {
      alert("Tu sistema no soporta la API de lectura de voz integrada.");
    }
  });

  // --- 8. REPRODUCTOR DE RADIO FLOTANTE ---
  let radioAudio = null;
  let isRadioPlaying = false;

  // Toggle de la barra flotante desde el encabezado
  btnRadioToggle.addEventListener('click', () => {
    toggleRadioBar();
  });

  // Ocultar la barra flotante desde el botón "x" de la barra
  btnRadioBarClose.addEventListener('click', () => {
    hideRadioBar();
  });

  function toggleRadioBar() {
    const isOpen = floatingRadioBar.classList.contains('show');
    if (isOpen) {
      hideRadioBar();
    } else {
      showRadioBar();
    }
  }

  function showRadioBar() {
    floatingRadioBar.classList.add('show');
    btnRadioToggle.classList.add('active');
    document.body.classList.add('radio-bar-open');
  }

  function hideRadioBar() {
    floatingRadioBar.classList.remove('show');
    btnRadioToggle.classList.remove('active');
    document.body.classList.remove('radio-bar-open');
  }

  // Lógica del reproductor de Audio
  btnRadioPlay.addEventListener('click', () => {
    if (!radioAudio) {
      radioAudio = new Audio('https://stream.zeno.fm/f2etpuit0h1uv');
      radioAudio.crossOrigin = 'anonymous';
      radioAudio.volume = radioVolumeSlider.value / 100;
    }

    if (isRadioPlaying) {
      radioAudio.pause();
      isRadioPlaying = false;
      btnRadioPlay.innerHTML = '<span class="play-icon">▶</span>';
      equalizerBars.classList.remove('playing');
      radioStatusText.textContent = "Radio pausada";
    } else {
      radioStatusText.textContent = "Sintonizando...";
      radioAudio.play().then(() => {
        isRadioPlaying = true;
        btnRadioPlay.innerHTML = '<span class="play-icon">⏸</span>';
        equalizerBars.classList.add('playing');
        radioStatusText.textContent = "Escuchando en vivo 📻";
        // Si la barra está oculta, forzar mostrarla
        if (!floatingRadioBar.classList.contains('show')) {
          showRadioBar();
        }
      }).catch(err => {
        console.error("Fallo al sintonizar radio:", err);
        radioStatusText.textContent = "Señal no disponible";
      });
    }
  });

  radioVolumeSlider.addEventListener('input', () => {
    const vol = radioVolumeSlider.value / 100;
    if (radioAudio) {
      radioAudio.volume = vol;
    }
  });

  // --- 8b. CONTROL DEL PANEL LATERAL DE HISTORIAL Y MODAL ---
  let selectedHistoryItem = null;

  btnHistoryToggle.addEventListener('click', () => {
    toggleHistoryDrawer();
  });

  btnHistoryDrawerClose.addEventListener('click', () => {
    hideHistoryDrawer();
  });

  drawerOverlay.addEventListener('click', () => {
    hideHistoryDrawer();
  });

  function toggleHistoryDrawer() {
    const isOpen = historyDrawer.classList.contains('open');
    if (isOpen) {
      hideHistoryDrawer();
    } else {
      showHistoryDrawer();
    }
  }

  function showHistoryDrawer() {
    historyDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
    btnHistoryToggle.classList.add('active');
  }

  function hideHistoryDrawer() {
    historyDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    btnHistoryToggle.classList.remove('active');
  }

  // Eventos del Modal
  btnModalClose.addEventListener('click', () => {
    historyModal.classList.remove('open');
  });

  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) {
      historyModal.classList.remove('open');
    }
  });

  btnModalLoad.addEventListener('click', () => {
    if (selectedHistoryItem) {
      const parts = selectedHistoryItem.dateKey.split('-');
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      loadDailyDevotional(dateObj);
      historyModal.classList.remove('open');
      hideHistoryDrawer();
      document.getElementById('devotional-display-card').scrollIntoView({ behavior: 'smooth' });
    }
  });

  function openHistoryModal(item) {
    selectedHistoryItem = item;
    document.getElementById('modal-devotional-title').textContent = item.title;
    document.getElementById('modal-devotional-date').textContent = item.formattedDateLabel || item.formattedDate;
    document.getElementById('modal-verse-text').textContent = item.text || 'Sin texto bíblico cargado.';
    document.getElementById('modal-verse-reference').textContent = item.reference;
    historyModal.classList.add('open');
  }

  // --- 9. LOG DE HISTORIAL Y NAVEGACIÓN (INDEXEDDB) ---

  async function saveToHistoryLog(devotional, dateObj) {
    const dateKey = getFormattedDateKey(dateObj);
    const historyItem = {
      formattedDate: formatDateShort(dateObj),
      formattedDateLabel: formatDateSpanish(dateObj),
      title: devotional.devotional_title,
      reference: `${devotional.book} ${devotional.chapter}:${devotional.verse}`,
      text: devotional.text
    };
    
    try {
      await saveHistoryEntryDB(dateKey, historyItem);
      renderRecentVersesHistory();
    } catch (e) {
      console.error("Error al guardar en el historial DB:", e);
    }
  }

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  async function renderRecentVersesHistory() {
    try {
      const history = await getHistoryEntriesDB();
      elHistoryList.innerHTML = '';
      
      if (history.length === 0) {
        elHistoryList.innerHTML = '<li class="history-empty">Tu historial aparecerá aquí próximamente.</li>';
        return;
      }
      
      let currentMonthYear = '';
      history.forEach(item => {
        const parts = item.dateKey.split('-'); // YYYY-MM-DD
        const year = parts[0];
        const monthIdx = parseInt(parts[1]) - 1;
        const monthName = monthNames[monthIdx];
        const monthYearLabel = `${monthName} ${year}`;
        
        if (monthYearLabel !== currentMonthYear) {
          currentMonthYear = monthYearLabel;
          const monthHeader = document.createElement('div');
          monthHeader.className = 'history-month-divider';
          monthHeader.textContent = monthYearLabel;
          elHistoryList.appendChild(monthHeader);
        }
        
        const li = document.createElement('li');
        li.className = 'history-item-compact';
        li.innerHTML = `
          <div class="history-item-date">${item.formattedDateLabel || item.formattedDate}</div>
          <div class="history-item-reference">${item.reference}</div>
        `;
        
        li.addEventListener('click', () => {
          openHistoryModal(item);
        });
        
        elHistoryList.appendChild(li);
      });
    } catch (e) {
      console.error("Error al renderizar el historial de IndexedDB:", e);
      elHistoryList.innerHTML = '<li class="history-empty">Error al cargar historial.</li>';
    }
  }

  // --- 10. FUNCIONES AUXILIARES ---

  function getFormattedDateKey(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }

  function formatDateSpanish(date) {
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let formatted = date.toLocaleDateString('es-ES', opciones);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  function formatDateShort(date) {
    const opciones = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('es-ES', opciones);
  }

  // ==========================================================================
  // LÓGICA DE LA SECCIÓN DE LECTURA Y PLANES DE LECTURA
  // ==========================================================================

  // 1. Elementos del DOM de Lectura y Historias
  const tabDevotional = document.getElementById('tab-devotional');
  const tabLectura = document.getElementById('tab-lectura');
  const tabHistorias = document.getElementById('tab-historias');
  const sectionDevotional = document.getElementById('section-devotional');
  const sectionLectura = document.getElementById('section-lectura');
  const sectionHistorias = document.getElementById('section-historias');

  const btnCloseStories = document.getElementById('btn-close-stories');
  const filterStoryAll = document.getElementById('filter-story-all');
  const filterStoryAntiguo = document.getElementById('filter-story-antiguo');
  const filterStoryNuevo = document.getElementById('filter-story-nuevo');
  const storiesGridContainer = document.getElementById('stories-grid-container');

  const readingHomeView = document.getElementById('reading-home-view');
  const readingBooksView = document.getElementById('reading-books-view');
  const readingChaptersView = document.getElementById('reading-chapters-view');
  const readingTextView = document.getElementById('reading-text-view');
  const readingPlanDetailView = document.getElementById('reading-plan-detail-view');

  const btnTestamentAntiguo = document.getElementById('btn-testament-antiguo');
  const btnTestamentNuevo = document.getElementById('btn-testament-nuevo');
  const elReadingTestamentTitle = document.getElementById('reading-testament-title');
  const elBooksGridContainer = document.getElementById('books-grid-container');
  
  const btnBackToTestaments = document.getElementById('btn-back-to-testaments');
  const elReadingBookTitle = document.getElementById('reading-book-title');
  const elChaptersGridContainer = document.getElementById('chapters-grid-container');
  
  const btnBackToBooks = document.getElementById('btn-back-to-books');
  const elReaderChapterTitle = document.getElementById('reader-chapter-title');
  const elBibleReaderTextContainer = document.getElementById('bible-reader-text-container');
  const btnReaderMarkComplete = document.getElementById('btn-reader-mark-complete');
  const btnReaderPrev = document.getElementById('btn-reader-prev');
  const btnReaderNext = document.getElementById('btn-reader-next');
  const btnBackToChapters = document.getElementById('btn-back-to-chapters');

  const btnBackToPlans = document.getElementById('btn-back-to-plans');
  const elPlanDetailTitle = document.getElementById('plan-detail-title');
  const elPlanDetailProgressLabel = document.getElementById('plan-detail-progress-label');
  const elPlanDetailProgressFill = document.getElementById('plan-detail-progress-fill');
  const elPlanDaysListContainer = document.getElementById('plan-days-list-container');
  const btnResetPlan = document.getElementById('btn-reset-plan');

  const elBibleSearchInput = document.getElementById('bible-search-input');
  const btnBibleSearch = document.getElementById('btn-bible-search');

  // Base de datos estática de libros de la Biblia
  const bibleBooks = [
    // Antiguo Testamento
    { name: "Génesis", testament: "antiguo", chapters: 50, filename: "genesis" },
    { name: "Éxodo", testament: "antiguo", chapters: 40, filename: "exodo" },
    { name: "Levítico", testament: "antiguo", chapters: 27, filename: "levitico" },
    { name: "Números", testament: "antiguo", chapters: 36, filename: "numeros" },
    { name: "Deuteronomio", testament: "antiguo", chapters: 34, filename: "deuteronomio" },
    { name: "Josué", testament: "antiguo", chapters: 24, filename: "josue" },
    { name: "Jueces", testament: "antiguo", chapters: 21, filename: "jueces" },
    { name: "Rut", testament: "antiguo", chapters: 4, filename: "rut" },
    { name: "1 Samuel", testament: "antiguo", chapters: 31, filename: "1_samuel" },
    { name: "2 Samuel", testament: "antiguo", chapters: 24, filename: "2_samuel" },
    { name: "1 Reyes", testament: "antiguo", chapters: 22, filename: "1_reyes" },
    { name: "2 Reyes", testament: "antiguo", chapters: 25, filename: "2_reyes" },
    { name: "1 Crónicas", testament: "antiguo", chapters: 29, filename: "1_cronicas" },
    { name: "2 Crónicas", testament: "antiguo", chapters: 36, filename: "2_cronicas" },
    { name: "Esdras", testament: "antiguo", chapters: 10, filename: "esdras" },
    { name: "Nehemías", testament: "antiguo", chapters: 13, filename: "nehemias" },
    { name: "Ester", testament: "antiguo", chapters: 10, filename: "ester" },
    { name: "Job", testament: "antiguo", chapters: 42, filename: "job" },
    { name: "Salmos", testament: "antiguo", chapters: 150, filename: "salmos" },
    { name: "Proverbios", testament: "antiguo", chapters: 31, filename: "proverbios" },
    { name: "Eclesiastés", testament: "antiguo", chapters: 12, filename: "eclesiastes" },
    { name: "Cantares", testament: "antiguo", chapters: 8, filename: "cantares" },
    { name: "Isaías", testament: "antiguo", chapters: 66, filename: "isaias" },
    { name: "Jeremías", testament: "antiguo", chapters: 52, filename: "jeremias" },
    { name: "Lamentaciones", testament: "antiguo", chapters: 5, filename: "lamentaciones" },
    { name: "Ezequiel", testament: "antiguo", chapters: 48, filename: "ezequiel" },
    { name: "Daniel", testament: "antiguo", chapters: 12, filename: "daniel" },
    { name: "Oseas", testament: "antiguo", chapters: 14, filename: "oseas" },
    { name: "Joel", testament: "antiguo", chapters: 3, filename: "joel" },
    { name: "Amós", testament: "antiguo", chapters: 9, filename: "amos" },
    { name: "Abdías", testament: "antiguo", chapters: 1, filename: "abdias" },
    { name: "Jonás", testament: "antiguo", chapters: 4, filename: "jonas" },
    { name: "Miqueas", testament: "antiguo", chapters: 7, filename: "miqueas" },
    { name: "Nahúm", testament: "antiguo", chapters: 3, filename: "nahum" },
    { name: "Habacuc", testament: "antiguo", chapters: 3, filename: "habacuc" },
    { name: "Sofonías", testament: "antiguo", chapters: 3, filename: "sofonias" },
    { name: "Hageo", testament: "antiguo", chapters: 2, filename: "hageo" },
    { name: "Zacarías", testament: "antiguo", chapters: 14, filename: "zacarias" },
    { name: "Malaquías", testament: "antiguo", chapters: 4, filename: "malaquias" },
    
    // Nuevo Testamento
    { name: "Mateo", testament: "nuevo", chapters: 28, filename: "mateo" },
    { name: "Marcos", testament: "nuevo", chapters: 16, filename: "marcos" },
    { name: "Lucas", testament: "nuevo", chapters: 24, filename: "lucas" },
    { name: "Juan", testament: "nuevo", chapters: 21, filename: "juan" },
    { name: "Hechos", testament: "nuevo", chapters: 28, filename: "hechos" },
    { name: "Romanos", testament: "nuevo", chapters: 16, filename: "romanos" },
    { name: "1 Corintios", testament: "nuevo", chapters: 16, filename: "1_corintios" },
    { name: "2 Corintios", testament: "nuevo", chapters: 13, filename: "2_corintios" },
    { name: "Gálatas", testament: "nuevo", chapters: 6, filename: "galatas" },
    { name: "Efesios", testament: "nuevo", chapters: 6, filename: "efesios" },
    { name: "Filipenses", testament: "nuevo", chapters: 4, filename: "filipenses" },
    { name: "Colosenses", testament: "nuevo", chapters: 4, filename: "colosenses" },
    { name: "1 Tesalonicenses", testament: "nuevo", chapters: 5, filename: "1_tesalonicenses" },
    { name: "2 Tesalonicenses", testament: "nuevo", chapters: 3, filename: "2_tesalonicenses" },
    { name: "1 Timoteo", testament: "nuevo", chapters: 6, filename: "1_timoteo" },
    { name: "2 Timoteo", testament: "nuevo", chapters: 4, filename: "2_timoteo" },
    { name: "Tito", testament: "nuevo", chapters: 3, filename: "tito" },
    { name: "Filemón", testament: "nuevo", chapters: 1, filename: "filemon" },
    { name: "Hebreos", testament: "nuevo", chapters: 13, filename: "hebreos" },
    { name: "Santiago", testament: "nuevo", chapters: 5, filename: "santiago" },
    { name: "1 Pedro", testament: "nuevo", chapters: 5, filename: "1_pedro" },
    { name: "2 Pedro", testament: "nuevo", chapters: 3, filename: "2_pedro" },
    { name: "1 Juan", testament: "nuevo", chapters: 5, filename: "1_juan" },
    { name: "2 Juan", testament: "nuevo", chapters: 1, filename: "2_juan" },
    { name: "3 Juan", testament: "nuevo", chapters: 1, filename: "3_juan" },
    { name: "Judas", testament: "nuevo", chapters: 1, filename: "judas" },
    { name: "Apocalipsis", testament: "nuevo", chapters: 22, filename: "apocalipsis" }
  ];

  // Estado interno de navegación
  let currentTestamentSelected = ''; // 'antiguo' o 'nuevo'
  let currentBookSelected = null;
  let currentChapterSelected = null;
  let currentPlanSelected = null;
  let returnToViewAfterReader = 'chapters'; // 'chapters' o 'plan'
  let activePlanDays = [];

  // --- NAVEGACIÓN SPA ENTRE SECCIONES ---
  tabDevotional.addEventListener('click', () => {
    switchMainTab('devotional');
  });

  tabLectura.addEventListener('click', () => {
    switchMainTab('lectura');
  });

  tabHistorias.addEventListener('click', () => {
    switchMainTab('historias');
  });

  function switchMainTab(tabId) {
    // Restablecer todas las pestañas activas
    tabDevotional.classList.remove('active');
    tabLectura.classList.remove('active');
    tabHistorias.classList.remove('active');
    
    // Ocultar todas las secciones principales
    sectionDevotional.style.display = 'none';
    sectionLectura.style.display = 'none';
    sectionHistorias.style.display = 'none';

    if (tabId === 'devotional') {
      tabDevotional.classList.add('active');
      sectionDevotional.style.display = 'block';
    } else if (tabId === 'lectura') {
      tabLectura.classList.add('active');
      sectionLectura.style.display = 'block';
      // Al cambiar a lectura, actualizamos el progreso en la cuadrícula de planes
      updatePlansGridProgress();
    } else if (tabId === 'historias') {
      tabHistorias.classList.add('active');
      sectionHistorias.style.display = 'block';
      // Cargar e inicializar historias
      renderStories('all');
    }
  }

  function showReadingSubView(viewId) {
    const views = [readingHomeView, readingBooksView, readingChaptersView, readingTextView, readingPlanDetailView];
    views.forEach(v => {
      if (v.id === viewId) {
        v.style.display = 'block';
      } else {
        v.style.display = 'none';
      }
    });
  }

  // --- EVENTOS DE VISTA DE INICIO (HOME) ---
  btnTestamentAntiguo.addEventListener('click', () => {
    openTestament('antiguo');
  });

  btnTestamentNuevo.addEventListener('click', () => {
    openTestament('nuevo');
  });

  function openTestament(testamentId) {
    currentTestamentSelected = testamentId;
    elReadingTestamentTitle.textContent = testamentId === 'antiguo' ? 'Antiguo Testamento' : 'Nuevo Testamento';
    
    // Filtrar libros
    const filteredBooks = bibleBooks.filter(b => b.testament === testamentId);
    elBooksGridContainer.innerHTML = '';
    
    filteredBooks.forEach(book => {
      const btn = document.createElement('button');
      btn.className = 'book-btn';
      btn.textContent = book.name;
      btn.addEventListener('click', () => {
        openBook(book);
      });
      elBooksGridContainer.appendChild(btn);
    });

    showReadingSubView('reading-books-view');
  }

  btnBackToTestaments.addEventListener('click', () => {
    showReadingSubView('reading-home-view');
  });

  // --- EVENTOS DE VISTA DE LIBROS ---
  function openBook(bookObj) {
    currentBookSelected = bookObj;
    elReadingBookTitle.textContent = bookObj.name;
    elChaptersGridContainer.innerHTML = '';

    for (let c = 1; c <= bookObj.chapters; c++) {
      const btn = document.createElement('button');
      btn.className = 'chapter-btn';
      
      // Verificar si el capítulo ya está completado
      const key = `bible_read_${bookObj.name}_${c}`;
      if (localStorage.getItem(key) === 'true') {
        btn.classList.add('read-completed');
      }

      btn.textContent = c;
      btn.addEventListener('click', () => {
        returnToViewAfterReader = 'chapters';
        openChapter(bookObj, c);
      });
      elChaptersGridContainer.appendChild(btn);
    }

    showReadingSubView('reading-chapters-view');
  }

  btnBackToBooks.addEventListener('click', () => {
    openTestament(currentTestamentSelected);
  });

  // --- EVENTOS DEL LECTOR ---
  async function openChapter(bookObj, chapterNum) {
    currentBookSelected = bookObj;
    currentChapterSelected = chapterNum;
    elReaderChapterTitle.textContent = `${bookObj.name} ${chapterNum}`;
    
    elBibleReaderTextContainer.innerHTML = '<p class="bible-verse-paragraph">Cargando capítulo de la palabra de Dios...</p>';
    showReadingSubView('reading-text-view');

    // Actualizar estado del botón Completar
    updateChapterReadButtonState();

    try {
      const verses = await fetchBibleChapterText(bookObj, chapterNum);
      renderBibleText(verses);
    } catch (e) {
      console.error(e);
      elBibleReaderTextContainer.innerHTML = '<p class="bible-verse-paragraph">Error al cargar texto sagrado. Comprueba los archivos locales o tu conexión.</p>';
    }

    // Scroll al inicio del lector
    elBibleReaderTextContainer.scrollTop = 0;
  }

  async function fetchBibleChapterText(bookObj, chapterNum) {
    // --- 1. MODO FIREBASE ---
    if (typeof USE_FIREBASE !== 'undefined' && USE_FIREBASE && firestoreDb) {
      const docId = `${bookObj.filename}_${chapterNum}`;
      if (loadedBooksCache.has(docId)) {
        return loadedBooksCache.get(docId).verses || {};
      }
      try {
        const docRef = firestoreDb.collection('bible_rv1960').doc(docId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const chapterData = docSnap.data();
          loadedBooksCache.set(docId, chapterData);
          return chapterData.verses || {};
        }
      } catch (err) {
        console.error("Firestore read error:", err);
      }
    }

    // --- 2. MODO ARCHIVO LOCAL ---
    if (loadedBooksCache.has(bookObj.filename)) {
      const cachedText = loadedBooksCache.get(bookObj.filename);
      return parseLocalFileVerses(cachedText, chapterNum);
    }

    try {
      const response = await fetch(`data/rv1960/${bookObj.filename}.txt?v=1.0.1`);
      if (response.ok) {
        const text = await response.text();
        loadedBooksCache.set(bookObj.filename, text);
        return parseLocalFileVerses(text, chapterNum);
      }
    } catch (err) {
      console.warn(`Archivo local data/rv1960/${bookObj.filename}.txt no disponible. Usando fallback simulador.`);
    }

    // --- 3. MODO SIMULACIÓN OFFLINE PREMIUM ---
    return getMockChapterVerses(bookObj.name, chapterNum);
  }

  function parseLocalFileVerses(bookText, chapterNum) {
    const verses = {};
    const lines = bookText.split('\n').filter(l => l.trim().length > 0);
    lines.forEach(line => {
      const match = line.match(/\(\d+,\s*(\d+),\s*(\d+),\s*'(.*?)'\)/);
      if (match) {
        const [_, lineChapter, lineVerse, lineText] = match;
        if (parseInt(lineChapter) === chapterNum) {
          verses[lineVerse] = lineText.replace(/\\'/g, "'");
        }
      }
    });
    return verses;
  }

  function getMockChapterVerses(bookName, chapter) {
    const verses = {};
    // Simulamos cantidad de versículos en base al capítulo
    const seed = (bookName.charCodeAt(0) + chapter) % 15;
    const totalVerses = seed + 15; // Entre 15 y 30 versículos
    
    const biblicalPhrases = [
      "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.",
      "El que habita al abrigo del Altísimo morará bajo la sombra del Omnipotente. Diré yo a Jehová: Esperanza mía, y castillo mío; Mi Dios, en quien confiaré.",
      "Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará descansar; Junto a aguas de reposo me pastoreará.",
      "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.",
      "Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.",
      "Todo lo puedo en Cristo que me fortalece. Y mi Dios suplirá todo lo que os falta conforme a sus riquezas en gloria en Cristo Jesús.",
      "Clama a mí, y yo te responderé, y te enseñará cosas grandes y ocultas que tú no conoces.",
      "Tu palabra es una lámpara para mis pies, y una luz para mi camino. He guardado en mi corazón tus dichos, para no pecar contra ti.",
      "Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.",
      "Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.",
      "Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien, esto es, a los que conforme a su propósito son llamados.",
      "La ley de Jehová es perfecta, que convierte el alma; El testimonio de Jehová es fiel, que hace sabio al sencillo."
    ];

    for (let i = 1; i <= totalVerses; i++) {
      const p1 = biblicalPhrases[(seed + i) % biblicalPhrases.length];
      const p2 = biblicalPhrases[(seed + i * 3) % biblicalPhrases.length];
      verses[String(i)] = `${p1} Que la paz de Dios guarde tu mente en este día. ${p2}`;
    }
    return verses;
  }

  function renderBibleText(verses) {
    elBibleReaderTextContainer.innerHTML = '';
    const sortedVerseNums = Object.keys(verses).map(Number).sort((a, b) => a - b);
    
    if (sortedVerseNums.length === 0) {
      elBibleReaderTextContainer.innerHTML = '<p class="bible-verse-paragraph">Este capítulo no contiene versículos indexados en el servidor.</p>';
      return;
    }

    sortedVerseNums.forEach(num => {
      const p = document.createElement('p');
      p.className = 'bible-verse-paragraph';
      p.innerHTML = `<span class="verse-num">${num}</span>${verses[String(num)]}`;
      elBibleReaderTextContainer.appendChild(p);
    });
  }

  function updateChapterReadButtonState() {
    if (!currentBookSelected || !currentChapterSelected) return;
    const key = `bible_read_${currentBookSelected.name}_${currentChapterSelected}`;
    const isCompleted = localStorage.getItem(key) === 'true';

    if (isCompleted) {
      btnReaderMarkComplete.innerHTML = '<span class="icon">✓</span> Completado';
      btnReaderMarkComplete.classList.remove('btn-primary');
      btnReaderMarkComplete.classList.add('btn-secondary');
    } else {
      btnReaderMarkComplete.innerHTML = '<span class="icon">✓</span> Leído';
      btnReaderMarkComplete.classList.remove('btn-secondary');
      btnReaderMarkComplete.classList.add('btn-primary');
    }
  }

  btnReaderMarkComplete.addEventListener('click', () => {
    if (!currentBookSelected || !currentChapterSelected) return;
    const key = `bible_read_${currentBookSelected.name}_${currentChapterSelected}`;
    const isCompleted = localStorage.getItem(key) === 'true';

    if (isCompleted) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, 'true');
    }
    updateChapterReadButtonState();
  });

  btnReaderPrev.addEventListener('click', () => {
    if (currentChapterSelected > 1) {
      openChapter(currentBookSelected, currentChapterSelected - 1);
    } else {
      // Ir al libro anterior si es posible
      const bookIdx = bibleBooks.findIndex(b => b.name === currentBookSelected.name);
      if (bookIdx > 0) {
        const prevBook = bibleBooks[bookIdx - 1];
        openChapter(prevBook, prevBook.chapters);
      }
    }
  });

  btnReaderNext.addEventListener('click', () => {
    if (currentChapterSelected < currentBookSelected.chapters) {
      openChapter(currentBookSelected, currentChapterSelected + 1);
    } else {
      // Ir al libro siguiente si es posible
      const bookIdx = bibleBooks.findIndex(b => b.name === currentBookSelected.name);
      if (bookIdx < bibleBooks.length - 1) {
        const nextBook = bibleBooks[bookIdx + 1];
        openChapter(nextBook, 1);
      }
    }
  });

  btnBackToChapters.addEventListener('click', () => {
    if (returnToViewAfterReader === 'plan') {
      renderPlanDetailView(currentPlanSelected);
    } else if (returnToViewAfterReader === 'stories') {
      switchMainTab('historias');
    } else {
      openBook(currentBookSelected);
    }
  });

  // --- LÓGICA DE BUSCADOR DE BIBLIA ---
  btnBibleSearch.addEventListener('click', () => {
    performBibleSearch();
  });

  elBibleSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      performBibleSearch();
    }
  });

  function performBibleSearch() {
    const query = elBibleSearchInput.value.trim().toLowerCase();
    if (query.length === 0) return;

    // Quitar acentos para búsqueda insensible a tildes
    const cleanQuery = removeAccents(query);

    // Buscar coincidencia en libros
    // Regex para buscar libro y capítulo, ej: "rut 1" o "1 juan 2" o "juan 3:16"
    const match = cleanQuery.match(/^(\d?\s*[a-záéíóúüñ]+)\s*(\d+)?(?:\s*:\s*(\d+))?$/i);
    
    if (match) {
      const bookNameQuery = removeAccents(match[1].trim());
      const chapterNum = match[2] ? parseInt(match[2]) : null;
      
      const foundBook = bibleBooks.find(b => removeAccents(b.name.toLowerCase()) === bookNameQuery || 
                                             removeAccents(b.name.toLowerCase()).replace(/\s+/g, '') === bookNameQuery.replace(/\s+/g, ''));
      
      if (foundBook) {
        if (chapterNum) {
          const cap = Math.min(Math.max(chapterNum, 1), foundBook.chapters);
          returnToViewAfterReader = 'chapters';
          openChapter(foundBook, cap);
        } else {
          openBook(foundBook);
        }
        elBibleSearchInput.value = ''; // Limpiar buscador
        return;
      }
    }

    // Si no es una búsqueda estructurada, buscar coincidencia parcial en nombre de libro
    const partialMatch = bibleBooks.find(b => removeAccents(b.name.toLowerCase()).includes(cleanQuery));
    if (partialMatch) {
      openBook(partialMatch);
      elBibleSearchInput.value = '';
    } else {
      alert(`No se encontró ningún libro o cita bíblica para: "${elBibleSearchInput.value}"`);
    }
  }

  function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // --- LÓGICA DE PLANES DE LECTURA ---
  
  // Registrar clicks en planes desde la home
  document.querySelectorAll('.plan-card').forEach(card => {
    const planId = card.getAttribute('data-plan-id');
    const startBtn = card.querySelector('.btn-start-plan');
    
    startBtn.addEventListener('click', () => {
      startOrContinuePlan(planId);
    });
  });

  function startOrContinuePlan(planId) {
    currentPlanSelected = planId;
    
    // Marcar plan como iniciado
    localStorage.setItem(`devocional_plan_${planId}_started`, 'true');
    
    renderPlanDetailView(planId);
  }

  function generatePlanDays(planId) {
    let chaptersList = [];
    if (planId === '30days') {
      // Juan (21) + 1 Juan (5) + 2 Juan (1) + 3 Juan (1) + Salmos 23 y 121 -> total 30
      for (let i = 1; i <= 21; i++) chaptersList.push({ book: 'Juan', chapter: i });
      for (let i = 1; i <= 5; i++) chaptersList.push({ book: '1 Juan', chapter: i });
      chaptersList.push({ book: '2 Juan', chapter: 1 });
      chaptersList.push({ book: '3 Juan', chapter: 1 });
      chaptersList.push({ book: 'Salmos', chapter: 23 });
      chaptersList.push({ book: 'Salmos', chapter: 121 });
    } else if (planId === '60days') {
      // 4 Evangelios -> Mateo (28), Marcos (16), Lucas (24), Juan (21) -> total 89
      const books = [
        { name: 'Mateo', count: 28 }, { name: 'Marcos', count: 16 },
        { name: 'Lucas', count: 24 }, { name: 'Juan', count: 21 }
      ];
      books.forEach(b => {
        for (let i = 1; i <= b.count; i++) chaptersList.push({ book: b.name, chapter: i });
      });
    } else if (planId === '90days') {
      // Nuevo Testamento -> 260 capítulos
      const NTBooks = bibleBooks.filter(b => b.testament === 'nuevo');
      NTBooks.forEach(b => {
        for (let i = 1; i <= b.chapters; i++) chaptersList.push({ book: b.name, chapter: i });
      });
    } else if (planId === '365days') {
      // Biblia Completa -> 1189 capítulos
      bibleBooks.forEach(b => {
        for (let i = 1; i <= b.chapters; i++) chaptersList.push({ book: b.name, chapter: i });
      });
    }

    const totalDays = planId === '30days' ? 30 : planId === '60days' ? 60 : planId === '90days' ? 90 : 365;
    const targetDays = [];
    const totalChapters = chaptersList.length;
    const ratio = totalChapters / totalDays;

    let chapterIdx = 0;
    for (let d = 1; d <= totalDays; d++) {
      const targetEndIdx = Math.round(d * ratio);
      const dayChapters = [];
      while (chapterIdx < targetEndIdx && chapterIdx < totalChapters) {
        dayChapters.push(chaptersList[chapterIdx]);
        chapterIdx++;
      }

      let label = '';
      if (dayChapters.length === 0) {
        label = 'Reflexión y Oración';
      } else {
        const groups = {};
        dayChapters.forEach(c => {
          if (!groups[c.book]) groups[c.book] = [];
          groups[c.book].push(c.chapter);
        });

        const parts = [];
        Object.keys(groups).forEach(bookName => {
          const chapters = groups[bookName];
          if (chapters.length === 1) {
            parts.push(`${bookName} ${chapters[0]}`);
          } else {
            const min = Math.min(...chapters);
            const max = Math.max(...chapters);
            if (max - min === chapters.length - 1) {
              parts.push(`${bookName} ${min}-${max}`);
            } else {
              parts.push(`${bookName} ${chapters.join(', ')}`);
            }
          }
        });
        label = parts.join('; ');
      }

      targetDays.push({
        day: d,
        label: label,
        chapters: dayChapters
      });
    }

    return targetDays;
  }

  function renderPlanDetailView(planId) {
    const planNames = {
      '30days': 'Plan de 30 Días - Juan y Epístolas',
      '60days': 'Plan de 60 Días - Los 4 Evangelios',
      '90days': 'Plan de 90 Días - Nuevo Testamento',
      '365days': 'Plan de 1 Año - Biblia Completa'
    };
    
    elPlanDetailTitle.textContent = planNames[planId] || 'Plan de Lectura';
    
    const days = generatePlanDays(planId);
    activePlanDays = days;
    
    elPlanDaysListContainer.innerHTML = '';
    
    let completedCount = 0;
    
    days.forEach(dayItem => {
      // Un día está completado si todos sus capítulos asociados están marcados como leídos
      let isDayCompleted = dayItem.chapters.length > 0;
      dayItem.chapters.forEach(c => {
        const key = `bible_read_${c.book}_${c.chapter}`;
        if (localStorage.getItem(key) !== 'true') {
          isDayCompleted = false;
        }
      });
      if (dayItem.chapters.length === 0) {
        // Si no hay lecturas, está completado por defecto si el usuario lo marca, o siempre si es día de reflexión
        const reflectionKey = `plan_reflection_read_${planId}_day_${dayItem.day}`;
        isDayCompleted = localStorage.getItem(reflectionKey) === 'true';
      }
      
      if (isDayCompleted) completedCount++;

      const row = document.createElement('div');
      row.className = 'plan-day-row';
      
      row.innerHTML = `
        <div class="plan-day-checkbox-wrapper ${isDayCompleted ? 'completed' : ''}" aria-label="Marcar completado"></div>
        <div class="plan-day-info">
          <span class="plan-day-number">Día ${dayItem.day}</span>
          <span class="plan-day-target">${dayItem.label}</span>
        </div>
      `;

      // Clic en el checkbox: alterna completado
      const checkbox = row.querySelector('.plan-day-checkbox-wrapper');
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar abrir la lectura
        togglePlanDayComplete(planId, dayItem, isDayCompleted);
      });

      // Clic en la fila: abre el lector para el primer capítulo del día
      row.addEventListener('click', () => {
        if (dayItem.chapters.length > 0) {
          const first = dayItem.chapters[0];
          const foundBook = bibleBooks.find(b => b.name === first.book);
          if (foundBook) {
            returnToViewAfterReader = 'plan';
            openChapter(foundBook, first.chapter);
          }
        } else {
          // Si es día de reflexión
          togglePlanDayComplete(planId, dayItem, isDayCompleted);
        }
      });

      elPlanDaysListContainer.appendChild(row);
    });

    // Calcular progreso
    const totalDays = days.length;
    const progressPercent = Math.round((completedCount / totalDays) * 100);
    
    elPlanDetailProgressLabel.textContent = `Progreso: ${completedCount} de ${totalDays} días (${progressPercent}%)`;
    elPlanDetailProgressFill.style.width = `${progressPercent}%`;

    showReadingSubView('reading-plan-detail-view');
  }

  function togglePlanDayComplete(planId, dayItem, currentlyCompleted) {
    const newState = !currentlyCompleted;
    
    if (dayItem.chapters.length > 0) {
      // Marcar/Desmarcar todas las lecturas de ese día
      dayItem.chapters.forEach(c => {
        const key = `bible_read_${c.book}_${c.chapter}`;
        if (newState) {
          localStorage.setItem(key, 'true');
        } else {
          localStorage.removeItem(key);
        }
      });
    } else {
      // Guardar reflexión día en localstorage
      const reflectionKey = `plan_reflection_read_${planId}_day_${dayItem.day}`;
      if (newState) {
        localStorage.setItem(reflectionKey, 'true');
      } else {
        localStorage.removeItem(reflectionKey);
      }
    }

    renderPlanDetailView(planId);
  }

  btnResetPlan.addEventListener('click', () => {
    if (!currentPlanSelected) return;
    if (confirm('¿Estás seguro de que deseas reiniciar el progreso de este plan de lectura? Todo el historial de este plan se borrará.')) {
      const days = activePlanDays;
      days.forEach(dayItem => {
        dayItem.chapters.forEach(c => {
          localStorage.removeItem(`bible_read_${c.book}_${c.chapter}`);
        });
        localStorage.removeItem(`plan_reflection_read_${currentPlanSelected}_day_${dayItem.day}`);
      });
      renderPlanDetailView(currentPlanSelected);
    }
  });

  btnBackToPlans.addEventListener('click', () => {
    showReadingSubView('reading-home-view');
    updatePlansGridProgress();
  });

  // Actualizar el progreso en la pantalla principal (rejilla de planes)
  function updatePlansGridProgress() {
    document.querySelectorAll('.plan-card').forEach(card => {
      const planId = card.getAttribute('data-plan-id');
      const startBtn = card.querySelector('.btn-start-plan');
      const progressWrapper = card.querySelector('.plan-progress-wrapper');
      
      const isStarted = localStorage.getItem(`devocional_plan_${planId}_started`) === 'true';
      
      if (isStarted) {
        progressWrapper.style.display = 'block';
        startBtn.textContent = 'Continuar';
        startBtn.classList.remove('btn-primary');
        startBtn.classList.add('btn-secondary');
        
        // Calcular porcentaje completado
        const days = generatePlanDays(planId);
        let completedCount = 0;
        days.forEach(dayItem => {
          let isDayCompleted = dayItem.chapters.length > 0;
          dayItem.chapters.forEach(c => {
            if (localStorage.getItem(`bible_read_${c.book}_${c.chapter}`) !== 'true') {
              isDayCompleted = false;
            }
          });
          if (dayItem.chapters.length === 0) {
            isDayCompleted = localStorage.getItem(`plan_reflection_read_${planId}_day_${dayItem.day}`) === 'true';
          }
          if (isDayCompleted) completedCount++;
        });

        const percent = Math.round((completedCount / days.length) * 100);
        card.querySelector('.plan-progress-fill').style.width = `${percent}%`;
        card.querySelector('.plan-progress-text').textContent = `${percent}% completado`;
      } else {
        progressWrapper.style.display = 'none';
        startBtn.textContent = 'Comenzar';
        startBtn.classList.remove('btn-secondary');
        startBtn.classList.add('btn-primary');
      }
    });
  }

  // Ejecución inicial de actualizar planes
  updatePlansGridProgress();

  // ==========================================================================
  // LÓGICA DE HISTORIAS BÍBLICAS
  // ==========================================================================

  // Base de datos de historias bíblicas
  const bibleStories = [
    {
      title: "La Creación del Mundo",
      testament: "antiguo",
      category: "CREACIÓN",
      desc: "Dios crea el cielo, la tierra y todo lo que existe en seis días.",
      refs: ["Génesis 1:1-31", "Génesis 2:1-25"]
    },
    {
      title: "Adán y Eva en el Edén",
      testament: "antiguo",
      category: "CREACIÓN",
      desc: "La creación del primer hombre y mujer, y su vida en el jardín del Edén.",
      refs: ["Génesis 2:4-25"]
    },
    {
      title: "La Caída del Hombre",
      testament: "antiguo",
      category: "CREACIÓN",
      desc: "Adán y Eva desobedecen a Dios y comen del fruto prohibido.",
      refs: ["Génesis 3:1-24"]
    },
    {
      title: "Caín y Abel",
      testament: "antiguo",
      category: "CREACIÓN",
      desc: "La historia de los primeros hijos de Adán y Eva, y el primer asesinato.",
      refs: ["Génesis 4:1-16"]
    },
    {
      title: "Noé y el Arca",
      testament: "antiguo",
      category: "DILUVIO",
      desc: "Dios envía un diluvio para limpiar la tierra, pero salva a Noé y su familia.",
      refs: ["Génesis 6:5-22", "Génesis 7:1-24", "Génesis 8:1-22"]
    },
    {
      title: "La Torre de Babel",
      testament: "antiguo",
      category: "PRIMEROS TIEMPOS",
      desc: "Los hombres intentan construir una torre hasta el cielo, y Dios confunde sus lenguas.",
      refs: ["Génesis 11:1-9"]
    },
    {
      title: "El Nacimiento de Jesús",
      testament: "nuevo",
      category: "JESUCRISTO",
      desc: "Jesús, el Salvador prometido, nace en un pesebre en Belén.",
      refs: ["Lucas 2:1-20", "Mateo 1:18-25"]
    },
    {
      title: "El Bautismo de Jesús",
      testament: "nuevo",
      category: "JESUCRISTO",
      desc: "Juan el Bautista bautiza a Jesús en el río Jordán, y el Espíritu Santo desciende como paloma.",
      refs: ["Mateo 3:13-17", "Marcos 1:9-11"]
    },
    {
      title: "La Tentación en el Desierto",
      testament: "nuevo",
      category: "JESUCRISTO",
      desc: "Jesús es tentado por el diablo durante cuarenta días en el desierto.",
      refs: ["Mateo 4:1-11", "Lucas 4:1-13"]
    },
    {
      title: "La Crucifixión y Muerte",
      testament: "nuevo",
      category: "JESUCRISTO",
      desc: "Jesús es crucificado en el Calvario para el perdón de los pecados de la humanidad.",
      refs: ["Lucas 23:26-49", "Juan 19:16-37"]
    },
    {
      title: "La Resurrección Victoriosa",
      testament: "nuevo",
      category: "JESUCRISTO",
      desc: "Al tercer día, la tumba se encuentra vacía y Jesús resucita victorioso sobre la muerte.",
      refs: ["Mateo 28:1-10", "Lucas 24:1-12"]
    }
  ];

  // Cerrar sección de historias (regresa a devocional)
  btnCloseStories.addEventListener('click', () => {
    switchMainTab('devotional');
  });

  // Filtros de historias
  filterStoryAll.addEventListener('click', () => {
    setActiveStoryFilter('all');
  });

  filterStoryAntiguo.addEventListener('click', () => {
    setActiveStoryFilter('antiguo');
  });

  filterStoryNuevo.addEventListener('click', () => {
    setActiveStoryFilter('nuevo');
  });

  function setActiveStoryFilter(filterType) {
    [filterStoryAll, filterStoryAntiguo, filterStoryNuevo].forEach(btn => btn.classList.remove('active'));
    if (filterType === 'all') filterStoryAll.classList.add('active');
    if (filterType === 'antiguo') filterStoryAntiguo.classList.add('active');
    if (filterType === 'nuevo') filterStoryNuevo.classList.add('active');

    renderStories(filterType);
  }

  // Renderizar historias bíblicas
  function renderStories(filterType) {
    storiesGridContainer.innerHTML = '';
    const filtered = filterType === 'all' 
      ? bibleStories 
      : bibleStories.filter(s => s.testament === filterType);

    filtered.forEach(story => {
      const card = document.createElement('div');
      card.className = 'story-card';
      
      const refHtml = story.refs.map(ref => `<button class="btn-story-ref" data-ref="${ref}">${ref}</button>`).join(' ');

      card.innerHTML = `
        <div>
          <div class="story-card-header">
            <h3 class="story-card-title">${story.title}</h3>
            <span class="story-badge-testament">${story.testament === 'antiguo' ? 'Antiguo' : 'Nuevo'}</span>
          </div>
          <div class="story-category">${story.category}</div>
          <p class="story-desc">${story.desc}</p>
        </div>
        <div class="story-references">
          ${refHtml}
        </div>
      `;

      // Event listener para las referencias
      card.querySelectorAll('.btn-story-ref').forEach(btn => {
        btn.addEventListener('click', () => {
          const refText = btn.getAttribute('data-ref');
          navigateToBibleFromStory(refText);
        });
      });

      storiesGridContainer.appendChild(card);
    });
  }

  // Navegar al lector de Biblia desde una historia
  function navigateToBibleFromStory(refStr) {
    // Parser de citas estructuradas
    // Ej: "Génesis 1:1-31" -> libro: "Génesis", capítulo: 1
    const match = refStr.match(/^(\d?\s*[a-záéíóúüñ\s]+)\s*(\d+)/i);
    if (!match) return;

    const bookName = match[1].trim();
    const chapterNum = parseInt(match[2]);

    const foundBook = bibleBooks.find(b => b.name.toLowerCase() === bookName.toLowerCase() || 
                                           removeAccents(b.name.toLowerCase()) === removeAccents(bookName.toLowerCase()));

    if (foundBook) {
      // 1. Cambiar a pestaña lectura
      switchMainTab('lectura');
      
      // 2. Indicar que al volver del lector de Biblia debe regresar a historias
      returnToViewAfterReader = 'stories';
      
      // 3. Abrir el capítulo en el lector
      openChapter(foundBook, chapterNum);
    } else {
      console.warn(`No se pudo encontrar el libro: ${bookName}`);
    }
  }

});

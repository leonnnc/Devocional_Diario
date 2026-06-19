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

});

// ── Language Configuration (single source of truth) ───────────────────────────
const LANGUAGES = [
  { label: 'Hindi (हिन्दी)',       value: 'hi-IN', iso: 'hi'  },
  { label: 'Tamil (தமிழ்)',        value: 'ta-IN', iso: 'ta'  },
  { label: 'Telugu (తెలుగు)',      value: 'te-IN', iso: 'te'  },
  { label: 'Malayalam (മലയാളം)',   value: 'ml-IN', iso: 'ml'  },
  { label: 'Kannada (ಕನ್ನಡ)',      value: 'kn-IN', iso: 'kn'  },
  { label: 'Bengali (বাংলা)',      value: 'bn-IN', iso: 'bn'  },
  { label: 'Marathi (मराठी)',      value: 'mr-IN', iso: 'mr'  },
  { label: 'Gujarati (ગુજરાતી)',   value: 'gu-IN', iso: 'gu'  },
  { label: 'Punjabi (ਪੰਜਾਬੀ)',     value: 'pa-IN', iso: 'pa'  },
  { label: 'Odia (ଓଡ଼ିଆ)',         value: 'or-IN', iso: 'or'  },
  { label: 'Urdu (اردو)',          value: 'ur-IN', iso: 'ur'  },
  { label: 'Assamese (অসমীয়া)',   value: 'as-IN', iso: 'as'  },
  { label: 'Maithili (मैथिली)',    value: 'mai-IN', iso: 'mai' },
];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const recordBtn       = document.getElementById('record-btn');
const playBtn         = document.getElementById('play-btn');
const swapBtn         = document.getElementById('swap-langs');
const sourceLang      = document.getElementById('source-lang');
const targetLang      = document.getElementById('target-lang');
const sourceText      = document.getElementById('source-text');
const targetText      = document.getElementById('target-text');
const recordingStatus = document.getElementById('recording-status');
const recordingDot    = document.getElementById('recording-indicator');
const targetStatus    = document.getElementById('target-status');
const referenceText   = null; // removed — WER now on separate page
const werScore        = null; // on wer.html only
const werSub          = null;
const werDel          = null;
const werIns          = null;
const toggleWer       = null;
const werContent      = null;
const toastContainer  = document.getElementById('toast-container');
const unsupportedBanner = document.getElementById('unsupported-banner');

// ── State ─────────────────────────────────────────────────────────────────────
let recognition   = null;
let isRecording   = false;
let translateTimer = null;

// ── Populate selects from LANGUAGES ──────────────────────────────────────────
function populateSelects() {
  LANGUAGES.forEach((lang, i) => {
    const optSrc = new Option(lang.label, lang.value);
    const optTgt = new Option(lang.label, lang.value);
    sourceLang.appendChild(optSrc);
    targetLang.appendChild(optTgt);
  });
  sourceLang.value = 'hi-IN';
  targetLang.value = 'ta-IN';
}
populateSelects();

// ── Helper: get ISO code for a BCP-47 value ───────────────────────────────────
function getIso(bcp47) {
  const lang = LANGUAGES.find(l => l.value === bcp47);
  return lang ? lang.iso : bcp47.split('-')[0];
}

// ── Browser support check ─────────────────────────────────────────────────────
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognitionAPI) {
  unsupportedBanner.style.display = 'flex';
  recordBtn.disabled = true;
  recordBtn.style.opacity = '0.5';
  recordBtn.style.cursor = 'not-allowed';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { error: 'ph-warning-circle', success: 'ph-check-circle', warning: 'ph-warning', info: 'ph-info' };
  toast.innerHTML = `<i class="ph ${icons[type] || icons.info}"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

// ── Speech Recognition ────────────────────────────────────────────────────────
const ERROR_MESSAGES = {
  'not-allowed':           'Microphone access denied. Please allow mic permissions in your browser settings.',
  'no-speech':             'No speech detected. Please try speaking again.',
  'network':               'Network error during recognition. Check your connection.',
  'audio-capture':         'No microphone found. Please connect a microphone.',
  'service-not-allowed':   'Speech recognition service is not allowed. Try a different browser.',
  'bad-grammar':           'Speech recognition grammar error.',
  'language-not-supported':'This language is not supported by your browser\'s speech engine.',
};

function initRecognition() {
  if (!SpeechRecognitionAPI) return null;
  const rec = new SpeechRecognitionAPI();
  rec.continuous      = true;
  rec.interimResults  = true;
  rec.lang            = sourceLang.value;

  let finalTranscript = '';

  rec.onstart = () => {
    finalTranscript = sourceText.value.replace(/\u200B/g, '').trimEnd();
    if (finalTranscript) finalTranscript += ' ';
    recordingStatus.textContent = 'Listening…';
    recordingDot.style.display  = 'inline-block';
    recordBtn.classList.add('recording');
    recordBtn.querySelector('span').textContent = 'Stop Recording';
    recordBtn.querySelector('i').className = 'ph ph-stop-circle';
  };

  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript; // [0] = best alternative
      if (e.results[i].isFinal) finalTranscript += t + ' ';
      else interim += t;
    }
    // Show finalized text + interim in a lighter style via zero-width space marker
    sourceText.value = finalTranscript + interim;
    sourceText.scrollTop = sourceText.scrollHeight;
    scheduleTranslation();
  };

  rec.onerror = (e) => {
    const msg = ERROR_MESSAGES[e.error] || `Recognition error: ${e.error}`;
    showToast(msg, 'error');
    stopRecording();
  };

  rec.onend = () => {
    if (isRecording) {
      try { rec.start(); } catch (_) {}
    }
  };

  return rec;
}

function startRecording() {
  recognition = initRecognition();
  if (!recognition) return;
  recognition.lang = sourceLang.value;
  try {
    recognition.start();
    isRecording = true;
  } catch (e) {
    showToast('Could not start recording. Try again.', 'error');
  }
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  }
  recordingStatus.textContent = 'Ready to record';
  recordingDot.style.display  = 'none';
  recordBtn.classList.remove('recording');
  recordBtn.querySelector('span').textContent = 'Start Recording';
  recordBtn.querySelector('i').className = 'ph ph-microphone';

  const transcript = sourceText.value.trim();
  if (transcript) {
    // Save transcription data for WER page
    const words = transcript.toLowerCase().split(/\s+/).filter(Boolean);
    // Calculate WER vs previous session if available
    const prev = sessionStorage.getItem('lastTranscript') || '';
    const prevWords = prev.toLowerCase().split(/\s+/).filter(Boolean);
    let werResult = { wer: '0.00', sub: 0, del: 0, ins: 0 };
    if (prevWords.length > 0 && words.length > 0) {
      const r = levenshtein(prevWords, words);
      werResult = {
        wer: (Math.min(r.wer, 1) * 100).toFixed(2),
        sub: r.sub, del: r.del, ins: r.ins
      };
    }
    sessionStorage.setItem('werData', JSON.stringify({
      wer: werResult.wer,
      sub: werResult.sub,
      del: werResult.del,
      ins: werResult.ins,
      ref: prev || transcript,
      hyp: transcript,
      wordCount: words.length,
      transcript: transcript
    }));
    sessionStorage.setItem('lastTranscript', transcript);
    translateText();
  }
}

recordBtn.addEventListener('click', () => isRecording ? stopRecording() : startRecording());

// ── Translation ───────────────────────────────────────────────────────────────
function scheduleTranslation() {
  clearTimeout(translateTimer);
  translateTimer = setTimeout(translateText, 1200);
}

async function translateText() {
  const text = sourceText.value.trim();
  if (!text) return;

  const srcIso = getIso(sourceLang.value);
  const tgtIso = getIso(targetLang.value);

  if (srcIso === tgtIso) {
    targetText.value = text;
    targetStatus.textContent = 'Same language — no translation needed.';
    playBtn.disabled = false;
    speakTranslation(); // auto-play
    return;
  }

  targetStatus.textContent = 'Translating…';

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcIso}&tl=${tgtIso}&dt=t&q=${encodeURIComponent(text)}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const translated = data[0].map(s => s[0]).join('');
    targetText.value = translated;
    targetStatus.textContent = 'Translation complete';
    playBtn.disabled = false;
    speakTranslation(); // auto-play translated text
  } catch (err) {
    targetStatus.textContent = 'Translation failed';
    showToast('Translation failed. Check your internet connection.', 'error');
  }
}

sourceText.addEventListener('input', () => { scheduleTranslation(); });

// ── Manual play button ────────────────────────────────────────────────────────
playBtn.addEventListener('click', () => {
  if (!targetText.value.trim()) {
    showToast('No translated text available to play.', 'warning');
    return;
  }
  speakTranslation();
  showToast('Playing translation…', 'info');
});

// ── TTS via Google Translate audio (reliable cross-browser) ──────────────────
function speakTranslation() {
  const text = targetText.value.trim();
  if (!text) return;
  const tgtIso = getIso(targetLang.value);
  // Use Google Translate TTS endpoint — works without API key for short text
  const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=${tgtIso}&client=gtx&q=${encodeURIComponent(text.slice(0, 200))}`;
  const audio = new Audio(url);
  audio.play().catch(() => {
    // Fallback to Web Speech API if audio fetch blocked
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = targetLang.value;
    utt.rate  = 0.9;
    const voices    = window.speechSynthesis.getVoices();
    const tgtPrefix = targetLang.value.split('-')[0].toLowerCase();
    const match     = voices.find(v => v.lang.toLowerCase().startsWith(tgtPrefix));
    if (match) utt.voice = match;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  });
}

// ── Swap Languages ────────────────────────────────────────────────────────────
swapBtn.addEventListener('click', () => {
  const sv = sourceLang.value, tv = targetLang.value;
  sourceLang.value = tv;
  targetLang.value = sv;
  const st = sourceText.value, tt = targetText.value;
  sourceText.value = tt;
  targetText.value = st;
  if (st.trim() || tt.trim()) scheduleTranslation();
});

// ── WER Calculation ───────────────────────────────────────────────────────────
function levenshtein(ref, hyp) {
  const r = ref.length, h = hyp.length;
  // dp[i][j] = [editCost, substitutions, deletions, insertions]
  const dp = Array.from({ length: r + 1 }, (_, i) =>
    Array.from({ length: h + 1 }, (_, j) => [0, 0, 0, 0])
  );
  // Base cases
  for (let i = 0; i <= r; i++) dp[i][0] = [i, 0, i, 0]; // i deletions
  for (let j = 0; j <= h; j++) dp[0][j] = [j, 0, 0, j]; // j insertions

  for (let i = 1; i <= r; i++) {
    for (let j = 1; j <= h; j++) {
      if (ref[i - 1] === hyp[j - 1]) {
        dp[i][j] = [...dp[i - 1][j - 1]];
      } else {
        const sub = [dp[i-1][j-1][0]+1, dp[i-1][j-1][1]+1, dp[i-1][j-1][2],   dp[i-1][j-1][3]  ];
        const del = [dp[i-1][j  ][0]+1, dp[i-1][j  ][1],   dp[i-1][j  ][2]+1, dp[i-1][j  ][3]  ];
        const ins = [dp[i  ][j-1][0]+1, dp[i  ][j-1][1],   dp[i  ][j-1][2],   dp[i  ][j-1][3]+1];
        dp[i][j] = [sub, del, ins].reduce((a, b) => a[0] <= b[0] ? a : b);
      }
    }
  }
  const [cost, s, d, ins] = dp[r][h];
  return { wer: cost / r, sub: s, del: d, ins };
}

// ── WER helper (used in stopRecording) ───────────────────────────────────────
let prevTranscript = '';

// ── Language change handlers ──────────────────────────────────────────────────
sourceLang.addEventListener('change', () => {
  if (isRecording) {
    stopRecording();
    showToast('Language changed. Please restart recording.', 'warning');
  }
});

targetLang.addEventListener('change', () => {
  if (sourceText.value.trim()) translateText();
});

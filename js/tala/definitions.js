/**
 * TALA DEFINITIONS — Canonical database of 20 Hindustani talas.
 *
 * Data format (all fields required):
 *  name         — English name
 *  hindiName    — Devanagari name
 *  beats        — Total beats per avarta (cycle)
 *  vibhag       — Array of vibhag sizes (must sum to beats)
 *  sam          — 0-indexed beat position of Sam (X)
 *  khali        — 0-indexed beat position(s) of Khali (0)
 *  bols         — Array of bol names, one per beat
 *  description  — Brief description for UI
 *  commonTempo  — { vilambit, madhya, drut } BPM ranges
 *
 * Adding a new tala requires ONLY adding an entry here.
 * The engine, renderer, and all UI components adapt automatically.
 */

export const TALAS = {

  // ── 16-BEAT TALAS ─────────────────────────────────────────────────────

  Teentaal: {
    name: 'Teentaal',
    hindiName: 'तीनताल',
    beats: 16,
    vibhag: [4, 4, 4, 4],
    sam: 0,
    khali: [8],
    bols: [
      'Dha','Dhin','Dhin','Dha',
      'Dha','Dhin','Dhin','Dha',
      'Dha','Tin', 'Tin', 'Ta',
      'Ta', 'Dhin','Dhin','Dha',
    ],
    description: 'The most widespread tala. 16 beats in 4 equal vibhags. Foundation of Hindustani classical.',
    commonTempo: { vilambit:[30,60], madhya:[60,130], drut:[130,300] },
  },

  Tilwada: {
    name: 'Tilwada',
    hindiName: 'तिलवाड़ा',
    beats: 16,
    vibhag: [4, 4, 4, 4],
    sam: 0,
    khali: [8],
    bols: [
      'Dha','TrKt','Dhin','Na',
      'Dha','TrKt','Dhin','Na',
      'Dha','TrKt','Tin', 'Na',
      'Ta', 'TrKt','Dhin','Na',
    ],
    description: '16 beats like Teentaal but with tirakita fills. Preferred for vilambit khayal.',
    commonTempo: { vilambit:[20,50], madhya:[50,100], drut:[100,200] },
  },

  Addha: {
    name: 'Addha',
    hindiName: 'आड़ा',
    beats: 16,
    vibhag: [4, 4, 4, 4],
    sam: 0,
    khali: [8, 12],
    bols: [
      'Dhin','Na',  'Dhin','Dhin',
      'Na',  'Dhin','Dhin','Na',
      'Tin', 'Na',  'Tin', 'Tin',
      'Na',  'Tin', 'Tin', 'Na',
    ],
    description: '16-beat tala with a distinctive swaying feel. Used in semi-classical and thumri.',
    commonTempo: { vilambit:[40,80], madhya:[80,160], drut:[160,300] },
  },

  PunjabiTaal: {
    name: 'Punjabi Taal',
    hindiName: 'पंजाबी ताल',
    beats: 16,
    vibhag: [4, 4, 4, 4],
    sam: 0,
    khali: [8],
    bols: [
      'Dha','Dhin','Na',  'Dha',
      'Na', 'Dhin','Dhin','Ge',
      'Na', 'Tin', 'Na',  'Ta',
      'Na', 'Dhin','Dhin','Ge',
    ],
    description: '16-beat tala from Punjabi folk tradition. Used in semi-classical music.',
    commonTempo: { vilambit:[50,90], madhya:[90,160], drut:[160,320] },
  },

  // ── 14-BEAT TALAS ─────────────────────────────────────────────────────

  Deepchandi: {
    name: 'Deepchandi',
    hindiName: 'दीपचंदी',
    beats: 14,
    vibhag: [3, 4, 3, 4],
    sam: 0,
    khali: [7],
    bols: [
      'Dha','Dhin','Dhin',
      'Dha','Dha', 'Dhin','Dhin',
      'Ta', 'Tin', 'Tin',
      'Ta', 'Dha', 'Dhin','Dhin',
    ],
    description: '14-beat tala common in thumri, dadra, and semi-classical music.',
    commonTempo: { vilambit:[40,70], madhya:[70,140], drut:[140,280] },
  },

  Dhamar: {
    name: 'Dhamar',
    hindiName: 'धमार',
    beats: 14,
    vibhag: [5, 2, 3, 4],
    sam: 0,
    khali: [8],
    bols: [
      'Ka','Dhi','Ta','Dhi','Ta',
      'Dha','—',
      'Ti','Ta','Ka',
      'Dha','—','Dhi','Na',
    ],
    description: '14-beat dhrupad tala. Used for dhrupad-dhamar compositions and Hori genre.',
    commonTempo: { vilambit:[30,60], madhya:[60,120], drut:[120,250] },
  },

  Jhoomra: {
    name: 'Jhoomra',
    hindiName: 'झूमरा',
    beats: 14,
    vibhag: [3, 4, 3, 4],
    sam: 0,
    khali: [7],
    bols: [
      'Dhin','—',  'Ka',
      'DhiT','DhiT','Dhin','Dhin',
      'Dha', '—',  'Ta',
      'DhiT','DhiT','Dhin','Dhin',
    ],
    description: '14-beat vilambit tala. Used in slow khayal. Longer sustained phrases.',
    commonTempo: { vilambit:[20,50], madhya:[50,90], drut:[90,180] },
  },

  AdaChautal: {
    name: 'Ada Chautal',
    hindiName: 'आड़ा चौताल',
    beats: 14,
    vibhag: [2, 2, 2, 2, 2, 2, 2],
    sam: 0,
    khali: [6, 8],
    bols: [
      'Dha','—',
      'Dha','Din',
      'Ta', 'KiTa',
      'Dha','—',
      'Din','Ta',
      'TiTa','KaTa',
      'GaDi','GeNa',
    ],
    description: '14-beat dhrupad tala. Variant of Chautal in 7 vibhags of 2.',
    commonTempo: { vilambit:[25,55], madhya:[55,110], drut:[110,240] },
  },

  Farodast: {
    name: 'Farodast',
    hindiName: 'फ़रोदस्त',
    beats: 14,
    vibhag: [2, 4, 4, 4],
    sam: 0,
    khali: [6],
    bols: [
      'Dha','Dhin',
      'Na', 'Dhin','Dhin','Na',
      'Ka', 'Dhi', 'Na', 'Dhin',
      'Dhin','Na','DhaTr','KiTa',
    ],
    description: '14-beat dhrupad tala from Farukhabad gharana.',
    commonTempo: { vilambit:[25,55], madhya:[55,110], drut:[110,230] },
  },

  // ── 12-BEAT TALAS ─────────────────────────────────────────────────────

  Ektal: {
    name: 'Ektal',
    hindiName: 'एकताल',
    beats: 12,
    vibhag: [2, 2, 2, 2, 2, 2],
    sam: 0,
    khali: [6, 8],
    bols: [
      'Dhin','Dhin',
      'DhaTr','KiTa',
      'TunNa','KaTa',
      'DhinNa','DhaTr',
      'KiTa','TunNa',
      'KaTa','Ge',
    ],
    description: '12-beat tala in 6 vibhags of 2. Cornerstone of vilambit khayal.',
    commonTempo: { vilambit:[20,50], madhya:[50,100], drut:[100,220] },
  },

  Chautal: {
    name: 'Chautal',
    hindiName: 'चौताल',
    beats: 12,
    vibhag: [2, 2, 2, 2, 2, 2],
    sam: 0,
    khali: [4],
    bols: [
      'Dha','Dha',
      'Din','Ta',
      'KiTa','Dha',
      'Din','Ta',
      'TiTa','KaTa',
      'GaDi','GeNa',
    ],
    description: '12-beat dhrupad tala. Used in dhrupad, dhamar, and some khayal.',
    commonTempo: { vilambit:[30,60], madhya:[60,130], drut:[130,280] },
  },

  // ── 10-BEAT TALAS ─────────────────────────────────────────────────────

  Jhaptal: {
    name: 'Jhaptal',
    hindiName: 'झपताल',
    beats: 10,
    vibhag: [2, 3, 2, 3],
    sam: 0,
    khali: [5],
    bols: [
      'Dhi','Na',
      'Dhi','Dhi','Na',
      'Ti', 'Na',
      'Dhi','Dhi','Na',
    ],
    description: '10-beat tala in 4 unequal vibhags. Used in khayal and instrumental.',
    commonTempo: { vilambit:[30,60], madhya:[60,120], drut:[120,250] },
  },

  Sooltal: {
    name: 'Sooltal',
    hindiName: 'सूलताल',
    beats: 10,
    vibhag: [2, 2, 2, 2, 2],
    sam: 0,
    khali: [4],
    bols: [
      'Dha','Dha',
      'Din','Ta',
      'KiTa','Dha',
      'Din','Ta',
      'TiTa','GaDi',
    ],
    description: '10-beat dhrupad tala in 5 vibhags of 2.',
    commonTempo: { vilambit:[30,60], madhya:[60,120], drut:[120,250] },
  },

  // ── 8-BEAT TALAS ──────────────────────────────────────────────────────

  Keharwa: {
    name: 'Keharwa',
    hindiName: 'कहरवा',
    beats: 8,
    vibhag: [4, 4],
    sam: 0,
    khali: [4],
    bols: ['Dha','Ge','Na','Ti','Na','Ka','Dhi','Na'],
    description: 'Common 8-beat tala in light classical, folk, and devotional music.',
    commonTempo: { vilambit:[60,100], madhya:[100,180], drut:[180,350] },
  },

  // ── 7-BEAT TALAS ──────────────────────────────────────────────────────

  Rupak: {
    name: 'Rupak',
    hindiName: 'रूपक',
    beats: 7,
    vibhag: [3, 2, 2],
    sam: 0,
    khali: [0],   // Unique: Sam IS khali in Rupak — no bayan on beat 1
    bols: ['Tin','Tin','Na','Dhi','Na','Dhi','Na'],
    description: 'Unique 7-beat tala where Sam falls on the khali (empty) beat. Used in khayal and instrumental.',
    commonTempo: { vilambit:[40,70], madhya:[70,140], drut:[140,280] },
  },

  // ── 6-BEAT TALAS ──────────────────────────────────────────────────────

  Dadra: {
    name: 'Dadra',
    hindiName: 'दादरा',
    beats: 6,
    vibhag: [3, 3],
    sam: 0,
    khali: [3],
    bols: ['Dha','Dhin','Na','Dha','Tin','Na'],
    description: '6-beat tala. Used in thumri, ghazal, and light classical.',
    commonTempo: { vilambit:[50,80], madhya:[80,160], drut:[160,300] },
  },

  // ── LONGER / RARE TALAS ───────────────────────────────────────────────

  MattaTaal: {
    name: 'Matta Taal',
    hindiName: 'मत्त ताल',
    beats: 18,
    vibhag: [3, 3, 3, 3, 3, 3],
    sam: 0,
    khali: [9, 12],
    bols: [
      'Dha','Dhin','Na',
      'Dha','Dhin','Na',
      'Dha','Dhin','Na',
      'Ta', 'Tin', 'Na',
      'Ta', 'Tin', 'Na',
      'Dha','Dhin','Na',
    ],
    description: '18-beat meditative tala in 6 vibhags of 3. Used in dhrupad.',
    commonTempo: { vilambit:[20,45], madhya:[45,90], drut:[90,200] },
  },

  PanchamSawari: {
    name: 'Pancham Sawari',
    hindiName: 'पंचम सवारी',
    beats: 15,
    vibhag: [4, 4, 4, 3],
    sam: 0,
    khali: [8],
    bols: [
      'Dha','Dhin','Dhin','Dha',
      'Dha','Dhin','Dhin','Dha',
      'Dha','Tin', 'Tin', 'Ta',
      'Ta', 'Dhin','Dhin',
    ],
    description: '15-beat tala — essentially Teentaal with the last beat removed.',
    commonTempo: { vilambit:[30,60], madhya:[60,120], drut:[120,260] },
  },

  RudraTaal: {
    name: 'Rudra Taal',
    hindiName: 'रुद्र ताल',
    beats: 11,
    vibhag: [3, 4, 4],
    sam: 0,
    khali: [7],
    bols: [
      'Dha','Dhin','Na',
      'Dha','Dhin','Dhin','Na',
      'Dha','Tin', 'Tin', 'Na',
    ],
    description: '11-beat advanced tala. Challenging asymmetric feel for expert practice.',
    commonTempo: { vilambit:[25,55], madhya:[55,110], drut:[110,250] },
  },

  BrahmaTaal: {
    name: 'Brahma Taal',
    hindiName: 'ब्रह्म ताल',
    beats: 28,
    vibhag: [7, 7, 7, 7],
    sam: 0,
    khali: [14],
    bols: [
      'Dha','Dhin','Dhin','Dha','Dha','Dhin','Na',
      'Dha','Dhin','Dhin','Dha','Dha','Dhin','Na',
      'Dha','Tin', 'Tin', 'Ta', 'Ta', 'Tin', 'Na',
      'Ta', 'Tin', 'Tin', 'Ta', 'Ta', 'Dhin','Na',
    ],
    description: 'One of the longest talas. 28 beats in 4 vibhags of 7. Rare concert tala.',
    commonTempo: { vilambit:[15,35], madhya:[35,70], drut:[70,150] },
  },

};

/** Ordered list of tala keys for UI dropdowns. */
export const TALA_NAMES = Object.keys(TALAS);

/**
 * Compute vibhag boundary positions (0-indexed beat indices where a new vibhag starts).
 * @param {object} tala
 * @returns {number[]}
 */
export function getVibhagBoundaries(tala) {
  const bounds = [];
  let pos = 0;
  for (const size of tala.vibhag) {
    bounds.push(pos);
    pos += size;
  }
  return bounds;
}

/**
 * Returns true if beat `idx` is the start of a vibhag (for rendering separators).
 */
export function isVibhagStart(tala, idx) {
  return getVibhagBoundaries(tala).includes(idx);
}

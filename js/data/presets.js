/**
 * PRESET ALANKARS — Authentic Hindustani Classical Practice Patterns
 *
 * Each alankar defines a SEED PATTERN that shifts through the scale.
 * The app's direction setting (Aaroh/Avroh/Both) controls playback.
 *
 * Format following SurTaal / iShala convention:
 *   - Aaroh: Pattern shifts up note by note through the saptak
 *   - Avroh: Pattern reverses and shifts down
 *   - "Both" plays aaroh then avroh automatically
 *
 * Alankar types:
 *   1. Sequential (S R G m → R G m P → ...)
 *   2. Skip/Zigzag (S G R m → R m G P → ...)
 *   3. Grouped (S R G R → R G m G → ...)
 *   4. Mixed rhythm patterns
 *   5. Raga-specific ornamental patterns
 *
 * NOTE: S' (Taar Sa) is id:"S'" with o:0.
 *       Upper octave notes use o:1, Lower octave use o:-1.
 *
 * @type {import('./types').Preset[]}
 */
export const PRESETS = [

  // ═══════════════════════════════════════════════════════════════════════════
  //  BEGINNER — Foundation Alankars (Bilawal Thaat)
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Alankar 1: Basic 4-note ascending groups (the most fundamental) ---
  // Aaroh: S R G m | R G m P | G m P D | m P D N | P D N S'
  // Avroh: S' N D P | N D P m | D P m G | P m G R | m G R S
  {
    name: 'Alankar 1 — 4-Note Aaroh-Avroh',
    notes: [
      // Aaroh
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Beginner','Bilawal','Foundation'], level: 'beginner'
  },

  // --- Alankar 2: 3-Note ascending groups ---
  // Aaroh: S R G | R G m | G m P | m P D | P D N | D N S'
  // Avroh: S' N D | N D P | D P m | P m G | m G R | G R S
  {
    name: 'Alankar 2 — 3-Note Groups',
    notes: [
      // Aaroh
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Beginner','Bilawal','Foundation'], level: 'beginner'
  },

  // --- Alankar 3: 2-Note pairs (Jod) ---
  // Aaroh: S R | R G | G m | m P | P D | D N | N S'
  // Avroh: S' N | N D | D P | P m | m G | G R | R S
  {
    name: 'Alankar 3 — Pairs (Jod Alankar)',
    notes: [
      // Aaroh
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'R',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Beginner','Bilawal'], level: 'beginner'
  },

  // --- Alankar 4: Full Saptak Aaroh-Avroh ---
  {
    name: 'Saptak Aaroh-Avroh (Full Scale)',
    notes: [
      // Aaroh
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Beginner','Bilawal','Scale'], level: 'beginner'
  },

  // --- Alankar 5: Sa Pa pattern ---
  {
    name: 'Sa-Pa Drone Alankar',
    notes: [
      {id:'S',o:0,dur:2},{id:'P',o:0,dur:2},
      {id:"S'",o:0,dur:2},{id:'P',o:0,dur:2},{id:'S',o:0,dur:2},
    ],
    tags: ['Beginner','Drone'], level: 'beginner'
  },

  // --- Alankar 6: Forward-backward 4-note (S R G R, R G m G, ...) ---
  {
    name: 'Alankar 6 — Forward-Back Groups',
    notes: [
      // Aaroh
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},{id:'R',o:0,dur:1},
    ],
    tags: ['Beginner','Bilawal'], level: 'beginner'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  INTERMEDIATE — Longer Patterns, Skip Intervals, Mixed Rhythms
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Alankar 7: 5-Note groups ---
  // S R G m P | R G m P D | G m P D N | m P D N S' || reverse
  {
    name: 'Alankar 7 — 5-Note Groups',
    notes: [
      // Aaroh
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Intermediate','Bilawal'], level: 'intermediate'
  },

  // --- Alankar 8: Skip pattern (Vakra) — S G, R m, G P, m D, P N, D S' ---
  {
    name: 'Alankar 8 — Skip Intervals (Vakra)',
    notes: [
      // Aaroh
      {id:'S',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'R',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Intermediate','Bilawal','Vakra'], level: 'intermediate'
  },

  // --- Alankar 9: Zigzag (S G R m G P m D P N D S') ---
  {
    name: 'Alankar 9 — Zigzag Alankar',
    notes: [
      // Aaroh
      {id:'S',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Intermediate','Bilawal','Zigzag'], level: 'intermediate'
  },

  // --- Alankar 10: 4-note up + 2 back (S R G m G R, R G m P m G, ...) ---
  {
    name: 'Alankar 10 — Up-4 Back-2',
    notes: [
      // Aaroh
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},
    ],
    tags: ['Intermediate','Bilawal'], level: 'intermediate'
  },

  // --- Alankar 11: Double notes (S S R R G G m m ...) ---
  {
    name: 'Alankar 11 — Double Note Walk',
    notes: [
      {id:'S',o:0,dur:1},{id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'R',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Intermediate','Bilawal'], level: 'intermediate'
  },

  // --- Bhairavi Saptak Aaroh-Avroh ---
  {
    name: 'Bhairavi Saptak Aaroh-Avroh',
    notes: [
      {id:'S',o:0,dur:1},{id:'r',o:0,dur:1},{id:'g',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'d',o:0,dur:1},{id:'n',o:0,dur:1},{id:"S'",o:0,dur:1},
      {id:"S'",o:0,dur:1},{id:'n',o:0,dur:1},{id:'d',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'g',o:0,dur:1},{id:'r',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Intermediate','Bhairavi','Scale'], level: 'intermediate'
  },

  // --- Kalyan Saptak ---
  {
    name: 'Kalyan (Yaman) Aaroh-Avroh',
    notes: [
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'M',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'M',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Intermediate','Kalyan','Scale'], level: 'intermediate'
  },

  // --- Bhairav Saptak ---
  {
    name: 'Bhairav Aaroh-Avroh',
    notes: [
      {id:'S',o:0,dur:1},{id:'r',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'d',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'d',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'r',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Intermediate','Bhairav','Scale'], level: 'intermediate'
  },

  // --- Kafi Saptak ---
  {
    name: 'Kafi Aaroh-Avroh',
    notes: [
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'g',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'n',o:0,dur:1},{id:"S'",o:0,dur:1},
      {id:"S'",o:0,dur:1},{id:'n',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'g',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Intermediate','Kafi','Scale'], level: 'intermediate'
  },

  // --- Alankar 12: Khamaj 4-note groups ---
  {
    name: 'Khamaj 4-Note Alankar',
    notes: [
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'n',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'n',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'n',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'n',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Intermediate','Khamaj'], level: 'intermediate'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  ADVANCED — Speed Patterns, Taans, Ornaments, Raga-Specific
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Sapat Taan (straight run, fast) ---
  {
    name: 'Sapat Taan — Fast Aaroh-Avroh',
    notes: [
      {id:'S',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'m',o:0,dur:0.5},
      {id:'P',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'N',o:0,dur:0.5},{id:"S'",o:0,dur:0.5},
      {id:"S'",o:0,dur:0.5},{id:'N',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'P',o:0,dur:0.5},
      {id:'m',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'S',o:0,dur:0.5},
    ],
    tags: ['Advanced','Taan','Speed'], level: 'advanced'
  },

  // --- Alankar 13: 4-note fast groups ---
  {
    name: 'Alankar 13 — Fast 4-Note Groups',
    notes: [
      {id:'S',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'m',o:0,dur:0.5},
      {id:'R',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'P',o:0,dur:0.5},
      {id:'G',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'D',o:0,dur:0.5},
      {id:'m',o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'N',o:0,dur:0.5},
      {id:'P',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'N',o:0,dur:0.5},{id:"S'",o:0,dur:0.5},
      // Avroh
      {id:"S'",o:0,dur:0.5},{id:'N',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'P',o:0,dur:0.5},
      {id:'N',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'m',o:0,dur:0.5},
      {id:'D',o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'G',o:0,dur:0.5},
      {id:'P',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'R',o:0,dur:0.5},
      {id:'m',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'S',o:0,dur:0.5},
    ],
    tags: ['Advanced','Taan','Speed'], level: 'advanced'
  },

  // --- Taan Pattern: Zigzag fast ---
  {
    name: 'Zigzag Taan',
    notes: [
      {id:'S',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'m',o:0,dur:0.5},
      {id:'G',o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'D',o:0,dur:0.5},
      {id:'P',o:0,dur:0.5},{id:'N',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:"S'",o:0,dur:0.5},
      // Avroh
      {id:"S'",o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'N',o:0,dur:0.5},{id:'P',o:0,dur:0.5},
      {id:'D',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'G',o:0,dur:0.5},
      {id:'m',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'S',o:0,dur:0.5},
    ],
    tags: ['Advanced','Taan','Zigzag'], level: 'advanced'
  },

  // --- Yaman Characteristic: N R G M P, skipping Sa in aaroh ---
  {
    name: 'Yaman Pakad Alankar',
    notes: [
      {id:'N',o:-1,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'M',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'M',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
      {id:'N',o:-1,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'M',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'M',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Advanced','Yaman','Raga'], level: 'advanced'
  },

  // --- Bhairavi Thumri Pattern ---
  {
    name: 'Bhairavi Thumri Alankar',
    notes: [
      {id:'S',o:0,dur:1},{id:'r',o:0,dur:1},{id:'g',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'r',o:0,dur:1},{id:'g',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'g',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'d',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'d',o:0,dur:1},{id:'n',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'d',o:0,dur:1},{id:'n',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'n',o:0,dur:1},{id:'d',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'n',o:0,dur:1},{id:'d',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'d',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'g',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'g',o:0,dur:1},{id:'r',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'g',o:0,dur:1},{id:'r',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Advanced','Bhairavi','Raga'], level: 'advanced'
  },

  // --- Asavari 4-note ---
  {
    name: 'Asavari 4-Note Alankar',
    notes: [
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'g',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'R',o:0,dur:1},{id:'g',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'g',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'d',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'d',o:0,dur:1},{id:'n',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'d',o:0,dur:1},{id:'n',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'n',o:0,dur:1},{id:'d',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'n',o:0,dur:1},{id:'d',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},
      {id:'d',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'g',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'g',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'g',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Advanced','Asavari','Raga'], level: 'advanced'
  },

  // --- Todi 4-note ---
  {
    name: 'Todi 4-Note Alankar',
    notes: [
      {id:'S',o:0,dur:1},{id:'r',o:0,dur:1},{id:'g',o:0,dur:1},{id:'M',o:0,dur:1},
      {id:'r',o:0,dur:1},{id:'g',o:0,dur:1},{id:'M',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'g',o:0,dur:1},{id:'M',o:0,dur:1},{id:'P',o:0,dur:1},{id:'d',o:0,dur:1},
      {id:'M',o:0,dur:1},{id:'P',o:0,dur:1},{id:'d',o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'d',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'d',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:'d',o:0,dur:1},{id:'P',o:0,dur:1},{id:'M',o:0,dur:1},
      {id:'d',o:0,dur:1},{id:'P',o:0,dur:1},{id:'M',o:0,dur:1},{id:'g',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'M',o:0,dur:1},{id:'g',o:0,dur:1},{id:'r',o:0,dur:1},
      {id:'M',o:0,dur:1},{id:'g',o:0,dur:1},{id:'r',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Advanced','Todi','Raga'], level: 'advanced'
  },

  // --- Marwa 4-note ---
  {
    name: 'Marwa 4-Note Alankar',
    notes: [
      {id:'S',o:0,dur:1},{id:'r',o:0,dur:1},{id:'G',o:0,dur:1},{id:'M',o:0,dur:1},
      {id:'r',o:0,dur:1},{id:'G',o:0,dur:1},{id:'M',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'M',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'M',o:0,dur:1},{id:'D',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh (no Pa in Marwa)
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'M',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:'D',o:0,dur:1},{id:'M',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'M',o:0,dur:1},{id:'G',o:0,dur:1},{id:'r',o:0,dur:1},
      {id:'M',o:0,dur:1},{id:'G',o:0,dur:1},{id:'r',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Advanced','Marwa','Raga'], level: 'advanced'
  },

  // --- Poorvi 4-note ---
  {
    name: 'Poorvi 4-Note Alankar',
    notes: [
      {id:'S',o:0,dur:1},{id:'r',o:0,dur:1},{id:'G',o:0,dur:1},{id:'M',o:0,dur:1},
      {id:'r',o:0,dur:1},{id:'G',o:0,dur:1},{id:'M',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'G',o:0,dur:1},{id:'M',o:0,dur:1},{id:'P',o:0,dur:1},{id:'d',o:0,dur:1},
      {id:'M',o:0,dur:1},{id:'P',o:0,dur:1},{id:'d',o:0,dur:1},{id:'N',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'d',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'d',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'N',o:0,dur:1},{id:'d',o:0,dur:1},{id:'P',o:0,dur:1},{id:'M',o:0,dur:1},
      {id:'d',o:0,dur:1},{id:'P',o:0,dur:1},{id:'M',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'M',o:0,dur:1},{id:'G',o:0,dur:1},{id:'r',o:0,dur:1},
      {id:'M',o:0,dur:1},{id:'G',o:0,dur:1},{id:'r',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Advanced','Poorvi','Raga'], level: 'advanced'
  },

  // --- Expanding Pyramid Taan ---
  {
    name: 'Pyramid Taan (Expanding)',
    notes: [
      // 2-note
      {id:'S',o:0,dur:0.5},{id:'R',o:0,dur:0.5},
      // 3-note
      {id:'S',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'G',o:0,dur:0.5},
      // 4-note
      {id:'S',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'m',o:0,dur:0.5},
      // 5-note
      {id:'S',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'P',o:0,dur:0.5},
      // 6-note
      {id:'S',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'D',o:0,dur:0.5},
      // 7-note
      {id:'S',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'N',o:0,dur:0.5},
      // Full
      {id:'S',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'N',o:0,dur:0.5},{id:"S'",o:0,dur:0.5},
    ],
    tags: ['Advanced','Taan','Pyramid'], level: 'advanced'
  },

  // --- Meend-style slow vilambit ---
  {
    name: 'Vilambit Meend Alankar',
    notes: [
      {id:'S',o:0,dur:2},{id:'R',o:0,dur:2},{id:'G',o:0,dur:2},{id:'m',o:0,dur:2},
      {id:'P',o:0,dur:2},{id:'D',o:0,dur:2},{id:'N',o:0,dur:2},{id:"S'",o:0,dur:2},
      {id:"S'",o:0,dur:2},{id:'N',o:0,dur:2},{id:'D',o:0,dur:2},{id:'P',o:0,dur:2},
      {id:'m',o:0,dur:2},{id:'G',o:0,dur:2},{id:'R',o:0,dur:2},{id:'S',o:0,dur:2},
    ],
    tags: ['Advanced','Meend','Slow'], level: 'advanced'
  },

  // --- 3-Octave Run ---
  {
    name: 'Mandra-Madhya-Taar Run',
    notes: [
      // Mandra
      {id:'S',o:-1,dur:0.5},{id:'R',o:-1,dur:0.5},{id:'G',o:-1,dur:0.5},{id:'m',o:-1,dur:0.5},
      {id:'P',o:-1,dur:0.5},{id:'D',o:-1,dur:0.5},{id:'N',o:-1,dur:0.5},
      // Madhya
      {id:'S',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'m',o:0,dur:0.5},
      {id:'P',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'N',o:0,dur:0.5},
      // Taar
      {id:"S'",o:0,dur:0.5},{id:'R',o:1,dur:0.5},{id:'G',o:1,dur:0.5},
      // Avroh back
      {id:'R',o:1,dur:0.5},{id:"S'",o:0,dur:0.5},
      {id:'N',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'m',o:0,dur:0.5},
      {id:'G',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'S',o:0,dur:0.5},
      {id:'N',o:-1,dur:0.5},{id:'D',o:-1,dur:0.5},{id:'P',o:-1,dur:0.5},{id:'m',o:-1,dur:0.5},
      {id:'G',o:-1,dur:0.5},{id:'R',o:-1,dur:0.5},{id:'S',o:-1,dur:0.5},
    ],
    tags: ['Advanced','Expert','3-Octave'], level: 'advanced'
  },

  // --- Hamsadhvani (pentatonic raga) ---
  {
    name: 'Hamsadhvani Aaroh-Avroh',
    notes: [
      {id:'S',o:0,dur:1},{id:'R',o:0,dur:1},{id:'G',o:0,dur:1},{id:'P',o:0,dur:1},{id:'N',o:0,dur:1},{id:"S'",o:0,dur:1},
      {id:"S'",o:0,dur:1},{id:'N',o:0,dur:1},{id:'P',o:0,dur:1},{id:'G',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Advanced','Hamsadhvani','Raga'], level: 'advanced'
  },

  // --- Compound Taan ---
  {
    name: 'Compound Crossover Taan',
    notes: [
      {id:'S',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'R',o:0,dur:0.5},{id:'P',o:0,dur:0.5},
      {id:'G',o:0,dur:0.5},{id:'D',o:0,dur:0.5},{id:'m',o:0,dur:0.5},{id:'N',o:0,dur:0.5},
      {id:'P',o:0,dur:0.5},{id:"S'",o:0,dur:0.5},
      // Avroh
      {id:"S'",o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'N',o:0,dur:0.5},{id:'m',o:0,dur:0.5},
      {id:'D',o:0,dur:0.5},{id:'G',o:0,dur:0.5},{id:'P',o:0,dur:0.5},{id:'R',o:0,dur:0.5},
      {id:'m',o:0,dur:0.5},{id:'S',o:0,dur:0.5},
    ],
    tags: ['Advanced','Expert','Crossover'], level: 'advanced'
  },

  // --- Speed burst (16th notes) ---
  {
    name: 'Speed Burst (16th Notes)',
    notes: [
      {id:'S',o:0,dur:0.25},{id:'R',o:0,dur:0.25},{id:'G',o:0,dur:0.25},{id:'m',o:0,dur:0.25},
      {id:'P',o:0,dur:0.25},{id:'D',o:0,dur:0.25},{id:'N',o:0,dur:0.25},{id:"S'",o:0,dur:0.25},
      {id:"S'",o:0,dur:0.25},{id:'N',o:0,dur:0.25},{id:'D',o:0,dur:0.25},{id:'P',o:0,dur:0.25},
      {id:'m',o:0,dur:0.25},{id:'G',o:0,dur:0.25},{id:'R',o:0,dur:0.25},{id:'S',o:0,dur:0.5},
    ],
    tags: ['Advanced','Expert','Speed'], level: 'advanced'
  },

  // --- Bhimpalasi characteristic ---
  {
    name: 'Bhimpalasi Alankar',
    notes: [
      {id:'S',o:0,dur:1},{id:'g',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'g',o:0,dur:1},{id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'n',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'D',o:0,dur:1},{id:'n',o:0,dur:1},{id:"S'",o:0,dur:1},
      // Avroh
      {id:"S'",o:0,dur:1},{id:'n',o:0,dur:1},{id:'D',o:0,dur:1},{id:'P',o:0,dur:1},
      {id:'D',o:0,dur:1},{id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'g',o:0,dur:1},
      {id:'P',o:0,dur:1},{id:'m',o:0,dur:1},{id:'g',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'g',o:0,dur:1},{id:'R',o:0,dur:1},{id:'S',o:0,dur:1},
    ],
    tags: ['Advanced','Bhimpalasi','Raga'], level: 'advanced'
  },

  // --- Shruti Practice: alternating komal/shuddh ---
  {
    name: 'Shruti Sensitivity Practice',
    notes: [
      {id:'r',o:0,dur:1},{id:'R',o:0,dur:1},{id:'r',o:0,dur:1},{id:'R',o:0,dur:1},
      {id:'g',o:0,dur:1},{id:'G',o:0,dur:1},{id:'g',o:0,dur:1},{id:'G',o:0,dur:1},
      {id:'m',o:0,dur:1},{id:'M',o:0,dur:1},{id:'m',o:0,dur:1},{id:'M',o:0,dur:1},
      {id:'d',o:0,dur:1},{id:'D',o:0,dur:1},{id:'d',o:0,dur:1},{id:'D',o:0,dur:1},
      {id:'n',o:0,dur:1},{id:'N',o:0,dur:1},{id:'n',o:0,dur:1},{id:'N',o:0,dur:1},
    ],
    tags: ['Advanced','Shruti','Ear Training'], level: 'advanced'
  },

];

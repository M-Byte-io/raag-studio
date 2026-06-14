/**
 * SWARAS — The 13 notes of Hindustani music (Sa to Taar Sa).
 * Canonical data source. All modules import from here.
 */
export const SWARAS = [
  { id: 'S',  label: 'S',  full: 'Sa',          semit: 0,  type: 'pa-sa'  },
  { id: 'r',  label: 'r',  full: 'Komal Re',    semit: 1,  type: 'komal'  },
  { id: 'R',  label: 'R',  full: 'Shuddh Re',   semit: 2,  type: 'shuddh' },
  { id: 'g',  label: 'g',  full: 'Komal Ga',    semit: 3,  type: 'komal'  },
  { id: 'G',  label: 'G',  full: 'Shuddh Ga',   semit: 4,  type: 'shuddh' },
  { id: 'm',  label: 'm',  full: 'Shuddh Ma',   semit: 5,  type: 'shuddh' },
  { id: 'M',  label: 'M',  full: 'Teevra Ma',   semit: 6,  type: 'teevra' },
  { id: 'P',  label: 'P',  full: 'Pa',          semit: 7,  type: 'pa-sa'  },
  { id: 'd',  label: 'd',  full: 'Komal Dha',   semit: 8,  type: 'komal'  },
  { id: 'D',  label: 'D',  full: 'Shuddh Dha',  semit: 9,  type: 'shuddh' },
  { id: 'n',  label: 'n',  full: 'Komal Ni',    semit: 10, type: 'komal'  },
  { id: 'N',  label: 'N',  full: 'Shuddh Ni',   semit: 11, type: 'shuddh' },
  { id: "S'", label: "S'", full: 'Taar Sa',      semit: 12, type: 'pa-sa'  },
];

/** Fast O(1) lookup by id. Built once at module load. */
const _swIdx = new Map(SWARAS.map((s, i) => [s.id, i]));

/** @param {string} id — swara id @returns {object|undefined} */
export function getSw(id) { return SWARAS[_swIdx.get(id)]; }

/**
 * Returns the CSS colour tokens for a given swara type.
 * Centralises the 7× duplicated colour-mapping that was scattered
 * through the original codebase.
 *
 * @param {'komal'|'teevra'|'shuddh'|'pa-sa'} type
 * @returns {{ bg: string, fg: string, bd: string }}
 */
export function swaraColor(type) {
  switch (type) {
    case 'komal':  return { bg: 'rgba(248,113,113,0.15)', fg: '#f87171', bd: 'rgba(248,113,113,0.4)' };
    case 'teevra': return { bg: 'rgba(251,191,36,0.15)',  fg: '#fbbf24', bd: 'rgba(251,191,36,0.4)'  };
    case 'pa-sa':  return { bg: 'rgba(52,211,153,0.15)',  fg: '#34d399', bd: 'rgba(52,211,153,0.4)'  };
    default:       return { bg: 'rgba(192,132,252,0.15)', fg: '#c084fc', bd: 'rgba(192,132,252,0.4)' }; // shuddh
  }
}

/**
 * Keyboard key → swara id mapping for live note entry (U1).
 * Uses Hindustani notation convention: lowercase = komal, uppercase = shuddh.
 */
export const KEY_TO_SWARA = {
  's': 'S',   // Sa
  'r': 'r',   // Komal Re
  'R': 'R',   // Shuddh Re (Shift+R)
  'g': 'g',   // Komal Ga
  'G': 'G',   // Shuddh Ga (Shift+G)
  'm': 'm',   // Shuddh Ma
  'M': 'M',   // Teevra Ma (Shift+M)
  'p': 'P',   // Pa
  'd': 'd',   // Komal Dha
  'D': 'D',   // Shuddh Dha (Shift+D)
  'n': 'n',   // Komal Ni
  'N': 'N',   // Shuddh Ni (Shift+N)
  "'": "S'",  // Taar Sa
};

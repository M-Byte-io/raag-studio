/**
 * THAATS — The 10 parent scales of Hindustani classical music.
 * Each thaat has 7 notes (S' octave handled automatically at runtime).
 */
export const THAATS = {
  Bilawal:  ['S', 'R', 'G', 'm', 'P', 'D', 'N'],
  Khamaj:   ['S', 'R', 'G', 'm', 'P', 'D', 'n'],
  Kafi:     ['S', 'R', 'g', 'm', 'P', 'D', 'n'],
  Asavari:  ['S', 'R', 'g', 'm', 'P', 'd', 'n'],
  Bhairavi: ['S', 'r', 'g', 'm', 'P', 'd', 'n'],
  Bhairav:  ['S', 'r', 'G', 'm', 'P', 'd', 'N'],
  Kalyan:   ['S', 'R', 'G', 'M', 'P', 'D', 'N'],
  Marwa:    ['S', 'r', 'G', 'M', 'P', 'D', 'N'],
  Poorvi:   ['S', 'r', 'G', 'M', 'P', 'd', 'N'],
  Todi:     ['S', 'r', 'g', 'M', 'P', 'd', 'N'],
};

/** Ordered list of thaat names for UI rendering. */
export const THAAT_NAMES = Object.keys(THAATS);

/**
 * Human-readable thaat descriptions for the dropdown option text.
 * Format: "Name — notation"
 */
export const THAAT_LABELS = {
  Bilawal:  "Bilawal — S R G m P D N S'",
  Khamaj:   "Khamaj — S R G m P D n S'",
  Kafi:     "Kafi — S R g m P D n S'",
  Asavari:  "Asavari — S R g m P d n S'",
  Bhairavi: "Bhairavi — S r g m P d n S'",
  Bhairav:  "Bhairav — S r G m P d N S'",
  Kalyan:   "Kalyan — S R G M P D N S'",
  Marwa:    "Marwa — S r G M P D N S'",
  Poorvi:   "Poorvi — S r G M P d N S'",
  Todi:     "Todi — S r g M P d N S'",
};

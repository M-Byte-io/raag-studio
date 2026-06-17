/**
 * ShrutiEngine
 * 
 * Maps the 12 Equal Temperament MIDI notes to the 22 microtonal Shrutis
 * used in Hindustani Classical Music.
 * Calculates cents offsets based on Just Intonation ratios from Sa.
 */

export class ShrutiEngine {
  constructor() {
    // Standard 22 Shruti ratios based on Bharata's Natya Shastra / Sharngadeva
    // Represented as fractional ratios relative to Sa (1/1)
    this.shrutiRatios = {
      'Sa': 1/1,
      'r1': 256/243, // Komal Re (Pythagorean)
      'r2': 16/15,   // Komal Re (Just)
      'R1': 10/9,    // Shuddh Re (Minor whole tone)
      'R2': 9/8,     // Shuddh Re (Major whole tone)
      'g1': 32/27,   // Komal Ga (Pythagorean)
      'g2': 6/5,     // Komal Ga (Just)
      'G1': 5/4,     // Shuddh Ga (Just)
      'G2': 81/64,   // Shuddh Ga (Pythagorean)
      'm1': 4/3,     // Shuddh Ma (Just)
      'm2': 27/20,   // Shuddh Ma (Acute)
      'M1': 45/32,   // Teevra Ma (Just)
      'M2': 729/512, // Teevra Ma (Pythagorean)
      'Pa': 3/2,     // Pa (Perfect Fifth)
      'd1': 128/81,  // Komal Dha (Pythagorean)
      'd2': 8/5,     // Komal Dha (Just)
      'D1': 5/3,     // Shuddh Dha (Just)
      'D2': 27/16,   // Shuddh Dha (Pythagorean)
      'n1': 16/9,    // Komal Ni (Pythagorean)
      'n2': 9/5,     // Komal Ni (Just)
      'N1': 15/8,    // Shuddh Ni (Just)
      'N2': 243/128  // Shuddh Ni (Pythagorean)
    };
  }

  /**
   * Converts a ratio (e.g. 3/2) to cents.
   */
  ratioToCents(ratio) {
    return 1200 * Math.log2(ratio);
  }

  /**
   * Returns the exact pitch (in cents above Sa) for a given Shruti.
   */
  getShrutiCents(shrutiId) {
    if (!this.shrutiRatios[shrutiId]) return 0;
    return this.ratioToCents(this.shrutiRatios[shrutiId]);
  }

  /**
   * Maps a standard 12-TET Swara (e.g., 'R', 'g', 'P') to a specific Shruti
   * based on the context of a Raga or Thaat.
   * @param {string} ragaName 
   */
  getRagaIntonationMap(ragaName) {
    // Base Just Intonation defaults (Bilawal Thaat approx)
    const baseMap = {
      'S': 'Sa', 'r': 'r2', 'R': 'R2', 'g': 'g2', 'G': 'G1',
      'm': 'm1', 'M': 'M1', 'P': 'Pa', 'd': 'd2', 'D': 'D1',
      'n': 'n2', 'N': 'N1'
    };

    const name = ragaName.toLowerCase();

    // The 10 Classical Thaats (Bhatkhande system) + specific Ragas
    if (name === 'bilawal') {
      // All Shuddh Swaras
      // Default baseMap is already essentially Bilawal
    } else if (name === 'khamaj') {
      // Shuddh Re, Ga, Ma, Dha. Komal Ni
      baseMap['N'] = 'n2'; 
    } else if (name === 'kafi') {
      // Komal Ga, Komal Ni
      baseMap['G'] = 'g2';
      baseMap['N'] = 'n2';
    } else if (name === 'asavari') {
      // Komal Ga, Komal Dha, Komal Ni
      baseMap['G'] = 'g2';
      baseMap['D'] = 'd2';
      baseMap['N'] = 'n2';
    } else if (name === 'bhairavi') {
      // Komal Re, Ga, Dha, Ni
      baseMap['R'] = 'r2';
      baseMap['G'] = 'g2';
      baseMap['D'] = 'd2';
      baseMap['N'] = 'n2';
    } else if (name === 'bhairav') {
      // Komal Re, Komal Dha
      baseMap['R'] = 'r2';
      baseMap['D'] = 'd2';
    } else if (name === 'kalyan' || name === 'yaman') {
      // Teevra Ma
      baseMap['m'] = 'M2'; // Sharper Teevra Ma is often used in Yaman
    } else if (name === 'marwa') {
      // Komal Re, Teevra Ma
      baseMap['R'] = 'r2';
      baseMap['m'] = 'M1';
    } else if (name === 'poorvi') {
      // Komal Re, Teevra Ma, Komal Dha
      baseMap['R'] = 'r2';
      baseMap['m'] = 'M1';
      baseMap['D'] = 'd2';
    } else if (name === 'todi') {
      // Komal Re, Komal Ga, Teevra Ma, Komal Dha
      baseMap['R'] = 'r2';
      baseMap['G'] = 'g2';
      baseMap['m'] = 'M1';
      baseMap['D'] = 'd2';
    } else if (name === 'darbari') {
      // Specific Raga Override (Asavari Thaat but with Ati-komal Ga and Dha)
      baseMap['G'] = 'g1'; 
      baseMap['D'] = 'd1'; 
      baseMap['N'] = 'n2';
    }

    const centsMap = {};
    for (const [swara, shruti] of Object.entries(baseMap)) {
      centsMap[swara] = this.getShrutiCents(shruti);
    }

    return centsMap;
  }
}

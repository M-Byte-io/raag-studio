import { WesternNoteEngine } from '../../audio/western-note-engine.js';
import { SwaraMappingEngine } from '../../audio/swara-mapping-engine.js';
import { swaraColor } from '../../data/swaras.js';

/**
 * REFERENCE GRID RENDERER
 *
 * Renders the piano-roll style background grid.
 * Displays Western scientific pitch notation (e.g., C4) as primary,
 * and Hindustani Swaras (e.g., S) as secondary context based on the current Sa.
 */
export class ReferenceGridRenderer {
  constructor() {
    this.labelWidth = 55; // px reserved on the left for labels
  }

  /**
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} W - Canvas width
   * @param {number} H - Canvas height
   * @param {import('./frequency-axis-engine.js').FrequencyAxisEngine} axisEngine 
   * @param {number} basePitchOffset - Current Sa offset
   */
  render(ctx, W, H, axisEngine, basePitchOffset) {
    const minMidi = Math.floor(axisEngine.visibleMinMidi);
    const maxMidi = Math.ceil(axisEngine.visibleMaxMidi);
    const semitoneH = axisEngine.semitoneHeight;
    const contentW = W - this.labelWidth;

    ctx.save();

    for (let midi = minMidi; midi <= maxMidi; midi++) {
      const yCenter = axisEngine.midiToY(midi);
      const yTop = yCenter - (semitoneH / 2);
      
      const noteInfo = WesternNoteEngine.parseMidi(midi);
      const isBlackKey = noteInfo.noteName.includes('#');

      // 1. Draw background banding (Piano Roll style)
      ctx.fillStyle = isBlackKey ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(this.labelWidth, yTop, contentW, semitoneH);

      // 2. Map to Swara for secondary context and highlighting
      const swaraInfo = SwaraMappingEngine.getSwaraFromMidi(midi, basePitchOffset);
      const isSa = swaraInfo.id === 'S' || swaraInfo.id === "S'";
      const isPa = swaraInfo.id === 'P';

      // Highlight Sa and Pa rows
      if (isSa || isPa) {
        ctx.fillStyle = isSa ? 'rgba(52,211,153,0.08)' : 'rgba(192,132,252,0.06)';
        ctx.fillRect(this.labelWidth, yTop, contentW, semitoneH);
      }

      // 3. Draw grid line
      ctx.strokeStyle = isSa ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = isSa ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(this.labelWidth, yCenter);
      ctx.lineTo(W, yCenter);
      ctx.stroke();

      // 4. Draw Labels
      // We only draw labels if the zoom level is high enough to fit them,
      // or we only draw C notes and Sa notes if zoomed far out.
      if (semitoneH > 14 || noteInfo.noteName === 'C' || isSa) {
        // Label format: "C4 (S)"
        const primaryText = noteInfo.fullNotation;
        const secondaryText = `(${swaraInfo.label})`;
        
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        // Primary (Western)
        ctx.font = `${noteInfo.noteName === 'C' ? '700' : '600'} 10px Outfit, sans-serif`;
        ctx.fillStyle = isSa ? '#34d399' : (isBlackKey ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)');
        ctx.fillText(primaryText, this.labelWidth - 22, yCenter);

        // Secondary (Swara)
        ctx.font = `500 9px Outfit, sans-serif`;
        const swaraColTokens = swaraColor(swaraInfo.type);
        ctx.fillStyle = swaraColTokens.fg;
        ctx.fillText(secondaryText, this.labelWidth - 4, yCenter);
      }
    }

    ctx.restore();
  }
}

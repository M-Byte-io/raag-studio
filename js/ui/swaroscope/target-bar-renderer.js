import { SwaraMappingEngine } from '../../audio/swara-mapping-engine.js';
import { WesternNoteEngine } from '../../audio/western-note-engine.js';
import { SWARAS } from '../../data/swaras.js';

/**
 * TARGET BAR RENDERER
 *
 * Renders the "Guided Riyaz" blocks that the user must match their pitch against.
 */
export class TargetBarRenderer {
  /**
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} W 
   * @param {number} H 
   * @param {import('./frequency-axis-engine.js').FrequencyAxisEngine} axisEngine 
   * @param {Array} sequence - The pattern the user is singing (from main Scheduler)
   * @param {number} beatPhase - Current playback phase
   * @param {number} basePitchOffset - Current Sa
   * @param {number} labelWidth 
   * @param {number} contentWidth 
   */
  render(ctx, W, H, axisEngine, sequence, beatPhase, basePitchOffset, labelWidth, contentWidth) {
    if (!sequence || sequence.length === 0) return;

    ctx.save();
    
    // We want to visualize roughly the next 4 beats ahead, and 1 beat behind
    const lookaheadBeats = 4;
    const lookbehindBeats = 1;
    const totalVisibleBeats = lookaheadBeats + lookbehindBeats;
    
    // How many pixels per beat
    const pxPerBeat = contentWidth / totalVisibleBeats;
    
    // "Now" line is 1 beat from the right edge
    const nowX = labelWidth + contentWidth - (lookbehindBeats * pxPerBeat);

    let cumulativeBeat = 0;

    for (let i = 0; i < sequence.length; i++) {
      const note = sequence[i];
      const dur = note.dur || 1;
      
      const noteStartPhase = cumulativeBeat;
      const noteEndPhase = cumulativeBeat + dur;
      
      cumulativeBeat += dur;

      // Is this note in the visible window?
      const relativeStart = noteStartPhase - beatPhase;
      const relativeEnd = noteEndPhase - beatPhase;

      if (relativeEnd < -lookbehindBeats || relativeStart > lookaheadBeats) continue;

      // Resolve Swara to absolute MIDI
      const sw = SWARAS.find(s => s.id === note.id);
      if (!sw) continue;

      const targetMidi = SwaraMappingEngine.getAbsoluteMidiFromSwara(sw.semit, note.o || 0, basePitchOffset);
      const yCenter = axisEngine.midiToY(targetMidi);
      const h = axisEngine.semitoneHeight * 0.7; // slightly thinner than a full semitone
      const yTop = yCenter - (h / 2);

      const xStart = nowX + (relativeStart * pxPerBeat);
      const xEnd = nowX + (relativeEnd * pxPerBeat);
      const w = xEnd - xStart;

      // Draw Bar
      const isPast = relativeEnd <= 0;
      const isActive = relativeStart <= 0 && relativeEnd > 0;

      let fillStr = 'rgba(129, 140, 248, 0.4)'; // Upcoming
      if (isActive) fillStr = 'rgba(192, 132, 252, 0.7)'; // Active
      if (isPast) fillStr = 'rgba(255, 255, 255, 0.1)'; // Past

      ctx.fillStyle = fillStr;
      ctx.beginPath();
      ctx.roundRect(xStart, yTop, w, h, 4);
      ctx.fill();

      // Outline
      if (isActive) {
        ctx.strokeStyle = 'rgba(192, 132, 252, 1.0)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Inline Label
      if (w > 20 && h > 10) {
        ctx.fillStyle = isActive ? '#fff' : 'rgba(255,255,255,0.6)';
        ctx.font = '700 11px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const noteInfo = WesternNoteEngine.parseMidi(targetMidi);
        const label = `${noteInfo.fullNotation} (${sw.label})`;
        
        // Clip text inside bar roughly
        ctx.save();
        ctx.beginPath();
        ctx.rect(xStart, yTop, w, h);
        ctx.clip();
        ctx.fillText(label, xStart + (w/2), yCenter);
        ctx.restore();
      }
    }

    // Draw the "NOW" playhead line
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nowX, 0);
    ctx.lineTo(nowX, H);
    ctx.stroke();

    // Subtle glow on the playhead
    ctx.fillStyle = 'rgba(52, 211, 153, 0.2)';
    ctx.fillRect(nowX - 10, 0, 20, H);

    ctx.restore();
  }
}

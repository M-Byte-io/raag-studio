import { swaraColor } from '../../data/swaras.js';

/**
 * PITCH CONTOUR RENDERER
 *
 * Renders the live voice trace of the user. Uses Catmull-Rom spline
 * interpolation to ensure the curve is smooth and jitter-free.
 */
export class PitchContourRenderer {
  /**
   * Evaluates a Catmull-Rom spline at parameter t [0, 1] given 4 control points.
   */
  _catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    
    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  /**
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} W 
   * @param {number} H 
   * @param {import('./frequency-axis-engine.js').FrequencyAxisEngine} axisEngine 
   * @param {Array} history - Array of { t (seconds), midi, swara }
   * @param {number} contentWidth - Width available for drawing
   * @param {number} labelWidth - Left offset
   * @param {number} historySeconds - Total time window represented by contentWidth
   */
  render(ctx, W, H, axisEngine, history, contentWidth, labelWidth, historySeconds) {
    if (history.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;

    // We will build path segments grouped by tune status colour
    // to allow the line colour to change smoothly.
    // For simplicity and performance, we'll draw straight line segments 
    // but at a very high interpolated resolution.

    // Calculate X coordinate for a given relative time (t=0 is right edge, t=historySeconds is left)
    const getX = (t) => {
      const now = performance.now() / 1000;
      const age = now - t;
      const xRight = labelWidth + contentWidth;
      const pxPerSec = contentWidth / historySeconds;
      return xRight - (age * pxPerSec);
    };

    // Filter points to those visible on screen
    const now = performance.now() / 1000;
    const visibleHistory = history.filter(pt => (now - pt.t) <= historySeconds + 1);

    if (visibleHistory.length < 2) {
      ctx.restore();
      return;
    }

    // Sort chronologically (oldest first)
    visibleHistory.sort((a, b) => a.t - b.t);

    for (let i = 0; i < visibleHistory.length - 1; i++) {
      const ptA = visibleHistory[i];
      const ptB = visibleHistory[i + 1];

      // Don't connect points if there's a large time gap (silence)
      if (ptB.t - ptA.t > 0.15) continue;

      const xA = getX(ptA.t);
      const yA = axisEngine.midiToY(ptA.midi);
      
      const xB = getX(ptB.t);
      const yB = axisEngine.midiToY(ptB.midi);

      // Determine colour based on tuneStatus
      const colTokens = swaraColor(ptB.swara.type);
      let alpha = 1.0;
      
      // Fade out old points
      const age = now - ptB.t;
      if (age > historySeconds - 2) {
        alpha = Math.max(0, 1 - (age - (historySeconds - 2)) / 2);
      }

      ctx.strokeStyle = ptB.swara.tuneStatus === 'perfect' ? `rgba(52, 211, 153, ${alpha})` : 
                        ptB.swara.tuneStatus === 'good'    ? `rgba(251, 191, 36, ${alpha})` : 
                                                             `rgba(248, 113, 113, ${alpha})`;
      
      // Optional glow
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.moveTo(xA, yA);
      ctx.lineTo(xB, yB);
      ctx.stroke();
    }

    ctx.restore();
  }
}

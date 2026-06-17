import { AnalysisPlugin } from '../architecture/plugin-architecture.js';
import { AIFeedbackEngine } from '../ai-feedback-engine.js';
import { ScaleMappingEngine } from '../scale-mapping-engine.js';

export class AIFeedbackPlugin extends AnalysisPlugin {
  constructor() {
    super('ai-feedback-plugin');
    this.scaleEngine = new ScaleMappingEngine();
    this.feedbackEngine = new AIFeedbackEngine(this.scaleEngine);
  }

  /**
   * Generates Guru feedback annotations for the session.
   * @param {import('../architecture/session-schema.js').SessionProject} session 
   */
  analyze(session) {
    const userTrack = session.trackGroups.flatMap(g => g.tracks).find(t => t.type === 'UserPitchTrack');
    const refTrack = session.trackGroups.flatMap(g => g.tracks).find(t => t.type === 'ReferencePitchTrack');
    
    if (!userTrack || !refTrack) return;

    // Run the AI Guru analysis
    const aiAnnotations = this.feedbackEngine.analyze(userTrack, refTrack, session.annotations);

    // Remove old AIErrorAnnotations and add the new ones
    session.annotations = session.annotations.filter(a => a.type !== 'AIErrorAnnotation');
    session.annotations.push(...aiAnnotations);
  }
}

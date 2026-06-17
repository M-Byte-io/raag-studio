/**
 * Annotation Schema
 * 
 * Formal polymorphic annotation system for regions of interest.
 * Supports loop selections, detected phrases, AI feedback, and Teacher comments.
 */

export class BaseAnnotation {
  constructor() {
    this.id = crypto.randomUUID();
    this.type = 'BaseAnnotation';
    
    // Time boundaries (in seconds, relative to master clock)
    this.startSec = 0;
    this.endSec = 0;
    
    // UI Properties
    this.color = '#FFFFFF';
    this.label = '';
    this.isVisible = true;
    
    // Metadata/Linking
    this.trackId = null; // null = global annotation, else linked to specific pitch track
  }
}

/**
 * Automatically detected or user-defined sung phrases (e.g. one continuous breath).
 */
export class PhraseAnnotation extends BaseAnnotation {
  constructor() {
    super();
    this.type = 'PhraseAnnotation';
    this.color = '#4CAF50';
    this.lyrics = ''; 
  }
}

/**
 * User-defined loop region for practice.
 */
export class LoopAnnotation extends BaseAnnotation {
  constructor() {
    super();
    this.type = 'LoopAnnotation';
    this.color = '#FFC107';
    this.isLoopEnabled = true;
  }
}

/**
 * Regions of heavy oscillation identified by FeatureTracks.
 */
export class GamakAnnotation extends BaseAnnotation {
  constructor() {
    super();
    this.type = 'GamakAnnotation';
    this.color = '#9C27B0';
    this.speedHz = 0; // The detected oscillation rate
    this.depthCents = 0;
  }
}

/**
 * Text or Audio feedback from a human Teacher.
 */
export class TeacherCommentAnnotation extends BaseAnnotation {
  constructor() {
    super();
    this.type = 'TeacherCommentAnnotation';
    this.color = '#2196F3';
    this.textComment = '';
    this.audioRecordingId = null;
  }
}

/**
 * System-generated critique (e.g. "Meend was too fast").
 */
export class AIErrorAnnotation extends BaseAnnotation {
  constructor() {
    super();
    this.type = 'AIErrorAnnotation';
    this.color = '#F44336';
    this.severity = 1; // 1 to 5
    this.aiCritique = '';
    this.suggestedFix = '';
  }
}

import { test, assert } from './test-framework.js';
import { DAWTimelineEngine } from '../js/ui/swaroscope/daw-timeline-engine.js';
import { createEmptySession } from '../js/engine/architecture/session-schema.js';
import { TeacherCommentAnnotation } from '../js/engine/architecture/annotation-schema.js';

test('DAWTimelineEngine - Instantiation & Resize', () => {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  
  const engine = new DAWTimelineEngine(canvas);
  assert(engine.viewport.startSec === 0, 'Viewport starts at 0');
  assert(engine.overlay !== undefined, 'HTML Overlay is created');
  
  document.body.removeChild(canvas);
});

test('Annotation CRUD - Session Update', () => {
  const session = createEmptySession();
  
  // Create
  const comment = new TeacherCommentAnnotation();
  comment.startSec = 1;
  comment.endSec = 5;
  comment.textComment = "Watch the pitch here";
  session.annotations.push(comment);
  
  assert(session.annotations.length === 1, 'Annotation created');
  
  // Edit
  session.annotations[0].textComment = "Watch the Meend here";
  assert(session.annotations[0].textComment === "Watch the Meend here", 'Annotation updated');
  
  // Delete
  session.annotations = [];
  assert(session.annotations.length === 0, 'Annotation deleted');
});

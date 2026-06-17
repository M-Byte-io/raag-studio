/**
 * Session Schema
 * 
 * Defines the root data structure for a SessionProject, enabling 
 * saving, loading, versioning, and exporting of user practice sessions.
 */

/**
 * @typedef {Object} SessionProject
 * @property {number} schemaVersion - The schema version (e.g., 1.0) for backwards compatibility.
 * @property {string} id - Unique identifier for the session (UUID).
 * @property {SessionMetadata} metadata - Top-level information about the session.
 * @property {TrackGroup[]} trackGroups - Collections of PitchTracks (e.g., "Reference", "Takes").
 * @property {import('./annotation-schema.js').BaseAnnotation[]} annotations - Global annotations.
 * @property {SessionSettings} settings - UI/Playback settings (e.g., current zoom level).
 * @property {SessionStatistics} statistics - Overall performance metrics.
 * @property {SessionSnapshot[]} snapshots - History of session states for undo/recovery.
 */

/**
 * @typedef {Object} SessionSnapshot
 * @property {number} timestamp - Epoch timestamp of the snapshot.
 * @property {string} label - Auto-save, manual, or command description.
 * @property {Object} state - Serialized JSON of the SessionProject (excluding snapshots array).
 */

/**
 * @typedef {Object} SessionMetadata
 * @property {string} raga - E.g., "Yaman".
 * @property {string} taal - E.g., "Teentaal".
 * @property {string} performer - Name of the singer/instrumentalist.
 * @property {number} saFrequency - The base frequency of Sa (Hz).
 * @property {string} date - ISO date string of recording.
 */

/**
 * @typedef {Object} TrackGroup
 * @property {string} id - Unique group ID.
 * @property {string} name - Display name (e.g., "Vocal Takes").
 * @property {boolean} isVisible - Whether this group is expanded/visible.
 * @property {boolean} isMuted - Whether this group is muted.
 * @property {boolean} isSoloed - Whether this group is soloed.
 * @property {boolean} isCollapsed - Whether the group is collapsed in UI.
 * @property {import('./track-schema.js').BasePitchTrack[]} tracks - The tracks in this group.
 */

/**
 * @typedef {Object} SessionSettings
 * @property {number} playbackRate - Current global playback speed (0.25 to 2.0).
 * @property {number} viewStartSec - Current viewport start time.
 * @property {number} viewEndSec - Current viewport end time.
 */

/**
 * @typedef {Object} SessionStatistics
 * @property {number} totalPracticeTimeSec - Total time spent practicing in this session.
 * @property {number} overallAccuracy - 0-100 score of pitch accuracy against reference.
 */

export const CURRENT_SCHEMA_VERSION = 1.0;

/**
 * Creates an empty, valid SessionProject.
 * @returns {SessionProject}
 */
export function createEmptySession() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    metadata: { raga: '', taal: '', performer: '', saFrequency: 261.63, saMidi: 60, date: new Date().toISOString() },
    trackGroups: [],
    annotations: [],
    settings: { playbackRate: 1.0, viewStartSec: 0, viewEndSec: 10 },
    statistics: { totalPracticeTimeSec: 0, overallAccuracy: 0 },
    snapshots: []
  };
}

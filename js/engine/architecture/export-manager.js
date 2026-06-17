/**
 * Export Architecture
 * 
 * Unified logic for generating shareable data (JSON, CSV, PDF, WAV).
 */

export class ExportManager {
  constructor() {
    this.exporters = new Map();
  }

  register(exporter) {
    this.exporters.set(exporter.type, exporter);
  }

  /**
   * @param {string} type - e.g., 'json', 'csv', 'pdf'
   * @param {import('./session-schema.js').SessionProject} session 
   */
  async exportSession(type, session) {
    const exporter = this.exporters.get(type);
    if (!exporter) throw new Error(`No exporter registered for type: ${type}`);
    return await exporter.execute(session);
  }
}

export class BaseExporter {
  constructor(type) {
    this.type = type;
  }
  async execute(session) { throw new Error('Not implemented'); }
}

export class JsonExporter extends BaseExporter {
  constructor() {
    super('json');
  }
  async execute(session) {
    // Stringify, handling Float32Arrays safely
    return JSON.stringify(session, (key, value) => {
      if (value instanceof Float32Array) {
        return Array.from(value);
      }
      return value;
    }, 2);
  }
}

export const exportManager = new ExportManager();
exportManager.register(new JsonExporter());

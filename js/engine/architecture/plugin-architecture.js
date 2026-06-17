/**
 * Plugin Architecture
 * 
 * Prevents core monolithing. All advanced analysis (Gamak, Shruti) 
 * and specific UI overlays should be registered as Plugins.
 */

export class PluginManager {
  constructor() {
    this.plugins = new Map();
  }

  register(plugin) {
    if (!plugin.id) throw new Error("Plugin must have an ID");
    this.plugins.set(plugin.id, plugin);
    plugin.onRegister();
  }

  get(id) {
    return this.plugins.get(id);
  }

  runAnalysis(sessionProject) {
    for (const plugin of this.plugins.values()) {
      if (plugin.type === 'AnalysisPlugin') {
        plugin.analyze(sessionProject);
      }
    }
  }
}

export class BasePlugin {
  constructor(id) {
    this.id = id;
    this.type = 'BasePlugin';
  }
  onRegister() {}
}

export class AnalysisPlugin extends BasePlugin {
  constructor(id) {
    super(id);
    this.type = 'AnalysisPlugin';
  }
  /** @param {import('./session-schema.js').SessionProject} session */
  analyze(session) { throw new Error('Not implemented'); }
}

export class VisualizationPlugin extends BasePlugin {
  constructor(id) {
    super(id);
    this.type = 'VisualizationPlugin';
  }
  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx, viewport, session) { throw new Error('Not implemented'); }
}

export const pluginManager = new PluginManager();

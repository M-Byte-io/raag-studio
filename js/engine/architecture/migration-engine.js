import { CURRENT_SCHEMA_VERSION } from './session-schema.js';

/**
 * Schema Migration System
 * 
 * Guarantees backward compatibility of old projects. 
 * Migrates loaded JSON payloads incrementally to the CURRENT_SCHEMA_VERSION.
 */

export class MigrationEngine {
  constructor() {
    this.migrations = [
      // Example: new Migration_1_to_2()
    ];
  }

  /**
   * Migrates an untrusted/old JSON object to the current SessionProject schema.
   * @param {Object} rawData 
   * @returns {import('./session-schema.js').SessionProject}
   */
  migrate(rawData) {
    if (!rawData.schemaVersion) {
      rawData.schemaVersion = 1.0; // Assume 1.0 if missing
    }

    let currentVersion = rawData.schemaVersion;

    for (const migration of this.migrations) {
      if (currentVersion === migration.fromVersion) {
        console.log(`[MigrationEngine] Migrating from ${migration.fromVersion} to ${migration.toVersion}`);
        rawData = migration.execute(rawData);
        currentVersion = migration.toVersion;
        rawData.schemaVersion = currentVersion;
      }
    }

    if (currentVersion !== CURRENT_SCHEMA_VERSION) {
      console.warn(`[MigrationEngine] Reached version ${currentVersion}, but system expects ${CURRENT_SCHEMA_VERSION}`);
    }

    return rawData;
  }
}

export class BaseMigration {
  constructor(fromVersion, toVersion) {
    this.fromVersion = fromVersion;
    this.toVersion = toVersion;
  }
  execute(data) { throw new Error('Not implemented'); }
}

export const migrationEngine = new MigrationEngine();

const logger = require('../utils/logger');

/**
 * Escritura híbrida: DynamoDB (obligatorio) + Google Sheets (best-effort).
 */
class HybridWrite {
  /**
   * @param {Object} options
   * @param {() => Promise<void>} options.dynamo
   * @param {() => Promise<void>} [options.sheets]
   * @param {string} options.context
   */
  async write({ dynamo, sheets, context }) {
    await dynamo();

    if (!sheets) return;

    try {
      await sheets();
    } catch (err) {
      logger.warn('Sheets write failed (non-critical)', {
        context,
        error: err.message,
      });
    }
  }

  /**
   * Sheets primero (fuente de verdad), DynamoDB best-effort.
   * @param {Object} options
   * @param {() => Promise<void>} options.sheets
   * @param {() => Promise<void>} [options.dynamo]
   * @param {string} options.context
   */
  async writeSheetsFirst({ sheets, dynamo, context }) {
    await sheets();

    if (!dynamo) return;

    try {
      await dynamo();
    } catch (err) {
      logger.warn('DynamoDB write failed (non-critical)', {
        context,
        error: err.message,
      });
    }
  }
}

module.exports = new HybridWrite();

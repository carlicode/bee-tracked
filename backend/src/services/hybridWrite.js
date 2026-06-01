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
}

module.exports = new HybridWrite();

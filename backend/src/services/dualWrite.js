/**
 * Dual write a DynamoDB después de escribir en Sheets (best-effort, no bloquea al driver).
 */
const logger = require('../utils/logger');
const { isDynamoWriteEnabled } = require('./dynamoUtils');
const turnosService = require('./turnosService');
const carrerasService = require('./carrerasService');

async function saveTurnoToDynamo(data) {
  if (!isDynamoWriteEnabled()) return;
  try {
    await turnosService.putTurno(data);
  } catch (err) {
    logger.warn('DynamoDB turno write failed (non-critical)', {
      context: `turno:${data.tipo}:${data.turnoId}`,
      error: err.message,
    });
  }
}

async function saveCarreraToDynamo(data) {
  if (!isDynamoWriteEnabled()) return;
  try {
    await carrerasService.putCarrera(data);
  } catch (err) {
    logger.warn('DynamoDB carrera write failed (non-critical)', {
      context: `carrera:${data.tipo}:${data.carreraId}`,
      error: err.message,
    });
  }
}

module.exports = {
  saveTurnoToDynamo,
  saveCarreraToDynamo,
};

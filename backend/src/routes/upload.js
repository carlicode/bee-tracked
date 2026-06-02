const express = require('express');
const { sessionAuth } = require('../middleware/sessionAuth');
const {
  generatePresignedPutUrl,
  isPresignedUploadConfigured,
  VALID_TIPOS,
} = require('../services/presignedUpload');
const { createRequestLogger } = require('../utils/logger');

const router = express.Router();

router.post('/presigned-url', sessionAuth, async (req, res) => {
  const log = createRequestLogger(req);

  try {
    if (!isPresignedUploadConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Subida a S3 no configurada',
        code: 'S3_NOT_CONFIGURED',
      });
    }

    const { tipo, ext, contexto } = req.body || {};

    if (!tipo || !VALID_TIPOS.includes(tipo)) {
      return res.status(400).json({
        success: false,
        error: `tipo requerido. Valores: ${VALID_TIPOS.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await generatePresignedPutUrl({
      tipo,
      ext: ext || 'jpg',
      contexto: {
        ...(contexto && typeof contexto === 'object' ? contexto : {}),
        userId: contexto?.userId || req.authUser?.userId,
        username: contexto?.username || req.authUser?.userId,
        abejita: contexto?.abejita || req.authUser?.name,
      },
    });

    log.info('Presigned URL generada', { tipo, fileKey: result.fileKey });
    res.json({ success: true, ...result });
  } catch (err) {
    log.error('Error generando presigned URL', { error: err.message });
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Error al generar URL de subida',
      code: err.code,
    });
  }
});

module.exports = router;

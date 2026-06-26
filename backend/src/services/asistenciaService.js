const { QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const { dynamo, slugUserId } = require('./dynamoUtils');
const calendariosService = require('./calendariosService');
const extraordinariosService = require('./extraordinariosService');
const multasService = require('./multasService');
const { parseHoraMin, fechasEnRango } = require('../utils/weekUtils');

async function getTurnosUsuarioFecha(userName, fecha) {
  const pk = `USER#${slugUserId(userName)}`;
  const res = await dynamo.send(new QueryCommand({
    TableName: config.dynamo.turnosTable,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :pref)',
    ExpressionAttributeValues: marshall({ ':pk': pk, ':pref': 'TURNO#' }),
  }));
  return (res.Items || [])
    .map((i) => unmarshall(i))
    .filter((t) => t.fecha === fecha);
}

async function getPermisoAprobado(userId, fecha) {
  const res = await dynamo.send(new QueryCommand({
    TableName: config.dynamo.permisosTable,
    IndexName: 'userId-fecha-index',
    KeyConditionExpression: 'userId = :uid AND fecha = :f',
    ExpressionAttributeValues: marshall({ ':uid': userId, ':f': fecha }),
  }));
  const items = (res.Items || []).map((i) => unmarshall(i));
  return items.find((p) => p.estado === 'aprobado') || null;
}

async function getExtraAnotado(userName, fecha) {
  const abiertos = await extraordinariosService.listExtraordinarios('abierto');
  const cerrados = await extraordinariosService.listExtraordinarios('cerrado');
  const all = [...abiertos, ...cerrados].filter((e) => e.fecha === fecha);
  for (const extra of all) {
    const ins = await extraordinariosService.listInscripciones(extra.extraId);
    const mine = ins.find(
      (i) => slugUserId(i.userName) === slugUserId(userName) && i.estado === 'anotado'
    );
    if (mine) return { extra, inscripcion: mine };
  }
  return null;
}

function evaluarDia({ calDia, turnos, permiso, extra, reglas, extraReemplaza }) {
  const fecha = calDia.fecha;

  if (permiso) {
    return { fecha, resultado: 'permiso', detalle: `Permiso aprobado (${permiso.motivo})` };
  }

  if (extra && extraReemplaza) {
    return {
      fecha,
      resultado: 'extraordinario',
      detalle: `Día extraordinario (reemplaza): ${extra.extra.titulo}`,
      horaEsperadaInicio: extra.inscripcion.horaInicio,
      horaEsperadaFin: extra.inscripcion.horaFin,
    };
  }

  if (!calDia.trabaja) {
    if (extra && !extraReemplaza) {
      return {
        fecha,
        resultado: 'extraordinario',
        detalle: `Extra + libre programado: ${extra.extra.titulo}`,
        horaEsperadaInicio: extra.inscripcion.horaInicio,
        horaEsperadaFin: extra.inscripcion.horaFin,
      };
    }
    if (turnos.length > 0) {
      return { fecha, resultado: 'turno_sin_horario', detalle: 'Trabajó sin estar programado' };
    }
    return { fecha, resultado: 'libre', detalle: 'Día libre programado' };
  }

  if (extra && !extraReemplaza) {
    // Día normal + extra sumado — evaluar turno vs horario normal
  }

  const horaEspIni = calDia.horaInicio;
  const horaEspFin = calDia.horaFin;

  if (turnos.length === 0) {
    return {
      fecha,
      resultado: 'ausencia',
      detalle: 'No registró turno',
      horaEsperadaInicio: horaEspIni,
      horaEsperadaFin: horaEspFin,
      minutosRetraso: 9999,
    };
  }

  const turno = turnos.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  const iniEsp = parseHoraMin(horaEspIni);
  const iniReal = parseHoraMin(turno.horaInicio);
  let minutosRetraso = 0;
  if (iniEsp != null && iniReal != null) {
    minutosRetraso = iniReal - iniEsp;
  }

  const finEsp = parseHoraMin(horaEspFin);
  const finReal = parseHoraMin(turno.horaCierre);
  let minutosSalidaTemprana = 0;
  if (finEsp != null && finReal != null && turno.horaCierre) {
    minutosSalidaTemprana = finEsp - finReal;
  }

  let resultado = 'ok';
  let detalle = 'Asistencia correcta';
  if (minutosRetraso > reglas.margenMinutos) {
    resultado = 'tardanza';
    detalle = `Llegó ${minutosRetraso} min tarde (margen ${reglas.margenMinutos} min)`;
  } else if (minutosSalidaTemprana > reglas.margenMinutos && turno.horaCierre) {
    resultado = 'salida_temprana';
    detalle = `Salió ${minutosSalidaTemprana} min antes`;
    minutosRetraso = minutosSalidaTemprana;
  }

  return {
    fecha,
    resultado,
    detalle,
    horaEsperadaInicio: horaEspIni,
    horaEsperadaFin: horaEspFin,
    horaRealInicio: turno.horaInicio,
    horaRealFin: turno.horaCierre || '',
    turnoId: turno.turnoId,
    minutosRetraso: Math.max(minutosRetraso, 0),
  };
}

async function calcularAsistenciaRango({ fechaDesde, fechaHasta, userType, generarMultas }) {
  const reglas = await multasService.getReglas();
  const { fechas, rows } = await calendariosService.getCalendarioVisual(fechaDesde, fechaHasta);
  let filtered = rows;
  if (userType && userType !== 'all') {
    filtered = rows.filter((r) => r.userType === userType);
  }

  const reporte = [];
  for (const row of filtered) {
    const diasReporte = [];
    for (const fecha of fechas) {
      const celda = row.celdas[fecha];
      if (!celda || celda.tipo === 'fuera_rango') continue;

      const calDia = celda.tipo === 'trabaja'
        ? { fecha, trabaja: true, horaInicio: celda.horaInicio, horaFin: celda.horaFin }
        : { fecha, trabaja: false, horaInicio: '', horaFin: '' };

      const turnos = await getTurnosUsuarioFecha(row.userName, fecha);
      const permiso = await getPermisoAprobado(row.userId, fecha);
      const extra = await getExtraAnotado(row.userName, fecha);
      const extraReemplaza = extra?.extra?.reemplazaHorarioNormal === true;

      const evaluacion = evaluarDia({
        calDia: extraReemplaza && extra
          ? { fecha, trabaja: true, horaInicio: extra.inscripcion.horaInicio, horaFin: extra.inscripcion.horaFin }
          : calDia,
        turnos,
        permiso,
        extra,
        reglas,
        extraReemplaza,
      });
      diasReporte.push(evaluacion);

      if (generarMultas && ['tardanza', 'ausencia', 'salida_temprana'].includes(evaluacion.resultado)) {
        const tipo = evaluacion.resultado === 'salida_temprana' ? 'salidaTemprana' : evaluacion.resultado;
        if (reglas.tipos?.[tipo] !== false) {
          await multasService.crearMulta({
            userId: row.userId,
            userName: row.userName,
            userType: row.userType,
            fecha,
            tipo: evaluacion.resultado,
            minutos: evaluacion.minutosRetraso || 0,
            motivo: evaluacion.detalle,
            turnoId: evaluacion.turnoId,
          });
        }
      }
    }
    reporte.push({
      userId: row.userId,
      userName: row.userName,
      userType: row.userType,
      fechaDesde,
      fechaHasta,
      dias: diasReporte,
    });
  }

  return reporte;
}

/** Compat: acepta semana o rango de fechas */
async function calcularAsistenciaSemana({ semana, fechaDesde, fechaHasta, userType, generarMultas }) {
  if (fechaDesde && fechaHasta) {
    return calcularAsistenciaRango({ fechaDesde, fechaHasta, userType, generarMultas });
  }
  if (!fechaDesde || !fechaHasta) {
    const err = new Error('Indica fechaDesde y fechaHasta');
    err.statusCode = 400;
    throw err;
  }
  return calcularAsistenciaRango({ fechaDesde, fechaHasta, userType, generarMultas });
}

function reporteToCsv(reporte) {
  const headers = [
    'Usuario', 'Tipo', 'Fecha', 'Resultado', 'Detalle',
    'Hora esperada inicio', 'Hora esperada fin', 'Hora real inicio', 'Hora real fin', 'Minutos',
  ];
  const rows = [headers.join(',')];
  for (const u of reporte) {
    for (const d of u.dias) {
      rows.push([
        `"${u.userName}"`,
        u.userType,
        d.fecha,
        d.resultado,
        `"${(d.detalle || '').replace(/"/g, '""')}"`,
        d.horaEsperadaInicio || '',
        d.horaEsperadaFin || '',
        d.horaRealInicio || '',
        d.horaRealFin || '',
        d.minutosRetraso || 0,
      ].join(','));
    }
  }
  return rows.join('\n');
}

module.exports = {
  calcularAsistenciaSemana,
  calcularAsistenciaRango,
  reporteToCsv,
  fechasEnRango,
};

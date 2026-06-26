const { QueryCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const config = require('../config');
const { dynamo, slugUserId } = require('./dynamoUtils');
const calendariosService = require('./calendariosService');
const extraordinariosService = require('./extraordinariosService');
const multasService = require('./multasService');
const { parseHoraMin, diasDeSemana } = require('../utils/weekUtils');

const DIAS_NOMBRE = calendariosService.DIAS;

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

async function getExtraAprobado(userName, fecha) {
  const abiertos = await extraordinariosService.listExtraordinarios('abierto');
  const cerrados = await extraordinariosService.listExtraordinarios('cerrado');
  const all = [...abiertos, ...cerrados].filter((e) => e.fecha === fecha);
  for (const extra of all) {
    const ins = await extraordinariosService.listInscripciones(extra.extraId);
    const mine = ins.find(
      (i) => slugUserId(i.userName) === slugUserId(userName) && i.estado === 'aprobado'
    );
    if (mine) return { extra, inscripcion: mine };
  }
  return null;
}

function evaluarDia({ calDia, turnos, permiso, extra, reglas }) {
  const fecha = calDia.fecha;
  if (!calDia.trabaja) {
    if (turnos.length > 0) {
      return { fecha, resultado: 'turno_sin_horario', detalle: 'Trabajó sin estar programado' };
    }
    return { fecha, resultado: 'libre', detalle: 'Día libre programado' };
  }

  if (permiso) {
    return { fecha, resultado: 'permiso', detalle: `Permiso aprobado (${permiso.motivo})` };
  }

  if (extra) {
    return {
      fecha,
      resultado: 'extraordinario',
      detalle: `Día extraordinario: ${extra.extra.titulo}`,
      horaEsperadaInicio: extra.inscripcion.horaInicio,
      horaEsperadaFin: extra.inscripcion.horaFin,
    };
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

async function calcularAsistenciaSemana({ semana, userType, generarMultas }) {
  const reglas = await multasService.getReglas();
  const calendarios = await calendariosService.listCalendariosSemana(semana, userType);
  const reporte = [];

  for (const cal of calendarios) {
    const diasReporte = [];
    for (const nombre of DIAS_NOMBRE) {
      const calDia = cal.dias[nombre];
      if (!calDia) continue;
      const turnos = await getTurnosUsuarioFecha(cal.userName, calDia.fecha);
      const permiso = await getPermisoAprobado(cal.userId, calDia.fecha);
      const extra = await getExtraAprobado(cal.userName, calDia.fecha);
      const evaluacion = evaluarDia({ calDia, turnos, permiso, extra, reglas });
      diasReporte.push(evaluacion);

      if (generarMultas && ['tardanza', 'ausencia', 'salida_temprana'].includes(evaluacion.resultado)) {
        const tipo = evaluacion.resultado === 'salida_temprana' ? 'salidaTemprana' : evaluacion.resultado;
        if (reglas.tipos?.[tipo] !== false) {
          await multasService.crearMulta({
            userId: cal.userId,
            userName: cal.userName,
            userType: cal.userType,
            fecha: calDia.fecha,
            tipo: evaluacion.resultado,
            minutos: evaluacion.minutosRetraso || 0,
            motivo: evaluacion.detalle,
            turnoId: evaluacion.turnoId,
          });
        }
      }
    }
    reporte.push({
      userId: cal.userId,
      userName: cal.userName,
      userType: cal.userType,
      semana: cal.semana,
      dias: diasReporte,
    });
  }

  return reporte;
}

function reporteToCsv(reporte) {
  const headers = [
    'Usuario', 'Tipo', 'Semana', 'Fecha', 'Resultado', 'Detalle',
    'Hora esperada inicio', 'Hora esperada fin', 'Hora real inicio', 'Hora real fin', 'Minutos',
  ];
  const rows = [headers.join(',')];
  for (const u of reporte) {
    for (const d of u.dias) {
      rows.push([
        `"${u.userName}"`,
        u.userType,
        u.semana,
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
  reporteToCsv,
  diasDeSemana,
};

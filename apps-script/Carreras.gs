/**
 * CRUD operations for carreras
 */

function createCarrera(body) {
  try {
    const user = validateToken(body.idToken);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(user.driverName);
    
    // Si no existe la pestaña del driver, crearla
    if (!sheet) {
      sheet = ss.insertSheet(user.driverName);
      // Crear encabezados
      sheet.appendRow([
        'Fecha',
        'Cliente',
        'Hora inicio',
        'Lugar recojo',
        'Lugar destino',
        'Hora fin',
        'Tiempo',
        'Distancia',
        'Precio',
        'Observaciones',
        'Email',
        'Timestamp'
      ]);
      
      // Formatear encabezados
      const headerRange = sheet.getRange(1, 1, 1, 12);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f3f4f6');
    }
    
    // Append nueva fila
    const timestamp = new Date();
    const row = [
      body.fecha || '',
      body.cliente || '',
      body.horaInicio || '',
      body.lugarRecojo || '',
      body.lugarDestino || '',
      body.horaFin || '',
      body.tiempo || '',
      body.distancia || 0,
      body.precio || 0,
      body.observaciones || '',
      user.email,
      timestamp
    ];
    
    sheet.appendRow(row);
    
    return {
      success: true,
      data: {
        rowNumber: sheet.getLastRow(),
        carrera: body
      }
    };
  } catch(e) {
    Logger.log('Error creating carrera: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

function listCarreras(user, fecha) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(user.driverName);
    
    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, data: [] };
    }
    
    // Leer todas las filas (saltando encabezado)
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
    const carreras = [];
    
    for (var i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Si se especificó fecha, filtrar
      if (fecha && row[0] !== fecha) {
        continue;
      }
      
      // Crear objeto carrera
      const carrera = {
        fecha: row[0],
        cliente: row[1],
        horaInicio: row[2],
        lugarRecojo: row[3],
        lugarDestino: row[4],
        horaFin: row[5],
        tiempo: row[6],
        distancia: row[7] || 0,
        precio: row[8] || 0,
        observaciones: row[9] || '',
        email: row[10],
        createdAt: row[11] ? new Date(row[11]).toISOString() : ''
      };
      
      carreras.push(carrera);
    }
    
    // Ordenar por fecha y hora (más recientes primero)
    carreras.sort(function(a, b) {
      if (a.fecha !== b.fecha) {
        return b.fecha.localeCompare(a.fecha);
      }
      return (b.horaInicio || '').localeCompare(a.horaInicio || '');
    });
    
    return {
      success: true,
      data: carreras
    };
  } catch(e) {
    Logger.log('Error listing carreras: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

function autocompleteClientes(user, query) {
  try {
    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(user.driverName);
    
    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, data: [] };
    }
    
    // Leer todas las filas
    const data = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues(); // Columna B = Cliente
    const clientesSet = new Set();
    const queryLower = query.toLowerCase();
    
    for (var i = 0; i < data.length; i++) {
      const cliente = data[i][0];
      if (cliente && typeof cliente === 'string') {
        const clienteLower = cliente.toLowerCase();
        if (clienteLower.indexOf(queryLower) !== -1) {
          clientesSet.add(cliente);
        }
      }
    }
    
    const clientes = Array.from(clientesSet).sort().slice(0, 10); // Máximo 10 resultados
    
    return {
      success: true,
      data: clientes
    };
  } catch(e) {
    Logger.log('Error autocompleting clientes: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}


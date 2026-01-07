/**
 * Authentication functions
 */

function validateAuth(idToken) {
  try {
    const user = validateToken(idToken);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    return {
      success: true,
      data: user
    };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function validateToken(idToken) {
  try {
    if (!idToken) {
      return null;
    }
    
    // Verificar token con Google
    const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + idToken;
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    
    if (response.getResponseCode() !== 200) {
      return null;
    }
    
    const data = JSON.parse(response.getContentText());
    
    // Verificar que el email esté autorizado
    const authorizedEmails = getAuthorizedEmails();
    if (authorizedEmails.indexOf(data.email) === -1) {
      return null;
    }
    
    return {
      email: data.email,
      name: data.name || data.email,
      driverName: getDriverName(data.email)
    };
  } catch(e) {
    Logger.log('Error validating token: ' + e.toString());
    return null;
  }
}

function getAuthorizedEmails() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName('Config');
    
    if (!configSheet) {
      // Si no existe Config, crear lista vacía (deberías crear esta pestaña)
      return [];
    }
    
    const lastRow = configSheet.getLastRow();
    if (lastRow < 2) {
      return [];
    }
    
    // Leer emails de la columna A (empezando desde fila 2)
    const emails = configSheet.getRange('A2:A' + lastRow).getValues();
    return emails.flat().filter(function(email) { return email !== ''; });
  } catch(e) {
    Logger.log('Error getting authorized emails: ' + e.toString());
    return [];
  }
}

function getDriverName(email) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName('Config');
    
    if (!configSheet) {
      return email.split('@')[0]; // Default: primera parte del email
    }
    
    const lastRow = configSheet.getLastRow();
    if (lastRow < 2) {
      return email.split('@')[0];
    }
    
    // Buscar email en columna A y devolver nombre de columna B
    const data = configSheet.getRange('A2:B' + lastRow).getValues();
    
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === email && data[i][1]) {
        return data[i][1];
      }
    }
    
    // Si no se encuentra, usar primera parte del email
    return email.split('@')[0];
  } catch(e) {
    Logger.log('Error getting driver name: ' + e.toString());
    return email.split('@')[0];
  }
}


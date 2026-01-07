/**
 * Main entry point for Apps Script Web App
 */

function doPost(e) {
  try {
    const path = e.parameter.path || (e.postData ? JSON.parse(e.postData.contents).path : null);
    
    if (!path) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Path parameter required' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    let body = {};
    if (e.postData) {
      body = JSON.parse(e.postData.contents);
    }
    
    let result;
    
    switch(path) {
      case 'auth':
        result = validateAuth(body.idToken);
        break;
      case 'carreras':
        result = createCarrera(body);
        break;
      default:
        result = { success: false, error: 'Invalid endpoint' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const path = e.parameter.path;
    const token = e.parameter.token;
    
    if (!path) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Path parameter required' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Validate token for GET requests
    const user = validateToken(token);
    if (!user) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    let result;
    
    switch(path) {
      case 'carreras':
        result = listCarreras(user, e.parameter.fecha);
        break;
      case 'clientes':
        result = autocompleteClientes(user, e.parameter.q);
        break;
      default:
        result = { success: false, error: 'Invalid endpoint' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


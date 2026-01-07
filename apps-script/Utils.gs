/**
 * Utility functions
 */

function success(data) {
  return {
    success: true,
    data: data
  };
}

function error(message) {
  return {
    success: false,
    error: message
  };
}

/**
 * Setup function - Run this once to configure Script Properties
 */
function setup() {
  // Configurar propiedades del script
  // Ejecutar manualmente desde el editor de Apps Script
  
  const properties = PropertiesService.getScriptProperties();
  
    // Ejemplo:
    // properties.setProperty('SHEET_ID', 'id-del-google-sheet');
    
    Logger.log('Setup completed.');
}


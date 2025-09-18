// Google Apps Script para Dashboard GIM - Versión Final Corregida
const SPREADSHEET_CONFIG = {
  capitalSocial: {
    spreadsheetId: '1qnsW4CpcDZgzHOWT8njIdQRAeVlXow0kJ7kOj2dTUVg',
    sheetName: 'CapitalSocial'
  },
  
  repartoSocial: {
    spreadsheetId: '1qnsW4CpcDZgzHOWT8njIdQRAeVlXow0kJ7kOj2dTUVg', 
    sheetName: 'RepartoSocial'
  },
  
  empleados: {
    spreadsheetId: '1nD_dfTIj2a691QV4l-8SBN6wlY_HivRPz_wR0CDBi9s',
    sheetName: 'Empleados'
  }
};

function doPost(e) {
  try {
    let data = {};
    
    // Verificar si hay datos POST
    if (e && e.postData && e.postData.contents) {
      try {
        // Intentar parsear como JSON
        data = JSON.parse(e.postData.contents);
      } catch (jsonError) {
        // Si falla, intentar como form data
        data = parseFormData(e.postData.contents);
      }
    } else if (e && e.parameter) {
      // Usar parámetros si están disponibles
      data = e.parameter;
    } else {
      return createResponse({ error: 'No se recibieron datos válidos' });
    }
    
    Logger.log('Datos recibidos en doPost: ' + JSON.stringify(data));
    
    switch(data.action) {
      case 'login':
        return createResponse(handleLogin(data.username, data.password));
      case 'getCapitalData':
        return createResponse(getCapitalData());
      case 'getRepartoData':
        return createResponse(getRepartoData());
      case 'getEmployeeData':
        return createResponse(getEmployeeData());
      default:
        return createResponse({ error: 'Acción no válida: ' + (data.action || 'undefined') });
    }
  } catch (error) {
    Logger.log('Error en doPost: ' + error.toString());
    return createResponse({ error: 'Error del servidor: ' + error.toString() });
  }
}

function doGet(e) {
  try {
    let action = '';
    
    // Verificar parámetros GET
    if (e && e.parameter && e.parameter.action) {
      action = e.parameter.action;
    }
    
    Logger.log('Acción GET recibida: ' + action);
    
    switch(action) {
      case 'getCapitalData':
        return createResponse(getCapitalData());
      case 'getRepartoData':
        return createResponse(getRepartoData());
      case 'getEmployeeData':
        return createResponse(getEmployeeData());
      case 'test':
        return createResponse({ message: 'API funcionando', timestamp: new Date().toISOString() });
      default:
        return createResponse({ 
          message: 'Dashboard GIM API funcionando correctamente',
          timestamp: new Date().toISOString(),
          availableActions: ['login', 'getCapitalData', 'getRepartoData', 'getEmployeeData']
        });
    }
  } catch (error) {
    Logger.log('Error en doGet: ' + error.toString());
    return createResponse({ error: 'Error en GET: ' + error.toString() });
  }
}

function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseFormData(formString) {
  const params = {};
  
  if (!formString || typeof formString !== 'string') {
    return params;
  }
  
  try {
    const pairs = formString.split('&');
    
    for (let pair of pairs) {
      const equalIndex = pair.indexOf('=');
      if (equalIndex > -1) {
        const key = decodeURIComponent(pair.substring(0, equalIndex));
        const value = decodeURIComponent(pair.substring(equalIndex + 1));
        params[key] = value;
      }
    }
  } catch (error) {
    Logger.log('Error parseando form data: ' + error.toString());
  }
  
  return params;
}

function handleLogin(username, password) {
  try {
    if (!username || !password) {
      return { success: false, message: 'Usuario y contraseña son requeridos' };
    }
    
    const config = SPREADSHEET_CONFIG.empleados;
    const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return { success: false, message: 'No hay datos de empleados' };
    }
    
    const headers = data[0];
    Logger.log('Headers encontrados en Empleados: ' + headers.join(', '));
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const user = {};
      
      headers.forEach((header, index) => {
        user[header] = row[index];
      });
      
      Logger.log('Verificando usuario: ' + user.Usuario + ' / ' + user.Email + ' - Estado: ' + user.Estado + ' - Accesos: ' + user.Accesos);
      
      // Validar credenciales y permisos
      if (user.Estado === 'Activo' && user.Accesos === true) {
        const usernameMatch = user.Usuario === username || user.Email === username;
        const passwordMatch = user.Clave === password;
        
        if (usernameMatch && passwordMatch) {
          delete user.Clave;
          Logger.log('Login exitoso para: ' + username);
          return { 
            success: true, 
            user: user,
            message: 'Login exitoso'
          };
        }
      }
    }
    
    Logger.log('Login fallido para: ' + username);
    return { 
      success: false, 
      message: 'Credenciales incorrectas o acceso denegado' 
    };
    
  } catch (error) {
    Logger.log('Error en handleLogin: ' + error.toString());
    return { 
      success: false, 
      message: 'Error al validar credenciales: ' + error.toString() 
    };
  }
}

function getCapitalData() {
  try {
    const config = SPREADSHEET_CONFIG.capitalSocial;
    const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return [];
    }
    
    const headers = data[0];
    Logger.log('Headers en CapitalSocial: ' + headers.join(', '));
    const result = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const record = {};
      
      headers.forEach((header, index) => {
        let value = row[index];
        
        // Convertir fechas
        if (header === 'Fecha' || header === 'FechaHora' || header.toLowerCase().includes('fecha')) {
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          } else if (typeof value === 'string' && value.includes('/')) {
            const parts = value.split('/');
            if (parts.length === 3) {
              value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }
        
        // Convertir números
        const numericFields = [
          'Monto', 'Penalizacion', 'Aporte', 'Colocación', 'MontoNeto', 
          'Utilidades', 'BaseUtilidad', 'Participacion', 'Saldo', 'SaldoAnterior',
          'monto', 'penalizacion', 'aporte', 'colocacion', 'montoneto',
          'utilidades', 'baseutilidad', 'participacion', 'saldo', 'saldoanterior'
        ];
        
        if (numericFields.includes(header)) {
          value = parseFloat(value) || 0;
        }
        
        record[header] = value;
      });
      
      if (record.Estado === 'Activo' || record.estado === 'Activo') {
        result.push(record);
      }
    }
    
    Logger.log('Registros de capital encontrados: ' + result.length);
    return result;
    
  } catch (error) {
    Logger.log('Error en getCapitalData: ' + error.toString());
    return { error: 'Error al obtener datos de capital: ' + error.toString() };
  }
}

function getRepartoData() {
  try {
    const config = SPREADSHEET_CONFIG.repartoSocial;
    const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return [];
    }
    
    const headers = data[0];
    Logger.log('Headers en RepartoSocial: ' + headers.join(', '));
    const result = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const record = {};
      
      headers.forEach((header, index) => {
        let value = row[index];
        
        if (header === 'fecha' || header === 'Fecha' || header === 'fechaHora' || header.toLowerCase().includes('fecha')) {
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0];
          } else if (typeof value === 'string' && value.includes('/')) {
            const parts = value.split('/');
            if (parts.length === 3) {
              value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
        }
        
        const numericFields = [
          'monto', 'ingresos', 'gastos', 'utilidad', 'utilidades',
          'Monto', 'Ingresos', 'Gastos', 'Utilidad', 'Utilidades'
        ];
        
        if (numericFields.includes(header)) {
          value = parseFloat(value) || 0;
        }
        
        record[header] = value;
      });
      
      if (record.estado === 'Activo' || record.Estado === 'Activo') {
        result.push(record);
      }
    }
    
    Logger.log('Registros de reparto encontrados: ' + result.length);
    return result;
    
  } catch (error) {
    Logger.log('Error en getRepartoData: ' + error.toString());
    return { error: 'Error al obtener datos de reparto: ' + error.toString() };
  }
}

function getEmployeeData() {
  try {
    const config = SPREADSHEET_CONFIG.empleados;
    const sheet = SpreadsheetApp.openById(config.spreadsheetId).getSheetByName(config.sheetName);
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return [];
    }
    
    const headers = data[0];
    const result = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const record = {};
      
      headers.forEach((header, index) => {
        record[header] = row[index];
      });
      
      if (record.Estado === 'Activo') {
        delete record.Clave;
        result.push(record);
      }
    }
    
    Logger.log('Empleados activos encontrados: ' + result.length);
    return result;
    
  } catch (error) {
    Logger.log('Error en getEmployeeData: ' + error.toString());
    return { error: 'Error al obtener datos de empleados: ' + error.toString() };
  }
}

// Funciones de testing
function testAllConnections() {
  Logger.log('=== TESTING CONEXIONES GIM ===');
  
  try {
    const capitalConfig = SPREADSHEET_CONFIG.capitalSocial;
    const capitalSheet = SpreadsheetApp.openById(capitalConfig.spreadsheetId).getSheetByName(capitalConfig.sheetName);
    const capitalData = capitalSheet.getDataRange().getValues();
    Logger.log('✓ Capital Social: ' + capitalData.length + ' filas encontradas');
    Logger.log('  Headers: ' + capitalData[0].join(', '));
  } catch (error) {
    Logger.log('✗ Error Capital Social: ' + error.toString());
  }
  
  try {
    const repartoConfig = SPREADSHEET_CONFIG.repartoSocial;
    const repartoSheet = SpreadsheetApp.openById(repartoConfig.spreadsheetId).getSheetByName(repartoConfig.sheetName);
    const repartoData = repartoSheet.getDataRange().getValues();
    Logger.log('✓ Reparto Social: ' + repartoData.length + ' filas encontradas');
    Logger.log('  Headers: ' + repartoData[0].join(', '));
  } catch (error) {
    Logger.log('✗ Error Reparto Social: ' + error.toString());
  }
  
  try {
    const empleadosConfig = SPREADSHEET_CONFIG.empleados;
    const empleadosSheet = SpreadsheetApp.openById(empleadosConfig.spreadsheetId).getSheetByName(empleadosConfig.sheetName);
    const empleadosData = empleadosSheet.getDataRange().getValues();
    Logger.log('✓ Empleados: ' + empleadosData.length + ' filas encontradas');
    Logger.log('  Headers: ' + empleadosData[0].join(', '));
  } catch (error) {
    Logger.log('✗ Error Empleados: ' + error.toString());
  }
}

function testLogin() {
  const result = handleLogin('usuario_test', 'clave_test');
  Logger.log('Resultado login: ' + JSON.stringify(result));
}

function testAPI() {
  Logger.log('=== TEST API COMPLETO ===');
  
  // Test login
  const loginResult = handleLogin('admin', '123456');
  Logger.log('Login test: ' + JSON.stringify(loginResult));
  
  // Test capital data
  const capitalResult = getCapitalData();
  Logger.log('Capital data count: ' + (Array.isArray(capitalResult) ? capitalResult.length : 'Error'));
  
  // Test reparto data
  const repartoResult = getRepartoData();
  Logger.log('Reparto data count: ' + (Array.isArray(repartoResult) ? repartoResult.length : 'Error'));
}

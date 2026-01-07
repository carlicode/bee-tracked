import type { Carrera, ApiResponse, User } from '../types';
import { storage } from './storage';

// Datos mock para demo
const MOCK_CARRERAS: Carrera[] = [
  {
    fecha: '2025-01-15',
    cliente: 'Yango',
    horaInicio: '16:56',
    lugarRecojo: 'Tarija',
    lugarDestino: 'Capitán ñuflo',
    horaFin: '17:13',
    tiempo: '0:17',
    distancia: 8,
    precio: 18,
    observaciones: '',
  },
  {
    fecha: '2025-01-15',
    cliente: 'Yango',
    horaInicio: '17:30',
    lugarRecojo: 'Oquendo',
    lugarDestino: 'Bernradino bilvao',
    horaFin: '17:42',
    tiempo: '0:12',
    distancia: 6,
    precio: 14,
    observaciones: '',
  },
  {
    fecha: '2025-01-15',
    cliente: 'Yango',
    horaInicio: '17:45',
    lugarRecojo: 'Ramón Espinoza',
    lugarDestino: 'Calle efronio',
    horaFin: '17:57',
    tiempo: '0:12',
    distancia: 4,
    precio: 10,
    observaciones: '',
  },
];

const MOCK_CLIENTES = ['Yango', 'Tarija', 'Target Store', 'Tarapaya'];

const MOCK_USER: User = {
  email: 'demo@ecoapp.com',
  name: 'Demo Driver',
  driverName: 'Demo',
};

// Simular delay de red
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApiService = {
  // Verificar token y obtener usuario (modo demo)
  verifyAuth: async (idToken?: string): Promise<ApiResponse<User>> => {
    await delay(500);
    return {
      success: true,
      data: MOCK_USER,
    };
  },

  // Crear nueva carrera (simula guardar en localStorage)
  createCarrera: async (carrera: Carrera, idToken?: string): Promise<ApiResponse<Carrera>> => {
    await delay(800);
    
    // Guardar en localStorage para persistencia
    const carrerasGuardadas = JSON.parse(localStorage.getItem('mock_carreras') || '[]');
    carrerasGuardadas.push({ ...carrera, rowNumber: carrerasGuardadas.length + 1 });
    localStorage.setItem('mock_carreras', JSON.stringify(carrerasGuardadas));
    
    return {
      success: true,
      data: carrera,
    };
  },

  // Listar carreras (combina mock inicial + localStorage)
  getCarreras: async (fecha?: string): Promise<ApiResponse<Carrera[]>> => {
    await delay(500);
    
    const carrerasGuardadas = JSON.parse(localStorage.getItem('mock_carreras') || '[]');
    const todasLasCarreras = [...MOCK_CARRERAS, ...carrerasGuardadas];
    
    let carrerasFiltradas = todasLasCarreras;
    if (fecha) {
      carrerasFiltradas = todasLasCarreras.filter(c => c.fecha === fecha);
    }
    
    // Ordenar por fecha y hora (más recientes primero)
    carrerasFiltradas.sort((a, b) => {
      if (a.fecha !== b.fecha) {
        return b.fecha.localeCompare(a.fecha);
      }
      return (b.horaInicio || '').localeCompare(a.horaInicio || '');
    });
    
    return {
      success: true,
      data: carrerasFiltradas,
    };
  },

  // Autocomplete clientes
  autocompleteClientes: async (query: string): Promise<ApiResponse<string[]>> => {
    await delay(300);
    
    const queryLower = query.toLowerCase();
    const resultados = MOCK_CLIENTES.filter(cliente => 
      cliente.toLowerCase().includes(queryLower)
    );
    
    return {
      success: true,
      data: resultados,
    };
  },
};


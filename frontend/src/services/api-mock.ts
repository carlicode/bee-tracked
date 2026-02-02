import type { Carrera, ApiResponse, User, Delivery } from '../types';
import type { TurnoSimple } from '../types/turno';
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
  userType: 'beezero',
};

// Simular delay de red
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApiService = {
  // Verificar token y obtener usuario (modo demo)
  verifyAuth: async (_idToken?: string): Promise<ApiResponse<User>> => {
    await delay(500);
    return {
      success: true,
      data: MOCK_USER,
    };
  },

  // Crear nueva carrera (simula guardar en localStorage)
  createCarrera: async (carrera: Carrera, _idToken?: string): Promise<ApiResponse<Carrera>> => {
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

  // EcoDelivery Mock endpoints
  iniciarTurnoBiker: async (turno: TurnoSimple): Promise<ApiResponse<TurnoSimple>> => {
    await delay(500);
    return {
      success: true,
      data: turno,
    };
  },

  cerrarTurnoBiker: async (turno: TurnoSimple): Promise<ApiResponse<TurnoSimple>> => {
    await delay(500);
    return {
      success: true,
      data: turno,
    };
  },

  crearDelivery: async (delivery: Delivery): Promise<ApiResponse<Delivery>> => {
    await delay(500);
    return {
      success: true,
      data: delivery,
    };
  },

  obtenerDeliveriesBiker: async (): Promise<ApiResponse<Delivery[]>> => {
    await delay(500);
    const deliveries = storage.getItem<Delivery[]>('historial_deliveries') || [];
    return {
      success: true,
      data: deliveries,
    };
  },

  obtenerTurnosBiker: async (): Promise<ApiResponse<TurnoSimple[]>> => {
    await delay(500);
    const turnos = storage.getItem<TurnoSimple[]>('historial_turnos_biker') || [];
    return {
      success: true,
      data: turnos,
    };
  },
};


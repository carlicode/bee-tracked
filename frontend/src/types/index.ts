export interface Carrera {
  fecha: string;
  cliente: string;
  horaInicio: string;
  lugarRecojo: string;
  lugarDestino: string;
  horaFin: string;
  tiempo: string;
  distancia: number;
  precio: number;
  /** Si la carrera es cobrada por hora (no requiere lugar recojo, destino ni distancia) */
  porHora?: boolean;
  /** Si la carrera es a cuenta (por pagar) */
  aCuenta?: boolean;
  /** Si el pago fue por QR */
  pagoPorQR?: boolean;
  observaciones?: string;
  foto?: string;
  email?: string;
  createdAt?: string;
  rowNumber?: number;
}

export type UserType = 'beezero' | 'operador' | 'ecodelivery';

export interface User {
  email: string;
  name: string;
  driverName: string;
  userType: UserType;
}

export interface Delivery {
  id?: string;
  bikerName: string;
  fecha: string;
  cliente: string;
  lugarOrigen: string;
  lugarDestino: string;
  distancia: number;
  /** Hora de inicio de la carrera (opcional, ej: "14:30") */
  horaInicio?: string;
  /** Hora de fin de la carrera (opcional, ej: "15:45") */
  horaFin?: string;
  /** Si la carrera es cobrada por hora */
  porHora?: boolean;
  /** Notas opcionales del delivery */
  notas?: string;
  /** URL o dataUrl de foto opcional */
  foto?: string;
  email?: string;
  createdAt?: string;
  rowNumber?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Carrera del día desde hoja Registros (Ecodelivery Kilometraje) */
export interface CarreraRegistro {
  id: string;
  [key: string]: unknown;
}

/** Registro de kilometraje en hoja Kilometraje */
export interface KilometrajeRegistro {
  id: string;
  kilometraje: number;
  [key: string]: unknown;
}


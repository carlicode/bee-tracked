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
  observaciones?: string;
  email?: string;
  createdAt?: string;
  rowNumber?: number;
}

export type UserType = 'beezero' | 'ecodelivery';

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
  email?: string;
  createdAt?: string;
  rowNumber?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}


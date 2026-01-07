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

export interface User {
  email: string;
  name: string;
  driverName: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}


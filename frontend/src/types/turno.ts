export interface Turno {
  id?: string;
  abejita: string; // Nombre del driver
  aperturaCaja: number;
  cierreCaja?: number;
  qr?: number;
  auto: string; // Placa del auto
  kilometraje?: number; // Km del odómetro
  danosAuto: string;
  fotoPantalla?: string; // URL o base64
  fotoExterior?: string; // URL o base64
  horaInicio?: string; // Hora de inicio del turno (HH:MM)
  horaCierre?: string; // Hora de cierre del turno (HH:MM)
  ubicacionInicio?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  ubicacionFin?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  turnoIniciado: boolean;
  turnoCerrado: boolean;
  observaciones?: string; // Información extra al cerrar turno
  createdAt?: string;
  updatedAt?: string;
}

export interface TurnoSimple {
  id?: string;
  bikerName: string; // Nombre del biker
  horaInicio?: string; // Hora de inicio del turno (HH:MM)
  horaCierre?: string; // Hora de cierre del turno (HH:MM)
  ubicacionInicio?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  ubicacionFin?: {
    lat: number;
    lng: number;
    timestamp: string;
  };
  turnoIniciado: boolean;
  turnoCerrado: boolean;
  fotoInicio?: string; // URL en S3 (Registros_BeeTracked/Ecodelivery/)
  fotoCierre?: string;
  createdAt?: string;
  updatedAt?: string;
}

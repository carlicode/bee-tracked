export interface Turno {
  id?: string;
  abejita: string; // Nombre del driver
  aperturaCaja: number;
  cierreCaja?: number;
  qr?: number;
  auto: string; // Placa del auto
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
  createdAt?: string;
  updatedAt?: string;
}


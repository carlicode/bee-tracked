import type { UserType } from '../types';

export interface Theme {
  name: string;
  displayName: string;
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight?: string;
    black: string;
    grayDark: string;
    grayLight: string;
  };
  logo: {
    firstPart: string;
    secondPart: string;
  };
}

export const themes: Record<UserType, Theme> = {
  admin: {
    name: 'admin',
    displayName: 'Admin',
    colors: {
      primary: '#7C3AED',
      primaryDark: '#6D28D9',
      primaryLight: '#A78BFA',
      black: '#000000',
      grayDark: '#1F2937',
      grayLight: '#F9FAFB',
    },
    logo: {
      firstPart: 'bee',
      secondPart: 'admin',
    },
  },
  beezero: {
    name: 'beezero',
    displayName: 'BeeZero',
    colors: {
      primary: '#FFD700',
      primaryDark: '#FFC700',
      black: '#000000',
      grayDark: '#1F2937',
      grayLight: '#F9FAFB',
    },
    logo: {
      firstPart: 'bee',
      secondPart: 'zero',
    },
  },
  operador: {
    name: 'operador',
    displayName: 'Operadores',
    colors: {
      primary: '#64748B',
      primaryDark: '#475569',
      primaryLight: '#94A3B8',
      black: '#000000',
      grayDark: '#1F2937',
      grayLight: '#F9FAFB',
    },
    logo: {
      firstPart: 'bee',
      secondPart: 'tracked',
    },
  },
  ecodelivery: {
    name: 'ecodelivery',
    displayName: 'EcoDelivery',
    colors: {
      primary: '#10B981',
      primaryDark: '#059669',
      primaryLight: '#34D399',
      black: '#000000',
      grayDark: '#1F2937',
      grayLight: '#F9FAFB',
    },
    logo: {
      firstPart: 'eco',
      secondPart: 'delivery',
    },
  },
  rrhh: {
    name: 'rrhh',
    displayName: 'RRHH',
    colors: {
      primary: '#F97316',
      primaryDark: '#EA580C',
      primaryLight: '#FB923C',
      black: '#000000',
      grayDark: '#1F2937',
      grayLight: '#F9FAFB',
    },
    logo: {
      firstPart: 'bee',
      secondPart: 'rrhh',
    },
  },
};

export const getTheme = (userType: UserType): Theme => {
  return themes[userType];
};

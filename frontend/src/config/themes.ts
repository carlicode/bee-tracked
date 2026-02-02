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
};

export const getTheme = (userType: UserType): Theme => {
  return themes[userType];
};

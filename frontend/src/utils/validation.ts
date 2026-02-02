/**
 * Validation utilities
 */

export const validators = {
  required: (value: string | number | undefined): boolean => {
    if (typeof value === 'number') {
      return value > 0;
    }
    return !!(value && value.toString().trim());
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },

  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },

  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  phone: (value: string): boolean => {
    // Basic phone validation (adjust as needed)
    const phoneRegex = /^[0-9]{7,10}$/;
    return phoneRegex.test(value.replace(/\s+/g, ''));
  },

  positiveNumber: (value: number): boolean => {
    return value > 0;
  },
};

export type ValidationRule = {
  validator: (value: any) => boolean;
  message: string;
};

export const validateForm = <T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, ValidationRule[]>
): { isValid: boolean; errors: Partial<Record<keyof T, string>> } => {
  const errors: Partial<Record<keyof T, string>> = {};

  Object.keys(rules).forEach((key) => {
    const fieldRules = rules[key as keyof T];
    const value = data[key as keyof T];

    for (const rule of fieldRules) {
      if (!rule.validator(value)) {
        errors[key as keyof T] = rule.message;
        break;
      }
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

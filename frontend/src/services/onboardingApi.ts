import axios from 'axios';
import { storage } from './storage';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const TUTORIAL_VERSION = 5;

function authHeaders(): Record<string, string> {
  const token = storage.getToken();
  const sessionId = storage.getSessionId();
  const username = storage.getUsername();
  const headers: Record<string, string> = {};
  if (token && token !== 'demo-token') headers.Authorization = `Bearer ${token}`;
  if (sessionId) headers['X-Session-Id'] = sessionId;
  if (username) headers['X-User-Id'] = username;
  return headers;
}

export interface OnboardingStatus {
  completed: boolean;
  tutorialVersion: number | null;
  completedAt: number | null;
  currentVersion: number;
}

export interface OnboardingUserRow {
  usuario: string;
  nombre: string;
  rol: string;
  userType: string | null;
  onboarding: {
    completed: boolean;
    tutorialVersion: number;
    completedAt: number;
  } | null;
}

export const onboardingApi = {
  isEnabled(): boolean {
    return Boolean(API_BASE);
  },

  async getStatus(): Promise<OnboardingStatus> {
    if (!API_BASE) throw new Error('Backend no configurado');
    const { data } = await axios.get<{
      success: boolean;
      completed: boolean;
      tutorialVersion: number | null;
      completedAt: number | null;
      currentVersion: number;
      error?: string;
    }>(`${API_BASE}/api/onboarding/status`, {
      headers: authHeaders(),
      timeout: 10000,
    });
    if (!data.success) throw new Error(data.error || 'Error al obtener estado');
    return {
      completed: data.completed,
      tutorialVersion: data.tutorialVersion,
      completedAt: data.completedAt,
      currentVersion: data.currentVersion,
    };
  },

  async complete(userType: string): Promise<void> {
    if (!API_BASE) throw new Error('Backend no configurado');
    const { data } = await axios.post<{ success: boolean; error?: string }>(
      `${API_BASE}/api/onboarding/complete`,
      { userType },
      { headers: authHeaders(), timeout: 10000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al registrar tutorial');
  },
};

export const adminOnboardingApi = {
  async list(): Promise<OnboardingUserRow[]> {
    if (!API_BASE) throw new Error('Backend no configurado');
    const { data } = await axios.get<{ success: boolean; users: OnboardingUserRow[]; error?: string }>(
      `${API_BASE}/api/admin/onboarding`,
      { headers: authHeaders(), timeout: 20000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al listar onboarding');
    return data.users || [];
  },

  async resetUser(userId: string): Promise<void> {
    if (!API_BASE) throw new Error('Backend no configurado');
    const { data } = await axios.delete<{ success: boolean; error?: string }>(
      `${API_BASE}/api/admin/onboarding/${encodeURIComponent(userId)}`,
      { headers: authHeaders(), timeout: 10000 }
    );
    if (!data.success) throw new Error(data.error || 'Error al resetear usuario');
  },

  async resetAll(userType?: string): Promise<number> {
    if (!API_BASE) throw new Error('Backend no configurado');
    const { data } = await axios.delete<{ success: boolean; deleted?: number; error?: string }>(
      `${API_BASE}/api/admin/onboarding`,
      {
        headers: authHeaders(),
        data: userType ? { userType } : {},
        timeout: 20000,
      }
    );
    if (!data.success) throw new Error(data.error || 'Error al resetear todos');
    return data.deleted ?? 0;
  },
};

import axios, { AxiosError } from 'axios';
import { storage } from './storage';
import { fileToCompressedBase64 } from '../utils/image';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type FotoTipo =
  | 'beezero-tablero'
  | 'beezero-exterior'
  | 'beezero-carrera'
  | 'beezero-gasto'
  | 'eco-turno'
  | 'eco-delivery';

export interface PresignedUploadContext {
  turnoId?: string | number;
  momento?: 'inicio' | 'cierre';
  abejita?: string;
  userId?: string;
  username?: string;
  fecha?: string;
  num?: number;
}

export interface UploadPhotoResult {
  fileUrl: string;
  previewUrl: string;
}

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

function getErrorMessage(err: unknown): string {
  if (
    err instanceof AxiosError &&
    err.response?.data &&
    typeof err.response.data === 'object' &&
    'error' in err.response.data
  ) {
    return String((err.response.data as { error?: string }).error);
  }
  return err instanceof Error ? err.message : 'Error de conexión';
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export function isUploadApiEnabled(): boolean {
  return Boolean(API_BASE);
}

export const uploadApi = {
  isEnabled: isUploadApiEnabled,
  isUploadApiEnabled,

  async uploadPhoto(
    file: File,
    tipo: FotoTipo,
    contexto: PresignedUploadContext = {}
  ): Promise<UploadPhotoResult> {
    if (!API_BASE) {
      throw new Error('Backend no configurado (VITE_API_URL)');
    }

    const previewUrl = URL.createObjectURL(file);
    const dataUrl = await fileToCompressedBase64(file);
    const blob = await dataUrlToBlob(dataUrl);
    const ext = blob.type.includes('png') ? 'png' : 'jpg';

    const { data } = await axios.post<{
      success: boolean;
      uploadUrl?: string;
      fileUrl?: string;
      contentType?: string;
      error?: string;
    }>(
      `${API_BASE}/api/upload/presigned-url`,
      {
        tipo,
        ext,
        contexto: {
          ...contexto,
          userId: contexto.userId || storage.getUsername() || undefined,
          username: contexto.username || storage.getUsername() || undefined,
        },
      },
      { headers: authHeaders(), timeout: 15000 }
    );

    if (!data.success || !data.uploadUrl || !data.fileUrl) {
      throw new Error(data.error || 'No se pudo obtener URL de subida');
    }

    const contentType = data.contentType || (ext === 'png' ? 'image/png' : 'image/jpeg');

    const putRes = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });

    if (!putRes.ok) {
      throw new Error(`Error subiendo foto a S3 (${putRes.status})`);
    }

    return { fileUrl: data.fileUrl, previewUrl };
  },

  revokePreview(previewUrl: string | null | undefined): void {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  },

  parseError: getErrorMessage,
};

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

let userPool: CognitoUserPool | null = null;

function getPool(): CognitoUserPool | null {
  if (!USER_POOL_ID || !CLIENT_ID) return null;
  if (!userPool) {
    userPool = new CognitoUserPool({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
    });
  }
  return userPool;
}

export function isCognitoConfigured(): boolean {
  return Boolean(USER_POOL_ID && CLIENT_ID);
}

/** Decode JWT payload without verification (client-side only; backend must verify). */
function decodePayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    if (!payload) return {};
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export type CognitoUserType = 'beezero' | 'operador' | 'ecodelivery';

/**
 * Obtiene el tipo de usuario desde el idToken de Cognito (claim cognito:groups).
 * Prioridad: beezero > operador > ecodelivery. Si no hay grupos, devuelve 'ecodelivery'.
 */
export function getUserTypeFromToken(idToken: string): CognitoUserType {
  const payload = decodePayload(idToken);
  const groups = (payload['cognito:groups'] as string[] | undefined) || [];
  if (groups.includes('beezero')) return 'beezero';
  if (groups.includes('operador')) return 'operador';
  if (groups.includes('ecodelivery')) return 'ecodelivery';
  return 'ecodelivery';
}

export interface CognitoSignInResult {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  name: string;
  username: string;
  expiresIn: number;
}

export function signIn(username: string, password: string): Promise<CognitoSignInResult> {
  const pool = getPool();
  if (!pool) {
    return Promise.reject(new Error('Cognito no configurado'));
  }

  const normalized = username.trim();
  const cognitoUsername = normalized.toLowerCase();

  const cognitoUser = new CognitoUser({
    Username: cognitoUsername,
    Pool: pool,
  });

  const authDetails = new AuthenticationDetails({
    Username: cognitoUsername,
    Password: password,
  });

  cognitoUser.setAuthenticationFlowType('USER_PASSWORD_AUTH');

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session: CognitoUserSession) => {
        const idToken = session.getIdToken().getJwtToken();
        const accessToken = session.getAccessToken().getJwtToken();
        const refreshToken = session.getRefreshToken().getToken();
        const expiresIn = session.getIdToken().getExpiration();
        
        const payload = decodePayload(idToken);
        const name = (payload.name as string) || (payload['cognito:username'] as string) || normalized;
        const subUsername = (payload['cognito:username'] as string) || normalized;
        resolve({
          idToken,
          accessToken,
          refreshToken,
          name: String(name),
          username: String(subUsername),
          expiresIn,
        });
      },
      onFailure: (err: Error & { code?: string }) => {
        const message =
          err.code === 'NotAuthorizedException' || err.code === 'UserNotFoundException'
            ? 'Usuario o contraseña incorrectos'
            : err.message || 'Error al iniciar sesión';
        reject(new Error(message));
      },
    });
  });
}

/**
 * Renovar tokens usando el refresh token
 */
export function refreshSession(username: string, refreshToken: string): Promise<CognitoSignInResult> {
  const pool = getPool();
  if (!pool) {
    return Promise.reject(new Error('Cognito no configurado'));
  }

  const cognitoUser = new CognitoUser({
    Username: username.toLowerCase(),
    Pool: pool,
  });

  return new Promise((resolve, reject) => {
    cognitoUser.refreshSession(
      { getToken: () => refreshToken } as any,
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) {
          reject(err || new Error('Error al renovar sesión'));
          return;
        }

        const idToken = session.getIdToken().getJwtToken();
        const accessToken = session.getAccessToken().getJwtToken();
        const newRefreshToken = session.getRefreshToken().getToken();
        const expiresIn = session.getIdToken().getExpiration();
        
        const payload = decodePayload(idToken);
        const name = (payload.name as string) || (payload['cognito:username'] as string) || username;
        const subUsername = (payload['cognito:username'] as string) || username;

        resolve({
          idToken,
          accessToken,
          refreshToken: newRefreshToken,
          name: String(name),
          username: String(subUsername),
          expiresIn,
        });
      }
    );
  });
}

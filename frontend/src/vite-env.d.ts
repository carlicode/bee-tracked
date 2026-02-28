/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_APPS_SCRIPT_URL?: string
  readonly VITE_API_URL?: string
  readonly VITE_COGNITO_USER_POOL_ID?: string
  readonly VITE_COGNITO_CLIENT_ID?: string
  readonly VITE_COGNITO_REGION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


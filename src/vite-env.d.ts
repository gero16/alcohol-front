/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del API (ej. https://tu-api.up.railway.app). Sin barra final. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

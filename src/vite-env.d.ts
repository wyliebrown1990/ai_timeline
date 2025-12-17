/// <reference types="vite/client" />

/**
 * Vite environment type definitions
 * Provides type safety for import.meta.env variables
 */
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

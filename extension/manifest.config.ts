import { defineManifest } from '@crxjs/vite-plugin';

const PUBLIC_KEY_B64 =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1t83/FzmXKfoza9LvwfglCIM1IFARLkNNtYeU0RUAQqP5/5HsmvuOvAv2sijIKo28s5xItZ1L5AfR8czCH4nnHOZf1ZIPimZAdggFFb6d/1PuscenQ6ZqInFn0Z7yuV7yWU70M9LaF3RPc+bMPhtoymiQZhcIcxrOx0Rh3CdzqqYUqHvlKdBJ8MfQXJILh273ggc5nGBM4eOcECgY+cWe0lPc2fNtayLc6UlITdfQysWuDvfE5xDV1Wxkc2NWn50TdUV8f7Zh/mlyx5SZsfzPx6HaAa7BvkI6cETBD32P047kuxyS9fQvwoXMatKqxDlc4QhA2wdkHyeJQu1A0F0oQIDAQAB';

export default defineManifest({
  manifest_version: 3,
  name: 'AI Timeline Submit',
  description: 'One-click article submission into the AI Timeline ingestion pipeline.',
  version: '0.1.0',
  key: PUBLIC_KEY_B64,
  permissions: ['storage', 'activeTab', 'scripting'],
  host_permissions: [
    'https://nhnkwe8o6i.execute-api.us-east-1.amazonaws.com/*',
    'http://localhost:3001/*',
  ],
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Submit this article to AI Timeline',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/content.ts'],
      run_at: 'document_idle',
    },
  ],
});

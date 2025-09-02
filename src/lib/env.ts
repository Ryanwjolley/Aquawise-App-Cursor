// Central runtime environment validation & typed access.
// Only expose NEXT_PUBLIC_* to client; others server-only.

interface Env {
  PUBLIC_APP_URL: string;
  // Firebase public
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;
  // SendGrid server
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
  SENDGRID_FROM_NAME?: string;
  SENDGRID_REPLY_TO?: string;
  // Irrigation software integration (new)
  IRRIGATION_BASE_URL?: string;
  IRRIGATION_API_KEY?: string;
  IRRIGATION_TENANT?: string;
  // Admin notifications
  SUPER_ADMIN_EMAIL?: string;
  // Admin SDK
  FIREBASE_ADMIN_PROJECT_ID?: string;
  FIREBASE_ADMIN_CLIENT_EMAIL?: string;
  FIREBASE_ADMIN_PRIVATE_KEY?: string;
}

// Defer throwing until a required key is actually accessed (lazy) to not break tests importing unrelated modules.
function required(name: keyof Env): string {
  const v = process.env[name as string];
  if (!v) {
    if (process.env.JEST_WORKER_ID !== undefined) {
      // In test environment, provide a harmless placeholder
      return `test-${String(name).toLowerCase()}`;
    }
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env: Env = {
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || 'http://localhost:3000',
  NEXT_PUBLIC_FIREBASE_API_KEY: required('NEXT_PUBLIC_FIREBASE_API_KEY'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: required('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: required('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: required('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: required('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  NEXT_PUBLIC_FIREBASE_APP_ID: required('NEXT_PUBLIC_FIREBASE_APP_ID'),
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
  SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME,
  SENDGRID_REPLY_TO: process.env.SENDGRID_REPLY_TO,
  IRRIGATION_BASE_URL: process.env.IRRIGATION_BASE_URL,
  IRRIGATION_API_KEY: process.env.IRRIGATION_API_KEY,
  IRRIGATION_TENANT: process.env.IRRIGATION_TENANT,
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL,
  FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
  FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
};

// Convenience helpers
export const isProd = process.env.NODE_ENV === 'production';
export const isDev = !isProd;

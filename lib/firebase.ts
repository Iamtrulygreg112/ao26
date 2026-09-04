import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// The Firebase web config is public by design; the Firestore rules are the security.
const env = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const ENV_NAMES: Record<keyof typeof env, string> = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
};

function requireConfig(): Record<keyof typeof env, string> {
  const missing = (Object.keys(env) as Array<keyof typeof env>)
    .filter((k) => !env[k])
    .map((k) => ENV_NAMES[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase env var(s): ${missing.join(", ")}. Add them to .env.local and restart the dev server.`,
    );
  }
  return env as Record<keyof typeof env, string>;
}

// Next hot reload re-runs modules, so reuse the existing app if one is registered.
const app = getApps().length ? getApp() : initializeApp(requireConfig());

export const db = getFirestore(app);

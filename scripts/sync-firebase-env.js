#!/usr/bin/env node
/**
 * Writes VITE_FIREBASE_* vars from config/firebase/web.config.json to .env
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(root, "config", "firebase", "web.config.json");
const envPath = join(root, ".env");

const config = JSON.parse(readFileSync(configPath, "utf8"));

const lines = [
  "# Generated from config/firebase/web.config.json — lawncare-72560",
  `VITE_FIREBASE_API_KEY=${config.apiKey}`,
  `VITE_FIREBASE_AUTH_DOMAIN=${config.authDomain}`,
  `VITE_FIREBASE_PROJECT_ID=${config.projectId}`,
  `VITE_FIREBASE_STORAGE_BUCKET=${config.storageBucket}`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID=${config.messagingSenderId}`,
  `VITE_FIREBASE_APP_ID=${config.appId}`,
  `VITE_FIREBASE_MEASUREMENT_ID=${config.measurementId || ""}`,
  "",
];

writeFileSync(envPath, lines.join("\n"));
console.log(`✓ Wrote ${envPath} from config/firebase/web.config.json`);

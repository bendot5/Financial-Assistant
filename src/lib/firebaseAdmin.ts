import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? './firebase-service-account.json';

let serviceAccount: admin.ServiceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(resolve(serviceAccountPath), 'utf-8'));
} catch {
  throw new Error(
    `Could not read Firebase service account at "${serviceAccountPath}".\n` +
      'Download it from: Firebase Console → Project Settings → Service Accounts → Generate new private key\n' +
      'Then set FIREBASE_SERVICE_ACCOUNT_PATH in your .env file.',
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export { admin };

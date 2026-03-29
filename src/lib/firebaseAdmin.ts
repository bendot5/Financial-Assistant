import admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? '';
// Normalize key regardless of how it was stored (.env with quotes, Railway, etc.)
const privateKey = rawKey.replace(/\\n/g, '\n').trim();

if (!projectId || !clientEmail || !rawKey) {
  throw new Error(
    'Missing Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your .env file.\n' +
    'Values are found in Firebase Console → Project Settings → Service Accounts → Generate new private key.',
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export { admin };

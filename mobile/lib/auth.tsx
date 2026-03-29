import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { api, type Member } from './api';
import '../lib/firebase'; // ensure Firebase is initialised

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  firebaseUser: User | null;
  member: Member | null;
  isLoading: boolean;
  refreshMember: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const verifyWithBackend = async (user: User) => {
    try {
      const idToken = await user.getIdToken();
      const data = await api.post<{ member: Member }>('/auth/verify', { idToken });
      setMember(data.member);
    } catch (err) {
      console.error('[Auth] Backend verification failed:', err);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Sign out any cached phone-auth session (no longer supported)
      if (user && !user.email) {
        await firebaseSignOut(auth);
        return; // onAuthStateChanged will fire again with null
      }
      setFirebaseUser(user);
      if (user) {
        await verifyWithBackend(user);
      } else {
        setMember(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshMember = async () => {
    if (firebaseUser) await verifyWithBackend(firebaseUser);
  };

  const signOut = async () => {
    const auth = getAuth();
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, member, isLoading, refreshMember, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

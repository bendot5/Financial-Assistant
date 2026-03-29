import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import '../../lib/firebase'; // ensure Firebase is initialised

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'כתובת האימייל שהוזנה אינה תקינה',
  'auth/user-not-found': 'לא נמצא חשבון עם אימייל זה — אולי טעית? או אולי עדיין לא נרשמת?',
  'auth/wrong-password': 'הסיסמה שגויה — בדוק שוב ונסה מחדש',
  'auth/invalid-credential': 'האימייל או הסיסמה שגויים — בדוק שוב ונסה מחדש',
  'auth/email-already-in-use': 'האימייל הזה כבר רשום במערכת — לחץ על "יש לך חשבון? כניסה" כדי להתחבר',
  'auth/weak-password': 'הסיסמה קצרה מדי — יש להזין לפחות 6 תווים',
  'auth/too-many-requests': 'בוצעו יותר מדי ניסיונות כושלים — המתן מספר דקות ונסה שוב',
  'auth/network-request-failed': 'בעיית חיבור לרשת — בדוק את חיבור האינטרנט שלך',
  'auth/user-disabled': 'החשבון הזה הושבת — פנה לתמיכה',
  'auth/operation-not-allowed': 'שיטת הכניסה הזו אינה מופעלת כרגע',
  'auth/popup-closed-by-user': 'חלון הכניסה נסגר לפני השלמת הפעולה',
  'auth/cancelled-popup-request': 'בקשת הכניסה בוטלה',
};

function getErrorMessage(code: string): string {
  return FIREBASE_ERRORS[code] ?? `אירעה שגיאה בלתי צפויה — נסה שוב (${code || 'unknown'})`;
}

export default function SignInScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged in AuthProvider handles navigation
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setErrorMsg(getErrorMessage(code));
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setErrorMsg('יש למלא אימייל וסיסמה');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    const auth = getAuth();
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      }
      // onAuthStateChanged in AuthProvider handles the rest
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setErrorMsg(getErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={s.logo}>💰</Text>
      <Text style={s.title}>FinancialAssistant</Text>
      <Text style={s.subtitle}>עקוב אחר הוצאות עם משק ביתך</Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>{isRegister ? 'הרשמה' : 'כניסה'}</Text>

        <Text style={s.label}>אימייל</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={(v) => { setEmail(v); setErrorMsg(''); }}
          placeholder="example@email.com"
          placeholderTextColor="#888"
          keyboardType="email-address"
          autoCapitalize="none"
          textAlign="right"
        />

        <Text style={s.label}>סיסמה</Text>
        <View style={s.passwordRow}>
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={s.eyeBtn}>
            <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={password}
            onChangeText={(v) => { setPassword(v); setErrorMsg(''); }}
            placeholder="לפחות 6 תווים"
            placeholderTextColor="#888"
            secureTextEntry={!showPassword}
            textAlign="right"
          />
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleEmailAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>{isRegister ? 'הרשמה ←' : 'כניסה ←'}</Text>
          )}
        </TouchableOpacity>

        {!!errorMsg && <Text style={s.errorMsg}>{errorMsg}</Text>}

        <TouchableOpacity onPress={() => { setIsRegister((v) => !v); setErrorMsg(''); }} style={s.toggleBtn}>
          <Text style={s.toggleText}>
            {isRegister ? 'יש לך חשבון? כניסה' : 'אין לך חשבון? הרשמה'}
          </Text>
        </TouchableOpacity>

        <>
            <View style={s.dividerRow}>
              <View style={s.divider} />
              <Text style={s.dividerText}>או</Text>
              <View style={s.divider} />
            </View>

            <TouchableOpacity
              style={[s.googleBtn, googleLoading && s.btnDisabled]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#333" />
              ) : (
                <Text style={s.googleBtnText}>🔵 Sign in with Google</Text>
              )}
            </TouchableOpacity>
        </>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#aaa', marginBottom: 40 },
  card: { width: '100%', backgroundColor: '#16213e', borderRadius: 16, padding: 24, gap: 10 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  label: { color: '#ccc', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  input: { backgroundColor: '#0f3460', borderRadius: 10, padding: 14, fontSize: 16, color: '#fff' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },
  eyeIcon: { fontSize: 18 },
  btn: { backgroundColor: '#6c63ff', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  toggleBtn: { alignItems: 'center', paddingVertical: 4 },
  toggleText: { color: '#6c63ff', fontSize: 13 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  divider: { flex: 1, height: 1, backgroundColor: '#334' },
  dividerText: { color: '#888', fontSize: 12 },
  googleBtn: { backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center' },
  googleBtnText: { color: '#333', fontWeight: '600', fontSize: 15 },
  errorMsg: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', backgroundColor: '#2d1a1a', borderRadius: 8, padding: 10 },
});

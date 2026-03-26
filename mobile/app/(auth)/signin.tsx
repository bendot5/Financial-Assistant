import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { useAuthRequest, makeRedirectUri, ResponseType } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import '../../lib/firebase'; // ensure Firebase is initialised

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
// Google Sign-In only works in native builds (not Expo Go) because
// Google OAuth blocks exp:// redirect URIs.
const isExpoGo = Constants.appOwnership === 'expo';

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'כתובת אימייל לא תקינה',
  'auth/user-not-found': 'משתמש לא קיים',
  'auth/wrong-password': 'סיסמה שגויה',
  'auth/invalid-credential': 'אימייל או סיסמה שגויים',
  'auth/email-already-in-use': 'האימייל כבר רשום',
  'auth/weak-password': 'הסיסמה חייבת להכיל לפחות 6 תווים',
  'auth/too-many-requests': 'יותר מדי ניסיונות — נסה שוב מאוחר יותר',
  'auth/network-request-failed': 'בעיית רשת — בדוק חיבור לאינטרנט',
};

function getErrorMessage(code: string): string {
  return FIREBASE_ERRORS[code] ?? 'אירעה שגיאה — נסה שוב';
}

export default function SignInScreen() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: GOOGLE_WEB_CLIENT_ID,
      redirectUri: makeRedirectUri({ useProxy: true }),
      responseType: ResponseType.IdToken,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: false,
    },
    GOOGLE_DISCOVERY
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const auth = getAuth();
      const credential = GoogleAuthProvider.credential(id_token);
      setGoogleLoading(true);
      signInWithCredential(auth, credential).catch((err) => {
        setGoogleLoading(false);
        Alert.alert('שגיאה', getErrorMessage(err.code));
      });
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      Alert.alert('שגיאה', 'הכניסה עם Google נכשלה');
    }
  }, [response]);

  const handleEmailAuth = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('שגיאה', 'יש למלא אימייל וסיסמה');
      return;
    }
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
      Alert.alert('שגיאה', getErrorMessage(code));
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
          onChangeText={setEmail}
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
            onChangeText={setPassword}
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

        <TouchableOpacity onPress={() => setIsRegister((v) => !v)} style={s.toggleBtn}>
          <Text style={s.toggleText}>
            {isRegister ? 'יש לך חשבון? כניסה' : 'אין לך חשבון? הרשמה'}
          </Text>
        </TouchableOpacity>

        {!isExpoGo && (
          <>
            <View style={s.dividerRow}>
              <View style={s.divider} />
              <Text style={s.dividerText}>או</Text>
              <View style={s.divider} />
            </View>

            <TouchableOpacity
              style={[s.googleBtn, (!request || googleLoading) && s.btnDisabled]}
              onPress={() => promptAsync()}
              disabled={!request || googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#333" />
              ) : (
                <Text style={s.googleBtnText}>🔵 Sign in with Google</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
});

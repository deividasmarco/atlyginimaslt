import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getFirebaseAuth } from '../../src/services/firebase';

// Import auth functions from the same RN build used by firebase.ts
// to avoid loading a second Firebase auth instance.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} = require('firebase/node_modules/@firebase/auth/dist/rn/index.js') as {
  signInWithEmailAndPassword:    (auth: any, e: string, p: string) => Promise<any>;
  createUserWithEmailAndPassword:(auth: any, e: string, p: string) => Promise<any>;
  sendPasswordResetEmail:        (auth: any, e: string) => Promise<void>;
};
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { Colors } from '../../src/constants/colors';
import { Language } from '../../src/types';

type Mode = 'login' | 'register';

const FB_ERROR: Record<string, string> = {
  'auth/user-not-found':          'auth.userNotFound',
  'auth/wrong-password':          'auth.wrongPassword',
  'auth/invalid-credential':      'auth.invalidCredential',
  'auth/email-already-in-use':    'auth.emailInUse',
  'auth/weak-password':           'auth.weakPassword',
  'auth/invalid-email':           'auth.invalidEmail',
  'auth/too-many-requests':       'auth.tooManyRequests',
  'auth/network-request-failed':  'auth.networkError',
  'auth/operation-not-allowed':   'auth.operationNotAllowed',
  'auth/user-disabled':           'auth.userDisabled',
  'auth/invalid-api-key':         'auth.invalidApiKey',
  'auth/api-key-not-valid':       'auth.invalidApiKey',
  'auth/configuration-not-found': 'auth.notConfigured',
  'auth/app-not-authorized':      'auth.notConfigured',
  'auth/unauthorized-domain':     'auth.unauthorizedDomain',
};

export default function LoginScreen() {
  const { t }     = useTranslation();
  const params    = useLocalSearchParams<{ mode?: string }>();
  const { setUser, skipAuth } = useAuthStore();
  const { language, setLanguage } = useSettingsStore();

  const [mode,      setMode]      = useState<Mode>(params.mode === 'register' ? 'register' : 'login');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => { setError(''); setErrorCode(''); }, [email, password, confirm, mode]);

  function getErrorMsg(e: any): string {
    const code = e?.code ?? '';
    const key  = FB_ERROR[code];
    if (key) return t(key);
    // Show the raw code so the user can report it
    return code ? `${t('auth.error')}: ${code}` : t('auth.genericError');
  }

  async function handleSubmit() {
    if (!email.trim())  { setError(t('auth.enterEmail'));    return; }
    if (!password)       { setError(t('auth.enterPassword')); return; }
    if (mode === 'register') {
      if (password.length < 6) { setError(t('auth.weakPassword')); return; }
      if (password !== confirm)  { setError(t('auth.passwordMismatch')); return; }
    }

    setLoading(true);
    setError(''); setErrorCode('');
    try {
      const firebaseAuth = getFirebaseAuth();
      const cred = mode === 'login'
        ? await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
        : await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);

      setUser({
        id:        cred.user.uid,
        email:     cred.user.email ?? email,
        userType:  'iv',
        isPremium: false,
        language,
        createdAt: new Date(),
      });
      router.replace('/(tabs)/dashboard' as any);
    } catch (e: any) {
      const code = e?.code ?? '';
      setErrorCode(code);
      setError(getErrorMsg(e));
      console.warn('Firebase auth error:', code, e?.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError(t('auth.enterEmailReset')); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      setResetSent(true);
    } catch (e: any) {
      setError(getErrorMsg(e));
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === 'register';

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Top row: back + language */}
          <View style={s.topRow}>
            <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={Colors.blue} />
              <Text style={s.backTxt}>{t('common.back')}</Text>
            </TouchableOpacity>

            <View style={s.langToggle}>
              {(['lt', 'en'] as Language[]).map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={[s.langBtn, language === lang && s.langBtnActive]}
                  onPress={() => setLanguage(lang)}
                >
                  <Text style={[s.langTxt, language === lang && s.langTxtActive]}>
                    {lang === 'lt' ? '🇱🇹' : '🇬🇧'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={s.title}>{isRegister ? t('auth.createAccount') : t('auth.signIn')}</Text>
          <Text style={s.subtitle}>{isRegister ? t('auth.syncSubtitle') : t('auth.welcomeBack')}</Text>

          {/* Mode toggle */}
          <View style={s.modeRow}>
            {(['login', 'register'] as Mode[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[s.modeBtn, mode === m && s.modeBtnActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[s.modeTxt, mode === m && s.modeTxtActive]}>
                  {m === 'login' ? t('auth.signIn') : t('auth.register')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Success reset */}
          {resetSent && (
            <View style={s.successCard}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
              <Text style={s.successTxt}>{t('auth.resetSent', { email })}</Text>
            </View>
          )}

          {/* Error */}
          {!!error && (
            <View style={s.errorCard}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.red} />
              <View style={{ flex: 1 }}>
                <Text style={s.errorTxt}>{error}</Text>
                {!!errorCode && (
                  <Text style={[s.errorTxt, { fontSize: 11, marginTop: 2, opacity: 0.7 }]}>
                    code: {errorCode}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Form */}
          <View style={s.form}>
            <Text style={s.lbl}>{t('auth.email')}</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="vardas@example.lt"
              placeholderTextColor={Colors.text3}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />

            <Text style={s.lbl}>{t('auth.password')}</Text>
            <View style={s.passWrap}>
              <TextInput
                style={[s.input, s.passInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={isRegister ? t('auth.passwordMin') : '••••••••'}
                placeholderTextColor={Colors.text3}
                secureTextEntry={!showPass}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                editable={!loading}
              />
              <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(v => !v)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.text3} />
              </TouchableOpacity>
            </View>

            {isRegister && (
              <>
                <Text style={s.lbl}>{t('auth.confirmPassword')}</Text>
                <TextInput
                  style={s.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.text3}
                  secureTextEntry={!showPass}
                  autoComplete="new-password"
                  editable={!loading}
                />
              </>
            )}

            {!isRegister && (
              <TouchableOpacity style={s.forgotBtn} onPress={handleForgotPassword} disabled={loading}>
                <Text style={s.forgotTxt}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.submitBtnTxt}>{isRegister ? t('auth.createAccount') : t('auth.signIn')}</Text>
            }
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerTxt}>{t('common.or')}</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity
            style={s.skipBtn}
            onPress={() => { skipAuth(); router.replace('/(tabs)/dashboard' as any); }}
            disabled={loading}
          >
            <Text style={s.skipTxt}>{t('auth.continueWithout')}</Text>
          </TouchableOpacity>
          <Text style={s.skipNote}>{t('auth.localOnly')}</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 12 },

  topRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backTxt: { fontSize: 15, color: Colors.blue, fontWeight: '600' },

  langToggle:  { flexDirection: 'row', gap: 6 },
  langBtn:     { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  langBtnActive:{ backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.4)' },
  langTxt:     { fontSize: 18 },
  langTxtActive:{ },

  title:    { fontSize: 28, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.text2, marginBottom: 24, lineHeight: 20 },

  modeRow:        { flexDirection: 'row', backgroundColor: Colors.surface2, borderRadius: 14, padding: 4, marginBottom: 24, gap: 4 },
  modeBtn:        { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  modeBtnActive:  { backgroundColor: Colors.surface1, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  modeTxt:        { fontSize: 14, fontWeight: '600', color: Colors.text3 },
  modeTxtActive:  { color: Colors.text1 },

  successCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.greenDim, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(45,212,191,0.3)' },
  successTxt:  { flex: 1, fontSize: 13, color: Colors.green, lineHeight: 19 },

  errorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.redDim, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)' },
  errorTxt:  { fontSize: 13, color: Colors.red, lineHeight: 19 },

  form: { marginBottom: 4 },
  lbl:  { fontSize: 12, fontWeight: '600', color: Colors.text2, marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: Colors.surface1, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.text1, marginBottom: 16 },
  passWrap:  { position: 'relative' },
  passInput: { paddingRight: 48, marginBottom: 16 },
  eyeBtn:    { position: 'absolute', right: 14, top: 14 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 20 },
  forgotTxt: { fontSize: 13, color: Colors.blue, fontWeight: '500' },

  submitBtn:         { backgroundColor: Colors.blue, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 20, shadowColor: Colors.blue, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnTxt:      { fontSize: 16, fontWeight: '800', color: '#fff' },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerTxt:  { fontSize: 13, color: Colors.text3 },

  skipBtn:  { backgroundColor: Colors.surface1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: 10 },
  skipTxt:  { fontSize: 15, fontWeight: '600', color: Colors.text2 },
  skipNote: { fontSize: 12, color: Colors.text3, textAlign: 'center' },
});

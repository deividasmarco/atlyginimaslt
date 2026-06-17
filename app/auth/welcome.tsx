import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/authStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { Language } from '../../src/types';

export default function WelcomeScreen() {
  const { t }  = useTranslation();
  const { skipAuth } = useAuthStore();
  const { language, setLanguage } = useSettingsStore();

  const FEATURES: { icon: keyof typeof Ionicons.glyphMap; key: string }[] = [
    { icon: 'calculator-outline', key: 'welcome.feature1' },
    { icon: 'receipt-outline',    key: 'welcome.feature2' },
    { icon: 'book-outline',       key: 'welcome.feature3' },
    { icon: 'shield-checkmark-outline', key: 'welcome.feature4' },
  ];

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Background decorations */}
      <View style={s.orb1} pointerEvents="none" />
      <View style={s.orb2} pointerEvents="none" />

      <View style={s.inner}>

        {/* Language switcher */}
        <View style={s.langRow}>
          {(['lt', 'en'] as Language[]).map(lang => (
            <TouchableOpacity
              key={lang}
              style={[s.langBtn, language === lang && s.langBtnActive]}
              onPress={() => setLanguage(lang)}
            >
              <Text style={s.langFlag}>{lang === 'lt' ? '🇱🇹' : '🇬🇧'}</Text>
              <Text style={[s.langName, language === lang && s.langNameActive]}>
                {lang === 'lt' ? 'LT' : 'EN'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.logoWrap}>
            <Text style={s.logoLetter}>A</Text>
          </View>
          <Text style={s.appName}>Atlyginimas LT</Text>
          <Text style={s.tagline}>{t('welcome.tagline')}</Text>
        </View>

        {/* Features */}
        <View style={s.featureList}>
          {FEATURES.map(f => (
            <View key={f.key} style={s.featureRow}>
              <View style={s.featureIconWrap}>
                <Ionicons name={f.icon} size={18} color={Colors.blue} />
              </View>
              <Text style={s.featureText}>{t(f.key)}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.push('/auth/login?mode=register' as any)}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnTxt}>{t('auth.createAccount')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => router.push('/auth/login' as any)}
            activeOpacity={0.85}
          >
            <Text style={s.secondaryBtnTxt}>{t('auth.signIn')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.skipBtn}
            onPress={() => { skipAuth(); router.replace('/(tabs)/dashboard' as any); }}
            activeOpacity={0.7}
          >
            <Text style={s.skipTxt}>{t('auth.continueWithout')}</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.text3} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
          <Text style={s.guestNote}>⚠️ {t('auth.guestWarning')}</Text>
        </View>

        <Text style={s.legalNote}>{t('welcome.legal')}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1, paddingHorizontal: 28, paddingTop: 8, paddingBottom: 24, justifyContent: 'space-between' },

  orb1: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(79,142,247,0.07)', top: -80, right: -80 },
  orb2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(45,212,191,0.05)', bottom: 100, left: -60 },

  langRow:     { flexDirection: 'row', gap: 8, alignSelf: 'flex-end', paddingTop: 4, marginBottom: 8 },
  langBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  langBtnActive: { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.4)' },
  langFlag:    { fontSize: 16 },
  langName:    { fontSize: 12, fontWeight: '600', color: Colors.text3 },
  langNameActive: { color: Colors.blue },

  hero:       { alignItems: 'center', paddingTop: 8 },
  logoWrap:   { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: Colors.blue, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  logoLetter: { fontSize: 42, fontWeight: '900', color: '#fff', lineHeight: 50 },
  appName:    { fontSize: 31, fontWeight: '900', color: Colors.text1, letterSpacing: -0.8, marginBottom: 10 },
  tagline:    { fontSize: 15, color: Colors.text2, textAlign: 'center', lineHeight: 23 },

  featureList: { gap: 14, paddingVertical: 8 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.blueDim, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 14, color: Colors.text1, fontWeight: '500', lineHeight: 20 },

  actions: { gap: 10 },
  primaryBtn:    { backgroundColor: Colors.blue, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: Colors.blue, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  primaryBtnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  secondaryBtn:  { backgroundColor: Colors.surface1, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border2 },
  secondaryBtnTxt: { fontSize: 16, fontWeight: '600', color: Colors.text1 },
  skipBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  skipTxt:  { fontSize: 14, color: Colors.text3 },

  guestNote: { fontSize: 11, color: Colors.amber, textAlign: 'center', lineHeight: 17, marginTop: -4 },
  legalNote: { fontSize: 11, color: Colors.text3, textAlign: 'center', lineHeight: 17 },
});

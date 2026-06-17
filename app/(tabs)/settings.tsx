import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert, TextInput, Modal, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { signOutUser, getFirebaseAuth } from '../../src/services/firebase';
import { Colors } from '../../src/constants/colors';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useBusinessStore } from '../../src/stores/businessStore';
import { useAuthStore } from '../../src/stores/authStore';
import { clearAllLocalData } from '../../src/utils/clearLocalData';
import { presentCustomerCenter, hasCustomerCenter } from '../../src/services/premium/premiumService';
import { Language } from '../../src/types';
import { ExpenseMode } from '../../src/types/business';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { reauthenticateWithCredential, EmailAuthProvider, deleteUser } =
  require('firebase/node_modules/@firebase/auth/dist/rn/index.js') as {
    reauthenticateWithCredential: (user: any, cred: any) => Promise<void>;
    EmailAuthProvider: { credential: (email: string, pass: string) => any };
    deleteUser: (user: any) => Promise<void>;
  };

export default function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore();
  const bp       = useBusinessStore();
  const { isPremium, user, logout } = useAuthStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword,  setDeletePassword]  = useState('');
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [deleteError,     setDeleteError]     = useState('');

  async function handleDeleteAccount() {
    if (!deletePassword) { setDeleteError('Įveskite slaptažodį'); return; }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No user');

      const cred = EmailAuthProvider.credential(currentUser.email ?? '', deletePassword);
      await reauthenticateWithCredential(currentUser, cred);
      await deleteUser(currentUser);
      await clearAllLocalData();
      logout();
      setShowDeleteModal(false);
      router.replace('/auth/welcome' as any);
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDeleteError('Neteisingas slaptažodis');
      } else if (code === 'auth/too-many-requests') {
        setDeleteError('Per daug bandymų. Bandykite vėliau.');
      } else {
        setDeleteError('Nepavyko ištrinti paskyros. Bandykite dar kartą.');
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Atsijungti?', 'Duomenys šiame įrenginyje išliks.', [
      { text: 'Atšaukti', style: 'cancel' },
      { text: 'Atsijungti', style: 'destructive', onPress: async () => {
        try { await signOutUser(); } catch { /* Firebase not configured */ }
        logout();
        router.replace('/auth/welcome' as any);
      }},
    ]);
  }


  const USER_TYPES = [
    { key: 'employee' as const, label: t('settings.employee'), desc: t('settings.empDesc') },
    { key: 'iv'       as const, label: t('settings.iv'),       desc: t('settings.ivDesc') },
    { key: 'mb'       as const, label: t('settings.mb'),       desc: t('settings.mbDesc') },
  ];

  const NOTIF_ROWS = [
    { key: 'notifDeadlines' as const, label: t('settings.notifDeadlines'), sub: t('settings.notifDeadlinesSub') },
    { key: 'notifSodra'     as const, label: t('settings.notifSodra'),     sub: t('settings.notifSodraSub') },
    { key: 'notifPVM'       as const, label: t('settings.notifPVM'),       sub: t('settings.notifPVMSub') },
  ];

  return (
    <SafeAreaView style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <Text style={s.title}>{t('settings.title')}</Text>

        {/* Premium card */}
        {!isPremium ? (
          <TouchableOpacity style={s.premiumCard} onPress={() => router.push('/premium' as any)} activeOpacity={0.85}>
            <Text style={s.premiumStar}>✦</Text>
            <Text style={s.premiumTitle}>{t('common.premium')}</Text>
            <Text style={s.premiumDesc}>{t('settings.premiumDesc')}</Text>
            <View style={s.premiumBtn}>
              <Text style={s.premiumBtnTxt}>Žiūrėti Premium</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[s.premiumCard, { backgroundColor: 'rgba(45,212,191,0.08)', borderColor: 'rgba(45,212,191,0.2)' }]}>
            <Text style={s.premiumStar}>✓</Text>
            <Text style={[s.premiumTitle, { color: Colors.green }]}>{t('settings.premiumActive')}</Text>
            <Text style={s.premiumDesc}>{t('settings.premiumActiveDesc')}</Text>
            <TouchableOpacity
              onPress={() => { hasCustomerCenter() ? presentCustomerCenter() : router.push('/premium' as any); }}
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: Colors.text2, fontSize: 13 }}>Valdyti prenumeratą</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* User type */}
        <Text style={s.sectionLbl}>{t('settings.userType')}</Text>
        <View style={s.card}>
          {USER_TYPES.map((type, i) => (
            <TouchableOpacity
              key={type.key}
              style={[s.typeRow, i < USER_TYPES.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.border }]}
              onPress={() => settings.setUserType(type.key)}
            >
              <View style={s.typeInfo}>
                <Text style={s.typeLabel}>{type.label}</Text>
                <Text style={s.typeDesc}>{type.desc}</Text>
              </View>
              {settings.userType === type.key && <Text style={{ color: Colors.blue, fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Business profile */}
        <Text style={s.sectionLbl}>Verslo profilis</Text>
        <View style={s.card}>
          <Text style={s.fieldLbl}>Vardas, pavardė / Įmonės pavadinimas</Text>
          <TextInput
            style={s.fieldInput}
            value={bp.profile.personName ?? bp.profile.companyName ?? ''}
            onChangeText={v => bp.profile.businessType === 'MB' ? bp.setCompanyName(v) : bp.setPersonName(v)}
            placeholder="Jūsų vardas"
            placeholderTextColor={Colors.text3}
          />
          <Text style={s.fieldLbl}>Asmens / Įmonės kodas</Text>
          <TextInput
            style={s.fieldInput}
            value={bp.profile.personalCode ?? bp.profile.companyCode ?? ''}
            onChangeText={v => bp.profile.businessType === 'MB' ? bp.setCompanyCode(v) : bp.setPersonalCode(v)}
            placeholder="Asmens kodas"
            placeholderTextColor={Colors.text3}
          />
          <Text style={s.fieldLbl}>Veiklos pavadinimas</Text>
          <TextInput
            style={s.fieldInput}
            value={bp.profile.activityName ?? ''}
            onChangeText={bp.setActivityName}
            placeholder="pvz. Programavimo paslaugos"
            placeholderTextColor={Colors.text3}
          />
          <Text style={s.fieldLbl}>Adresas</Text>
          <TextInput
            style={s.fieldInput}
            value={bp.profile.address ?? ''}
            onChangeText={bp.setAddress}
            placeholder="Gatvė, miestas"
            placeholderTextColor={Colors.text3}
          />
          <Text style={s.fieldLbl}>El. paštas</Text>
          <TextInput
            style={s.fieldInput}
            value={bp.profile.email ?? ''}
            onChangeText={bp.setEmail}
            placeholder="vardas@example.lt"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={Colors.text3}
          />
          <Text style={s.fieldLbl}>Telefonas</Text>
          <TextInput
            style={s.fieldInput}
            value={bp.profile.phone ?? ''}
            onChangeText={bp.setPhone}
            placeholder="+370 6XX XXXXX"
            keyboardType="phone-pad"
            placeholderTextColor={Colors.text3}
          />
          <Text style={s.fieldLbl}>IBAN sąskaita</Text>
          <TextInput
            style={s.fieldInput}
            value={bp.profile.iban ?? ''}
            onChangeText={bp.setIban}
            placeholder="LT00 0000 0000 0000 0000"
            autoCapitalize="characters"
            placeholderTextColor={Colors.text3}
          />
        </View>

        {/* Expense mode */}
        <Text style={s.sectionLbl}>Išlaidų apskaita</Text>
        <View style={s.card}>
          <View style={s.langRow}>
            {(['FIXED_30_PERCENT', 'ACTUAL_EXPENSES'] as ExpenseMode[]).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[s.langBtn, bp.profile.expenseMode === mode && s.langBtnActive]}
                onPress={() => bp.setExpenseMode(mode)}
              >
                <Text style={[s.langBtnTxt, bp.profile.expenseMode === mode && s.langBtnTxtActive]}>
                  {mode === 'FIXED_30_PERCENT' ? '30% fiksuotos' : 'Faktinės išlaidos'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fieldHint}>
            {bp.profile.expenseMode === 'FIXED_30_PERCENT'
              ? 'Atskaitoma 30% pajamų kaip išlaidos — paprasčiau, be apskaitos'
              : 'Atskaitomos faktinės išlaidos — naudinga esant didelėms sąnaudoms'}
          </Text>
        </View>

        {/* Language */}
        <Text style={s.sectionLbl}>{t('settings.language')}</Text>
        <View style={s.card}>
          <View style={s.langRow}>
            {(['lt', 'en'] as Language[]).map(lang => (
              <TouchableOpacity
                key={lang}
                style={[s.langBtn, settings.language === lang && s.langBtnActive]}
                onPress={() => settings.setLanguage(lang)}
              >
                <Text style={[s.langBtnTxt, settings.language === lang && s.langBtnTxtActive]}>
                  {lang === 'lt' ? t('settings.ltLang') : t('settings.enLang')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <Text style={s.sectionLbl}>{t('settings.notifications')}</Text>
        <View style={s.card}>
          {NOTIF_ROWS.map((item, i, arr) => (
            <View key={item.key} style={[s.optRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
              <View style={s.optLeft}>
                <Text style={s.optLbl}>{item.label}</Text>
                <Text style={s.optSub}>{item.sub}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={v => settings.setNotif(item.key, v)}
                trackColor={{ false: 'rgba(255,255,255,0.18)', true: Colors.blueDim }}
                thumbColor={settings[item.key] ? Colors.blue : '#9CA3AF'}
              />
            </View>
          ))}
        </View>

        {/* App info */}
        <Text style={s.sectionLbl}>{t('settings.appSection')}</Text>
        <View style={s.card}>
          {[
            [t('settings.versionLabel'), '1.0.0'],
            [t('settings.dataLabel'),    t('settings.dataVal')],
            [t('settings.lastUpdate'),   t('settings.lastUpdateVal')],
          ].map(([label, value]) => (
            <View key={label} style={s.infoRow}>
              <Text style={s.infoLbl}>{label}</Text>
              <Text style={s.infoVal}>{value}</Text>
            </View>
          ))}
          {/* Privacy and Terms moved to bottom of settings */}
        </View>

        {/* Support */}
        <Text style={s.sectionLbl}>{t('settings.support')}</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={s.optRow}
            onPress={() => Linking.openURL('mailto:pagalba@atlyginimaslt.lt')}
            activeOpacity={0.7}
          >
            <View style={s.optLeft}>
              <Text style={s.optLbl}>{t('settings.contactSupport')}</Text>
              <Text style={s.optSub}>pagalba@atlyginimaslt.lt</Text>
            </View>
            <Text style={{ color: Colors.blue, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Account */}
        {user ? (
          <>
            <Text style={s.sectionLbl}>Paskyra</Text>
            <View style={s.card}>
              <View style={s.infoRow}>
                <Text style={s.infoLbl}>El. paštas</Text>
                <Text style={s.infoVal}>{user.email}</Text>
              </View>
            </View>
            <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
              <Text style={s.signOutTxt}>Atsijungti</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteAccountBtn} onPress={() => { setDeletePassword(''); setDeleteError(''); setShowDeleteModal(true); }}>
              <Text style={s.deleteAccountTxt}>Ištrinti paskyrą</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={s.signInBtn}
            onPress={() => router.push('/auth/login' as any)}
          >
            <Text style={s.signInTxt}>Prisijungti / Kurti paskyrą</Text>
          </TouchableOpacity>
        )}

        {/* Privacy & Terms links */}
        <View style={s.legalRow}>
          <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
            <Text style={s.legalLink}>{t('settings.privacy')}</Text>
          </TouchableOpacity>
          <Text style={s.legalSep}>·</Text>
          <TouchableOpacity onPress={() => router.push('/terms' as any)}>
            <Text style={s.legalLink}>{t('settings.terms')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.disclaimer}>{t('settings.disclaimer')}</Text>
      </ScrollView>

      {/* Delete account modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={d.overlay}>
          <View style={d.sheet}>
            <Text style={d.title}>Ištrinti paskyrą</Text>
            <Text style={d.sub}>
              Šis veiksmas negrįžtamas. Visi jūsų duomenys bus ištrinti.{'\n'}
              Įveskite slaptažodį patvirtinimui.
            </Text>
            {!!deleteError && <Text style={d.err}>{deleteError}</Text>}
            <TextInput
              style={d.input}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Slaptažodis"
              placeholderTextColor={Colors.text3}
              secureTextEntry
              editable={!deleteLoading}
            />
            <TouchableOpacity
              style={[d.deleteBtn, deleteLoading && { opacity: 0.6 }]}
              onPress={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={d.deleteBtnTxt}>Ištrinti paskyrą</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={d.cancelBtn} onPress={() => setShowDeleteModal(false)} disabled={deleteLoading}>
              <Text style={d.cancelTxt}>Atšaukti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  title:   { fontSize: 24, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5, marginBottom: 20 },
  sectionLbl: { fontSize: 11, fontWeight: '600', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 6 },
  card: { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  premiumCard: { backgroundColor: '#16102a', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', alignItems: 'center' },
  premiumStar:   { fontSize: 28, marginBottom: 8 },
  premiumTitle:  { fontSize: 20, fontWeight: '800', color: Colors.purple, marginBottom: 8 },
  premiumDesc:   { fontSize: 13, color: 'rgba(167,139,250,0.7)', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  premiumBtn:    { width: '100%', padding: 14, borderRadius: 14, backgroundColor: Colors.purple, alignItems: 'center', marginBottom: 10 },
  premiumBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
  typeRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  typeInfo:  { flex: 1 },
  typeLabel: { fontSize: 15, fontWeight: '600', color: Colors.text1 },
  typeDesc:  { fontSize: 12, color: Colors.text3, marginTop: 2 },
  langRow:        { flexDirection: 'row', gap: 10 },
  langBtn:        { flex: 1, padding: 12, borderRadius: 12, backgroundColor: Colors.surface2, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  langBtnActive:  { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.3)' },
  langBtnTxt:     { fontSize: 14, fontWeight: '600', color: Colors.text3 },
  langBtnTxtActive: { color: Colors.blue },
  optRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  optLeft: { flex: 1, marginRight: 12 },
  optLbl:  { fontSize: 14, color: Colors.text1, fontWeight: '500' },
  optSub:  { fontSize: 11, color: Colors.text3, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLbl: { fontSize: 13, color: Colors.text2 },
  infoVal: { fontSize: 13, fontWeight: '600', color: Colors.text1 },
  disclaimer: { fontSize: 11, color: Colors.text3, textAlign: 'center', lineHeight: 18, marginTop: 8 },
  fieldLbl:   { fontSize: 11, color: Colors.text3, marginBottom: 6, fontWeight: '500', marginTop: 4 },
  fieldInput: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 14, color: Colors.text1, marginBottom: 8 },
  fieldHint:  { fontSize: 11, color: Colors.text3, marginTop: 8, lineHeight: 16 },
  deleteAccountBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  deleteAccountTxt: { fontSize: 13, color: Colors.red, textDecorationLine: 'underline' },
  legalRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  legalLink: { fontSize: 12, color: Colors.blue },
  legalSep:  { fontSize: 12, color: Colors.text3 },
  signOutBtn: { backgroundColor: Colors.redDim, borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)' },
  signOutTxt: { fontSize: 15, fontWeight: '700', color: Colors.red },
  signInBtn:  { backgroundColor: Colors.blueDim, borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(79,142,247,0.25)' },
  signInTxt:  { fontSize: 15, fontWeight: '700', color: Colors.blue },
});

const d = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  sheet:     { backgroundColor: Colors.surface1, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border2 },
  title:     { fontSize: 20, fontWeight: '800', color: Colors.red, marginBottom: 12 },
  sub:       { fontSize: 13, color: Colors.text2, lineHeight: 20, marginBottom: 16 },
  err:       { fontSize: 13, color: Colors.red, marginBottom: 10 },
  input:     { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text1, marginBottom: 14 },
  deleteBtn: { backgroundColor: Colors.red, borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 10 },
  deleteBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn: { alignItems: 'center', padding: 10 },
  cancelTxt: { color: Colors.text2, fontSize: 14 },
});

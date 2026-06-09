import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useAuthStore } from '../src/stores/authStore';
import {
  isPurchasesAvailable, getPremiumOffer, purchasePremium, restorePremium,
  presentNativePaywall, checkEntitlement, PlanType,
} from '../src/services/premium/premiumService';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'receipt-outline',     text: 'Neribotos sąskaitos faktūros' },
  { icon: 'people-outline',      text: 'Klientų istorija ir filtrai' },
  { icon: 'home-outline',        text: 'Būsto paskolos pajamų vertinimas' },
  { icon: 'document-text-outline', text: 'Oficialus pajamų–išlaidų žurnalas (PDF)' },
  { icon: 'bar-chart-outline',   text: 'Ataskaita bankui ir VMI suvestinė' },
  { icon: 'camera-outline',      text: 'Išlaidų sąskaitų nuskaitymas' },
  { icon: 'cloud-upload-outline', text: 'Duomenų sinchronizacija debesyje' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { setPremium, isPremium } = useAuthStore();

  const available = isPurchasesAvailable();
  const [plan, setPlan]       = useState<PlanType>('yearly');
  const [loading, setLoading] = useState(false);
  const [monthlyPrice,  setMonthlyPrice]  = useState('2,99 €');
  const [yearlyPrice,   setYearlyPrice]   = useState('24,99 €');
  const [lifetimePrice, setLifetimePrice] = useState('59,99 €');

  useEffect(() => {
    if (!available) return;
    getPremiumOffer().then(o => {
      if (o.monthlyPriceString)  setMonthlyPrice(o.monthlyPriceString);
      if (o.yearlyPriceString)   setYearlyPrice(o.yearlyPriceString);
      if (o.lifetimePriceString) setLifetimePrice(o.lifetimePriceString);
    });
  }, [available]);

  const planLabel = (p: PlanType) => p === 'yearly' ? 'annual' : p === 'lifetime' ? 'lifetime' : 'monthly';

  async function handleContinue() {
    if (!available) {
      // Expo Go / no native module — dev test unlock so features can be tested
      Alert.alert(
        'Bandomasis režimas',
        'Tikri pirkimai veikia tik įdiegtoje programėlėje (ne Expo Go). Įjungti Premium testavimui?',
        [
          { text: 'Atšaukti', style: 'cancel' },
          { text: 'Įjungti (test)', onPress: () => { setPremium(true, planLabel(plan)); router.back(); } },
        ],
      );
      return;
    }
    setLoading(true);
    try {
      // Prefer the RevenueCat-hosted paywall (dashboard-designed) when available;
      // fall back to direct package purchase otherwise.
      const native = await presentNativePaywall();
      let ok: boolean;
      if (native === true) {
        ok = true;
      } else if (native === false) {
        ok = await checkEntitlement(); // user cancelled native paywall
      } else {
        ok = await purchasePremium(plan); // native paywall not available
      }
      if (ok) {
        setPremium(true, planLabel(plan));
        Alert.alert('Sėkmingai!', 'Premium aktyvuotas. Ačiū!');
        router.back();
      }
    } catch (e: any) {
      if (e?.userCancelled || e?.code === '1' || /cancel/i.test(e?.message ?? '')) {
        // user cancelled — silent
      } else {
        Alert.alert('Klaida', 'Nepavyko įvykdyti pirkimo. Bandykite dar kartą.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    if (!available) {
      Alert.alert('Nepasiekiama', 'Pirkimų atkūrimas veikia tik įdiegtoje programėlėje.');
      return;
    }
    setLoading(true);
    try {
      const ok = await restorePremium();
      if (ok) {
        setPremium(true);
        Alert.alert('Atkurta!', 'Jūsų Premium prenumerata atkurta.');
        router.back();
      } else {
        Alert.alert('Nerasta', 'Aktyvios prenumeratos nerasta.');
      }
    } catch {
      Alert.alert('Klaida', 'Nepavyko atkurti pirkimų.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.text2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.crown}><Text style={{ fontSize: 30 }}>✦</Text></View>
          <Text style={s.title}>Atlyginimas LT Premium</Text>
          <Text style={s.subtitle}>Visos funkcijos vienoje vietoje</Text>
        </View>

        {isPremium && (
          <View style={s.activeCard}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
            <Text style={s.activeTxt}>Premium jau aktyvus</Text>
          </View>
        )}

        {/* Features */}
        <View style={s.featureList}>
          {FEATURES.map(f => (
            <View key={f.text} style={s.featureRow}>
              <View style={s.featureIcon}><Ionicons name={f.icon} size={18} color={Colors.blue} /></View>
              <Text style={s.featureTxt}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={s.plans}>
          <TouchableOpacity
            style={[s.planCard, plan === 'yearly' && s.planCardOn]}
            onPress={() => setPlan('yearly')}
          >
            <View style={s.planTop}>
              <Text style={[s.planName, plan === 'yearly' && { color: Colors.blue }]}>Metinis</Text>
              <View style={s.saveBadge}><Text style={s.saveBadgeTxt}>−30%</Text></View>
            </View>
            <Text style={s.planPrice}>{yearlyPrice}<Text style={s.planPer}>/metus</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.planCard, plan === 'monthly' && s.planCardOn]}
            onPress={() => setPlan('monthly')}
          >
            <View style={s.planTop}>
              <Text style={[s.planName, plan === 'monthly' && { color: Colors.blue }]}>Mėnesinis</Text>
            </View>
            <Text style={s.planPrice}>{monthlyPrice}<Text style={s.planPer}>/mėn.</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.planCard, plan === 'lifetime' && s.planCardOn]}
            onPress={() => setPlan('lifetime')}
          >
            <View style={s.planTop}>
              <Text style={[s.planName, plan === 'lifetime' && { color: Colors.blue }]}>Visam laikui</Text>
              <View style={[s.saveBadge, { backgroundColor: Colors.purple }]}><Text style={[s.saveBadgeTxt, { color: '#fff' }]}>Vienkartinis</Text></View>
            </View>
            <Text style={s.planPrice}>{lifetimePrice}<Text style={s.planPer}> vienkart.</Text></Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity style={[s.cta, loading && { opacity: 0.6 }]} onPress={handleContinue} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaTxt}>Tęsti</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.restoreBtn} onPress={handleRestore} disabled={loading}>
          <Text style={s.restoreTxt}>Atkurti pirkimus</Text>
        </TouchableOpacity>

        {!available && (
          <Text style={s.devNote}>
            ⓘ Tikri pirkimai aktyvuojami įdiegtoje programėlėje (App Store / Google Play).
            Expo Go režime galima įjungti Premium testavimui.
          </Text>
        )}

        <Text style={s.legal}>
          Metinė ir mėnesinė prenumerata atsinaujina automatiškai pasibaigus laikotarpiui,
          nebent ją atšaukiate likus bent 24 val. iki termino pabaigos. Mokestis nuskaitomas
          iš jūsų App Store arba Google Play paskyros. Prenumeratą galite valdyti ar atšaukti
          bet kada paskyros nustatymuose. „Visam laikui" – vienkartinis mokėjimas, neatsinaujina.
        </Text>

        <View style={s.legalLinks}>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={s.legalLink}>Naudojimo sąlygos</Text>
          </TouchableOpacity>
          <Text style={s.legalDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={s.legalLink}>Privatumo politika</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 8 },
  closeBtn:{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content:{ padding: 24, paddingTop: 8, paddingBottom: 40 },

  hero:    { alignItems: 'center', marginBottom: 24 },
  crown:   { width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.purpleDim, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title:   { fontSize: 24, fontWeight: '800', color: Colors.text1, marginBottom: 6, textAlign: 'center' },
  subtitle:{ fontSize: 14, color: Colors.text2 },

  activeCard:{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.greenDim, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(45,212,191,0.3)' },
  activeTxt: { color: Colors.green, fontWeight: '700', fontSize: 14 },

  featureList:{ marginBottom: 24, gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon:{ width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.blueDim, alignItems: 'center', justifyContent: 'center' },
  featureTxt: { flex: 1, fontSize: 14, color: Colors.text1, fontWeight: '500' },

  plans:    { gap: 10, marginBottom: 20 },
  planCard: { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: Colors.border },
  planCardOn:{ borderColor: Colors.blue, backgroundColor: Colors.blueDim },
  planTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  planName: { fontSize: 15, fontWeight: '700', color: Colors.text1 },
  saveBadge:{ backgroundColor: Colors.green, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  saveBadgeTxt:{ color: '#06281f', fontSize: 11, fontWeight: '800' },
  planPrice:{ fontSize: 24, fontWeight: '900', color: Colors.text1 },
  planPer:  { fontSize: 14, fontWeight: '500', color: Colors.text3 },

  cta:     { backgroundColor: Colors.blue, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 10, shadowColor: Colors.blue, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  ctaTxt:  { color: '#fff', fontWeight: '800', fontSize: 16 },
  restoreBtn:{ alignItems: 'center', padding: 12, marginBottom: 12 },
  restoreTxt:{ color: Colors.blue, fontSize: 14, fontWeight: '600' },

  devNote: { fontSize: 12, color: Colors.amber, textAlign: 'center', lineHeight: 18, marginBottom: 14, backgroundColor: Colors.amberDim, borderRadius: 10, padding: 12 },
  legal:   { fontSize: 11, color: Colors.text3, textAlign: 'center', lineHeight: 17 },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12 },
  legalLink:  { fontSize: 12, color: Colors.blue, fontWeight: '600' },
  legalDot:   { fontSize: 12, color: Colors.text3 },
});

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useAuthStore } from '../src/stores/authStore';
import { useSettingsStore } from '../src/stores/settingsStore';

const EULA_URL    = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://atlyginimaslt.lt/privatumas.html';
import {
  isPurchasesAvailable, getPremiumOffer, purchasePremium, restorePremium,
  PlanType, PremiumOffer,
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
  const { language } = useSettingsStore();
  const isEN = language === 'en';

  const available = isPurchasesAvailable();
  const [plan, setPlan]       = useState<PlanType>('yearly');
  const [loading, setLoading] = useState(false);
  const [offer, setOffer]     = useState<PremiumOffer | null>(null);

  useEffect(() => {
    if (!available) return;
    getPremiumOffer().then(o => {
      setOffer(o);
      // default to the first available plan, preferring yearly
      if (o.yearly)        setPlan('yearly');
      else if (o.monthly)  setPlan('monthly');
      else if (o.lifetime) setPlan('lifetime');
    });
  }, [available]);

  // In Expo Go (no native module) we can't fetch real prices — show
  // placeholders for dev testing only. The App Store build always uses live prices.
  const FALLBACK: Record<PlanType, string> = { monthly: '2,99 €', yearly: '24,99 €', lifetime: '59,99 €' };
  const planInfo = (p: PlanType) => p === 'yearly' ? offer?.yearly : p === 'lifetime' ? offer?.lifetime : offer?.monthly;
  const priceStr = (p: PlanType): string | null => available ? (planInfo(p)?.priceString ?? null) : FALLBACK[p];
  const showCard = (p: PlanType): boolean => available ? !!planInfo(p) : true;

  // Discount badge computed from real prices, never hardcoded.
  const discountPct = (() => {
    const m = available ? offer?.monthly?.price : 2.99;
    const y = available ? offer?.yearly?.price  : 24.99;
    if (!m || !y) return 0;
    const pct = Math.round((1 - y / (m * 12)) * 100);
    return pct > 0 ? pct : 0;
  })();

  const PLAN_DEFS: { key: PlanType; name: string; per: string }[] = [
    { key: 'yearly',   name: isEN ? 'Annual'   : 'Metinis',      per: isEN ? '/year' : '/metus' },
    { key: 'monthly',  name: isEN ? 'Monthly'  : 'Mėnesinis',    per: isEN ? '/mo'   : '/mėn.' },
    { key: 'lifetime', name: isEN ? 'Lifetime' : 'Visam laikui', per: isEN ? ' once' : ' vienkart.' },
  ];

  const offerLoading = available && offer === null;

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
      // Purchase the selected package directly so every plan (including the
      // non-subscription Lifetime) is reachable and prices stay live.
      const ok = await purchasePremium(plan);
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
        {offerLoading ? (
          <View style={s.plansLoading}>
            <ActivityIndicator color={Colors.blue} />
            <Text style={s.plansLoadingTxt}>{isEN ? 'Loading prices…' : 'Kraunamos kainos…'}</Text>
          </View>
        ) : (
          <View style={s.plans}>
            {PLAN_DEFS.filter(d => showCard(d.key)).map(d => {
              const ps = priceStr(d.key);
              const on = plan === d.key;
              return (
                <TouchableOpacity
                  key={d.key}
                  style={[s.planCard, on && s.planCardOn]}
                  onPress={() => setPlan(d.key)}
                >
                  <View style={s.planTop}>
                    <Text style={[s.planName, on && { color: Colors.blue }]}>{d.name}</Text>
                    {d.key === 'yearly' && discountPct > 0 && (
                      <View style={s.saveBadge}><Text style={s.saveBadgeTxt}>−{discountPct}%</Text></View>
                    )}
                    {d.key === 'lifetime' && (
                      <View style={[s.saveBadge, { backgroundColor: Colors.purple }]}>
                        <Text style={[s.saveBadgeTxt, { color: '#fff' }]}>{isEN ? 'One-time' : 'Vienkartinis'}</Text>
                      </View>
                    )}
                  </View>
                  {ps
                    ? <Text style={s.planPrice}>{ps}<Text style={s.planPer}>{d.per}</Text></Text>
                    : <ActivityIndicator color={Colors.blue} style={{ alignSelf: 'flex-start', marginTop: 4 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* CTA */}
        {(() => {
          const ctaDisabled = loading || offerLoading || (available && !showCard(plan));
          return (
            <TouchableOpacity style={[s.cta, ctaDisabled && { opacity: 0.6 }]} onPress={handleContinue} disabled={ctaDisabled}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaTxt}>{isEN ? 'Continue' : 'Tęsti'}</Text>}
            </TouchableOpacity>
          );
        })()}

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
          {isEN
            ? 'Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Payment is charged to your Apple ID account. You can manage or cancel your subscription in your device settings. “Lifetime” is a one-time purchase and does not renew.'
            : 'Prenumerata atsinaujina automatiškai, jei neatšaukiama likus bent 24 val. iki esamo laikotarpio pabaigos. Mokestis nuskaitomas iš „Apple ID" paskyros. Prenumeratą galite valdyti ar atšaukti įrenginio nustatymuose. „Visam laikui" yra vienkartinis pirkimas, neatsinaujina.'}
        </Text>

        <View style={s.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL(EULA_URL)}>
            <Text style={s.legalLink}>{isEN ? 'Terms of Use' : 'Naudojimo sąlygos'}</Text>
          </TouchableOpacity>
          <Text style={s.legalDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={s.legalLink}>{isEN ? 'Privacy Policy' : 'Privatumo politika'}</Text>
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
  plansLoading:    { alignItems: 'center', justifyContent: 'center', paddingVertical: 28, marginBottom: 20, gap: 10 },
  plansLoadingTxt: { fontSize: 13, color: Colors.text3 },
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
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 },
  legalLink:  { fontSize: 13, color: Colors.blue, fontWeight: '600', textDecorationLine: 'underline' },
  legalDot:   { fontSize: 13, color: Colors.text3 },
});

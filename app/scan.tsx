import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../src/constants/colors';
import {
  pickInvoiceDocument, extractInvoiceData,
  InvoiceData,
} from '../src/services/invoice.service';
import { useJournalStore } from '../src/stores/journalStore';
import { useAuthStore } from '../src/stores/authStore';
import { JournalCategory, EXPENSE_CATEGORIES, CATEGORY_ICONS } from '../src/types';

type Step = 'pick' | 'loading' | 'review';

export default function ScanScreen() {
  const router           = useRouter();
  const { t }            = useTranslation();
  const { addEntry }     = useJournalStore();
  const { isPremium }    = useAuthStore();

  const [step, setStep]               = useState<Step>('pick');
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);

  // Review form
  const [supplier, setSupplier]   = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate]           = useState('');
  const [total, setTotal]         = useState('');
  const [vat, setVat]             = useState('');
  const [category, setCategory]   = useState<JournalCategory>('other_expense');

  function populate(data: InvoiceData) {
    setSupplier(data.supplierName  ?? '');
    setInvoiceNo(data.invoiceNumber ?? '');
    setDate(data.invoiceDate        ?? '');
    setTotal(data.totalAmount != null ? String(data.totalAmount) : '');
    setVat(data.vatAmount     != null ? String(data.vatAmount)   : '');
    const cat = data.category as JournalCategory;
    if (EXPENSE_CATEGORIES.includes(cat)) setCategory(cat);
  }

  async function handleCamera() {
    setStep('loading');
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') { setStep('pick'); return; }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.55,   // lower quality = smaller base64, faster API + fewer timeouts
        base64: true,
        exif: false,
      });
      if (result.canceled || !result.assets[0]?.base64) { setStep('pick'); return; }

      const data = await extractInvoiceData(result.assets[0].base64, 'image');
      populate(data);
      setInvoiceData(data);
      setStep('review');
    } catch {
      setStep('pick');
      Alert.alert(t('common.error'), t('scan.errorPhoto'));
    }
  }

  async function handleDocument() {
    setStep('loading');
    try {
      const base64 = await pickInvoiceDocument();
      if (!base64) { setStep('pick'); return; }
      const data = await extractInvoiceData(base64, 'pdf');
      populate(data);
      setInvoiceData(data);
      setStep('review');
    } catch {
      setStep('pick');
      Alert.alert(t('common.error'), t('scan.errorDoc'));
    }
  }

  async function handleSave() {
    const num = parseFloat(total.replace(',', '.'));
    if (!num || num <= 0) {
      Alert.alert(t('common.error'), t('scan.errorAmount'));
      return;
    }
    // Use today if no date extracted or date is more than 2 years old
    // (old invoice dates cause entries to appear in the wrong month)
    const parsedDate = date ? new Date(date) : null;
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const entryDate = (parsedDate && !isNaN(parsedDate.getTime()) && parsedDate > twoYearsAgo)
      ? parsedDate
      : now;

    const ok = await addEntry({
      userId: '',
      type: 'expense',
      amount: num,
      category,
      description: supplier || 'Nuskaitytas dokumentas',
      date: entryDate,
      isDeductible: true,
      source: 'scan',
      supplierName: supplier || undefined,
      invoiceNumber: invoiceNo || undefined,
      vatAmount: parseFloat(vat.replace(',', '.')) || undefined,
      confidence: invoiceData?.confidence,
    }, isPremium);

    if (ok) {
      router.back();
    } else {
      Alert.alert(t('common.error'), t('scan.errorSave'));
    }
  }

  // ── Step: pick ──────────────────────────────────────────────
  if (step === 'pick') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('scan.title')}</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.pickBody}>
          <Text style={s.pickHint}>{t('scan.pickSource')}</Text>

          <TouchableOpacity style={s.bigBtn} onPress={handleCamera}>
            <Text style={s.bigBtnIcon}>📷</Text>
            <Text style={s.bigBtnLabel}>{t('scan.takePhoto')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.bigBtn, { backgroundColor: Colors.surface2 }]} onPress={handleDocument}>
            <Text style={s.bigBtnIcon}>📁</Text>
            <Text style={s.bigBtnLabel}>{t('scan.uploadPDF')}</Text>
          </TouchableOpacity>

          <Text style={s.formatHint}>{t('scan.formats')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step: loading ───────────────────────────────────────────
  if (step === 'loading') {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.loadingBody}>
          <ActivityIndicator size="large" color={Colors.blue} />
          <Text style={s.loadingText}>{t('scan.analyzing')}</Text>
          <Text style={s.loadingNote}>{t('scan.analyzingNote')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step: review ────────────────────────────────────────────
  const confidence     = invoiceData?.confidence ?? 0;
  const highConfidence = confidence >= 0.85;
  const amountMissing  = !total || parseFloat(total.replace(',', '.')) <= 0;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => setStep('pick')}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('scan.review')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.reviewContent} keyboardShouldPersistTaps="handled">

        {/* Confidence badge */}
        <View style={[s.confidenceBadge, { backgroundColor: highConfidence ? Colors.greenDim : Colors.amberDim }]}>
          <Text style={[s.confidenceTxt, { color: highConfidence ? Colors.green : Colors.amber }]}>
            {highConfidence ? t('scan.highConfidence') : t('scan.checkManually')}
          </Text>
        </View>

        {/* Prominent banner when amount not found */}
        {amountMissing && (
          <View style={s.amountMissingCard}>
            <Text style={s.amountMissingTitle}>⚠️ Suma nerasta automatiškai</Text>
            <Text style={s.amountMissingText}>
              Nurodykite sumą rankiniu būdu žemiau esančiame lauke. Kiti laukai gali būti atnaujinti.
            </Text>
          </View>
        )}

        <Text style={s.lbl}>{t('scan.supplier')}</Text>
        <TextInput style={s.input} value={supplier} onChangeText={setSupplier} placeholderTextColor={Colors.text3} />

        <Text style={s.lbl}>{t('scan.invoiceNo')}</Text>
        <TextInput style={s.input} value={invoiceNo} onChangeText={setInvoiceNo} placeholder="SF-001" placeholderTextColor={Colors.text3} />

        <Text style={s.lbl}>{t('scan.invoiceDate')}</Text>
        <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="2026-01-01" placeholderTextColor={Colors.text3} />

        <Text style={[s.lbl, amountMissing && { color: Colors.amber }]}>
          {t('scan.totalAmount')} {amountMissing ? '(privalomas)' : ''}
        </Text>
        <TextInput
          style={[s.input, amountMissing && { borderColor: Colors.amber, borderWidth: 2 }]}
          value={total}
          onChangeText={setTotal}
          keyboardType="decimal-pad"
          placeholder="Įveskite sumą €"
          placeholderTextColor={Colors.amber}
          autoFocus={amountMissing}
        />

        <Text style={s.lbl}>{t('scan.vatAmount')}</Text>
        <TextInput style={s.input} value={vat} onChangeText={setVat} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.text3} />

        <Text style={s.lbl}>Kategorija</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {EXPENSE_CATEGORIES.map(c => (
              <TouchableOpacity key={c} style={[s.chip, category === c && s.chipActive]} onPress={() => setCategory(c)}>
                <Text style={s.chipIcon}>{CATEGORY_ICONS[c]}</Text>
                <Text style={[s.chipTxt, category === c && { color: Colors.blue }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnTxt}>{t('scan.saveAsExpense')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.manualBtn} onPress={() => router.back()}>
          <Text style={s.manualBtnTxt}>{t('scan.enterManually')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backTxt:     { fontSize: 22, color: Colors.text1, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text1 },

  pickBody: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  pickHint: { fontSize: 14, color: Colors.text2, textAlign: 'center', marginBottom: 8 },
  bigBtn:   {
    backgroundColor: Colors.surface1, borderRadius: 20, padding: 28,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  bigBtnIcon:  { fontSize: 40, marginBottom: 12 },
  bigBtnLabel: { fontSize: 16, fontWeight: '700', color: Colors.text1 },
  formatHint:  { fontSize: 12, color: Colors.text3, textAlign: 'center', marginTop: 8 },

  loadingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 18, fontWeight: '700', color: Colors.text1 },
  loadingNote: { fontSize: 13, color: Colors.text2 },

  reviewContent: { padding: 20, paddingBottom: 40 },

  amountMissingCard: { backgroundColor: Colors.amberDim, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' },
  amountMissingTitle:{ fontSize: 14, fontWeight: '700', color: Colors.amber, marginBottom: 4 },
  amountMissingText: { fontSize: 12, color: Colors.amber, lineHeight: 18 },
  confidenceBadge: { borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 20 },
  confidenceTxt:   { fontSize: 14, fontWeight: '700' },

  lbl:   { fontSize: 11, color: Colors.text3, marginBottom: 6, fontWeight: '500' },
  input: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 13, fontSize: 15, color: Colors.text1, marginBottom: 14,
  },

  chip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.3)' },
  chipIcon:   { fontSize: 14 },
  chipTxt:    { fontSize: 12, color: Colors.text2 },

  saveBtn:    { backgroundColor: Colors.blue, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12 },
  saveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  manualBtn:  { alignItems: 'center', padding: 12 },
  manualBtnTxt: { color: Colors.text2, fontSize: 14 },
});

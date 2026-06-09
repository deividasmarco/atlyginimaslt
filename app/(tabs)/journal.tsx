import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../src/constants/colors';
import { useJournalStore } from '../../src/stores/journalStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useFormatting } from '../../src/hooks/useFormatting';
import {
  JournalEntry, JournalCategory, JournalEntryType,
  INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_ICONS,
} from '../../src/types';

const CAT_LT: Record<string, string> = {
  salary: 'Atlyginimas', freelance: 'Freelance', rental: 'Nuoma',
  dividends: 'Dividendai', other_income: 'Kitos pajamos',
  office: 'Biuro išlaidos', transport: 'Transportas', food: 'Maistas',
  software: 'Programinė įranga', equipment: 'Įranga', phone: 'Telefonas',
  training: 'Mokymai', utilities: 'Komunalinės', housing: 'Būstas',
  entertainment: 'Pramogos', health: 'Sveikata', other_expense: 'Kitos išlaidos',
};

const MONTH_NAMES = [
  '', 'Sausis','Vasaris','Kovas','Balandis','Gegužė','Birželis',
  'Liepa','Rugpjūtis','Rugsėjis','Spalis','Lapkritis','Gruodis',
];

export default function JournalScreen() {
  const router = useRouter();
  const { t }  = useTranslation();
  const params = useLocalSearchParams<{ openModal?: string }>();
  const { isPremium } = useAuthStore();
  const { formatEur, formatDate } = useFormatting();
  const {
    loadEntries, getMonthEntries, getMonthSummary,
    addEntry, deleteEntry, canAddEntry,
    selectedYear, selectedMonth, setMonth,
  } = useJournalStore();

  const [showModal, setShowModal] = useState(false);

  useEffect(() => { loadEntries(); }, []);
  useEffect(() => {
    if (params.openModal === 'true') setShowModal(true);
  }, [params.openModal]);

  const entries = getMonthEntries(selectedYear, selectedMonth);
  const summary = getMonthSummary(selectedYear, selectedMonth);
  const income  = entries.filter(e => e.type === 'income');
  const expense = entries.filter(e => e.type === 'expense');

  function changeMonth(dir: -1 | 1) {
    let m = selectedMonth + dir;
    let y = selectedYear;
    if (m < 1)  { m = 12; y--; }
    if (m > 12) { m = 1;  y++; }
    setMonth(y, m);
  }

  async function handleDelete(id: string) {
    Alert.alert(t('journal.deleteTitle'), t('journal.deleteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deleteEntry(id) },
    ]);
  }

  function handleAddPress() {
    if (!canAddEntry(isPremium)) {
      Alert.alert(t('journal.limitTitle'), t('journal.limitMsg'), [
        { text: t('common.notNow'), style: 'cancel' },
        { text: 'Žiūrėti Premium', onPress: () => router.push('/premium' as any) },
      ]);
      return;
    }
    setShowModal(true);
  }

  function handleScanPress() {
    if (!isPremium) {
      Alert.alert(t('journal.premiumScanTitle'), t('journal.premiumScanMsg'), [
        { text: t('common.notNow'), style: 'cancel' },
        { text: t('journal.viewPremium'), onPress: () => router.push('/(tabs)/settings') },
      ]);
      return;
    }
    router.push('/scan' as any);
  }

  const balancePct = summary.totalIncome > 0
    ? Math.min(1, Math.max(0, summary.balance / summary.totalIncome))
    : 0;

  return (
    <SafeAreaView style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>{t('journal.title')}</Text>
            <Text style={s.subtitle}>{t('journal.subtitle')}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: Colors.purpleDim }]}>
            <Text style={[s.badgeText, { color: Colors.purple }]}>Premium</Text>
          </View>
        </View>

        {/* Month nav */}
        <View style={s.monthNav}>
          <TouchableOpacity style={s.navBtn} onPress={() => changeMonth(-1)}>
            <Text style={s.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{selectedYear} m. {MONTH_NAMES[selectedMonth]}</Text>
          <TouchableOpacity style={s.navBtn} onPress={() => changeMonth(1)}>
            <Text style={s.navBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={s.summaryRow}>
          <View style={[s.sumCard, { borderColor: 'rgba(45,212,191,0.2)' }]}>
            <Text style={s.sumIcon}>↑</Text>
            <Text style={s.sumLbl}>{t('journal.income')}</Text>
            <Text style={[s.sumVal, { color: Colors.green }]}>{formatEur(summary.totalIncome)}</Text>
            <Text style={s.sumCount}>{income.length} įrašai</Text>
          </View>
          <View style={[s.sumCard, { borderColor: 'rgba(248,113,113,0.2)' }]}>
            <Text style={s.sumIcon}>↓</Text>
            <Text style={s.sumLbl}>{t('journal.expense')}</Text>
            <Text style={[s.sumVal, { color: Colors.red }]}>{formatEur(summary.totalExpense)}</Text>
            <Text style={s.sumCount}>{expense.length} įrašai</Text>
          </View>
        </View>

        {/* Profit / Loss */}
        <View style={s.balanceCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.balLbl}>{t('journal.balance')}</Text>
            <Text style={[s.balVal, { color: summary.balance >= 0 ? Colors.green : Colors.red }]}>
              {summary.balance >= 0 ? '+' : ''}{formatEur(summary.balance)}
            </Text>
            <View style={s.balBarWrap}>
              <View style={[s.balBarFill, {
                width: `${Math.max(0, balancePct * 100)}%` as any,
                backgroundColor: summary.balance >= 0 ? Colors.green : Colors.red,
              }]} />
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.addBtn, { flex: 1 }]} onPress={handleAddPress}>
            <Text style={s.addBtnText}>{t('journal.addEntry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.scanBtn} onPress={handleScanPress}>
            <Text style={s.scanBtnIcon}>📷{!isPremium ? ' 🔒' : ''}</Text>
            <Text style={s.scanBtnLabel}>{t('journal.scanSF')}</Text>
          </TouchableOpacity>
        </View>

        {income.length > 0 && (
          <>
            <Text style={s.sectionLbl}>{t('journal.income')}</Text>
            {income.map(e => (
              <EntryItem key={e.id} entry={e} formatEur={formatEur} formatDate={formatDate} onDelete={() => handleDelete(e.id)} />
            ))}
          </>
        )}

        {expense.length > 0 && (
          <>
            <Text style={s.sectionLbl}>{t('journal.expense')}</Text>
            {expense.map(e => (
              <EntryItem key={e.id} entry={e} formatEur={formatEur} formatDate={formatDate} onDelete={() => handleDelete(e.id)} />
            ))}
          </>
        )}

        {entries.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📒</Text>
            <Text style={s.emptyTitle}>{t('journal.emptyTitle')}</Text>
            <Text style={s.emptyDesc}>{t('journal.emptyDesc')}</Text>
          </View>
        )}

      </ScrollView>

      <AddEntryModal
        visible={showModal}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onClose={() => setShowModal(false)}
        onSave={async (data) => {
          const ok = await addEntry(data, isPremium);
          if (ok) setShowModal(false);
        }}
      />
    </SafeAreaView>
  );
}

// ── Entry item ────────────────────────────────────────────────
function EntryItem({ entry, formatEur, formatDate, onDelete }: {
  entry: JournalEntry; formatEur: Function; formatDate: Function; onDelete: () => void;
}) {
  const { useTranslation } = require('react-i18next');
  const { t } = useTranslation();
  const { Ionicons } = require('@expo/vector-icons');

  const partnerName = entry.clientName || entry.supplierName;
  const parts: string[] = [];
  if (partnerName)        parts.push(partnerName);
  if (entry.invoiceNumber) parts.push(entry.invoiceNumber);
  const subLine = parts.length > 0
    ? parts.join('  ·  ')
    : (CAT_LT[entry.category] ?? entry.category);

  return (
    <View style={s.entryItem}>
      <View style={[s.entryIcon, { backgroundColor: entry.type === 'income' ? Colors.greenDim : Colors.redDim }]}>
        <Text style={s.entryIconText}>{CATEGORY_ICONS[entry.category]}</Text>
      </View>
      <View style={s.entryInfo}>
        <Text style={s.entryName}>{entry.description}</Text>
        <Text style={s.entryCat}>{subLine}</Text>
        <Text style={s.entryDate}>
          {formatDate(entry.date)}{entry.source === 'scan' ? '  📷' : ''}
        </Text>
      </View>
      <View style={s.entryRight}>
        <Text style={[s.entryAmount, { color: entry.type === 'income' ? Colors.green : Colors.red }]}>
          {entry.type === 'income' ? '+' : '-'}{formatEur(entry.amount)}
        </Text>
        <TouchableOpacity onPress={onDelete} style={s.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={16} color={Colors.text3} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Add entry modal ───────────────────────────────────────────
function AddEntryModal({ visible, selectedYear, selectedMonth, onClose, onSave }: { // eslint-disable-line
  visible: boolean;
  selectedYear: number;
  selectedMonth: number;
  onClose: () => void;
  onSave: (data: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
}) {
  const { t } = useTranslation();
  const [type, setType]               = useState<JournalEntryType>('income');
  const [amount, setAmount]           = useState('');
  const [desc, setDesc]               = useState('');
  const [category, setCategory]       = useState<JournalCategory>('salary');
  const [deductible, setDeductible]   = useState(false);
  const [showExtra, setShowExtra]     = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [invoiceNum, setInvoiceNum]   = useState('');
  const [vatAmtStr, setVatAmtStr]     = useState('');

  const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function handleTypeChange(t: JournalEntryType) {
    setType(t);
    setCategory(t === 'income' ? 'salary' : 'office');
  }

  function handleSave() {
    const num = parseFloat(amount.replace(',', '.'));
    if (!num || !desc) { Alert.alert(t('common.error'), 'Įveskite sumą ir aprašymą'); return; }
    const partnerField = showExtra && partnerName
      ? (type === 'income' ? { clientName: partnerName } : { supplierName: partnerName })
      : {};
    const now = new Date();
    const isCurrentMonth =
      selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
    const entryDate = isCurrentMonth
      ? now
      : new Date(selectedYear, selectedMonth - 1, 1);

    onSave({
      userId: '',
      type, amount: num, category, description: desc,
      date: entryDate, isDeductible: deductible,
      source: 'manual',
      ...partnerField,
      ...(showExtra && invoiceNum ? { invoiceNumber: invoiceNum } : {}),
      ...(showExtra && vatAmtStr  ? { vatAmount: parseFloat(vatAmtStr.replace(',', '.')) || undefined } : {}),
    });
    setAmount(''); setDesc(''); setCategory('salary');
    setShowExtra(false); setPartnerName(''); setInvoiceNum(''); setVatAmtStr('');
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={m.overlay}>
        <ScrollView style={m.sheet} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={m.handle} />
          <Text style={m.title}>{t('journal.newEntry')}</Text>

          <View style={m.typeRow}>
            <TouchableOpacity
              style={[m.typeBtn, type === 'income' && m.typeBtnIncome]}
              onPress={() => handleTypeChange('income')}
            >
              <Text style={[m.typeTxt, type === 'income' && { color: Colors.green }]}>↑ {t('journal.income')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.typeBtn, type === 'expense' && m.typeBtnExpense]}
              onPress={() => handleTypeChange('expense')}
            >
              <Text style={[m.typeTxt, type === 'expense' && { color: Colors.red }]}>↓ {t('journal.expense')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={m.lbl}>{t('journal.amount')}</Text>
          <TextInput style={m.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.text3} />

          <Text style={m.lbl}>{t('journal.description')}</Text>
          <TextInput style={m.input} value={desc} onChangeText={setDesc} placeholderTextColor={Colors.text3} />

          <TouchableOpacity style={m.extraToggle} onPress={() => setShowExtra(v => !v)}>
            <Text style={m.extraToggleTxt}>{t('journal.extraInfo')} {showExtra ? '▴' : '▾'}</Text>
          </TouchableOpacity>

          {showExtra && (
            <View style={m.extraSection}>
              <Text style={m.lbl}>{t('journal.clientOrSupplier')}</Text>
              <TextInput style={m.input} value={partnerName} onChangeText={setPartnerName} placeholderTextColor={Colors.text3} />
              <Text style={m.lbl}>{t('journal.invoiceNumber')}</Text>
              <TextInput style={m.input} value={invoiceNum} onChangeText={setInvoiceNum} placeholder="SF-001" placeholderTextColor={Colors.text3} />
              <Text style={m.lbl}>{t('journal.vatAmount')}</Text>
              <TextInput style={m.input} value={vatAmtStr} onChangeText={setVatAmtStr} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.text3} />
            </View>
          )}

          <Text style={m.lbl}>{t('journal.category')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {cats.map(c => (
                <TouchableOpacity key={c} style={[m.chip, category === c && m.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={m.chipIcon}>{CATEGORY_ICONS[c]}</Text>
                  <Text style={[m.chipTxt, category === c && { color: Colors.blue }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={m.switchRow}>
            <Text style={m.switchLbl}>{t('journal.isDeductible')}</Text>
            <Switch value={deductible} onValueChange={setDeductible} trackColor={{ false: 'rgba(255,255,255,0.18)', true: Colors.blueDim }} thumbColor={deductible ? Colors.blue : '#9CA3AF'} />
          </View>

          <TouchableOpacity style={m.saveBtn} onPress={handleSave}>
            <Text style={m.saveBtnTxt}>{t('common.save')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
            <Text style={m.cancelBtnTxt}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  title:   { fontSize: 24, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.text2, marginTop: 2 },
  badge:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  monthNav:   { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16, justifyContent: 'center' },
  navBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 20, color: Colors.text1, fontWeight: '600' },
  monthLabel: { fontSize: 16, fontWeight: '700', color: Colors.text1 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  sumCard:    { flex: 1, backgroundColor: Colors.surface1, borderRadius: 16, padding: 14, borderWidth: 1 },
  sumIcon:    { fontSize: 18, marginBottom: 6 },
  sumLbl:     { fontSize: 11, color: Colors.text2, marginBottom: 4 },
  sumVal:     { fontSize: 20, fontWeight: '800' },
  sumCount:   { fontSize: 10, color: Colors.text3, marginTop: 3 },

  balanceCard: { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row' },
  balLbl:      { fontSize: 12, color: Colors.text2 },
  balVal:      { fontSize: 22, fontWeight: '800', marginVertical: 4 },
  balBarWrap:  { height: 4, backgroundColor: Colors.surface3, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  balBarFill:  { height: '100%', borderRadius: 2 },

  actionRow:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addBtn:       { backgroundColor: Colors.blueDim, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(79,142,247,0.25)', flexDirection: 'row', justifyContent: 'center' },
  addBtnText:   { color: Colors.blue, fontWeight: '700', fontSize: 15 },
  scanBtn:      { backgroundColor: Colors.surface2, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, minWidth: 72 },
  scanBtnIcon:  { fontSize: 18 },
  scanBtnLabel: { fontSize: 9, color: Colors.text3, marginTop: 3, fontWeight: '600' },

  sectionLbl:   { fontSize: 11, fontWeight: '600', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  entryItem:    { backgroundColor: Colors.surface1, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  entryRight:   { alignItems: 'flex-end', gap: 6 },
  deleteBtn:    { padding: 2 },
  entryIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryIconText: { fontSize: 18 },
  entryInfo:    { flex: 1, minWidth: 0 },
  entryName:    { fontSize: 14, fontWeight: '600', color: Colors.text1 },
  entryCat:     { fontSize: 11, color: Colors.text3, marginTop: 2 },
  entryDate:    { fontSize: 10, color: Colors.text3 },
  entryAmount:  { fontSize: 15, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon:  { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text1, marginBottom: 8 },
  emptyDesc:  { fontSize: 13, color: Colors.text2, textAlign: 'center' },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: Colors.surface1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: Colors.border2, maxHeight: '90%' },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.text3, alignSelf: 'center', marginBottom: 20 },
  title:   { fontSize: 18, fontWeight: '800', color: Colors.text1, marginBottom: 20 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface2, alignItems: 'center' },
  typeBtnIncome:  { backgroundColor: Colors.greenDim, borderColor: 'rgba(45,212,191,0.3)' },
  typeBtnExpense: { backgroundColor: Colors.redDim,   borderColor: 'rgba(248,113,113,0.3)' },
  typeTxt: { fontSize: 14, fontWeight: '700', color: Colors.text3 },
  lbl:     { fontSize: 11, color: Colors.text3, marginBottom: 6, fontWeight: '500' },
  input:   { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 13, fontSize: 15, color: Colors.text1, marginBottom: 14 },
  extraToggle:    { paddingVertical: 10, marginBottom: 4 },
  extraToggleTxt: { fontSize: 13, color: Colors.blue, fontWeight: '600' },
  extraSection:   { backgroundColor: Colors.surface2, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.3)' },
  chipIcon: { fontSize: 14 },
  chipTxt:  { fontSize: 12, color: Colors.text2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  switchLbl: { fontSize: 14, color: Colors.text1 },
  saveBtn:   { backgroundColor: Colors.blue, borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 10 },
  saveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn:  { alignItems: 'center', padding: 12 },
  cancelBtnTxt: { color: Colors.text2, fontSize: 14 },
});

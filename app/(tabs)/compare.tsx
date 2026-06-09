import { useTranslation } from 'react-i18next';
import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { calcEmployee } from '../../src/engine/employeeCalc';
import { calcIV, compareDeductions } from '../../src/engine/ivCalc';
import { useFormatting } from '../../src/hooks/useFormatting';

type TabKey = 'salary' | 'ivvsemp' | 'deduct';

export default function CompareScreen() {
  const { t }          = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('salary');
  const { formatEur } = useFormatting();

  const TABS = [
    { key: 'salary'  as const, label: t('compare.twoSalaries') },
    { key: 'ivvsemp' as const, label: t('compare.ivVsEmp') },
    { key: 'deduct'  as const, label: t('compare.flatVsActual30') },
  ];

  return (
    <SafeAreaView style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>{t('compare.title')}</Text>
          <View style={[s.badge, { backgroundColor: Colors.greenDim }]}>
            <Text style={[s.badgeText, { color: Colors.green }]}>Premium</Text>
          </View>
        </View>

        {/* Tab selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={s.tabRow}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[s.tabBtn, activeTab === tab.key && s.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[s.tabBtnTxt, activeTab === tab.key && s.tabBtnTxtActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {activeTab === 'salary'  && <SalaryCompare formatEur={formatEur} />}
        {activeTab === 'ivvsemp' && <IVvsEmployee  formatEur={formatEur} />}
        {activeTab === 'deduct'  && <DeductionCompare formatEur={formatEur} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Salary vs Salary ─────────────────────────────────────────
function SalaryCompare({ formatEur }: { formatEur: Function }) {
  const { t } = useTranslation();
  const [g1, setG1] = useState('2500');
  const [g2, setG2] = useState('3500');
  const opts = { isPension: false, isNPD: true, employerGroup: 1 as const };
  const r1 = useMemo(() => calcEmployee(parseFloat(g1) || 0, opts), [g1]);
  const r2 = useMemo(() => calcEmployee(parseFloat(g2) || 0, opts), [g2]);
  const diff = r2.net - r1.net;

  return (
    <>
      <View style={s.cmpRow}>
        <View style={s.cmpCard}>
          <Text style={s.cmpLbl}>{t('compare.salary1')}</Text>
          <View style={s.cmpInputRow}>
            <TextInput style={s.cmpInput} value={g1} onChangeText={setG1} keyboardType="decimal-pad" />
            <Text style={s.cmpEur}>€</Text>
          </View>
          <Text style={s.cmpNet}>{formatEur(r1.net)}</Text>
          <Text style={s.cmpNetLbl}>{t('common.toHand')}</Text>
        </View>
        <View style={s.vsBox}><Text style={s.vsTxt}>{t('common.vs')}</Text></View>
        <View style={s.cmpCard}>
          <Text style={s.cmpLbl}>{t('compare.salary2')}</Text>
          <View style={s.cmpInputRow}>
            <TextInput style={s.cmpInput} value={g2} onChangeText={setG2} keyboardType="decimal-pad" />
            <Text style={s.cmpEur}>€</Text>
          </View>
          <Text style={s.cmpNet}>{formatEur(r2.net)}</Text>
          <Text style={s.cmpNetLbl}>{t('common.toHand')}</Text>
        </View>
      </View>

      <View style={s.diffCard}>
        <Text style={s.diffLbl}>{t('compare.difference')}</Text>
        <Text style={[s.diffVal, { color: diff >= 0 ? Colors.green : Colors.red }]}>
          {diff >= 0 ? '+' : ''}{formatEur(diff)}/mėn.
        </Text>
        <Text style={s.diffAnnual}>{t('compare.perYear')}: {diff >= 0 ? '+' : ''}{formatEur(diff * 12)}</Text>
      </View>

      <View style={s.tableCard}>
        {[
          [t('calculator.gross'),      formatEur(r1.gross),      formatEur(r2.gross)],
          [t('calculator.net'),        formatEur(r1.net),        formatEur(r2.net)],
          [t('calculator.gpm'),       `-${formatEur(r1.gpm)}`,  `-${formatEur(r2.gpm)}`],
          [t('calculator.sodra'),     `-${formatEur(r1.sodra)}`, `-${formatEur(r2.sodra)}`],
          [t('calculator.npd_label'), `+${formatEur(r1.npd)}`,  `+${formatEur(r2.npd)}`],
          [t('calculator.employerCost'), formatEur(r1.empTotal), formatEur(r2.empTotal)],
        ].map(([label, v1, v2]) => (
          <View key={label} style={s.tableRow}>
            <Text style={s.tableLabel}>{label}</Text>
            <Text style={s.tableVal}>{v1}</Text>
            <Text style={s.tableVal}>{v2}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

// ── IV vs Employee ────────────────────────────────────────────
function IVvsEmployee({ formatEur }: { formatEur: Function }) {
  const { t } = useTranslation();
  const [income, setIncome] = useState('36000');
  const annual = parseFloat(income) || 0;
  const empMonthly = annual / 12;
  const opts = { isPension: false, isNPD: true, employerGroup: 1 as const };
  const empRes = useMemo(() => calcEmployee(empMonthly, opts), [empMonthly]);
  const ivRes  = useMemo(() => calcIV({ annualIncome: annual, useFlat30: true, actualExpenses: 0 }), [annual]);

  const empAnnualNet = empRes.net * 12;
  const diff = ivRes.netIncome - empAnnualNet;

  return (
    <>
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('compare.annualIncome')}</Text>
        <View style={s.cmpInputRow}>
          <TextInput style={[s.cmpInput, { flex: 1 }]} value={income} onChangeText={setIncome} keyboardType="decimal-pad" />
          <Text style={s.cmpEur}>€ / {t('common.year')}</Text>
        </View>
      </View>

      <View style={s.cmpRow}>
        <View style={s.cmpCard}>
          <Text style={s.cmpLbl}>👔 {t('calculator.modesLong.employee')}</Text>
          <Text style={s.cmpNet}>{formatEur(empAnnualNet)}</Text>
          <Text style={s.cmpNetLbl}>{t('calculator.netIncome')} / {t('common.year')}</Text>
          <Text style={s.cmpSub}>{t('calculator.gpm')}: {formatEur(empRes.gpm * 12)}</Text>
          <Text style={s.cmpSub}>{t('calculator.sodra')}: {formatEur(empRes.sodra * 12)}</Text>
        </View>
        <View style={s.vsBox}><Text style={s.vsTxt}>{t('common.vs')}</Text></View>
        <View style={s.cmpCard}>
          <Text style={s.cmpLbl}>💼 {t('calculator.modesLong.iv')}</Text>
          <Text style={s.cmpNet}>{formatEur(ivRes.netIncome)}</Text>
          <Text style={s.cmpNetLbl}>{t('calculator.netIncome')} / {t('common.year')}</Text>
          <Text style={s.cmpSub}>{t('calculator.gpm')}: {formatEur(ivRes.gpm)}</Text>
          <Text style={s.cmpSub}>{t('calculator.sodra')}: {formatEur(ivRes.sodraVSD + ivRes.sodraPSD)}</Text>
        </View>
      </View>

      <View style={s.diffCard}>
        <Text style={s.diffLbl}>{t('compare.annualDiff')}</Text>
        <Text style={[s.diffVal, { color: diff >= 0 ? Colors.green : Colors.red }]}>
          {diff >= 0 ? '+' : ''}{formatEur(diff)}/{t('common.year')}
        </Text>
        <Text style={s.diffAnnual}>
          {diff >= 0 ? t('compare.ivBetter') : t('compare.empBetter')}
        </Text>
      </View>
    </>
  );
}

// ── Deduction compare ─────────────────────────────────────────
function DeductionCompare({ formatEur }: { formatEur: Function }) {
  const { t } = useTranslation();
  const [income, setIncome]     = useState('30000');
  const [expenses, setExpenses] = useState('6000');
  const annual   = parseFloat(income)   || 0;
  const actual   = parseFloat(expenses) || 0;
  const result   = useMemo(() => compareDeductions(annual, actual), [annual, actual]);

  return (
    <>
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('compare.annualIncome')}</Text>
        <TextInput style={s.fieldInput} value={income} onChangeText={setIncome} keyboardType="decimal-pad" />
        <Text style={s.cardTitle}>{t('compare.actualExpenses')}</Text>
        <TextInput style={s.fieldInput} value={expenses} onChangeText={setExpenses} keyboardType="decimal-pad" />
      </View>

      <View style={s.cmpRow}>
        <View style={[s.cmpCard, result.betterOption === 'flat' && s.cmpCardBest]}>
          <Text style={s.cmpLbl}>{t('compare.flatLabel')}</Text>
          <Text style={[s.cmpNet, { fontSize: 16 }]}>{formatEur(result.flat.deductibleExpenses)}</Text>
          <Text style={s.cmpNetLbl}>{t('compare.deductedLabel')}</Text>
          <Text style={[s.cmpNet, { marginTop: 8 }]}>{formatEur(result.flat.netIncome)}</Text>
          <Text style={s.cmpNetLbl}>{t('compare.netLabel')}</Text>
          {result.betterOption === 'flat' && <Text style={s.bestTag}>{t('common.better')}</Text>}
        </View>
        <View style={s.vsBox}><Text style={s.vsTxt}>{t('common.vs')}</Text></View>
        <View style={[s.cmpCard, result.betterOption === 'actual' && s.cmpCardBest]}>
          <Text style={s.cmpLbl}>{t('compare.actualLabel')}</Text>
          <Text style={[s.cmpNet, { fontSize: 16 }]}>{formatEur(result.actual.deductibleExpenses)}</Text>
          <Text style={s.cmpNetLbl}>{t('compare.deductedLabel')}</Text>
          <Text style={[s.cmpNet, { marginTop: 8 }]}>{formatEur(result.actual.netIncome)}</Text>
          <Text style={s.cmpNetLbl}>{t('compare.netLabel')}</Text>
          {result.betterOption === 'actual' && <Text style={s.bestTag}>{t('common.better')}</Text>}
        </View>
      </View>

      <View style={s.diffCard}>
        <Text style={s.diffLbl}>{t('compare.diffLabel')}</Text>
        <Text style={[s.diffVal, { color: Colors.green }]}>{formatEur(result.difference)}</Text>
        <Text style={s.diffAnnual}>
          {result.betterOption === 'flat' ? t('compare.flatBetter') : t('compare.actualBetter')} {t('compare.choiceLabel')}
        </Text>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  title:   { fontSize: 24, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  badge:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  tabRow:       { flexDirection: 'row', gap: 8 },
  tabBtn:       { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  tabBtnActive: { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.3)' },
  tabBtnTxt:    { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  tabBtnTxtActive: { color: Colors.blue },

  cmpRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  cmpCard:    { flex: 1, backgroundColor: Colors.surface1, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border },
  cmpCardBest: { borderColor: Colors.green },
  cmpLbl:     { fontSize: 12, color: Colors.text3, marginBottom: 8, fontWeight: '500' },
  cmpInputRow: { flexDirection: 'row', alignItems: 'center' },
  cmpInput:   { fontSize: 28, fontWeight: '800', color: Colors.text1, letterSpacing: -1, flex: 1 },
  cmpEur:     { fontSize: 14, color: Colors.text3 },
  cmpNet:     { fontSize: 20, fontWeight: '800', color: Colors.green, marginTop: 8 },
  cmpNetLbl:  { fontSize: 10, color: Colors.text3 },
  cmpSub:     { fontSize: 11, color: Colors.text2, marginTop: 4 },

  vsBox: { width: 36, alignItems: 'center', paddingTop: 48 },
  vsTxt: { fontSize: 12, fontWeight: '700', color: Colors.text3 },

  diffCard:   { backgroundColor: Colors.surface1, borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  diffLbl:    { fontSize: 12, color: Colors.text2, marginBottom: 6 },
  diffVal:    { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  diffAnnual: { fontSize: 13, color: Colors.text2, marginTop: 6 },

  tableCard: { backgroundColor: Colors.surface1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  tableRow:  { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'center' },
  tableLabel: { flex: 1, fontSize: 12, color: Colors.text3 },
  tableVal:   { width: 90, fontSize: 12, fontWeight: '600', color: Colors.text1, textAlign: 'right' },

  card:       { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTitle:  { fontSize: 11, fontWeight: '600', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  fieldInput: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: Colors.text1, marginBottom: 14 },
  bestTag:    { fontSize: 11, fontWeight: '700', color: Colors.green, marginTop: 8 },
});

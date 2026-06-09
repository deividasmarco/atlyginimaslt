import { useTranslation } from 'react-i18next';
import React, { useState, useMemo } from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useRouter } = require('expo-router');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Ionicons } = require('@expo/vector-icons');
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { useJournalStore } from '../../src/stores/journalStore';
import { useBusinessStore } from '../../src/stores/businessStore';
import { useAuthStore } from '../../src/stores/authStore';
import { generatePDF } from '../../src/services/pdf.service';
import { useFormatting } from '../../src/hooks/useFormatting';
import { generateAnnualTaxSummary } from '../../src/engine/taxEngine';
import { PDFReportType } from '../../src/types';

const REPORT_TYPES: { key: PDFReportType; label: string; desc: string; icon: string }[] = [
  { key: 'bank',      label: 'Ataskaita bankui',     desc: 'Pajamų ir išlaidų suvestinė paskolai / lizingui', icon: '🏦' },
  { key: 'monthly',   label: 'Mėnesinė ataskaita',   desc: 'Pilna mėnesio finansų suvestinė',                 icon: '📅' },
  { key: 'quarterly', label: 'Ketvirčio ataskaita',  desc: 'Ketvirčio Sodros ir pajamų suvestinė',            icon: '📊' },
  { key: 'annual',    label: 'Metinė VMI suvestinė', desc: 'Metinė pajamų ir mokesčių ataskaita',             icon: '📋' },
];

const DEADLINES = [
  { label: 'GPM deklaracija (EDS)', date: 'Gegužės 1 d.',   icon: '📝', color: Colors.amber },
  { label: 'Sodros Q1 įmokos',      date: 'Balandžio 1 d.', icon: '💼', color: Colors.blue },
  { label: 'Sodros Q2 įmokos',      date: 'Liepos 1 d.',    icon: '💼', color: Colors.blue },
  { label: 'Sodros Q3 įmokos',      date: 'Spalio 1 d.',    icon: '💼', color: Colors.blue },
  { label: 'Sodros Q4 įmokos',      date: 'Sausio 1 d.',    icon: '💼', color: Colors.blue },
  { label: 'PVM deklaracija',        date: 'Mėnesio 25 d.',  icon: '🧾', color: Colors.purple },
];

export default function ReportsScreen() {
  const router              = useRouter();
  const { t }               = useTranslation();
  const { isPremium }       = useAuthStore();
  const { getMonthEntries, getMonthSummary, selectedYear, selectedMonth, getYearTotal } = useJournalStore();
  const { formatMonth, formatEur } = useFormatting();
  const [generating, setGenerating] = useState(false);

  const { profile }  = useBusinessStore();
  const year         = new Date().getFullYear();
  const yearTotals   = getYearTotal(year);
  const actualExpenses = yearTotals.expense;

  const REPORT_TYPES = [
    { key: 'bank'      as PDFReportType, label: t('reports.bank'),     desc: 'Pajamų ir išlaidų suvestinė paskolai / lizingui', icon: '🏦' },
    { key: 'monthly'   as PDFReportType, label: t('reports.monthly'),  desc: 'Pilna mėnesio finansų suvestinė',                 icon: '📅' },
    { key: 'quarterly' as PDFReportType, label: t('reports.quarterly'),desc: 'Ketvirčio Sodros ir pajamų suvestinė',            icon: '📊' },
    { key: 'annual'    as PDFReportType, label: t('reports.annual'),   desc: 'Metinė pajamų ir mokesčių ataskaita',             icon: '📋' },
  ];

  const summary = useMemo(
    () => generateAnnualTaxSummary(yearTotals.income, actualExpenses, {
      ...profile, year,
    }),
    [yearTotals.income, actualExpenses, profile, year],
  );

  async function handleGeneratePDF(type: PDFReportType) {
    if (!isPremium) {
      Alert.alert(t('reports.premiumAlert'), t('reports.premiumMsg'), [
        { text: t('common.notNow'), style: 'cancel' },
        { text: t('common.premium'), onPress: () => {} },
      ]);
      return;
    }
    setGenerating(true);
    try {
      const entries  = getMonthEntries(selectedYear, selectedMonth);
      const summary  = getMonthSummary(selectedYear, selectedMonth);
      const filePath = await generatePDF(entries, summary, {
        type, userId: '', year: selectedYear, month: selectedMonth,
      });
      if (!filePath) Alert.alert(t('common.error'), t('reports.errorMsg'));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <View>
            <Text style={s.title}>{t('reports.title')}</Text>
            <Text style={s.subtitle}>{t('reports.subtitle')}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: Colors.amberDim }]}>
            <Text style={[s.badgeText, { color: Colors.amber }]}>Premium</Text>
          </View>
        </View>

        {/* Metinė suvestinė */}
        <Text style={s.sectionLbl}>{t('reports.annualSummary')} {year}</Text>
        <View style={s.summaryCard}>
          {([
            [t('reports.income'),    summary.income,                                            Colors.green],
            [t('reports.expenses'), summary.actualExpenses,                                    Colors.red],
            [t('reports.profit'),   summary.income - summary.actualExpenses,
              summary.income >= summary.actualExpenses ? Colors.blue : Colors.red],
          ] as [string, number, string][]).map(([label, val, color]) => (
            <View key={label} style={s.summaryRow}>
              <Text style={s.summaryLabel}>{label}</Text>
              <Text style={[s.summaryValue, { color }]}>{formatEur(val)}</Text>
            </View>
          ))}

          {summary.income > 0 && (
            <>
              <View style={s.summaryDivider} />
              {/* Side-by-side expense method comparison */}
              <View style={s.methodRow}>
                {(['FIXED_30_PERCENT', 'ACTUAL_EXPENSES'] as const).map(method => {
                  const res    = method === 'FIXED_30_PERCENT' ? summary.fixed30 : summary.actual;
                  const better = summary.betterMethod === method;
                  return (
                    <View key={method} style={[s.methodCard, better && s.methodCardBest]}>
                      <Text style={[s.methodTitle, better && { color: Colors.green }]}>
                        {method === 'FIXED_30_PERCENT' ? '30% fiksuotos' : 'Faktinės išlaidos'}
                      </Text>
                      {better && <Text style={s.methodBadge}>✓ Naudingesnis</Text>}
                      <Text style={s.methodTax}>{formatEur(res.totalTaxes)}</Text>
                      <Text style={s.methodTaxLbl}>mokesčiai</Text>
                      <Text style={s.methodNet}>{formatEur(res.netAfterTaxes)}</Text>
                      <Text style={s.methodNetLbl}>likutis</Text>
                    </View>
                  );
                })}
              </View>

              {summary.savingsByBetterMethod > 0 && (
                <Text style={s.savingNote}>
                  💡 {summary.betterMethod === 'FIXED_30_PERCENT' ? '30% metodas' : 'Faktinės išlaidos'} sutaupo{' '}
                  {formatEur(summary.savingsByBetterMethod)} mokesčių
                </Text>
              )}

              <View style={s.summaryDivider} />
              <Text style={s.taxSubtitle}>{t('reports.taxProjection')}</Text>
              {(() => {
                const taxes = profile.expenseMode === 'FIXED_30_PERCENT' ? summary.fixed30 : summary.actual;
                const net   = summary.income - summary.actualExpenses - taxes.totalTaxes;
                return (
                  <>
                    {([
                      [t('calculator.gpm'), taxes.gpm,      Colors.amber],
                      [t('calculator.psd'), taxes.psd,      Colors.orange],
                      [t('calculator.vsd'), taxes.vsd,      Colors.orange],
                      [t('reports.totalTax'), taxes.totalTaxes, Colors.red],
                    ] as [string, number, string][]).map(([label, val, color]) => (
                      <View key={label} style={s.summaryRow}>
                        <Text style={s.summaryLabel}>{label}</Text>
                        <Text style={[s.summaryValue, { color }]}>{formatEur(val)}</Text>
                      </View>
                    ))}
                    {/* #9 — Net after taxes */}
                    <View style={[s.summaryRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.border }]}>
                      <Text style={[s.summaryLabel, { fontWeight: '700', color: Colors.text1 }]}>Likutis po mokesčių</Text>
                      <Text style={[s.summaryValue, { color: net >= 0 ? Colors.green : Colors.red, fontWeight: '800' }]}>{formatEur(net)}</Text>
                    </View>
                  </>
                );
              })()}
              <Text style={s.taxNote}>{t('reports.taxCalcNote')}</Text>
              {summary.fixed30.warnings.includes('PSD_MINIMUM_MAY_APPLY') && (
                <Text style={[s.taxNote, { color: Colors.amber, marginTop: 4 }]}>
                  ⚠️ Jeigu nesate draustas PSD kitur, gali būti taikoma minimali mėnesinė PSD įmoka.
                </Text>
              )}
            </>
          )}
          {summary.income <= 0 && <Text style={s.taxNote}>{t('reports.noData')}</Text>}
        </View>

        {/* Period */}
        <View style={s.periodCard}>
          <Text style={s.periodLbl}>{t('reports.currentPeriod')}</Text>
          <Text style={s.periodVal}>{formatMonth(selectedYear, selectedMonth)}</Text>
          <Text style={s.periodHint}>{t('reports.changePeriod')}</Text>
        </View>

        {/* Bank income assessment — Premium feature card */}
        <TouchableOpacity
          style={s.bankCard}
          onPress={() => router.push('/credit-income' as any)}
          activeOpacity={0.85}
        >
          <View style={s.bankCardIcon}>
            <Ionicons name="home-outline" size={22} color="#1E3A8A" />
          </View>
          <View style={s.bankCardBody}>
            <Text style={s.bankCardTitle}>Būsto paskolos pajamų skaičiuoklė</Text>
            <Text style={s.bankCardSub}>Grynosios pajamos paskolai · Būsto kreditingumas</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#1E3A8A" />
        </TouchableOpacity>

        {/* PDF report types */}
        <Text style={s.sectionLbl}>{t('reports.pdfSection')}</Text>
        {REPORT_TYPES.map(r => (
          <TouchableOpacity
            key={r.key}
            style={s.reportCard}
            onPress={() => handleGeneratePDF(r.key)}
            disabled={generating}
          >
            <View style={s.reportIcon}>
              <Text style={s.reportIconText}>{r.icon}</Text>
            </View>
            <View style={s.reportInfo}>
              <Text style={s.reportTitle}>{r.label}</Text>
              <Text style={s.reportDesc}>{r.desc}</Text>
            </View>
            <View style={s.reportRight}>
              {!isPremium && <Text style={s.lockIcon}>🔒</Text>}
              <Text style={s.reportArrow}>›</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Deadlines */}
        <Text style={s.sectionLbl}>{t('reports.deadlinesSection')}</Text>
        <View style={s.card}>
          {DEADLINES.map((d, i) => (
            <View key={i} style={[s.deadlineRow, i === DEADLINES.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.deadlineIcon}>{d.icon}</Text>
              <View style={s.deadlineInfo}><Text style={s.deadlineLbl}>{d.label}</Text></View>
              <Text style={[s.deadlineDate, { color: d.color }]}>{d.date}</Text>
            </View>
          ))}
        </View>

        <View style={s.noteCard}>
          <Text style={s.noteIcon}>ℹ️</Text>
          <Text style={s.noteText}>{t('reports.pdfInfo')}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
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

  sectionLbl: { fontSize: 11, fontWeight: '600', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4 },

  summaryCard:    { backgroundColor: Colors.surface1, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  methodRow:      { flexDirection: 'row', gap: 10, marginBottom: 12 },
  methodCard:     { flex: 1, backgroundColor: Colors.surface2, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  methodCardBest: { borderColor: 'rgba(45,212,191,0.4)', backgroundColor: Colors.greenDim },
  methodTitle:    { fontSize: 11, fontWeight: '700', color: Colors.text2, marginBottom: 4 },
  methodBadge:    { fontSize: 10, color: Colors.green, fontWeight: '700', marginBottom: 6 },
  methodTax:      { fontSize: 16, fontWeight: '800', color: Colors.amber },
  methodTaxLbl:   { fontSize: 10, color: Colors.text3, marginBottom: 6 },
  methodNet:      { fontSize: 16, fontWeight: '800', color: Colors.green },
  methodNetLbl:   { fontSize: 10, color: Colors.text3 },
  savingNote:     { fontSize: 12, color: Colors.green, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  summaryLabel:   { fontSize: 13, color: Colors.text2 },
  summaryValue:   { fontSize: 13, fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: Colors.border2, marginVertical: 8 },
  taxSubtitle:    { fontSize: 11, color: Colors.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  taxNote:        { fontSize: 10, color: Colors.text3, marginTop: 10 },

  periodCard: { backgroundColor: Colors.amberDim, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', alignItems: 'center' },
  periodLbl:  { fontSize: 11, color: Colors.amber, marginBottom: 4, fontWeight: '600', textTransform: 'uppercase' },
  periodVal:  { fontSize: 20, fontWeight: '800', color: Colors.amber },
  periodHint: { fontSize: 11, color: 'rgba(245,158,11,0.6)', marginTop: 4 },

  reportCard: { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  reportIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.amberDim, alignItems: 'center', justifyContent: 'center' },
  reportIconText: { fontSize: 22 },
  reportInfo: { flex: 1 },
  reportTitle: { fontSize: 14, fontWeight: '700', color: Colors.text1, marginBottom: 3 },
  reportDesc:  { fontSize: 12, color: Colors.text2, lineHeight: 17 },
  reportRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockIcon:    { fontSize: 14 },
  reportArrow: { fontSize: 20, color: Colors.text3 },

  card: { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  deadlineRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  deadlineIcon: { fontSize: 18, width: 30 },
  deadlineInfo: { flex: 1 },
  deadlineLbl:  { fontSize: 13, color: Colors.text1, fontWeight: '500' },
  deadlineDate: { fontSize: 12, fontWeight: '700' },

  noteCard: { backgroundColor: Colors.surface1, borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: Colors.border },
  noteIcon: { fontSize: 16, marginTop: 1 },
  noteText: { flex: 1, fontSize: 12, color: Colors.text2, lineHeight: 18 },

  bankCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,58,138,0.12)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(30,58,138,0.3)', gap: 12 },
  bankCardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(30,58,138,0.15)', alignItems: 'center', justifyContent: 'center' },
  bankCardBody: { flex: 1 },
  bankCardTitle:{ fontSize: 15, fontWeight: '700', color: '#1E3A8A', marginBottom: 2 },
  bankCardSub:  { fontSize: 12, color: '#374151' },
});

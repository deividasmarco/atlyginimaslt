import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../src/constants/colors';
import { useJournalStore } from '../../src/stores/journalStore';
import { useBusinessStore } from '../../src/stores/businessStore';
import { useFormatting } from '../../src/hooks/useFormatting';
import { calcIV } from '../../src/engine/ivCalc';
import { calcEmployee } from '../../src/engine/employeeCalc';
import { calcMB } from '../../src/engine/mbCalc';
import { calculateVatThreshold, projectAnnualIncome } from '../../src/engine/taxEngine';
import { calcForecastTaxes } from '../../src/utils/taxForecast';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { TAX_2026 } from '../../src/constants/tax2026';
import { ForecastMode } from '../../src/types/business';

const DEADLINES = [
  { month: 4,  day: 1, label: 'Sodros Q1 įmokos' },
  { month: 5,  day: 1, label: 'GPM deklaracija (EDS)' },
  { month: 7,  day: 1, label: 'Sodros Q2 įmokos' },
  { month: 10, day: 1, label: 'Sodros Q3 įmokos' },
  { month: 1,  day: 1, label: 'Sodros Q4 įmokos' },
];

function getNextDeadline(): { label: string; daysLeft: number } | null {
  const now  = new Date();
  const year = now.getFullYear();
  const upcoming = DEADLINES
    .map(d => {
      const deadlineYear = d.month === 1 && now.getMonth() > 0 ? year + 1 : year;
      const date     = new Date(deadlineYear, d.month - 1, d.day);
      const daysLeft = Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
      return { label: d.label, daysLeft };
    })
    .filter(d => d.daysLeft > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  return upcoming[0] ?? null;
}

export default function DashboardScreen() {
  const router                    = useRouter();
  const { t }                     = useTranslation();
  const { formatEur }             = useFormatting();
  const { getYearTotal }          = useJournalStore();
  const { profile }               = useBusinessStore();
  const { userType }              = useSettingsStore();
  const year                      = new Date().getFullYear();
  const currentMonth              = new Date().getMonth() + 1;
  const totals                    = getYearTotal(year);
  const [forecastMode, setForecastMode] = useState<ForecastMode>('ACTUAL_TO_DATE');

  const incomeForCalc = forecastMode === 'PROJECTED_YEAR'
    ? projectAnnualIncome(totals.income, currentMonth)
    : totals.income;

  const profit   = totals.income - totals.expense;
  const taxes    = useMemo(
    () => calcForecastTaxes(incomeForCalc, profile.pensionAccumulation),
    [incomeForCalc, profile.pensionAccumulation],
  );
  const pvm      = useMemo(() => calculateVatThreshold(totals.income), [totals.income]);
  const deadline = getNextDeadline();

  // Tax optimization: compare employee / IV / MB net income
  const optimization = useMemo(() => {
    if (totals.income < 5000) return null;

    const empNet = calcEmployee(
      totals.income / 12,
      { isPension: false, isNPD: false, employerGroup: 1 as const },
    ).net * 12;

    const ivNet = calcIV({
      annualIncome: totals.income, useFlat30: true, actualExpenses: 0,
    }).netIncome;

    const mbExpenses = totals.income * 0.3;
    const mbProfit   = Math.max(0, totals.income - mbExpenses);
    const mbNet = calcMB({
      annualRevenue:    totals.income,
      annualExpenses:   mbExpenses,
      isNewCompany:     false,
      isSmallCompany:   true,
      memberWithdrawal: mbProfit,
      directorSalary:   0,
      dividends:        0,
    }).netToMember;

    const nets: Record<string, number> = { employee: empNet, iv: ivNet, mb: mbNet };
    const currentNet = nets[userType] ?? ivNet;
    const sorted = Object.entries(nets).sort((a, b) => b[1] - a[1]);
    const [bestKey, bestNet] = sorted[0];
    const diff = Math.round(bestNet - currentNet);

    if (bestKey === userType || diff < 300) return null;

    const typeNames: Record<string, string> = {
      employee: t('calculator.modesLong.employee'),
      iv:       t('calculator.modesLong.iv'),
      mb:       t('calculator.modesLong.mb'),
    };
    return { current: typeNames[userType], best: typeNames[bestKey], diff };
  }, [totals.income, userType, t]);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{t('dashboard.title')}</Text>
          <Text style={s.subtitle}>{year} {t('common.year')}</Text>
        </View>

        {/* Forecast mode toggle */}
        <View style={s.toggleRow}>
          {(['ACTUAL_TO_DATE', 'PROJECTED_YEAR'] as ForecastMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[s.toggleBtn, forecastMode === mode && s.toggleBtnActive]}
              onPress={() => setForecastMode(mode)}
            >
              <Text style={[s.toggleTxt, forecastMode === mode && s.toggleTxtActive]}>
                {mode === 'ACTUAL_TO_DATE' ? 'Pagal įrašus' : 'Metinė prognozė'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section A — Year totals */}
        <View style={s.row3}>
          <SummaryCard label={t('dashboard.yearIncome')}   value={formatEur(totals.income)}  color={Colors.green} />
          <SummaryCard label={t('dashboard.yearExpenses')} value={formatEur(totals.expense)} color={Colors.red} />
          <SummaryCard label="Faktinis pelnas"             value={formatEur(profit)}         color={profit >= 0 ? Colors.blue : Colors.red} />
        </View>
        {forecastMode === 'PROJECTED_YEAR' && incomeForCalc !== totals.income && (
          <Text style={s.projNote}>
            📈 Metinė prognozė pagal {currentMonth} mėn. vidurkį: {formatEur(incomeForCalc)}
          </Text>
        )}

        {/* Section B — Tax projection */}
        {taxes ? (
          <View style={s.card}>
            {/* #8 — Mode label */}
            <View style={s.taxCardHeader}>
              <Text style={s.cardTitle}>{t('dashboard.taxProjection')}</Text>
              <Text style={s.modeLabel}>
                {forecastMode === 'ACTUAL_TO_DATE'
                  ? `Pagal įvestus ${year} m. įrašus`
                  : 'Metinė prognozė'}
              </Text>
            </View>

            {/* #4 & #5 — Taxable profit with formula explanation */}
            {(() => {
              const deductible    = incomeForCalc * 0.3;
              const taxableProfit = Math.max(0, incomeForCalc - deductible);
              return (
                <View style={s.taxContextRow}>
                  <View style={{ flex: 1 }}>
                    <View style={s.taxContextTitleRow}>
                      <Text style={s.taxContextLbl}>Apmokestinamasis pelnas</Text>
                    </View>
                    {/* #4 — Show formula so it's obvious why it differs from actual profit */}
                    <Text style={s.taxContextSub}>
                      {formatEur(incomeForCalc)} − 30% fiksuotų išlaidų ({formatEur(deductible)})
                    </Text>
                  </View>
                  <Text style={s.taxContextVal}>{formatEur(taxableProfit)}</Text>
                </View>
              );
            })()}

            {/* GPM / PSD / VSD rows */}
            {([
              [t('calculator.gpm'), taxes.gpm,      Colors.amber],
              [t('calculator.psd'), taxes.psd,      Colors.orange],
              [t('calculator.vsd'), taxes.vsd,      Colors.orange],
            ] as [string, number, string][]).map(([label, val, color]) => (
              <View key={label} style={s.taxRow}>
                <Text style={s.taxLabel}>{label}</Text>
                <Text style={[s.taxValue, { color }]}>{formatEur(val)}</Text>
              </View>
            ))}

            {/* #2 — Total taxes + net after taxes as a summary block */}
            <View style={s.taxSummaryBlock}>
              <View style={s.taxSummaryRow}>
                <Text style={s.taxSummaryLbl}>{t('dashboard.totalTax')}</Text>
                <Text style={[s.taxSummaryVal, { color: Colors.red }]}>{formatEur(taxes.totalTax)}</Text>
              </View>
              {/* #1 — Net after all outflows */}
              <View style={[s.taxSummaryRow, { marginTop: 4 }]}>
                <Text style={s.taxSummaryLbl}>Likutis po mokesčių</Text>
                <Text style={[s.taxSummaryVal, { color: Colors.green }]}>
                  {formatEur(Math.max(0, incomeForCalc - totals.expense - taxes.totalTax))}
                </Text>
              </View>
            </View>

            <Text style={s.taxNote}>{t('dashboard.taxNote')}</Text>

            {/* #3 — Improved Pastaba wording */}
            {taxes.belowMinSodra && (
              <View style={s.minNoteCard}>
                <Text style={s.minNoteTitle}>Pastaba</Text>
                <Text style={s.minNoteText}>
                  Jeigu nesate draustas PSD kitur, gali būti taikoma minimali mėnesinė PSD įmoka.
                  VSD skaičiuojama pagal deklaruotas pajamas.
                </Text>
              </View>
            )}

            {/* #7 — High income GPM warning */}
            {taxes.highIncomeSimplified && (
              <View style={[s.minNoteCard, { borderLeftColor: Colors.amber }]}>
                <Text style={[s.minNoteTitle, { color: Colors.amber }]}>Preliminarus GPM</Text>
                <Text style={s.minNoteText}>
                  GPM skaičiavimas preliminarus, nes virš 42 500 € mokestis gali priklausyti nuo
                  bendrų metinių pajamų. Tikslią sumą nustatys VMI deklaracija.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('dashboard.taxProjection')}</Text>
            <Text style={s.emptyHint}>{t('dashboard.emptyTax')}</Text>
          </View>
        )}

        {/* Section C — PVM monitor */}
        <View style={[s.card, pvm.status === 'EXCEEDED' && { borderColor: 'rgba(248,113,113,0.35)' }]}>
          <Text style={s.cardTitle}>{t('dashboard.vatMonitor')}</Text>
          {pvm.status === 'EXCEEDED' && <Text style={s.alertText}>{t('dashboard.vatOver')}</Text>}
          {(pvm.status === 'WARNING' || pvm.status === 'CRITICAL') && (
            <Text style={s.warnText}>{t('dashboard.vatNear')}</Text>
          )}
          <View style={s.pvmRow}>
            <Text style={s.pvmLabel}>{t('dashboard.vatCurrent')}</Text>
            <Text style={[s.pvmValue, {
              color: pvm.status === 'EXCEEDED' ? Colors.red
                   : pvm.status === 'SAFE'     ? Colors.text1
                   : Colors.amber,
            }]}>{formatEur(totals.income)}</Text>
          </View>
          <View style={s.progressWrap}>
            <View style={[s.progressFill, {
              width: `${Math.round(pvm.percentageUsed * 100)}%` as any,
              backgroundColor: pvm.status === 'EXCEEDED' ? Colors.red
                             : pvm.status === 'SAFE'     ? Colors.green
                             : Colors.amber,
            }]} />
          </View>
          <View style={s.pvmRow}>
            <Text style={s.pvmLabel}>{t('dashboard.vatRemaining')}</Text>
            <Text style={s.pvmValue}>{formatEur(pvm.remaining)}</Text>
          </View>
          <Text style={s.pvmLimit}>{t('dashboard.vatLimit')}: {formatEur(TAX_2026.PVM_THRESHOLD)}{t('dashboard.perYear')}</Text>
        </View>

        {/* Section D — Next deadline */}
        {deadline && (
          <View style={s.deadlineCard}>
            <View style={s.deadlineLeft}>
              <Text style={s.cardTitle}>{t('dashboard.nextDeadline')}</Text>
              <Text style={s.deadlineName}>{deadline.label}</Text>
            </View>
            <View style={s.deadlineBadge}>
              <Text style={s.deadlineDays}>{deadline.daysLeft}</Text>
              <Text style={s.deadlineDaysLbl}>{t('dashboard.daysLeft')}</Text>
            </View>
          </View>
        )}

        {/* Optimization card */}
        {optimization && (
          <View style={s.optCard}>
            <Text style={s.cardTitle}>{t('dashboard.recommendation')}</Text>
            <View style={s.optRow}>
              <View style={s.optCol}>
                <Text style={s.optLbl}>{t('dashboard.currentType')}</Text>
                <Text style={s.optVal}>{optimization.current}</Text>
              </View>
              <Text style={s.optArrow}>→</Text>
              <View style={s.optCol}>
                <Text style={[s.optLbl, { color: Colors.green }]}>{t('dashboard.betterOption')}</Text>
                <Text style={[s.optVal, { color: Colors.green }]}>{optimization.best}</Text>
              </View>
            </View>
            <View style={s.optDiffRow}>
              <Text style={s.optDiffLbl}>{t('dashboard.possibleDiff')}</Text>
              <Text style={s.optDiffVal}>+{formatEur(optimization.diff)}{t('dashboard.perYear')}</Text>
            </View>
            <Text style={s.optNote}>{t('dashboard.recNote')}</Text>
          </View>
        )}

        {/* Bank income card (shown when there's some income) */}
        {totals.income > 0 && (
          <TouchableOpacity
            style={s.bankCard}
            onPress={() => router.push('/credit-income' as any)}
            activeOpacity={0.85}
          >
            <View style={s.bankCardLeft}>
              <Text style={s.bankCardTitle}>Būsto paskolos pajamų skaičiuoklė</Text>
              <Text style={s.bankCardSub}>Grynosios pajamos paskolai / lizingui</Text>
            </View>
            <View style={s.bankCardArrow}>
              <Text style={{ fontSize: 18, color: '#1E3A8A', fontWeight: '700' }}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Section E — Quick actions */}
        <View style={s.actionsRow}>
          <ActionBtn label={t('dashboard.addIncome')} color={Colors.green} onPress={() => router.push({ pathname: '/(tabs)/journal', params: { openModal: 'true' } })} />
          <ActionBtn label={t('dashboard.compare')}   color={Colors.blue}  onPress={() => router.push('/(tabs)/compare')} />
          <ActionBtn label={t('dashboard.pdfReport')} color={Colors.amber} onPress={() => router.push('/(tabs)/reports')} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.sumCard, { borderColor: `${color}22` }]}>
      <Text style={s.sumLabel}>{label}</Text>
      <Text style={[s.sumValue, { color }]}>{value}</Text>
    </View>
  );
}

function ActionBtn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.actionBtn, { borderColor: `${color}33` }]} onPress={onPress}>
      <Text style={[s.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },

  header:   { marginBottom: 20 },
  title:    { fontSize: 26, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.text2, marginTop: 2 },

  toggleRow:       { flexDirection: 'row', gap: 8, marginBottom: 14 },
  toggleBtn:       { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.surface2, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  toggleBtnActive: { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.3)' },
  toggleTxt:       { fontSize: 12, fontWeight: '600', color: Colors.text3 },
  toggleTxtActive: { color: Colors.blue },
  projNote:        { fontSize: 11, color: Colors.blue, marginBottom: 10, textAlign: 'center' },

  row3: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sumCard:  { flex: 1, backgroundColor: Colors.surface1, borderRadius: 14, padding: 12, borderWidth: 1 },
  sumLabel: { fontSize: 9, color: Colors.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  sumValue: { fontSize: 14, fontWeight: '800' },

  card:      { backgroundColor: Colors.surface1, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 11, fontWeight: '600', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },

  taxCardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 },
  modeLabel:          { fontSize: 9, color: Colors.blue, fontWeight: '600', backgroundColor: Colors.blueDim, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, flexShrink: 1, textAlign: 'right' },
  taxContextRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: Colors.surface2, borderRadius: 10, padding: 10, marginBottom: 10 },
  taxContextTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  taxContextLbl:      { fontSize: 12, fontWeight: '600', color: Colors.text1 },
  taxContextSub:      { fontSize: 10, color: Colors.text3, lineHeight: 15 },
  taxContextVal:      { fontSize: 14, fontWeight: '800', color: Colors.blue, marginLeft: 8 },
  taxSummaryBlock:    { backgroundColor: Colors.surface2, borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 6 },
  taxSummaryRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taxSummaryLbl:      { fontSize: 13, fontWeight: '600', color: Colors.text1 },
  taxSummaryVal:      { fontSize: 15, fontWeight: '800' },

  taxRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  taxLabel:    { fontSize: 13, color: Colors.text2 },
  taxValue:    { fontSize: 13, fontWeight: '700' },
  taxNote:     { fontSize: 10, color: Colors.text3, marginTop: 10 },
  minNoteCard: { backgroundColor: Colors.surface2, borderRadius: 10, padding: 10, marginTop: 10, borderLeftWidth: 3, borderLeftColor: Colors.amber },
  minNoteTitle:{ fontSize: 11, fontWeight: '700', color: Colors.amber, marginBottom: 4 },
  minNoteText: { fontSize: 11, color: Colors.text2, lineHeight: 16 },
  emptyHint:   { fontSize: 13, color: Colors.text3, textAlign: 'center', paddingVertical: 8 },

  alertText: { fontSize: 13, color: Colors.red, fontWeight: '600', marginBottom: 10 },
  warnText:  { fontSize: 13, color: Colors.amber, fontWeight: '600', marginBottom: 10 },

  pvmRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  pvmLabel:  { fontSize: 12, color: Colors.text2 },
  pvmValue:  { fontSize: 12, fontWeight: '700', color: Colors.text1 },
  progressWrap: { height: 6, backgroundColor: Colors.surface3, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  pvmLimit:  { fontSize: 10, color: Colors.text3, marginTop: 4 },

  deadlineCard:  { backgroundColor: Colors.surface2, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center' },
  deadlineLeft:  { flex: 1 },
  deadlineName:  { fontSize: 15, fontWeight: '700', color: Colors.text1 },
  deadlineBadge: { alignItems: 'center', backgroundColor: Colors.blueDim, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  deadlineDays:  { fontSize: 22, fontWeight: '800', color: Colors.blue },
  deadlineDaysLbl: { fontSize: 10, color: Colors.blue, fontWeight: '600' },

  bankCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,58,138,0.10)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(30,58,138,0.25)' },
  bankCardLeft:  { flex: 1 },
  bankCardTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A8A', marginBottom: 3 },
  bankCardSub:   { fontSize: 12, color: '#374151' },
  bankCardArrow: { width: 30, alignItems: 'center' },

  optCard:    { backgroundColor: Colors.surface1, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(45,212,191,0.25)' },
  optRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  optCol:     { flex: 1 },
  optLbl:     { fontSize: 10, color: Colors.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  optVal:     { fontSize: 14, fontWeight: '700', color: Colors.text1 },
  optArrow:   { fontSize: 20, color: Colors.text3, marginHorizontal: 12 },
  optDiffRow: { backgroundColor: Colors.greenDim, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  optDiffLbl: { fontSize: 12, color: Colors.green },
  optDiffVal: { fontSize: 16, fontWeight: '800', color: Colors.green },
  optNote:    { fontSize: 10, color: Colors.text3, lineHeight: 15 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn:  { flex: 1, backgroundColor: Colors.surface1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, minHeight: 64, justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 18 },
});

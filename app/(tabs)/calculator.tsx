import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Switch, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { useEmployeeCalc, useIVCalc, useMBCalc } from '../../src/hooks/useCalculator';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useFormatting } from '../../src/hooks/useFormatting';
import { TAX_2026 } from '../../src/constants/tax2026';
import { UserType, EmployerGroup } from '../../src/types';


export default function CalculatorScreen() {
  const { t }                      = useTranslation();
  const { userType, setUserType }  = useSettingsStore();
  const { formatEur, formatPct }   = useFormatting();

  const MODES = [
    { key: 'employee' as const, label: t('calculator.modes.employee') },
    { key: 'iv'       as const, label: t('calculator.modes.iv') },
    { key: 'mb'       as const, label: t('calculator.modes.mb') },
  ];

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>{t('calculator.title')}</Text>
              <Text style={s.subtitle}>{t('calculator.subtitle')}</Text>
            </View>
            <View style={s.badge}>
              <Text style={s.badgeText}>2026</Text>
            </View>
          </View>

          {/* Mode selector */}
          <View style={s.modeRow}>
            {MODES.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[s.modeBtn, userType === m.key && s.modeBtnActive]}
                onPress={() => setUserType(m.key)}
              >
                <Text style={[s.modeBtnText, userType === m.key && s.modeBtnTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          {userType === 'employee' && <EmployeeCalc formatEur={formatEur} formatPct={formatPct} />}
          {userType === 'iv'       && <IVCalc       formatEur={formatEur} />}
          {userType === 'mb'       && <MBCalc       formatEur={formatEur} />}

          {/* Rates reference */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('calculator.rates2026')}</Text>
            {[
              [t('calculator.mma'),    `${TAX_2026.MMA} €`],
              [t('calculator.npdBase'), `${TAX_2026.NPD_BASE} €`],
              [t('calculator.vdu'),    `${TAX_2026.VDU} €`],
              ['GPM 20% (iki 83 237 €/m.)', '20 %'],
              ['GPM 25% (iki 138 729 €/m.)', '25 %'],
              ['GPM 32% (virš 138 729 €/m.)', '32 %'],
              [t('calculator.psd'), '6,98 %'],
              [t('calculator.vsd'), '12,52 %'],
            ].map(([label, value]) => (
              <View key={label} style={s.rateRow}>
                <Text style={s.rateLbl}>{label}</Text>
                <Text style={s.rateVal}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={s.footer}>{t('calculator.footer')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Employee sub-screen ───────────────────────────────────────
function EmployeeCalc({ formatEur, formatPct }: { formatEur: Function; formatPct: Function }) {
  const { t } = useTranslation();
  const { amount, setAmount, isGross, setIsGross, result } = useEmployeeCalc();
  const { isPension, isNPD, employerGroup, setIsPension, setIsNPD, setEmployerGroup } = useSettingsStore();
  const [rawText, setRawText] = useState('');

  function handleAmountChange(text: string) {
    setRawText(text);
    const num = parseFloat(text.replace(',', '.'));
    if (!isNaN(num) && num > 0) setAmount(num);
  }

  const netPct = result ? (result.net / result.gross) : 0;

  return (
    <>
      {/* Input card */}
      <View style={s.card}>
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleBtn, isGross && s.toggleBtnActive]}
            onPress={() => setIsGross(true)}
          >
            <Text style={[s.toggleText, isGross && s.toggleTextActive]}>{t('calculator.gross')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, !isGross && s.toggleBtnActive]}
            onPress={() => setIsGross(false)}
          >
            <Text style={[s.toggleText, !isGross && s.toggleTextActive]}>{t('calculator.net')}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.amountRow}>
          <TextInput
            style={s.amountInput}
            value={rawText}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
          <Text style={s.eurSign}>€</Text>
        </View>
        <View style={s.amountLine} />
        <Text style={s.amountHint}>
          {isGross ? t('calculator.grossHint') : t('calculator.netHint')}
        </Text>
      </View>

      {/* Result card */}
      {result && (
        <View style={s.resultCard}>
          <View style={s.resultTop}>
            <View>
              <Text style={s.resultLbl}>{t('calculator.toHand')}</Text>
              <Text style={s.resultNet}>{formatEur(result.net)}</Text>
              <Text style={s.resultNetMo}>{Math.round(netPct * 100)}% {t('calculator.netPctLabel')} · {t('calculator.grossLabel')} {formatEur(result.gross)}</Text>
            </View>
            <View style={s.donut}>
              <Text style={s.donutPct}>{Math.round(netPct * 100)}%</Text>
              <Text style={s.donutLbl}>{t('calculator.netPctLabel')}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            {[
              { label: 'GPM',   val: formatEur(result.gpm),   color: Colors.amber },
              { label: 'SODRA', val: formatEur(result.sodra), color: Colors.amber },
              { label: 'NPD',   val: formatEur(result.npd),   color: Colors.green },
            ].map(({ label, val, color }) => (
              <View key={label} style={s.statBox}>
                <Text style={s.statLbl}>{label}</Text>
                <Text style={[s.statVal, { color }]}>{val}</Text>
              </View>
            ))}
          </View>

          {/* Breakdown */}
          {[
            { label: `GPM ${result.gpmRate}`, amount: result.gpm,     color: Colors.amber,  rate: result.gpmRate },
            { label: 'PSD 6.98%',             amount: result.psd,     color: Colors.orange, rate: '6.98%' },
            { label: 'VSD 12.52%',            amount: result.vsd,     color: '#fbbf24',     rate: '12.52%' },
            ...(result.pension > 0 ? [{ label: t('calculator.pensionLabel'), amount: result.pension, color: Colors.blue, rate: '3%' }] : []),
            { label: t('calculator.npd_label'), amount: result.npd, color: Colors.green, rate: '' },
          ].map(row => (
            <View key={row.label} style={s.brRow}>
              <View style={s.brLeft}>
                <View style={[s.brDot, { backgroundColor: row.color }]} />
                <Text style={s.brName}>{row.label}</Text>
              </View>
              <View style={s.brRight}>
                {row.rate ? <Text style={s.brRate}>{row.rate}</Text> : null}
                <Text style={[s.brAmount, { color: row.color }]}>
                  {row.label === t('calculator.npd_label') ? '+' : '-'}{formatEur(row.amount)}
                </Text>
              </View>
            </View>
          ))}

          {/* Employer cost */}
          <View style={s.empBar}>
            <View>
              <Text style={s.empLbl}>{t('calculator.employerCost')}</Text>
              <Text style={s.empSub}>+{formatEur(result.empSodra)} {t('calculator.sodra')}</Text>
            </View>
            <View>
              <Text style={s.empVal}>{formatEur(result.empTotal)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Options */}
      <View style={s.card}>
        <Text style={s.cardTitle}>{t('calculator.optionsTitle')}</Text>
        <OptionSwitch
          label={t('calculator.pension')}
          sub={t('calculator.pensionSub')}
          value={isPension}
          onChange={setIsPension}
        />
        <OptionSwitch
          label={t('calculator.npd')}
          sub={t('calculator.npdSub')}
          value={isNPD}
          onChange={setIsNPD}
        />
        <View style={s.optRow}>
          <View style={s.optLeft}>
            <Text style={s.optLbl}>{t('calculator.employerGroup')}</Text>
            <Text style={s.optSub}>{t('calculator.employerGroupSub')}</Text>
          </View>
          <View style={s.grpRow}>
            {([1, 2, 3, 4] as EmployerGroup[]).map(g => (
              <TouchableOpacity
                key={g}
                style={[s.grpBtn, employerGroup === g && s.grpBtnActive]}
                onPress={() => setEmployerGroup(g)}
              >
                <Text style={[s.grpBtnText, employerGroup === g && s.grpBtnTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </>
  );
}

// ── IV sub-screen ─────────────────────────────────────────────
function IVCalc({ formatEur }: { formatEur: Function }) {
  const { t } = useTranslation();
  const { annualIncome, setAnnualIncome, useFlat30, setUseFlat30, actualExpenses, setActualExpenses, result } = useIVCalc();

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{t('calculator.modesLong.iv')}</Text>

      <Text style={s.fieldLbl}>{t('calculator.annualIncome')}</Text>
      <TextInput
        style={s.fieldInput}
        value={String(annualIncome)}
        onChangeText={v => setAnnualIncome(parseFloat(v) || 0)}
        keyboardType="decimal-pad"
      />

      <OptionSwitch
        label={t('calculator.flat30')}
        sub={t('calculator.flat30Sub')}
        value={useFlat30}
        onChange={setUseFlat30}
      />

      {!useFlat30 && (
        <>
          <Text style={s.fieldLbl}>{t('calculator.actualExpenses')}</Text>
          <TextInput
            style={s.fieldInput}
            value={String(actualExpenses)}
            onChangeText={v => setActualExpenses(parseFloat(v) || 0)}
            keyboardType="decimal-pad"
          />
        </>
      )}

      {result && (
        <View style={{ marginTop: 16 }}>
          {[
            { label: t('journal.income'),           val: formatEur(result.grossIncome),          color: Colors.green },
            { label: t('calculator.deductions'),     val: `-${formatEur(result.deductibleExpenses)}`, color: Colors.blue },
            { label: t('calculator.taxableProfit'),  val: formatEur(result.taxableProfit),        color: Colors.text1 },
            { label: `${t('calculator.gpm')} (5–15%)`, val: `-${formatEur(result.gpm)}`,         color: Colors.amber },
            { label: `${t('calculator.vsd')} (12.52%)`, val: `-${formatEur(result.sodraVSD)}`,   color: Colors.amber },
            { label: `${t('calculator.psd')} (6.98%)`,  val: `-${formatEur(result.sodraPSD)}`,   color: Colors.amber },
            { label: t('calculator.netIncome'),      val: formatEur(result.netIncome),            color: Colors.green },
            { label: t('calculator.effectiveRate'),  val: `${result.effectiveRate}%`,             color: Colors.text2 },
          ].map(row => (
            <View key={row.label} style={s.brRow}>
              <Text style={s.brName}>{row.label}</Text>
              <Text style={[s.brAmount, { color: row.color }]}>{row.val}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── MB sub-screen ─────────────────────────────────────────────
function MBCalc({ formatEur }: { formatEur: Function }) {
  const { t } = useTranslation();
  const { opts, updateOpts, result } = useMBCalc();

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{t('calculator.modesLong.mb')}</Text>
      {([
        [t('calculator.annualIncome'),   'annualRevenue'    as const],
        [t('calculator.actualExpenses'), 'annualExpenses'   as const],
        [t('calculator.memberWithdrawal'), 'memberWithdrawal' as const],
        [t('calculator.directorSalary'), 'directorSalary'  as const],
        [t('calculator.dividends'),      'dividends'        as const],
      ] as [string, keyof typeof opts][]).map(([label, key]) => (
        <View key={key}>
          <Text style={s.fieldLbl}>{label}</Text>
          <TextInput
            style={s.fieldInput}
            value={String(opts[key])}
            onChangeText={v => updateOpts({ [key]: parseFloat(v) || 0 })}
            keyboardType="decimal-pad"
          />
        </View>
      ))}

      <OptionSwitch label={t('calculator.newCompany')} sub={t('calculator.newCompanySub')} value={opts.isNewCompany} onChange={v => updateOpts({ isNewCompany: v })} />
      <OptionSwitch label={t('calculator.smallCompany')} sub={t('calculator.smallCompanySub')} value={opts.isSmallCompany} onChange={v => updateOpts({ isSmallCompany: v })} />

      {result && (
        <View style={{ marginTop: 16 }}>
          {[
            { label: t('dashboard.profit'),         val: formatEur(result.profit),                  color: Colors.green },
            { label: `Pelno mokestis (${Math.round(result.profitTaxRate * 100)}%)`, val: `-${formatEur(result.profitTax)}`, color: Colors.amber },
            { label: `${t('calculator.gpm')} (išmoka)`, val: `-${formatEur(result.memberWithdrawalGPM)}`, color: Colors.amber },
            { label: `${t('calculator.sodra')} (išmoka)`, val: `-${formatEur(result.memberWithdrawalSodra)}`, color: Colors.amber },
            { label: `${t('calculator.gpm')} (vadovas)`, val: `-${formatEur(result.directorSalaryGPM)}`, color: Colors.amber },
            { label: t('calculator.totalTax'),      val: formatEur(result.totalTax),                color: Colors.red },
            { label: t('calculator.netToMember'),   val: formatEur(result.netToMember),             color: Colors.green },
            { label: t('calculator.effectiveRate'),  val: `${result.effectiveRate}%`,               color: Colors.text2 },
          ].map(row => (
            <View key={row.label} style={s.brRow}>
              <Text style={s.brName}>{row.label}</Text>
              <Text style={[s.brAmount, { color: row.color }]}>{row.val}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Shared option switch ──────────────────────────────────────
function OptionSwitch({ label, sub, value, onChange }: {
  label: string; sub: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.optRow}>
      <View style={s.optLeft}>
        <Text style={s.optLbl}>{label}</Text>
        <Text style={s.optSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: 'rgba(255,255,255,0.18)', true: Colors.blueDim }}
        thumbColor={value ? Colors.blue : '#9CA3AF'}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  title:      { fontFamily: 'System', fontSize: 24, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  subtitle:   { fontSize: 13, color: Colors.text2, marginTop: 2 },
  badge:      { backgroundColor: Colors.blueDim, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText:  { fontSize: 12, fontWeight: '700', color: Colors.blue },

  modeRow:         { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeBtn:         { flex: 1, paddingVertical: 9, borderRadius: 12, backgroundColor: Colors.surface2, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  modeBtnActive:   { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.3)' },
  modeBtnText:     { fontSize: 12, fontWeight: '600', color: Colors.text3 },
  modeBtnTextActive: { color: Colors.blue },

  card:      { backgroundColor: Colors.surface1, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 11, fontWeight: '600', color: Colors.text2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },

  toggleRow:      { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn:      { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.surface2, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: Colors.surface3 },
  toggleText:     { fontSize: 13, fontWeight: '500', color: Colors.text3 },
  toggleTextActive: { color: Colors.blue, fontWeight: '600' },

  amountRow:  { flexDirection: 'row', alignItems: 'baseline' },
  amountInput: { flex: 1, fontSize: 50, fontWeight: '800', color: Colors.text1, letterSpacing: -2 },
  eurSign:    { fontSize: 28, fontWeight: '600', color: Colors.text3 },
  amountLine: { height: 1, backgroundColor: Colors.blue, opacity: 0.4, marginTop: 6 },
  amountHint: { fontSize: 12, color: Colors.text3, marginTop: 6 },

  resultCard:  { backgroundColor: Colors.surface1, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  resultTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  resultLbl:   { fontSize: 11, color: Colors.text2, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultNet:   { fontSize: 36, fontWeight: '800', color: Colors.green, letterSpacing: -1 },
  resultNetMo: { fontSize: 11, color: Colors.text2, marginTop: 4 },

  donut:    { width: 72, height: 72, borderRadius: 36, borderWidth: 8, borderColor: Colors.green, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface2 },
  donutPct: { fontSize: 16, fontWeight: '800', color: Colors.green },
  donutLbl: { fontSize: 9, color: Colors.text3 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox:  { flex: 1, backgroundColor: Colors.surface3, borderRadius: 10, padding: 10 },
  statLbl:  { fontSize: 10, color: Colors.text3, marginBottom: 4 },
  statVal:  { fontSize: 13, fontWeight: '700' },

  brRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  brLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  brDot:    { width: 7, height: 7, borderRadius: 4 },
  brName:   { fontSize: 13, color: Colors.text2 },
  brRight:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brRate:   { fontSize: 11, color: Colors.text3, backgroundColor: Colors.surface2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  brAmount: { fontSize: 13, fontWeight: '600', minWidth: 80, textAlign: 'right' },

  empBar:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface2, borderRadius: 12, padding: 12, marginTop: 8 },
  empLbl:  { fontSize: 12, color: Colors.text2 },
  empSub:  { fontSize: 11, color: Colors.text3, marginTop: 2 },
  empVal:  { fontSize: 16, fontWeight: '800', color: Colors.text1 },

  optRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  optLeft: { flex: 1, marginRight: 12 },
  optLbl:  { fontSize: 14, color: Colors.text1, fontWeight: '500' },
  optSub:  { fontSize: 11, color: Colors.text3, marginTop: 2 },

  grpRow:        { flexDirection: 'row', gap: 6 },
  grpBtn:        { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  grpBtnActive:  { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.3)' },
  grpBtnText:    { fontSize: 13, fontWeight: '700', color: Colors.text3 },
  grpBtnTextActive: { color: Colors.blue },

  rateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rateLbl: { fontSize: 12, color: Colors.text2 },
  rateVal: { fontSize: 12, fontWeight: '600', color: Colors.text1 },

  fieldLbl:   { fontSize: 11, color: Colors.text3, marginBottom: 6, fontWeight: '500' },
  fieldInput: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: Colors.text1, marginBottom: 14 },

  footer: { fontSize: 11, color: Colors.text3, textAlign: 'center', lineHeight: 18, marginTop: 8 },
});

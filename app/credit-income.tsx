import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Switch, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useJournalStore } from '../src/stores/journalStore';
import { useAuthStore } from '../src/stores/authStore';
import { calcEmployee } from '../src/engine/employeeCalc';
import { calculateCreditIncome } from '../src/features/creditIncome/services/creditIncomeEngine';
import { calculateMortgageAffordability } from '../src/features/creditIncome/services/mortgageAffordability';
import {
  CreditIncomeInput,
  CreditIncomeResult,
  CreditIncomeType,
  MortgageResult,
  PensionAccumulation,
  ExpenseMode,
} from '../src/features/creditIncome/types/creditIncome.types';

const CY = new Date().getFullYear();
const PY = CY - 1;

function eur(n: number) {
  return n.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// ── Sub-components defined OUTSIDE to prevent remounting on every render.
// Defining them inside causes the TextInput to unmount/remount on every state
// change, which closes the keyboard after each keystroke.

interface NumInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  placeholder?: string;
}
function NumInput({ label, value, onChange, hint, placeholder = '0' }: NumInputProps) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.lbl}>{label}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={Colors.text3}
        returnKeyType="done"
      />
    </View>
  );
}

interface RowProps { label: string; value: string; color?: string; bold?: boolean }
function Row({ label, value, color, bold }: RowProps) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLbl, bold && { color: Colors.text1, fontWeight: '700' as const }]}>{label}</Text>
      <Text style={[s.rowVal, color ? { color } : {}, bold && { fontWeight: '800' as const }]}>{value}</Text>
    </View>
  );
}

interface PeriodCardProps {
  title: string;
  r: CreditIncomeResult['previousYear'];
}
function PeriodCard({ title, r }: PeriodCardProps) {
  return (
    <View style={s.periodCard}>
      <Text style={s.periodTitle}>{title}</Text>
      <Row label="Pajamos" value={eur(r.income)} />
      <Row label="Atskaitomos išlaidos" value={`−${eur(r.expensesUsed)}`} />
      <Row label="Apmokestinamasis pelnas" value={eur(r.taxableProfit)} color={Colors.blue} bold />
      <Row label="GPM" value={`−${eur(r.gpm)}`} color={Colors.amber} />
      <Row label="PSD (6,98%)" value={`−${eur(r.psd)}`} color={Colors.amber} />
      <Row label="VSD" value={`−${eur(r.vsd)}`} color={Colors.amber} />
      <Row label="Iš viso mokesčių" value={`−${eur(r.totalTaxes)}`} color={Colors.red} bold />
      <View style={s.divider} />
      <Row label="Grynosios pajamos" value={eur(r.netIncome)} color={Colors.green} bold />
      <Row label="Vidutinis mėn. vidurkis" value={eur(r.avgMonthlyNet)} color={Colors.green} bold />
      {r.warnings.includes('PSD_MINIMUM_APPLIED') && (
        <View style={s.warnNote}><Text style={s.warnTxt}>⚠️ Taikyta minimali mėnesinė PSD įmoka</Text></View>
      )}
      {r.warnings.includes('SODRA_CAP_APPLIED') && (
        <View style={s.warnNote}><Text style={s.warnTxt}>ℹ️ Sodros bazė apribota 43 × VDU riba</Text></View>
      )}
      {r.warnings.includes('HIGH_INCOME_GPM_SIMPLIFIED') && (
        <View style={s.warnNote}><Text style={s.warnTxt}>⚠️ GPM preliminarus — virš 42 500 € gali priklausyti nuo bendrų pajamų</Text></View>
      )}
    </View>
  );
}

type Step = 1 | 2 | 3;

export default function CreditIncomeScreen() {
  const router          = useRouter();
  const { isPremium }   = useAuthStore();
  const { getYearTotal } = useJournalStore();

  const pyJ = getYearTotal(PY);
  const cyJ = getYearTotal(CY);

  // Settings
  const [incomeType,          setIncomeType]          = useState<CreditIncomeType>('INDIVIDUAL_ACTIVITY');
  const [expenseMode,         setExpenseMode]         = useState<ExpenseMode>('FIXED_30_PERCENT');
  const [pensionAccumulation, setPensionAccumulation] = useState<PensionAccumulation>('NONE');
  const [psdInsured,          setPsdInsured]          = useState(false);

  // Previous year
  const [pyIncome,   setPyIncome]   = useState(pyJ.income  > 0 ? String(Math.round(pyJ.income))  : '');
  const [pyExpenses, setPyExpenses] = useState(pyJ.expense > 0 ? String(Math.round(pyJ.expense)) : '');
  const [pyMonths,   setPyMonths]   = useState('12');

  // Recent period
  const [rpIncome,   setRpIncome]   = useState(cyJ.income  > 0 ? String(Math.round(cyJ.income))  : '');
  const [rpExpenses, setRpExpenses] = useState(cyJ.expense > 0 ? String(Math.round(cyJ.expense)) : '');
  const [rpMonths,   setRpMonths]   = useState('6');

  const [step,   setStep]   = useState<Step>(1);
  const [result, setResult] = useState<CreditIncomeResult | null>(null);

  // Employee mode state
  const [empSalary,     setEmpSalary]     = useState('');
  const [empSalaryMode, setEmpSalaryMode] = useState<'NET' | 'GROSS'>('NET');
  const [empPension,    setEmpPension]    = useState(false);
  const [empNPD,        setEmpNPD]        = useState(true);
  const [empBankIncome, setEmpBankIncome] = useState(0);

  // Mortgage
  const [showMortgage, setShowMortgage] = useState(false);
  const [propPrice,    setPropPrice]    = useState('');
  const [downPayment,  setDownPayment]  = useState('');
  const [loanTerm,     setLoanTerm]     = useState('30');
  const [interestRate, setInterestRate] = useState('4.5');
  const [existing,     setExisting]     = useState('0');

  const mortgage: MortgageResult | null = useMemo(() => {
    if (!result || !showMortgage) return null;
    const pp = parseFloat(propPrice);
    const dp = parseFloat(downPayment);
    const lt = parseInt(loanTerm, 10);
    const ir = parseFloat(interestRate.replace(',', '.'));
    const ex = parseFloat(existing.replace(',', '.')) || 0;
    if (!pp || !dp || !lt || !ir) return null;
    return calculateMortgageAffordability({
      propertyPrice:              pp,
      downPayment:                dp,
      loanTermYears:              lt,
      annualInterestRate:         ir,
      existingMonthlyLiabilities: ex,
      creditworthyMonthlyIncome:  (incomeType === 'EMPLOYEE_NET' || incomeType === 'EMPLOYEE_GROSS') ? empBankIncome : result?.creditworthyMonthlyIncome ?? 0,
    });
  }, [result, showMortgage, propPrice, downPayment, loanTerm, interestRate, existing]);

  function handleCalculate() {
    // Employee path — simpler calculation
    if (incomeType === 'EMPLOYEE_NET' || incomeType === 'EMPLOYEE_GROSS') {
      const sal = parseFloat(empSalary.replace(',', '.')) || 0;
      if (sal <= 0) { Alert.alert('Klaida', 'Įveskite mėnesinį atlyginimą'); return; }
      const bankIncome = incomeType === 'EMPLOYEE_NET'
        ? sal
        : calcEmployee(sal, { isPension: empPension, isNPD: empNPD, employerGroup: 1 as const }).net;
      setEmpBankIncome(Math.round(bankIncome * 100) / 100);
      setResult(null);
      setStep(3);
      return;
    }

    // IV path
    const pyI = parseFloat(pyIncome.replace(',', '.')) || 0;
    const pyE = parseFloat(pyExpenses.replace(',', '.')) || 0;
    const pyM = parseInt(pyMonths, 10) || 12;
    const rpI = parseFloat(rpIncome.replace(',', '.')) || 0;
    const rpE = parseFloat(rpExpenses.replace(',', '.')) || 0;
    const rpM = parseInt(rpMonths, 10) || 6;

    if (pyI <= 0) { Alert.alert('Klaida', 'Įveskite praėjusių metų pajamas'); return; }
    if (rpI <= 0) { Alert.alert('Klaida', 'Įveskite paskutinio laikotarpio pajamas'); return; }

    const input: CreditIncomeInput = {
      incomeType,
      expenseMode,
      pensionAccumulation,
      psdInsuredElsewhere: psdInsured,
      previousYear:  { months: pyM, income: pyI, expenses: pyE },
      recentPeriod:  { months: rpM, income: rpI, expenses: rpE },
    };
    setResult(calculateCreditIncome(input));
    setStep(3);
  }

  // ── Step 1: settings ────────────────────────────────────────
  const renderStep1 = () => (
    <>
      <View style={s.card}>
        <Text style={[s.cardTitle, s.cardTitleBorder]}>Pajamų tipas</Text>
        <View style={s.cardContent}>
          {/* Individuali veikla */}
          <TouchableOpacity
            style={[incomeType === 'INDIVIDUAL_ACTIVITY' ? s.typeActive : s.typeInactive]}
            onPress={() => setIncomeType('INDIVIDUAL_ACTIVITY')}
          >
            <Ionicons name="briefcase-outline" size={20} color={incomeType === 'INDIVIDUAL_ACTIVITY' ? Colors.blue : Colors.text3} />
            <View style={s.typeText}>
              <Text style={incomeType === 'INDIVIDUAL_ACTIVITY' ? s.typeLabel : s.typeInactiveLabel}>Individuali veikla (IV pažyma)</Text>
              <Text style={s.typeSub}>Pajamos pagal IV veiklos pažymą</Text>
            </View>
            {incomeType === 'INDIVIDUAL_ACTIVITY' && <View style={s.checkBadge}><Text style={s.checkBadgeTxt}>✓</Text></View>}
          </TouchableOpacity>

          {/* Darbo sutartis */}
          <TouchableOpacity
            style={[
              (incomeType === 'EMPLOYEE_NET' || incomeType === 'EMPLOYEE_GROSS') ? s.typeActive : s.typeInactive
            ]}
            onPress={() => setIncomeType(empSalaryMode === 'NET' ? 'EMPLOYEE_NET' : 'EMPLOYEE_GROSS')}
          >
            <Ionicons name="person-outline" size={20} color={(incomeType === 'EMPLOYEE_NET' || incomeType === 'EMPLOYEE_GROSS') ? Colors.blue : Colors.text3} />
            <View style={s.typeText}>
              <Text style={(incomeType === 'EMPLOYEE_NET' || incomeType === 'EMPLOYEE_GROSS') ? s.typeLabel : s.typeInactiveLabel}>Darbo sutartis</Text>
              <Text style={s.typeSub}>Atlyginimas pagal darbo sutartį</Text>
            </View>
            {(incomeType === 'EMPLOYEE_NET' || incomeType === 'EMPLOYEE_GROSS') && <View style={s.checkBadge}><Text style={s.checkBadgeTxt}>✓</Text></View>}
          </TouchableOpacity>

          <View style={s.typeInactive}>
            <Ionicons name="business-outline" size={20} color={Colors.text3} />
            <View style={s.typeText}><Text style={s.typeInactiveLabel}>MB nario pajamos</Text></View>
            <Text style={s.soon}>Netrukus</Text>
          </View>
          <View style={[s.typeInactive, { borderBottomWidth: 0 }]}>
            <Ionicons name="home-outline" size={20} color={Colors.text3} />
            <View style={s.typeText}><Text style={s.typeInactiveLabel}>Nuomos pajamos</Text></View>
            <Text style={s.soon}>Netrukus</Text>
          </View>
        </View>
      </View>

      <View style={s.card}>
        <Text style={[s.cardTitle, s.cardTitleBorder]}>Išlaidų metodas</Text>
        <View style={s.cardContent}>
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[s.toggleBtn, expenseMode === 'FIXED_30_PERCENT' && s.toggleBtnOn]}
              onPress={() => setExpenseMode('FIXED_30_PERCENT')}
            >
              <Text style={[s.toggleTxt, expenseMode === 'FIXED_30_PERCENT' && s.toggleTxtOn]}>30% fiksuotos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, expenseMode === 'ACTUAL_EXPENSES' && s.toggleBtnOn]}
              onPress={() => setExpenseMode('ACTUAL_EXPENSES')}
            >
              <Text style={[s.toggleTxt, expenseMode === 'ACTUAL_EXPENSES' && s.toggleTxtOn]}>Faktinės išlaidos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={s.card}>
        <Text style={[s.cardTitle, s.cardTitleBorder]}>Sodros nustatymai</Text>
        <View style={s.cardContent}>
          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLbl}>Kaupiu pensiją (II pakopa)</Text>
              <Text style={s.switchSub}>VSD tarifas padidėja iki 15,52%</Text>
            </View>
            <Switch
              value={pensionAccumulation === 'PENSION_3'}
              onValueChange={v => setPensionAccumulation(v ? 'PENSION_3' : 'NONE')}
              trackColor={{ false: 'rgba(255,255,255,0.18)', true: Colors.blueDim }}
              thumbColor={pensionAccumulation !== 'NONE' ? Colors.blue : '#9CA3AF'}
            />
          </View>
          <View style={[s.switchRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLbl}>PSD draudžiama kitur</Text>
              <Text style={s.switchSub}>Neskaitoma minimali mėnesinė PSD įmoka</Text>
            </View>
            <Switch
              value={psdInsured}
              onValueChange={setPsdInsured}
              trackColor={{ false: 'rgba(255,255,255,0.18)', true: Colors.blueDim }}
              thumbColor={psdInsured ? Colors.blue : '#9CA3AF'}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(2)}>
        <Text style={s.primaryBtnTxt}>Toliau — pajamų duomenys</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </>
  );

  // ── Step 2: data input ───────────────────────────────────────
  const renderStep2 = () => {
    // Employee mode: simpler single-salary form
    if (incomeType === 'EMPLOYEE_NET' || incomeType === 'EMPLOYEE_GROSS') {
      return (
        <>
          <View style={s.card}>
            <Text style={[s.cardTitle, s.cardTitleBorder]}>Atlyginimo įvedimo būdas</Text>
            <View style={s.cardContent}>
              <View style={s.toggleRow}>
                <TouchableOpacity
                  style={[s.toggleBtn, empSalaryMode === 'NET' && s.toggleBtnOn]}
                  onPress={() => { setEmpSalaryMode('NET'); setIncomeType('EMPLOYEE_NET'); }}
                >
                  <Text style={[s.toggleTxt, empSalaryMode === 'NET' && s.toggleTxtOn]}>Į rankas (neto)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleBtn, empSalaryMode === 'GROSS' && s.toggleBtnOn]}
                  onPress={() => { setEmpSalaryMode('GROSS'); setIncomeType('EMPLOYEE_GROSS'); }}
                >
                  <Text style={[s.toggleTxt, empSalaryMode === 'GROSS' && s.toggleTxtOn]}>Ant popieriaus (bruto)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={s.card}>
            <Text style={[s.cardTitle, s.cardTitleBorder]}>
              {empSalaryMode === 'NET' ? 'Mėnesinis atlyginimas į rankas (€)' : 'Mėnesinis atlyginimas ant popieriaus (€)'}
            </Text>
            <View style={s.cardContent}>
              <NumInput
                label={empSalaryMode === 'NET' ? 'Neto atlyginimas (€)' : 'Bruto atlyginimas (€)'}
                value={empSalary}
                onChange={setEmpSalary}
                hint={empSalaryMode === 'GROSS' ? 'Programa apskaičiuos neto atlyginimą pagal 2026 m. tarifus' : undefined}
                placeholder="2000"
              />
              {empSalaryMode === 'GROSS' && (
                <>
                  <View style={s.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.switchLbl}>Kaupiu pensiją (II pakopa)</Text>
                      <Text style={s.switchSub}>+3 pp. papildoma įmoka</Text>
                    </View>
                    <Switch value={empPension} onValueChange={setEmpPension}
                      trackColor={{ false: 'rgba(255,255,255,0.18)', true: Colors.blueDim }}
                      thumbColor={empPension ? Colors.blue : '#9CA3AF'} />
                  </View>
                  <View style={[s.switchRow, { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.switchLbl}>Taikau NPD</Text>
                      <Text style={s.switchSub}>Neapmokestinamas pajamų dydis</Text>
                    </View>
                    <Switch value={empNPD} onValueChange={setEmpNPD}
                      trackColor={{ false: 'rgba(255,255,255,0.18)', true: Colors.blueDim }}
                      thumbColor={empNPD ? Colors.blue : '#9CA3AF'} />
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={s.navRow}>
            <TouchableOpacity style={s.secondaryBtn} onPress={() => setStep(1)}>
              <Ionicons name="arrow-back" size={16} color={Colors.text2} />
              <Text style={s.secondaryBtnTxt}>Atgal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={handleCalculate}>
              <Text style={s.primaryBtnTxt}>Skaičiuoti</Text>
              <Ionicons name="calculator-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      );
    }

    // IV mode (original form)
    return (
    <>
      <View style={s.card}>
        <View style={s.cardTitleRow}>
          <Text style={s.cardTitle}>{PY} m. deklaracijos duomenys</Text>
          {pyJ.income > 0 && <View style={s.prefillBadge}><Text style={s.prefillTxt}>Iš žurnalo</Text></View>}
        </View>
        <Text style={s.cardNote}>Pagal deklaruotas praėjusių metų pajamas</Text>
        <View style={s.cardContent}>
          <NumInput
            label="Metinės pajamos (€)"
            value={pyIncome}
            onChange={setPyIncome}
            hint={pyJ.income > 0 ? `Žurnale ${PY} m.: ${eur(pyJ.income)}` : undefined}
          />
          {expenseMode === 'ACTUAL_EXPENSES' && (
            <NumInput
              label="Metinės išlaidos (€)"
              value={pyExpenses}
              onChange={setPyExpenses}
              hint={pyJ.expense > 0 ? `Žurnale ${PY} m.: ${eur(pyJ.expense)}` : undefined}
            />
          )}
          <Text style={s.lbl}>Deklaruojami mėnesiai</Text>
          <View style={s.chipRow}>
            {[12].map(m => (
              <TouchableOpacity key={m} style={[s.chip, pyMonths === String(m) && s.chipOn]}
                onPress={() => setPyMonths(String(m))}>
                <Text style={[s.chipTxt, pyMonths === String(m) && s.chipTxtOn]}>{m} mėn.</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={s.card}>
        <View style={s.cardTitleRow}>
          <Text style={s.cardTitle}>{CY} m. paskutinis laikotarpis</Text>
          {cyJ.income > 0 && <View style={s.prefillBadge}><Text style={s.prefillTxt}>Iš žurnalo</Text></View>}
        </View>
        <Text style={s.cardNote}>Pastarųjų 6 arba 12 mėnesių pajamos</Text>
        <View style={s.cardContent}>
          <NumInput
            label="Pajamos (€)"
            value={rpIncome}
            onChange={setRpIncome}
            hint={cyJ.income > 0 ? `Žurnale šiais metais: ${eur(cyJ.income)}` : undefined}
          />
          {expenseMode === 'ACTUAL_EXPENSES' && (
            <NumInput label="Išlaidos (€)" value={rpExpenses} onChange={setRpExpenses} />
          )}
          <Text style={s.lbl}>Laikotarpis</Text>
          <View style={s.chipRow}>
            {[6, 12].map(m => (
              <TouchableOpacity key={m} style={[s.chip, rpMonths === String(m) && s.chipOn]}
                onPress={() => setRpMonths(String(m))}>
                <Text style={[s.chipTxt, rpMonths === String(m) && s.chipTxtOn]}>{m} mėn.</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={s.navRow}>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => setStep(1)}>
          <Ionicons name="arrow-back" size={16} color={Colors.text2} />
          <Text style={s.secondaryBtnTxt}>Atgal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={handleCalculate}>
          <Text style={s.primaryBtnTxt}>Skaičiuoti</Text>
          <Ionicons name="calculator-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
  }; // end renderStep2

  // ── Step 3: results ──────────────────────────────────────────
  const renderStep3 = () => {
    const isEmployee = incomeType === 'EMPLOYEE_NET' || incomeType === 'EMPLOYEE_GROSS';
    if (!isEmployee && !result) return null;

    // Unified creditworthy income regardless of mode
    const bankIncome = isEmployee ? empBankIncome : result!.creditworthyMonthlyIncome;

    const py = result?.previousYear;
    const rp = result?.recentPeriod;

    return (
      <>
        {/* Main result */}
        <View style={s.resultCard}>
          <Text style={s.resultLbl}>
            {isEmployee ? 'Mėnesinės grynosios pajamos' : 'Banko vertinamos grynosios pajamos'}
          </Text>
          <Text style={s.resultValue}>
            {eur(bankIncome)}
            <Text style={s.resultUnit}>/mėn.</Text>
          </Text>
          {isEmployee ? (
            <View style={s.reasonBadge}>
              <Text style={s.reasonTxt}>
                {incomeType === 'EMPLOYEE_NET'
                  ? 'Naudojamas įvestas neto atlyginimas'
                  : `Neto apskaičiuotas iš ${eur(parseFloat(empSalary) || 0)} bruto atlyginimo`}
              </Text>
            </View>
          ) : (
            <>
              <View style={s.reasonBadge}>
                <Text style={s.reasonTxt}>
                  {result!.selectedReason === 'PREVIOUS_YEAR_LOWER'
                    ? `Naudojamas ${PY} m. vidurkis (mažesnė suma)`
                    : `Naudojamas ${CY} m. ${rp!.months} mėn. vidurkis (mažesnė suma)`}
                </Text>
              </View>
              <Text style={s.conservativeNote}>
                Naudojama mažesnė suma iš {PY} m. vidurkio ({eur(py!.avgMonthlyNet)}/mėn.)
                {' '}ir paskutinių {rp!.months} mėn. vidurkio ({eur(rp!.avgMonthlyNet)}/mėn.)
              </Text>
            </>
          )}
          {!isEmployee && result && py && rp && (
            <View style={s.compareRow}>
              <View style={s.compareCol}>
                <Text style={s.compareLbl}>{PY} m. vidurkis</Text>
                <Text style={[s.compareVal, result.selectedReason === 'PREVIOUS_YEAR_LOWER' && { color: Colors.blue }]}>
                  {eur(py.avgMonthlyNet)}
                </Text>
              </View>
              <View style={s.compareDiv} />
              <View style={s.compareCol}>
                <Text style={s.compareLbl}>Paskutiniai {rp.months} mėn.</Text>
                <Text style={[s.compareVal, result.selectedReason === 'RECENT_PERIOD_LOWER' && { color: Colors.blue }]}>
                  {eur(rp.avgMonthlyNet)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {!isEmployee && py && rp && (
          <>
            <PeriodCard title={`${PY} m. deklaracija (${py.months} mėn.)`} r={py} />
            <PeriodCard title={`${CY} m. paskutiniai ${rp.months} mėn.`}  r={rp} />
          </>
        )}
        {/* #5 — explain annualization for partial periods */}
        {!isEmployee && rp && rp.months < 12 && (
          <View style={s.infoNote}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.blue} />
            <Text style={s.infoNoteTxt}>
              Paskutinių {rp.months} mėn. pajamos annualizuotos ({CY} m. mokesčių skaičiavimui),
              tada GPM pro-racionuotas atgal į {rp.months} mėn. laikotarpį.
            </Text>
          </View>
        )}

        {/* #16 — income history warning */}
        {!isEmployee && rp && rp.months < 6 && (
          <View style={[s.warnNote, { marginBottom: 12 }]}>
            <Text style={s.warnTxt}>
              ⚠️ Pajamų istorija trumpesnė nei 6 mėn. Vertinimas gali būti netikslus.
              LB rekomenduoja mažiausiai 6 mėn. stabilioms pajamoms.
            </Text>
          </View>
        )}

        {/* #12 — individual-only disclaimer */}
        <View style={s.disclaimerCard}>
          <Ionicons name="information-circle-outline" size={15} color={Colors.text3} />
          <Text style={s.disclaimerTxt}>
            Skaičiuoklė vertina vieno asmens pajamas. Neįtraukiamos sutuoktinio pajamos,
            vaikai, išlaikytiniai, pragyvenimo išlaidos ar individualios kredito davėjo taisyklės.
            Skaičiavimas preliminarus ir skirtas informaciniams tikslams.
          </Text>
        </View>

        {/* #14 — family mode placeholder */}
        <View style={s.familyPlaceholder}>
          <Ionicons name="people-outline" size={18} color={Colors.text3} />
          <Text style={s.familyPlaceholderTxt}>Šeimos pajamų vertinimas — netrukus</Text>
        </View>

        {/* Mortgage toggle */}
        <TouchableOpacity style={s.mortgageToggle} onPress={() => setShowMortgage(v => !v)}>
          <Ionicons name="home-outline" size={20} color={Colors.blue} />
          <Text style={s.mortgageToggleTxt}>Būsto paskolos galimybės</Text>
          <Ionicons name={showMortgage ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.text3} />
        </TouchableOpacity>

        {showMortgage && (
          <View style={s.card}>
            <Text style={[s.cardTitle, s.cardTitleBorder]}>Paskolos parametrai</Text>
            <View style={s.cardContent}>
              <NumInput label="Turto vertė (€)" value={propPrice} onChange={setPropPrice} placeholder="200000" />
              <NumInput label="Pradinis įnašas (€)" value={downPayment} onChange={setDownPayment} placeholder="40000" />
              <Text style={s.lbl}>Paskolos terminas</Text>
              <View style={s.chipRow}>
                {[15, 20, 25, 30].map(y => (
                  <TouchableOpacity key={y} style={[s.chip, loanTerm === String(y) && s.chipOn]}
                    onPress={() => setLoanTerm(String(y))}>
                    <Text style={[s.chipTxt, loanTerm === String(y) && s.chipTxtOn]}>{y}m.</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <NumInput label="Palūkanų norma (% per metus)" value={interestRate} onChange={setInterestRate} placeholder="4.5" />
              <NumInput label="Esami mėnesiniai įsipareigojimai (€)" value={existing} onChange={setExisting} hint="Lizingas, kitos paskolos ir pan." placeholder="0" />
            </View>

            {mortgage && (
              <View style={s.mortgageResult}>
                {/* Down payment warning #15 */}
                {mortgage.insufficientDownPayment && (
                  <View style={s.warnNote}>
                    <Text style={s.warnTxt}>⚠️ Pradinis įnašas mažesnis nei 15%. Gali reikėti didesnio pradinio įnašo. (LB reikalavimas)</Text>
                  </View>
                )}

                <Row label="Paskolos suma" value={eur(mortgage.loanAmount)} />
                <View style={s.divider} />

                {/* #3 — "Preliminarios mėnesio įmokos" heading */}
                <Text style={[s.lbl, { marginBottom: 8 }]}>Preliminarios mėnesio įmokos</Text>
                <View style={s.stressRow}>
                  {/* #1 — show actual entered rate */}
                  <View style={s.stressCol}>
                    <Text style={s.stressRateLbl}>Pasirinkta norma {parseFloat(interestRate.replace(',', '.'))}%</Text>
                    <Text style={[s.stressPayment, { color: Colors.blue }]}>{eur(mortgage.monthlyPayment)}</Text>
                    <Text style={s.stressPaySub}>/mėn.</Text>
                    <Text style={[s.stressResult, { color: mortgage.status !== 'NOT_ENOUGH' ? Colors.green : Colors.red }]}>
                      {mortgage.status !== 'NOT_ENOUGH' ? '✓ Atitinka' : '✗ Viršija ribą'}
                    </Text>
                  </View>
                  <View style={s.stressDivider} />
                  {/* #2 — explain stress test is not the actual rate */}
                  <View style={s.stressCol}>
                    <Text style={s.stressRateLbl}>Atsparumo testas {mortgage.stressRate}%</Text>
                    <Text style={[s.stressPayment, { color: Colors.amber }]}>{eur(mortgage.stressMonthlyPayment)}</Text>
                    <Text style={s.stressPaySub}>/mėn.</Text>
                    <Text style={[s.stressResult, { color: mortgage.status === 'ENOUGH' ? Colors.green : Colors.amber }]}>
                      {mortgage.status === 'ENOUGH' ? '✓ Atitinka' : '⚠ Viršija ribą'}
                    </Text>
                  </View>
                </View>
                {/* #2 — explanation that 5% is not what user pays */}
                <View style={s.stressExplain}>
                  <Text style={s.stressExplainTxt}>
                    ℹ️ {mortgage.stressRate}% nėra jūsų mokama norma. Ji naudojama atsparumo patikrinimui — ar paskola būtų pakeliama padidėjus palūkanoms.
                  </Text>
                </View>

                <View style={s.divider} />
                <Row label="Banko vertinamos pajamos" value={`${eur(bankIncome)}/mėn.`} />
                <Row label="Esami įsipareigojimai" value={`−${eur(parseFloat(existing) || 0)}/mėn.`} color={Colors.red} />
                {/* #10 — renamed label */}
                <Row label="Likutis įmokai pagal 40% ribą" value={`${eur(mortgage.availableByNormal)}/mėn.`} color={Colors.green} bold />
                {/* #11 — stress available */}
                <Row label="Likutis pagal 5% testą (50% riba)" value={`${eur(mortgage.availableByStress)}/mėn.`} color={Colors.amber} />

                {/* #5 — clearer ratio labels */}
                <View style={s.ratioRow}>
                  <View style={s.ratioCol}>
                    <Text style={s.ratioLbl}>Įmokų / pajamų santykis{'\n'}pagal pasirinktą normą</Text>
                    <Text style={[s.ratioVal, { color: mortgage.normalRatio <= 0.40 ? Colors.green : Colors.red }]}>
                      {Math.round(mortgage.normalRatio * 100)}%
                    </Text>
                    <Text style={s.ratioLimit}>iš maks. 40%</Text>
                  </View>
                  <View style={s.ratioDivider} />
                  <View style={s.ratioCol}>
                    <Text style={s.ratioLbl}>Įmokų / pajamų santykis{'\n'}pagal 5% atsparumo testą</Text>
                    <Text style={[s.ratioVal, { color: mortgage.stressRatio <= 0.50 ? Colors.green : Colors.amber }]}>
                      {Math.round(mortgage.stressRatio * 100)}%
                    </Text>
                    <Text style={s.ratioLimit}>iš maks. 50%</Text>
                  </View>
                </View>

                {/* #4/5/6/7 — three-state eligibility card */}
                <View style={[s.eligibility, {
                  backgroundColor: mortgage.status === 'ENOUGH' ? Colors.greenDim
                    : mortgage.status === 'CHECK_STRESS' ? Colors.amberDim : Colors.redDim,
                  borderColor: mortgage.status === 'ENOUGH' ? 'rgba(45,212,191,0.3)'
                    : mortgage.status === 'CHECK_STRESS' ? 'rgba(245,158,11,0.3)' : 'rgba(248,113,113,0.3)',
                }]}>
                  <Ionicons
                    name={mortgage.status === 'ENOUGH' ? 'checkmark-circle' : mortgage.status === 'CHECK_STRESS' ? 'warning' : 'alert-circle'}
                    size={20}
                    color={mortgage.status === 'ENOUGH' ? Colors.green : mortgage.status === 'CHECK_STRESS' ? Colors.amber : Colors.red}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    {/* #6 green / #5 yellow / #7 red wording */}
                    <Text style={[s.eligibilityTitle, {
                      color: mortgage.status === 'ENOUGH' ? Colors.green
                        : mortgage.status === 'CHECK_STRESS' ? Colors.amber : Colors.red,
                    }]}>
                      {mortgage.status === 'ENOUGH'
                        ? 'Pagal įvestus duomenis pajamų preliminariai pakaktų'
                        : mortgage.status === 'CHECK_STRESS'
                        ? 'Pagal pasirinktą normą pakanka, bet testinė 5% norma viršija ribą'
                        : 'Pagal įvestus duomenis pajamų preliminariai nepakaktų'}
                    </Text>
                    {mortgage.status === 'CHECK_STRESS' && (
                      <Text style={s.eligibilitySub}>Galimas papildomas banko vertinimas.</Text>
                    )}
                    {mortgage.status === 'NOT_ENOUGH' && (
                      <Text style={s.eligibilitySub}>Reikalingos pajamos: {eur(mortgage.requiredMonthlyIncome)}/mėn.</Text>
                    )}
                  </View>
                </View>

                {/* #4 — explain the two percentage thresholds */}
                <Text style={s.stressNote}>
                  Vertinama pagal 40% ribą su pasirinkta palūkanų norma ir 50% ribą su {mortgage.stressRate}% atsparumo norma.
                  Galutinį sprendimą priima kredito davėjas.
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={[s.secondaryBtn, { alignSelf: 'flex-start', marginTop: 8 }]} onPress={() => setStep(2)}>
          <Ionicons name="arrow-back" size={16} color={Colors.text2} />
          <Text style={s.secondaryBtnTxt}>Keisti duomenis</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBack}>
          <Ionicons name="arrow-back" size={22} color={Colors.blue} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.headerTitle}>Būsto paskolos pajamų skaičiuoklė</Text>
          <Text style={s.headerSub}>IV veikla · individualus preliminarus vertinimas</Text>
        </View>
        {!isPremium && (
          <View style={s.premiumBadge}><Text style={s.premiumTxt}>Premium</Text></View>
        )}
      </View>

      {/* Step dots */}
      <View style={s.stepBar}>
        {([1, 2, 3] as Step[]).map((n, i) => (
          <React.Fragment key={n}>
            {i > 0 && <View style={[s.stepLine, step > i && s.stepLineOn]} />}
            <View style={[s.stepDot, step >= n && s.stepDotOn]}>
              <Text style={[s.stepNum, step >= n && s.stepNumOn]}>{n}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Content — KeyboardAvoidingView prevents keyboard covering inputs */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingBottom: 48 },

  header:     { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerBack: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ fontSize: 16, fontWeight: '800', color: Colors.text1, lineHeight: 20 },
  headerSub:  { fontSize: 11, color: Colors.text3, marginTop: 2 },
  premiumBadge:{ backgroundColor: Colors.purpleDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  premiumTxt: { fontSize: 11, fontWeight: '700', color: Colors.purple },

  stepBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 40 },
  stepDot:    { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotOn:  { backgroundColor: Colors.blue, borderColor: Colors.blue },
  stepNum:    { fontSize: 12, fontWeight: '700', color: Colors.text3 },
  stepNumOn:  { color: '#fff' },
  stepLine:   { flex: 1, height: 2, backgroundColor: Colors.surface2 },
  stepLineOn: { backgroundColor: Colors.blue },

  // Card — no overflow:hidden so text is never clipped by border radius
  card:        { backgroundColor: Colors.surface1, borderRadius: 18, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  // cardTitle used standalone (Step 1): needs its own horizontal padding
  cardTitle:   { fontSize: 11, fontWeight: '800', color: Colors.text2, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  // Bottom border variant for standalone cardTitle
  cardTitleBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  // cardTitleRow used in Step 2 (includes badge): same padding applied via row
  cardTitleRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cardNote:    { fontSize: 11, color: Colors.text3, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cardContent: { padding: 16, paddingTop: 12 },

  prefillBadge:{ backgroundColor: Colors.greenDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  prefillTxt:  { fontSize: 10, fontWeight: '600', color: Colors.green },

  // Type selector rows
  typeActive:   { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: Colors.blueDim, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  typeInactive: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12, opacity: 0.55 },
  typeText:     { flex: 1 },
  typeLabel:    { fontSize: 14, fontWeight: '600', color: Colors.text1 },
  typeSub:      { fontSize: 11, color: Colors.text2, marginTop: 2 },
  typeInactiveLabel:{ fontSize: 14, fontWeight: '600', color: Colors.text2 },
  checkBadge:   { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center' },
  checkBadgeTxt:{ color: '#fff', fontSize: 11, fontWeight: '800' },
  soon:         { fontSize: 10, fontWeight: '600', color: Colors.text3, backgroundColor: Colors.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Expense method toggle
  toggleRow:  { flexDirection: 'row', gap: 8 },
  toggleBtn:  { flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: Colors.surface2, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  toggleBtnOn:{ backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.4)' },
  toggleTxt:  { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  toggleTxtOn:{ color: Colors.blue },

  // Switches
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border },
  switchLbl: { fontSize: 14, fontWeight: '500', color: Colors.text1 },
  switchSub: { fontSize: 11, color: Colors.text3, marginTop: 2 },

  // Number inputs
  fieldWrap: { marginBottom: 14 },
  lbl:       { fontSize: 11, fontWeight: '600', color: Colors.text2, marginBottom: 6 },
  hint:      { fontSize: 10, color: Colors.green, marginBottom: 4 },
  input:     { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.text1 },

  // Month/period chips
  chipRow:   { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip:      { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.surface2, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  chipOn:    { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.4)' },
  chipTxt:   { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  chipTxtOn: { color: Colors.blue },

  // Navigation buttons
  primaryBtn:    { backgroundColor: Colors.blue, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, borderWidth: 1, borderColor: Colors.border },
  secondaryBtnTxt:{ color: Colors.text2, fontWeight: '600', fontSize: 14 },
  navRow:        { flexDirection: 'row', gap: 10, marginTop: 4 },

  // Results
  resultCard:  { backgroundColor: Colors.surface1, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  resultLbl:   { fontSize: 11, fontWeight: '700', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  resultValue: { fontSize: 38, fontWeight: '900', color: Colors.green, letterSpacing: -1, marginBottom: 10 },
  resultUnit:  { fontSize: 16, fontWeight: '500', color: Colors.text3 },
  reasonBadge: { backgroundColor: Colors.greenDim, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 16 },
  reasonTxt:   { fontSize: 12, color: Colors.green, fontWeight: '600', textAlign: 'center' },
  compareRow:  { flexDirection: 'row', width: '100%' },
  compareCol:  { flex: 1, alignItems: 'center' },
  compareDiv:  { width: 1, backgroundColor: Colors.border },
  compareLbl:  { fontSize: 10, color: Colors.text3, marginBottom: 4 },
  compareVal:  { fontSize: 15, fontWeight: '800', color: Colors.text1 },

  periodCard:  { backgroundColor: Colors.surface1, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  periodTitle: { fontSize: 11, fontWeight: '700', color: Colors.text2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLbl:      { fontSize: 12, color: Colors.text2, flex: 1 },
  rowVal:      { fontSize: 12, fontWeight: '600', color: Colors.text1 },
  divider:     { height: 1, backgroundColor: Colors.border2, marginVertical: 8 },
  warnNote:    { backgroundColor: Colors.amberDim, borderRadius: 8, padding: 8, marginTop: 8 },
  warnTxt:     { fontSize: 11, color: Colors.amber, lineHeight: 16 },

  disclaimerCard: { flexDirection: 'row', gap: 10, backgroundColor: Colors.surface1, borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  disclaimerTxt:  { flex: 1, fontSize: 11, color: Colors.text3, lineHeight: 17 },

  mortgageToggle:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface1, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(79,142,247,0.25)', borderStyle: 'dashed' },
  mortgageToggleTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.blue },
  mortgageResult:    { padding: 14, paddingTop: 4 },

  eligibility:     { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1 },
  eligibilityTitle:{ fontSize: 13, fontWeight: '800', marginBottom: 4 },
  eligibilitySub:  { fontSize: 11, color: Colors.text2, marginTop: 2 },

  conservativeNote:{ fontSize: 11, color: Colors.text3, textAlign: 'center', marginTop: 10, lineHeight: 16 },
  infoNote:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.blueDim, borderRadius: 10, padding: 10, marginBottom: 12 },
  infoNoteTxt:     { flex: 1, fontSize: 10, color: Colors.blue, lineHeight: 16 },

  stressRow:     { flexDirection: 'row', marginBottom: 14 },
  stressCol:     { flex: 1, alignItems: 'center', paddingVertical: 10 },
  stressDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  stressRateLbl: { fontSize: 10, color: Colors.text3, marginBottom: 4, textAlign: 'center' },
  stressPayment: { fontSize: 18, fontWeight: '800', marginBottom: 0 },
  stressPaySub:  { fontSize: 10, color: Colors.text3, marginBottom: 4 },
  stressResult:  { fontSize: 11, fontWeight: '700' },
  stressExplain: { backgroundColor: Colors.surface2, borderRadius: 10, padding: 10, marginBottom: 10 },
  stressExplainTxt: { fontSize: 11, color: Colors.text3, lineHeight: 16 },
  stressNote:    { fontSize: 10, color: Colors.text3, marginTop: 10, lineHeight: 15, textAlign: 'center' },

  // Ratio section
  ratioRow:    { flexDirection: 'row', marginVertical: 10, backgroundColor: Colors.surface2, borderRadius: 12, padding: 12 },
  ratioCol:    { flex: 1, alignItems: 'center' },
  ratioDivider:{ width: 1, backgroundColor: Colors.border },
  ratioLbl:    { fontSize: 10, color: Colors.text3, marginBottom: 4, textAlign: 'center' },
  ratioVal:    { fontSize: 20, fontWeight: '900' },
  ratioLimit:  { fontSize: 9, color: Colors.text3, marginTop: 2 },

  familyPlaceholder:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface1, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  familyPlaceholderTxt: { fontSize: 13, color: Colors.text3, fontStyle: 'italic' },
});

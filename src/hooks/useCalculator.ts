import { useState, useMemo } from 'react';
import { calcEmployee, netToGross, EmployeeResult } from '../engine/employeeCalc';
import { calcIV } from '../engine/ivCalc';
import { calcMB, MBResult } from '../engine/mbCalc';
import { useSettingsStore } from '../stores/settingsStore';
import { TaxEstimate, IVOptions, MBOptions } from '../types';

// ── Employee hook ─────────────────────────────────────────────
export function useEmployeeCalc() {
  const { isPension, isNPD, employerGroup } = useSettingsStore();
  const [amount, setAmount]   = useState(0);
  const [isGross, setIsGross] = useState(true);

  const result = useMemo<EmployeeResult | null>(() => {
    if (!amount || amount <= 0) return null;
    const opts = { isPension, isNPD, employerGroup };
    return isGross ? calcEmployee(amount, opts) : netToGross(amount, opts);
  }, [amount, isGross, isPension, isNPD, employerGroup]);

  return { amount, setAmount, isGross, setIsGross, result };
}

// ── IV hook ───────────────────────────────────────────────────
export function useIVCalc() {
  const [annualIncome, setAnnualIncome]     = useState(0);
  const [useFlat30, setUseFlat30]           = useState(true);
  const [actualExpenses, setActualExpenses] = useState(0);

  const result = useMemo<TaxEstimate | null>(() => {
    if (!annualIncome || annualIncome <= 0) return null;
    return calcIV({ annualIncome, useFlat30, actualExpenses });
  }, [annualIncome, useFlat30, actualExpenses]);

  return {
    annualIncome, setAnnualIncome,
    useFlat30, setUseFlat30,
    actualExpenses, setActualExpenses,
    result,
  };
}

// ── MB hook ───────────────────────────────────────────────────
export function useMBCalc() {
  const [opts, setOpts] = useState<MBOptions>({
    annualRevenue:    0,
    annualExpenses:   0,
    isNewCompany:     false,
    isSmallCompany:   false,
    memberWithdrawal: 0,
    directorSalary:   0,
    dividends:        0,
  });

  const result = useMemo<MBResult | null>(() => {
    if (!opts.annualRevenue) return null;
    return calcMB(opts);
  }, [opts]);

  function updateOpts(partial: Partial<MBOptions>) {
    setOpts(prev => ({ ...prev, ...partial }));
  }

  return { opts, updateOpts, result };
}

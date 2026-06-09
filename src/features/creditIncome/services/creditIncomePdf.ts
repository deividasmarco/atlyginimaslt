import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  CreditIncomeInput,
  CreditIncomeResult,
  MortgageInput,
  MortgageResult,
} from '../types/creditIncome.types';

function eur(n: number) {
  return n.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function dt() {
  return new Intl.DateTimeFormat('lt-LT').format(new Date());
}

function periodSection(
  title: string,
  r: CreditIncomeResult['previousYear'],
  expenseMode: string,
): string {
  return `
  <div style="margin-top:20px;">
    <div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #E5E7EB;padding-bottom:6px;margin-bottom:10px">${title}</div>
    <table>
      <tr><td style="color:#4B5563">Pajamos</td><td style="text-align:right;font-weight:600;color:#111827">${eur(r.income)}</td></tr>
      <tr><td style="color:#4B5563">Atskaitomos išlaidos (${expenseMode === 'FIXED_30_PERCENT' ? '30% fiksuotos' : 'faktinės'})</td><td style="text-align:right;color:#DC2626">−${eur(r.expensesUsed)}</td></tr>
      <tr><td style="color:#374151;font-weight:600">Apmokestinamasis pelnas</td><td style="text-align:right;font-weight:700;color:#1D4ED8">${eur(r.taxableProfit)}</td></tr>
      <tr><td style="color:#4B5563">Sodros bazė</td><td style="text-align:right;color:#4B5563">${eur(r.sodraBase)}</td></tr>
      <tr><td style="color:#4B5563">GPM</td><td style="text-align:right;color:#D97706">−${eur(r.gpm)}</td></tr>
      <tr><td style="color:#4B5563">PSD (6,98%)</td><td style="text-align:right;color:#D97706">−${eur(r.psd)}</td></tr>
      <tr><td style="color:#4B5563">VSD</td><td style="text-align:right;color:#D97706">−${eur(r.vsd)}</td></tr>
      <tr style="border-top:2px solid #E5E7EB"><td style="font-weight:700;color:#374151;padding-top:8px">Iš viso mokesčių</td><td style="text-align:right;font-weight:800;color:#DC2626;padding-top:8px">−${eur(r.totalTaxes)}</td></tr>
      <tr style="background:#F0FDF4"><td style="font-weight:800;color:#065F46;padding:8px 4px">Grynosios pajamos (${r.months} mėn.)</td><td style="text-align:right;font-weight:900;color:#059669;padding:8px 4px">${eur(r.netIncome)}</td></tr>
      <tr style="background:#ECFDF5"><td style="font-weight:800;color:#065F46;padding:4px">Mėnesinis vidurkis</td><td style="text-align:right;font-weight:900;color:#059669;padding:4px">${eur(r.avgMonthlyNet)}/mėn.</td></tr>
    </table>
    ${r.warnings.includes('PSD_MINIMUM_APPLIED') ? `<div style="margin-top:6px;font-size:10px;color:#D97706;">⚠️ Taikyta minimali mėnesinė PSD įmoka</div>` : ''}
    ${r.warnings.includes('HIGH_INCOME_GPM_SIMPLIFIED') ? `<div style="margin-top:4px;font-size:10px;color:#D97706;">⚠️ GPM preliminarus virš 42 500 €</div>` : ''}
  </div>`;
}

function mortgageSection(m: MortgageResult, creditIncome: number, annualRate: number = 0): string {
  const colour = m.eligibleByIncome ? '#059669' : '#DC2626';
  return `
  <div style="margin-top:24px;background:#F9FAFB;border-radius:10px;padding:18px;border:1px solid #E5E7EB;">
    <div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Būsto paskolos galimybės</div>
    <table>
      <tr><td style="color:#4B5563">Paskolos suma</td><td style="text-align:right;font-weight:600">${eur(m.loanAmount)}</td></tr>
      <tr><td style="color:#4B5563">Mėnesio įmoka</td><td style="text-align:right;font-weight:800;color:#1D4ED8">${eur(m.monthlyPayment)}</td></tr>
      <tr><td style="color:#4B5563">Banko vertinamos pajamos</td><td style="text-align:right;font-weight:600">${eur(creditIncome)}/mėn.</td></tr>
      <tr><td style="color:#4B5563">Maks. 40% įmokų riba</td><td style="text-align:right;font-weight:600">${eur(m.maxAllowedMonthlyDebt)}/mėn.</td></tr>
      <tr><td style="color:#4B5563">Likutis įmokai pagal 40% ribą</td><td style="text-align:right;font-weight:600;color:#059669">${eur(m.availableByNormal)}/mėn.</td></tr>
    </table>
    <div style="margin-top:12px;padding:12px;border-radius:8px;background:${m.eligibleByIncome ? '#ECFDF5' : '#FEF2F2'};border:1px solid ${m.eligibleByIncome ? '#A7F3D0' : '#FECACA'}">
      <div style="font-size:14px;font-weight:800;color:${colour}">${m.eligibleByIncome ? '✓ Pajamų preliminariai pakaktų' : '✗ Pajamų preliminariai nepakaktų'}</div>
      ${!m.eligibleByIncome ? `<div style="font-size:11px;color:#DC2626;margin-top:4px">Reikalingos pajamos: ${eur(m.requiredMonthlyIncome)}/mėn.</div>` : ''}
      <div style="font-size:11px;color:#6B7280;margin-top:4px">Santykis pagal ${annualRate}%: ${Math.round(m.normalRatio * 100)}% | Testinė 5%: ${Math.round(m.stressRatio * 100)}%</div>
    </div>
  </div>`;
}

export async function generateCreditIncomePDF(
  input: CreditIncomeInput,
  result: CreditIncomeResult,
  mortgageInput?: MortgageInput,
  mortgageResult?: MortgageResult,
): Promise<string | null> {
  const cy = new Date().getFullYear();
  const py = cy - 1;

  const html = `<!DOCTYPE html>
<html lang="lt"><head><meta charset="UTF-8">
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color:#111827; padding:36px; font-size:13px; }
  .logo { font-size:22px; font-weight:800; color:#1E3A8A; }
  .header { border-bottom:2px solid #E5E7EB; padding-bottom:16px; margin-bottom:20px; }
  table { width:100%; border-collapse:collapse; }
  td { padding:6px 4px; border-bottom:1px solid #F3F4F6; font-size:12px; }
  .main-result { background:#F0FDF4; border-radius:12px; padding:20px; text-align:center; margin:20px 0; border:1px solid #A7F3D0; }
  .footer { margin-top:40px; padding-top:14px; border-top:1px solid #E5E7EB; font-size:10px; color:#6B7280; text-align:center; line-height:1.7; }
</style>
</head><body>
<div class="header">
  <div class="logo">Atlyginimas LT</div>
  <div style="font-size:13px;color:#4B5563;margin-top:4px">Banko pajamų vertinimas · Individuali veikla</div>
  <div style="font-size:11px;color:#6B7280;margin-top:4px">Sugeneruota: ${dt()}</div>
</div>

<div class="main-result">
  <div style="font-size:11px;font-weight:700;color:#065F46;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Banko vertinamos grynosios pajamos</div>
  <div style="font-size:36px;font-weight:900;color:#059669">${eur(result.creditworthyMonthlyIncome)}<span style="font-size:16px;font-weight:500;color:#6B7280">/mėn.</span></div>
  <div style="font-size:12px;color:#059669;margin-top:8px;font-weight:600">
    ${result.selectedReason === 'PREVIOUS_YEAR_LOWER'
      ? `${py} m. vidurkis (konservatyvi suma): ${eur(result.previousYear.avgMonthlyNet)}/mėn.`
      : `Paskutinių ${result.recentPeriod.months} mėn. vidurkis (konservatyvi suma): ${eur(result.recentPeriod.avgMonthlyNet)}/mėn.`}
  </div>
</div>

<div style="display:flex;gap:12px;margin-bottom:8px;">
  <div style="flex:1;background:#F9FAFB;border-radius:8px;padding:12px;border:1px solid #E5E7EB;text-align:center;">
    <div style="font-size:10px;color:#6B7280;margin-bottom:4px">${py} m. mėnesinis vidurkis</div>
    <div style="font-size:18px;font-weight:800;color:${result.selectedReason === 'PREVIOUS_YEAR_LOWER' ? '#1D4ED8' : '#374151'}">${eur(result.previousYear.avgMonthlyNet)}</div>
  </div>
  <div style="flex:1;background:#F9FAFB;border-radius:8px;padding:12px;border:1px solid #E5E7EB;text-align:center;">
    <div style="font-size:10px;color:#6B7280;margin-bottom:4px">Paskutiniai ${result.recentPeriod.months} mėn.</div>
    <div style="font-size:18px;font-weight:800;color:${result.selectedReason === 'RECENT_PERIOD_LOWER' ? '#1D4ED8' : '#374151'}">${eur(result.recentPeriod.avgMonthlyNet)}</div>
  </div>
</div>

${periodSection(`${py} m. deklaracijos duomenys (${result.previousYear.months} mėn.)`, result.previousYear, input.expenseMode)}
${periodSection(`${cy} m. paskutiniai ${result.recentPeriod.months} mėn.`, result.recentPeriod, input.expenseMode)}

${mortgageResult && mortgageInput ? mortgageSection(mortgageResult, result.creditworthyMonthlyIncome) : ''}

<div class="footer">
  <strong>Atsakomybės ribojimas</strong><br>
  Skaičiavimas yra preliminarus ir skirtas informaciniams tikslams. Galutinį pajamų vertinimą ir kredito
  sprendimą priima kredito davėjas pagal savo vidaus taisykles ir galiojančius teisės aktus.
  Duomenys: VMI, Sodra 2026 m. · Atlyginimas LT programėlė · ${dt()}
</div>
</body></html>`;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const name    = `Banko_pajamu_vertinimas_${dt().replace(/\./g, '-')}.pdf`;
    const named   = `${FileSystem.cacheDirectory}${name}`;
    await FileSystem.copyAsync({ from: uri, to: named });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(named, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    }
    return named;
  } catch (e) {
    console.error('Credit income PDF failed:', e);
    return null;
  }
}

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { JournalEntry, MonthSummary, PDFReportOptions } from '../types';
import { checkPVMWarning } from '../engine/ivCalc';
import { calcForecastTaxes } from '../utils/taxForecast';

const REPORT_FILENAMES: Record<string, string> = {
  bank:      'Ataskaita_bankui',
  monthly:   'Menesine_ataskaita',
  quarterly: 'Ketvirciu_ataskaita',
  annual:    'Metine_VMI_suvestine',
};

const MONTH_NAMES_LT = [
  '', 'sausis','vasaris','kovas','balandis','gegužė','birželis',
  'liepa','rugpjūtis','rugsėjis','spalis','lapkritis','gruodis',
];

function formatEur(amount: number): string {
  return amount.toLocaleString('lt-LT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €';
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('lt-LT').format(date);
}

function taxSection(income: number, actualExpenses: number = 0): string {
  const taxes = calcForecastTaxes(income);
  if (!taxes) return '';
  const deductible    = income * 0.3;
  const taxableProfit = Math.max(0, income - deductible);
  const netAfterAll   = income - actualExpenses - taxes.totalTax;
  const minNote = taxes.belowMinSodra
    ? `<div style="font-size:11px;color:#b45309;margin-top:8px;padding-top:8px;border-top:1px solid #fde68a;">
        ⚠️ Jeigu nesate draustas PSD kitur, gali būti taikoma minimali mėnesinė PSD įmoka. VSD skaičiuojama pagal deklaruotas pajamas.
       </div>`
    : '';
  const highNote = taxes.highIncomeSimplified
    ? `<div style="font-size:11px;color:#b45309;margin-top:6px;">
        ⚠️ GPM skaičiavimas preliminarus virš 42 500 €. Tikslią sumą nustatys VMI deklaracija.
       </div>`
    : '';
  return `
  <div style="margin-top:24px;">
    <div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin-bottom:12px">Prognozuojami mokesčiai</div>
    <div style="background:#fffbeb;border-radius:10px;padding:16px;border:1px solid #fde68a;">
      <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #fef3c7;font-size:12px">
        <span style="color:#4B5563">Apmokestinamasis pelnas (pajamos − 30%)</span>
        <span style="color:#111827;font-weight:600">${formatEur(taxableProfit)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #fef3c7;font-size:12px">
        <span style="color:#4B5563">GPM</span><span style="color:#d97706;font-weight:600">${formatEur(taxes.gpm)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #fef3c7;font-size:12px">
        <span style="color:#4B5563">PSD (6,98%)</span><span style="color:#d97706;font-weight:600">${formatEur(taxes.psd)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #fde68a;font-size:12px">
        <span style="color:#4B5563">VSD (12,52%)</span><span style="color:#d97706;font-weight:600">${formatEur(taxes.vsd)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0 4px;font-size:14px;font-weight:800">
        <span style="color:#111827">Iš viso mokesčių</span><span style="color:#dc2626">${formatEur(taxes.totalTax)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0 0;font-size:13px;font-weight:700;border-top:1px solid #fde68a;margin-top:4px">
        <span style="color:#111827">Likutis po mokesčių</span><span style="color:#059669">${formatEur(netAfterAll)}</span>
      </div>
      <div style="font-size:10px;color:#6B7280;margin-top:10px">Pagal IV skaičiavimą, 30% fiksuotos išlaidos. Tikslūs mokesčiai priklauso nuo veiklos tipo.</div>
      ${minNote}${highNote}
    </div>
  </div>`;
}

function pvmSection(income: number): string {
  const pvm   = checkPVMWarning(income);
  const limit = 45000;
  const pct   = Math.min(100, Math.round((income / limit) * 100));
  const barColor = pvm.isOverLimit ? '#dc2626' : pvm.isNearLimit ? '#d97706' : '#059669';
  // #6 — Safer wording when exceeded
  const statusText = pvm.isOverLimit
    ? '🚨 Viršyta PVM riba – gali atsirasti prievolė registruotis PVM mokėtoju'
    : pvm.isNearLimit
      ? '⚠️ Artėja PVM registracijos riba'
      : '✓ PVM registracijos nereikia';
  return `
  <div style="margin-top:20px;">
    <div style="font-size:11px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;margin-bottom:12px">PVM statusas</div>
    <div style="background:#f9fafb;border-radius:10px;padding:16px;">
      <div style="font-size:13px;font-weight:600;color:${barColor};margin-bottom:10px">${statusText}</div>
      <div style="background:#e5e7eb;border-radius:4px;height:8px;margin-bottom:10px;overflow:hidden">
        <div style="background:${barColor};height:8px;width:${pct}%;border-radius:4px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="color:#374151">Apyvarta: <strong style="color:#111827">${formatEur(income)}</strong></span>
        <span style="color:#374151">Riba: <strong style="color:#111827">${formatEur(limit)} / metus</strong></span>
      </div>
    </div>
  </div>`;
}

export function buildPDFHTML(
  entries: JournalEntry[],
  summary: MonthSummary,
  opts: PDFReportOptions,
): string {
  const income  = entries.filter(e => e.type === 'income');
  const expense = entries.filter(e => e.type === 'expense');
  const periodLabel = opts.month
    ? `${MONTH_NAMES_LT[opts.month]} ${opts.year} m.`
    : `${opts.year} m.`;

  const rows = (list: JournalEntry[], color: string) =>
    list.map(e => `
      <tr>
        <td class="dim">${formatDate(e.date)}</td>
        <td>${e.description}${e.invoiceNumber ? `<br><span style="font-size:10px;color:#6B7280">${e.invoiceNumber}</span>` : ''}</td>
        <td class="dim">${e.supplierName ?? e.clientName ?? e.category}</td>
        <td style="text-align:right;font-weight:700;color:${color}">
          ${e.type === 'income' ? '+' : '-'}${formatEur(e.amount)}
        </td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="lt"><head><meta charset="UTF-8">
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color:#111827; padding:40px; font-size:13px; }
  .logo { font-size:24px; font-weight:800; color:#1E3A8A; }
  .header { border-bottom:2px solid #E5E7EB; padding-bottom:20px; margin-bottom:24px; }
  .summary { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:28px; }
  .sum-box { background:#F9FAFB; border-radius:10px; padding:16px; border:1px solid #E5E7EB; }
  .sum-lbl { font-size:9px; font-weight:700; color:#6B7280; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
  .sum-val { font-size:20px; font-weight:800; }
  table { width:100%; border-collapse:collapse; margin-bottom:24px; }
  th { font-size:10px; font-weight:700; color:#374151; text-align:left; padding:7px 5px; border-bottom:2px solid #D1D5DB; text-transform:uppercase; letter-spacing:0.5px; }
  td { padding:9px 5px; border-bottom:1px solid #E5E7EB; font-size:12px; color:#111827; }
  td.dim { color:#4B5563; }
  .totals { background:#F9FAFB; border-radius:10px; padding:20px; border:1px solid #E5E7EB; }
  .total-row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#374151; }
  .total-final { border-top:2px solid #111827; margin-top:8px; padding-top:10px; font-weight:800; font-size:15px; color:#111827; }
  .footer { margin-top:40px; padding-top:16px; border-top:1px solid #E5E7EB; font-size:10px; color:#6B7280; text-align:center; line-height:1.7; }
  .sec-title { font-size:11px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #E5E7EB; padding-bottom:8px; margin-bottom:12px; }
</style>
</head><body>
  <div class="header">
    <div class="logo">Atlyginimas LT</div>
    <div style="font-size:13px;color:#4B5563;margin-top:4px">Pajamų ir išlaidų ataskaita</div>
    <div style="font-size:13px;font-weight:700;margin-top:6px;color:#111827">Laikotarpis: ${periodLabel}</div>
    <div style="font-size:11px;color:#6B7280;margin-top:4px">Sugeneruota: ${formatDate(new Date())}</div>
  </div>
  <div class="summary">
    <div class="sum-box"><div class="sum-lbl">Pajamos</div><div class="sum-val" style="color:#059669">${formatEur(summary.totalIncome)}</div></div>
    <div class="sum-box"><div class="sum-lbl">Išlaidos</div><div class="sum-val" style="color:#dc2626">${formatEur(summary.totalExpense)}</div></div>
    <div class="sum-box"><div class="sum-lbl">Pelnas / Nuostolis</div><div class="sum-val" style="color:${summary.balance >= 0 ? '#1e40af' : '#dc2626'}">${formatEur(summary.balance)}</div></div>
  </div>
  ${income.length > 0 ? `
  <div class="sec-title">Pajamos</div>
  <table><thead><tr><th>Data</th><th>Aprašymas</th><th>Tiekėjas / Kategorija</th><th style="text-align:right">Suma</th></tr></thead>
  <tbody>${rows(income, '#059669')}</tbody></table>` : ''}
  ${expense.length > 0 ? `
  <div class="sec-title">Išlaidos</div>
  <table><thead><tr><th>Data</th><th>Aprašymas</th><th>Tiekėjas / Kategorija</th><th style="text-align:right">Suma</th></tr></thead>
  <tbody>${rows(expense, '#dc2626')}</tbody></table>` : ''}
  <div class="totals">
    <div class="total-row"><span>Iš viso pajamų</span><span style="color:#059669;font-weight:600">${formatEur(summary.totalIncome)}</span></div>
    <div class="total-row"><span>Iš viso išlaidų</span><span style="color:#dc2626;font-weight:600">−${formatEur(summary.totalExpense)}</span></div>
    <div class="total-row total-final"><span>Pelnas / Nuostolis</span><span style="color:${summary.balance >= 0 ? '#1E3A8A' : '#dc2626'}">${summary.balance >= 0 ? '+' : ''}${formatEur(summary.balance)}</span></div>
  </div>
  ${taxSection(summary.totalIncome, summary.totalExpense)}
  ${pvmSection(summary.totalIncome)}
  <div class="footer">
    Sugeneruota: ${formatDate(new Date())}<br>
    Ši ataskaita sugeneruota Atlyginimas LT programėlės pagalba.<br>
    Dokumentas informaciniais tikslais. Tikslūs mokesčiai gali skirtis priklausomai nuo veiklos tipo.
  </div>
</body></html>`;
}

export async function generatePDF(
  entries: JournalEntry[],
  summary: MonthSummary,
  opts: PDFReportOptions,
): Promise<string | null> {
  try {
    const html = buildPDFHTML(entries, summary, opts);

    const now       = new Date();
    const datePart  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timePart  = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const typeName  = REPORT_FILENAMES[opts.type] ?? 'Ataskaita';
    const fileName  = `${typeName}_${datePart}_${timePart}`;

    const { uri: tmpUri } = await Print.printToFileAsync({ html, base64: false });

    // Copy to a named file so the share sheet shows the correct filename
    const namedUri = `${FileSystem.cacheDirectory}${fileName}.pdf`;
    await FileSystem.copyAsync({ from: tmpUri, to: namedUri });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(namedUri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    }

    return namedUri;
  } catch (error) {
    console.error('PDF generation failed:', error);
    return null;
  }
}

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { SalesInvoice, Client, BusinessProfile } from '../types/business';

function eur(n: number): string {
  return n.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function dt(iso: string): string {
  return new Intl.DateTimeFormat('lt-LT').format(new Date(iso));
}

export function buildInvoiceHTML(
  invoice: SalesInvoice,
  client: Client,
  profile: BusinessProfile,
): string {
  const isVatPayer   = profile.vatPayer && !!profile.vatCode;
  const invoiceTitle = isVatPayer ? 'PVM SĄSKAITA FAKTŪRA' : 'SĄSKAITA FAKTŪRA';

  const sellerName = profile.businessType === 'MB'
    ? (profile.companyName ?? '')
    : (profile.personName ?? '');

  const sellerCode = profile.businessType === 'MB'
    ? profile.companyCode
    : profile.personalCode;

  // Seller block lines
  const sellerLines = [
    sellerName                   && `<div style="font-size:15px;font-weight:700;color:#111827">${sellerName}</div>`,
    profile.activityName         && `<div style="font-size:12px;color:#4B5563">${profile.activityName}${profile.activityCode ? ' · ' + profile.activityCode : ''}</div>`,
    sellerCode                   && `<div style="font-size:12px;color:#4B5563">Kodas: ${sellerCode}</div>`,
    isVatPayer && profile.vatCode && `<div style="font-size:12px;color:#4B5563">PVM kodas: ${profile.vatCode}</div>`,
    profile.address              && `<div style="font-size:12px;color:#4B5563">${profile.address}</div>`,
    profile.email                && `<div style="font-size:12px;color:#4B5563">${profile.email}</div>`,
    profile.phone                && `<div style="font-size:12px;color:#4B5563">${profile.phone}</div>`,
    profile.iban                 && `<div style="font-size:12px;color:#4B5563">IBAN: ${profile.iban}</div>`,
  ].filter(Boolean).join('');

  const itemRows = invoice.items.map((item, i) => `
    <tr style="border-bottom:1px solid #E5E7EB">
      <td style="padding:9px 6px;color:#374151">${i + 1}</td>
      <td style="padding:9px 6px;color:#111827;font-weight:500">${item.description}</td>
      <td style="padding:9px 6px;text-align:right;color:#374151">${item.quantity}</td>
      <td style="padding:9px 6px;text-align:right;color:#374151">${eur(item.unitPrice)}</td>
      <td style="padding:9px 6px;text-align:right;color:#374151">${item.vatRate > 0 ? Math.round(item.vatRate * 100) + '%' : isVatPayer ? '0%' : '–'}</td>
      <td style="padding:9px 6px;text-align:right;font-weight:700;color:#111827">${eur(item.total)}</td>
    </tr>
  `).join('');

  // Use divs, not tr — these go inside a <div class="totals-block">, not a <table>
  const vatLine = isVatPayer
    ? (invoice.vatAmount > 0
        ? `<div class="total-row"><span>PVM:</span><span style="font-weight:600;color:#111827">${eur(invoice.vatAmount)}</span></div>`
        : '')
    : `<div class="total-row"><span style="color:#6B7280">PVM:</span><span style="color:#6B7280">PVM netaikomas</span></div>`;

  return `<!DOCTYPE html>
<html lang="lt"><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111827; padding: 48px; font-size: 13px; }
  .title { font-size: 22px; font-weight: 800; color: #1E3A8A; margin-bottom: 4px; }
  .inv-number { font-size: 16px; font-weight: 700; color: #374151; }
  .section-header { display: flex; justify-content: space-between; margin-bottom: 28px; }
  .party { min-width: 45%; }
  .party-label { font-size: 9px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
  .meta-grid { display: flex; gap: 28px; background: #F3F4F6; border-radius: 10px; padding: 14px 18px; margin-bottom: 28px; border: 1px solid #D1D5DB; }
  .meta-item .lbl { font-size: 9px; font-weight: 700; color: #374151; text-transform: uppercase; margin-bottom: 3px; }
  .meta-item .val { font-size: 14px; font-weight: 800; color: #111827; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  thead tr { background: #F3F4F6; }
  th { font-size: 10px; font-weight: 700; color: #374151; text-align: left; padding: 9px 6px; border-bottom: 2px solid #D1D5DB; text-transform: uppercase; letter-spacing: 0.5px; }
  .totals-block { margin-left: auto; width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #4B5563; }
  .total-final { border-top: 2px solid #111827; margin-top: 8px; padding-top: 10px; font-size: 16px; font-weight: 800; color: #111827; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #6B7280; text-align: center; line-height: 1.7; }
  .notes-box { margin-bottom: 20px; padding: 12px 16px; background: #F9FAFB; border-left: 3px solid #D1D5DB; font-size: 12px; color: #374151; }
</style>
</head><body>

<div class="section-header">
  <div>
    <div class="title">${invoiceTitle}</div>
    <div class="inv-number">${invoice.invoiceNumber}</div>
  </div>
  <div>
    <div class="status-badge" style="background:${invoice.status === 'PAID' ? '#D1FAE5' : '#FEF3C7'};color:${invoice.status === 'PAID' ? '#065F46' : '#92400E'}">
      ${invoice.status === 'PAID' ? '✓ APMOKĖTA' : 'LAUKIAMA APMOKĖJIMO'}
    </div>
  </div>
</div>

<div class="section-header" style="border-bottom:1px solid #E5E7EB;padding-bottom:24px;margin-bottom:24px">
  <div class="party">
    <div class="party-label">Pardavėjas</div>
    ${sellerLines || '<div style="color:#9CA3AF;font-size:12px">Užpildykite verslo profilį nustatymuose</div>'}
  </div>
  <div class="party">
    <div class="party-label">Pirkėjas</div>
    <div style="font-size:15px;font-weight:700;color:#111827">${client.name}</div>
    ${client.companyCode ? `<div style="font-size:12px;color:#4B5563">Kodas: ${client.companyCode}</div>` : ''}
    ${client.vatCode     ? `<div style="font-size:12px;color:#4B5563">PVM kodas: ${client.vatCode}</div>` : ''}
    ${client.address     ? `<div style="font-size:12px;color:#4B5563">${client.address}</div>` : ''}
    ${client.email       ? `<div style="font-size:12px;color:#4B5563">${client.email}</div>` : ''}
  </div>
</div>

<div class="meta-grid">
  <div class="meta-item"><div class="lbl">Išrašymo data</div><div class="val">${dt(invoice.issueDate)}</div></div>
  ${invoice.dueDate ? `<div class="meta-item"><div class="lbl">Apmokėti iki</div><div class="val">${dt(invoice.dueDate)}</div></div>` : ''}
  <div class="meta-item"><div class="lbl">Valiuta</div><div class="val">${invoice.currency}</div></div>
  <div class="meta-item"><div class="lbl">Numeris</div><div class="val">${invoice.invoiceNumber}</div></div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:30px">Nr.</th>
      <th>Paslaugos / Prekės pavadinimas</th>
      <th style="text-align:right;width:60px">Kiekis</th>
      <th style="text-align:right;width:90px">Vnt. kaina</th>
      <th style="text-align:right;width:60px">PVM %</th>
      <th style="text-align:right;width:100px">Suma</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>

<div class="totals-block">
  <div class="total-row"><span>Be PVM:</span><span style="font-weight:600;color:#111827">${eur(invoice.subtotal)}</span></div>
  ${vatLine}
  <div class="total-row total-final"><span>Mokėti iš viso:</span><span>${eur(invoice.total)}</span></div>
</div>

${invoice.notes ? `<div class="notes-box"><strong style="color:#374151">Pastabos:</strong> ${invoice.notes}</div>` : ''}

<div class="footer">
  ${!isVatPayer ? 'PVM netaikomas, nes pardavėjas nėra PVM mokėtojas.<br>' : ''}
  Sąskaita sugeneruota Atlyginimas LT programėlės pagalba. &nbsp;|&nbsp; Sugeneruota: ${dt(new Date().toISOString())}
</div>
</body></html>`;
}

export async function generateAndShareInvoicePDF(
  invoice: SalesInvoice,
  client: Client,
  profile: BusinessProfile,
): Promise<string | null> {
  try {
    const html     = buildInvoiceHTML(invoice, client, profile);
    const { uri }  = await Print.printToFileAsync({ html, base64: false });
    const named    = `${FileSystem.cacheDirectory}${invoice.invoiceNumber.replace(/[^A-Za-z0-9\-_]/g, '_')}.pdf`;
    await FileSystem.copyAsync({ from: uri, to: named });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(named, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    }
    return named;
  } catch (err) {
    console.error('Invoice PDF failed:', err);
    return null;
  }
}

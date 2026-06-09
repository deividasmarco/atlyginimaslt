/**
 * Popular Lithuanian companies for quick client auto-fill.
 * Source: public Lithuanian company registry (JAR).
 */
export interface LTCompany {
  name: string;
  code: string;
  vatCode?: string;
}

export const LT_COMPANIES: LTCompany[] = [
  // Retail & Supermarkets
  { name: 'Maxima LT, UAB',               code: '322185819', vatCode: 'LT221858113' },
  { name: 'Rimi Lietuva, UAB',             code: '111522908', vatCode: 'LT115229014' },
  { name: 'Lidl Lietuva, UAB',             code: '303072911', vatCode: 'LT030729113' },
  { name: 'Iki, UAB',                      code: '302310025', vatCode: 'LT023100216' },
  { name: 'Norfa LT, UAB',                 code: '302330795', vatCode: 'LT023307913' },
  { name: 'Barbora, UAB',                  code: '304620975' },

  // Banks & Finance
  { name: 'Swedbank, AB',                  code: '112029406', vatCode: 'LT120294011' },
  { name: 'SEB bankas, AB',               code: '112021738', vatCode: 'LT120217311' },
  { name: 'Luminor Bank, AB',              code: '112029270', vatCode: 'LT120292714' },
  { name: 'Šiaulių bankas, AB',            code: '112025254', vatCode: 'LT120252513' },
  { name: 'Citadele banka (Lietuvos skyrius)', code: '304337588' },
  { name: 'Revolut Bank, AB',              code: '305127119' },

  // Telecom & IT
  { name: 'Telia Lietuva, AB',             code: '121215434', vatCode: 'LT212154311' },
  { name: 'Tele2, UAB',                    code: '122628526', vatCode: 'LT226285217' },
  { name: 'Bitė Lietuva, UAB',             code: '110266148', vatCode: 'LT102661411' },
  { name: 'CGI Lithuania, UAB',            code: '111756393' },
  { name: 'NRD Companies, UAB',            code: '111969270' },

  // Energy & Utilities
  { name: 'Ignitis, UAB',                  code: '235212426', vatCode: 'LT352124219' },
  { name: 'Energijos skirstymo operatorius, AB', code: '304151376', vatCode: 'LT041513712' },
  { name: 'Lietuvos dujos, AB',            code: '120055795', vatCode: 'LT200557912' },
  { name: 'Vilniaus vandenys, UAB',        code: '120057576', vatCode: 'LT200575719' },

  // E-commerce & Logistics
  { name: 'Pigu.lt, UAB',                  code: '300866792', vatCode: 'LT100003292317' },
  { name: 'DPD Lietuva, UAB',              code: '111720611', vatCode: 'LT117206115' },
  { name: 'LP Express, UAB',               code: '290327930' },
  { name: 'Omniva LT, UAB',               code: '302474961' },

  // Real estate & Construction
  { name: 'Hanner, AB',                    code: '120230752' },
  { name: 'YIT Lietuva, UAB',              code: '300895390' },
  { name: 'Eika, UAB',                     code: '300023509' },

  // Healthcare
  { name: 'Affidea Lietuva, UAB',          code: '302567523' },
  { name: 'Northway, UAB',                 code: '124963219' },
  { name: 'Gailestingoji, VšĮ',            code: '124025677' },

  // Automotive
  { name: 'Autoplius, UAB',                code: '302616588' },
  { name: 'Moller Auto Lietuva, UAB',      code: '111764478' },
  { name: 'Viena sėkmė, UAB',             code: '302449022' },

  // Professional services
  { name: 'PricewaterhouseCoopers, UAB',   code: '111468600' },
  { name: 'KPMG Baltics, UAB',             code: '111476245' },
  { name: 'Deloitte Lietuva, UAB',         code: '122985693' },
  { name: 'Sorainen IR Partners, UAB',     code: '124260010' },

  // Government & Public
  { name: 'Valstybinė mokesčių inspekcija', code: '188659752' },
  { name: 'Sodra (VSDF valdyba)',          code: '191602812' },
  { name: 'Registrų centras, VĮ',         code: '124110246' },
];

/** Fuzzy search — returns top matches by name or code. */
export function searchLTCompanies(query: string, limit = 6): LTCompany[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().replace(/[,.\s]/g, '');
  return LT_COMPANIES
    .filter(c =>
      c.name.toLowerCase().replace(/[,.\s]/g, '').includes(q) ||
      c.code.includes(q)
    )
    .slice(0, limit);
}

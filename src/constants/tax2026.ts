// ─────────────────────────────────────────────────────────────
// Lithuania 2026 Tax Constants
// Sources: VMI (vmi.lt), Sodra (sodra.lt), LR Vyriausybė
// Last updated: January 2026
// ─────────────────────────────────────────────────────────────

export const TAX_2026 = {
  // ── General ──────────────────────────────────────────────
  VDU: 2312.15,         // Vidutinis darbo užmokestis 2026
  MMA: 1153,            // Minimali mėnesinė alga 2026
  NPD_BASE: 747,        // Bazinis neapmokestinamas pajamų dydis
  NPD_PHASE_RATE: 0.49, // NPD mažinimo koeficientas

  // ── Employee GPM (Gyventojų pajamų mokestis) ─────────────
  GPM_20_THRESHOLD: 36 * 2312.15,  // 83,237.40 €/year → 20%
  GPM_25_THRESHOLD: 60 * 2312.15,  // 138,729.00 €/year → 25%
  GPM_RATE_20: 0.20,
  GPM_RATE_25: 0.25,
  GPM_RATE_32: 0.32,

  // ── Employee SODRA ────────────────────────────────────────
  PSD_EMPLOYEE: 0.0698,   // Privalomasis sveikatos draudimas
  VSD_EMPLOYEE: 0.1252,   // Valstybinis socialinis draudimas
  PENSION_II: 0.03,        // Papildomas pensijų kaupimas II pakopa

  // ── Employer SODRA ────────────────────────────────────────
  EMPLOYER_SODRA_BASE: 0.0177,
  EMPLOYER_ACC: {
    1: 0.0014,  // Grupė 1 – mažiausias rizikos lygis
    2: 0.0049,
    3: 0.0070,
    4: 0.0140,  // Grupė 4 – aukščiausias rizikos lygis
  } as Record<1 | 2 | 3 | 4, number>,

  // ── Individual Activity (Individuali veikla) ──────────────
  IV_GPM_LOW: 0.05,         // 5% iki 20 000 € pelno
  IV_GPM_HIGH: 0.15,        // 15% virš 20 000 € pelno
  IV_GPM_THRESHOLD: 20000,
  IV_EXPENSE_FLAT: 0.30,    // 30% fiksuotų išlaidų atskaitymas
  IV_VSD: 0.1252,
  IV_PSD: 0.0698,
  IV_SODRA_BASE: 0.90,      // Sodra skaičiuojama nuo 90% pajamų
  IV_INCOME_LIMIT: 45000,   // PVM registracijos riba
  IV_MIN_SODRA_BASE: 1153,  // Minimali Sodros bazė (MMA)

  // ── MB (Mažoji Bendrija) ──────────────────────────────────
  MB_PROFIT_TAX_STANDARD: 0.17,  // Pelno mokestis standartinis
  MB_PROFIT_TAX_SMALL: 0.07,     // Maža įmonė (iki 300k, iki 10 darb.)
  MB_PROFIT_TAX_NEW: 0.00,       // Naujos įmonės (pirmieji 2 metai)
  MB_MEMBER_WITHDRAWAL_GPM: 0.20,
  MB_MEMBER_VSD: 0.1383,         // Nuo 50% išmokos
  MB_MEMBER_PSD: 0.0698,         // Nuo 50% išmokos
  MB_DIVIDEND_GPM: 0.15,
  MB_DIRECTOR_GPM_RATES: {
    tier1: { rate: 0.15, limit: 12 * 2312.15 },  // iki 12 VDU
    tier2: { rate: 0.20, limit: 36 * 2312.15 },  // 12–36 VDU
    tier3: { rate: 0.25, limit: 60 * 2312.15 },  // 36–60 VDU
  },

  // ── VAT (PVM) ─────────────────────────────────────────────
  PVM_THRESHOLD: 45000,
  PVM_STANDARD: 0.21,
  PVM_REDUCED_9: 0.09,
  PVM_REDUCED_5: 0.05,

  // ── Deadlines ─────────────────────────────────────────────
  ANNUAL_DECLARATION_DEADLINE: 'May 1',
  SODRA_QUARTERLY_MONTHS: [1, 4, 7, 10],
} as const;

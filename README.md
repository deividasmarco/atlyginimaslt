# Atlyginimas LT

**Lithuanian tax & accounting assistant for the self-employed.** A mobile app for individual activity (*individuali veikla*, IV) and small partnership (*mažoji bendrija*, MB) workers to estimate taxes, keep an income/expense journal, issue invoices, and assess loan-qualifying income.

> ⚠️ **Informational tool only.** All calculations are indicative estimates based on publicly available VMI and *Sodra* data. The app does not provide financial, legal, or accounting advice. Always verify with a qualified accountant before making financial decisions.

---

## Features

- **Tax calculator** — GPM, PSD, VSD for IV and MB (2025 & 2026 rules).
- **Income / expense journal** — cash-basis bookkeeping with PDF export.
- **Invoices & mini-CRM** — clients, statuses, filters; a paid invoice automatically books journal income.
- **Loan income calculator** — estimate mortgage-qualifying income from self-employment.
- **Invoice scanning** *(optional)* — extract data from a photo or PDF.
- **Cloud sync** — Firebase Auth + Firestore, with a full offline/guest mode.
- **Bilingual** — Lithuanian and English.
- **Premium** — subscriptions handled via RevenueCat (monthly / yearly / lifetime).

## Tech stack

| Area | Tech |
|------|------|
| Framework | React Native 0.81 · Expo SDK 54 · expo-router |
| Language | TypeScript |
| State | Zustand (+ AsyncStorage persistence) |
| Backend | Firebase Auth · Cloud Firestore |
| Payments | RevenueCat |
| i18n | i18next / react-i18next |
| Build & deploy | EAS Build / EAS Submit |

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # then fill in EXPO_PUBLIC_SCAN_KEY (optional)

# 3. Run in Expo Go (JS-only features)
npx expo start --go
```

For features that need native modules (in-app purchases), use a **development build** instead of Expo Go:

```bash
npx eas-cli build --platform android --profile development
npx expo start --dev-client
```

## Building for release

```bash
# Android (Google Play app bundle)
npx eas-cli build --platform android --profile production

# iOS (App Store)
npx eas-cli build  --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

Build & submit profiles are defined in [`eas.json`](./eas.json).

## Project structure

```
app/                 expo-router screens (tabs, auth, invoice, premium, legal…)
src/
  components/        shared UI
  constants/         colors, tax rates & formulas
  features/          self-contained features (e.g. creditIncome)
  i18n/              lt.json / en.json
  services/          firebase, premium (RevenueCat)
  stores/            Zustand stores
  types/             shared TypeScript types
docs/                hosted legal pages (served via GitHub Pages)
```

## Tax engine notes

- Rates and formulas live in [`src/constants`](./src/constants) and must be reviewed each January against official VMI / *Sodra* figures.
- Tax estimates run entirely on-device; generated PDFs are not sent anywhere.

## Legal

- [Privacy Policy](https://deividasmarco.github.io/atlyginimaslt/privacy.html)
- [Terms of Use](https://deividasmarco.github.io/atlyginimaslt/terms.html)

## License

Copyright © 2026 Atlyginimas LT. All rights reserved. This source is published for transparency and review; it is **not** open source. See [LICENSE](./LICENSE).

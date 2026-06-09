import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../src/constants/colors';
import { useSettingsStore } from '../src/stores/settingsStore';

const PRIVACY_LT = `Privatumo politika

Paskutinį kartą atnaujinta: 2026-06-01

1. Bendrosios nuostatos

„Atlyginimas LT" mobiliosios programėlės privatumo politika aprašo, kaip renkame, naudojame ir saugome jūsų asmens duomenis. Ši politika taikoma visiems programėlės naudotojams.

2. Renkami duomenys

Jūsų sukuriami duomenys:
• Pajamų ir išlaidų žurnalo įrašai
• Sąskaitos faktūros ir klientų duomenys
• Verslo profilio informacija (vardas, veiklos kodas, PVM kodas ir kt.)
• Verslo tipo ir mokesčių nustatymai

Automatiški duomenys:
• Paskyros el. pašto adresas (jei registruojatės)
• Prisijungimo data ir laikas (Firebase Auth techniniai žurnalai)

3. Sąskaitų nuskaitymas (neprivaloma)

Jei naudojate sąskaitų nuskaitymo funkciją, sąskaitos faktūros vaizdas arba PDF siunčiamas į išorinę paslaugą apdorojimui. Duomenys naudojami tik informacijos ištraukimui ir nėra saugomi paslaugos teikėjo. Ši funkcija veikia tik suaktyvinus ją rankiniu būdu.

4. Kaip naudojame duomenis

Jūsų duomenys naudojami tik:
• Mokesčių skaičiavimams ir finansinėms ataskaitoms kurti
• Duomenų sinchronizavimui tarp jūsų įrenginių (jei esate prisijungę)
• Programėlės funkcijoms užtikrinti

Duomenys nėra parduodami, perduodami ar naudojami reklamos tikslams.

5. Duomenų saugojimas

Svečio naudotojai: visi duomenys saugomi tik jūsų įrenginyje. Programėlei užsidarius, duomenys išvalomi.

Registruoti naudotojai: duomenys šifruotai saugomi „Google Firebase" (Firestore) duomenų bazėje Europos regiono serveriuose. „Google" privatumo politika: https://policies.google.com/privacy

6. Trečiųjų šalių paslaugos

• Google Firebase – autentifikacija ir duomenų bazė
• Dokumentų apdorojimo paslauga – tik sąskaitų nuskaitymo funkcijai (neprivaloma)

7. Jūsų teisės (BDAR)

Turite teisę:
• Peržiūrėti savo duomenis
• Ištaisyti netikslius duomenis
• Ištrinti savo paskyrą ir visus duomenis (funkcija prieinama programėlės Nustatymuose)
• Eksportuoti duomenis PDF formatu

8. Vaikų apsauga

Programėlė nėra skirta asmenims iki 18 metų.

9. Pakeitimai

Apie esminius privatumo politikos pakeitimus informuosime per programėlę.

10. Kontaktai

Klausimams dėl asmens duomenų: deividasmar@gmail.com`;

const PRIVACY_EN = `Privacy Policy

Last updated: 2026-06-01

1. General

The "Atlyginimas LT" mobile app Privacy Policy describes how we collect, use and protect your personal data.

2. Data We Collect

Data you create:
• Income and expense journal entries
• Invoices and client records
• Business profile information (name, business code, VAT code, etc.)
• Business type and tax settings

Automatic data:
• Account email address (if you register)
• Login date and time (Firebase Auth technical logs)

3. Invoice Scanning (Optional)

If you use the invoice scanning feature, the invoice image or PDF is sent to an external service for processing. Data is used only for information extraction and is not stored by the service provider. This feature only works when manually activated.

4. How We Use Data

Your data is used only to:
• Perform tax calculations and generate financial reports
• Sync data between your devices (if logged in)
• Provide app functionality

Data is not sold, transferred or used for advertising.

5. Data Storage

Guest users: all data is stored only on your device. Data is cleared when the app is closed.

Registered users: data is stored encrypted in Google Firebase (Firestore) on European region servers. Google Privacy Policy: https://policies.google.com/privacy

6. Third-Party Services

• Google Firebase – authentication and database
• Document-processing service – invoice scanning only (optional)

7. Your Rights (GDPR)

You have the right to:
• Access your data
• Correct inaccurate data
• Delete your account and all data (available in app Settings)
• Export data in PDF format

8. Children

The app is not intended for persons under 18.

9. Changes

We will notify you of significant privacy policy changes through the app.

10. Contact

For personal data questions: deividasmar@gmail.com`;

export default function PrivacyScreen() {
  const { t }      = useTranslation();
  const { language } = useSettingsStore();
  const text       = language === 'en' ? PRIVACY_EN : PRIVACY_LT;
  const title      = language === 'en' ? 'Privacy Policy' : 'Privatumo politika';

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.blue} />
        </TouchableOpacity>
        <Text style={s.title}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.body}>{text}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:  { fontSize: 17, fontWeight: '700', color: Colors.text1 },
  scroll: { flex: 1 },
  content:{ padding: 20, paddingBottom: 40 },
  body:   { fontSize: 14, color: Colors.text2, lineHeight: 24 },
});

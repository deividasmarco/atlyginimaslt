import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/colors';
import { useSettingsStore } from '../src/stores/settingsStore';

const TERMS_LT = `Naudojimosi sąlygos

Paskutinį kartą atnaujinta: 2026-06-01

1. Programėlės paskirtis

„Atlyginimas LT" yra informacinė priemonė, skirta orientaciniam Lietuvos mokesčių skaičiavimui: GPM, PSD, VSD, individualios veiklos ir MB mokesčiams.

Programėlė neteikia finansinių, teisinių ar apskaitos konsultacijų. Visi skaičiavimai yra orientaciniai ir pagrįsti viešai prieinama VMI bei Sodros informacija.

2. Atsakomybės ribojimas

• Skaičiavimų tikslumas nėra garantuojamas
• Tikslūs mokesčiai gali skirtis priklausomai nuo individualių aplinkybių
• Prieš priimant finansinius sprendimus rekomenduojame konsultuotis su buhalteriu ar mokesčių konsultantu
• Programėlės kūrėjai neatsako už klaidas skaičiavimuose ar jų pasekmes

3. Naudotojo atsakomybė

Naudotojas atsako už:
• Teisingą duomenų įvedimą
• Savarankišką mokesčių deklaracijų tikrinimą
• Paskyros saugumo užtikrinimą
• Programėlės nenaudojimą neteisėtiems tikslams

4. Intelektinė nuosavybė

Visos programėlės teisės priklauso kūrėjams. Draudžiama programėlę kopijuoti, platinti ar keisti be rašytinio sutikimo.

5. Paskyros nutraukimas

Paskyra gali būti ištrinta:
• Naudotojo prašymu (funkcija prieinama Nustatymuose)
• Pažeidus naudojimosi sąlygas
• Ilgą laiką nesinaudojant paskyra

6. Mokesčių duomenų tikslumas

Programėlė atnaujinama atsižvelgiant į oficialius VMI ir Sodros skelbiamus duomenis. Negalime garantuoti, kad visi rodikliai visada atitinka galiojančius teisės aktus. Rekomenduojame tikrinti aktualius duomenis VMI ir Sodros svetainėse.

7. Sąlygų pakeitimai

Sąlygos gali būti keičiamos. Apie esminius pakeitimus informuosime per programėlę.

8. Taikoma teisė

Šioms sąlygoms taikoma Lietuvos Respublikos teisė.

9. Prenumeratos ir mokėjimai

„Premium" funkcijos pasiekiamos per automatiškai atsinaujinančias prenumeratas (mėnesinę ar metinę) arba vienkartinį „visam laikui" pirkimą. Mokestis nuskaitomas iš jūsų „App Store" arba „Google Play" paskyros patvirtinus pirkimą. Mėnesinė ir metinė prenumerata atsinaujina automatiškai, nebent ją atšaukiate likus bent 24 val. iki esamo laikotarpio pabaigos. Prenumeratas galite valdyti ar atšaukti bet kada paskyros nustatymuose. „Visam laikui" pirkimas yra vienkartinis ir neatsinaujina.

10. Kontaktai

Klausimams: pagalba@atlyginimaslt.lt`;

const TERMS_EN = `Terms of Use

Last updated: 2026-06-01

1. Purpose of the App

"Atlyginimas LT" is an informational tool for indicative Lithuanian tax calculations: income tax (GPM), health insurance (PSD), social insurance (VSD), self-employment and small partnership (MB) taxes.

The app does not provide financial, legal or accounting advice. All calculations are indicative and based on publicly available VMI and Sodra information.

2. Limitation of Liability

• Accuracy of calculations is not guaranteed
• Actual taxes may differ depending on individual circumstances
• We recommend consulting an accountant or tax advisor before making financial decisions
• App developers are not liable for errors in calculations or their consequences

3. User Responsibility

The user is responsible for:
• Entering data correctly
• Independently verifying tax declarations
• Maintaining account security
• Not using the app for illegal purposes

4. Intellectual Property

All app rights belong to the developers. Copying, distributing or modifying the app without written consent is prohibited.

5. Account Termination

An account may be deleted:
• At the user's request (available in Settings)
• For violating terms of use
• After extended periods of inactivity

6. Tax Data Accuracy

The app is updated based on official VMI and Sodra published data. We cannot guarantee that all figures always reflect current legislation. We recommend verifying current data on the VMI and Sodra websites.

7. Changes to Terms

Terms may be updated. We will notify you of significant changes through the app.

8. Applicable Law

These terms are governed by the law of the Republic of Lithuania.

9. Subscriptions and Payments

Premium features are available via auto-renewing subscriptions (monthly or yearly) or a one-time lifetime purchase. Payment is charged to your App Store or Google Play account at confirmation. Monthly and yearly subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. You can manage or cancel subscriptions any time in your account settings. The lifetime purchase is a single payment and does not renew.

10. Contact

Questions: pagalba@atlyginimaslt.lt`;

export default function TermsScreen() {
  const { language } = useSettingsStore();
  const text  = language === 'en' ? TERMS_EN : TERMS_LT;
  const title = language === 'en' ? 'Terms of Use' : 'Naudojimosi sąlygos';

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

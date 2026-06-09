import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../src/constants/colors';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
  icon:    IoniconName;
  label:   string;
  desc:    string;
  route:   string;
  color?:  string;
}

export default function MoreScreen() {
  const router    = useRouter();
  const { t }     = useTranslation();

  const ITEMS: MenuItem[] = [
    {
      icon:  'home-outline',
      label: 'Būsto paskolos galimybės',
      desc:  'Būsto paskolos pajamų skaičiuoklė · IV kreditingumas',
      route: '/credit-income',
      color: '#1E3A8A',
    },
    {
      icon:  'calculator-outline',
      label: t('tabs.calculator'),
      desc:  'Darbuotojas, IV, MB skaičiuoklė',
      route: '/(tabs)/calculator',
      color: Colors.blue,
    },
    {
      icon:  'layers-outline',
      label: 'Palyginti',
      desc:  'IV vs Darbuotojas, 30% vs faktinės',
      route: '/(tabs)/compare',
      color: Colors.purple,
    },
    {
      icon:  'calendar-outline',
      label: 'Mokestiniai terminai',
      desc:  'GPM, Sodros terminai 2026',
      route: '/(tabs)/reports',
      color: Colors.amber,
    },
    {
      icon:  'settings-outline',
      label: t('tabs.settings'),
      desc:  'Verslo profilis, kalba, pranešimai',
      route: '/(tabs)/settings',
      color: Colors.text2,
    },
  ];

  return (
    <SafeAreaView style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <Text style={s.title}>Daugiau</Text>

        <View style={s.list}>
          {ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={s.row}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[s.iconWrap, { backgroundColor: `${item.color ?? Colors.blue}1A` }]}>
                <Ionicons name={item.icon} size={22} color={item.color ?? Colors.blue} />
              </View>
              <View style={s.rowText}>
                <Text style={s.rowLabel}>{item.label}</Text>
                <Text style={s.rowDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.text3} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.version}>Atlyginimas LT · v1.0.0</Text>
        <Text style={s.disclaimer}>Duomenys: VMI, Sodra 2026 m.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  title:   { fontSize: 28, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5, marginBottom: 24 },

  list:    { backgroundColor: Colors.surface1, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row:     { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconWrap:{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel:{ fontSize: 15, fontWeight: '600', color: Colors.text1, marginBottom: 2 },
  rowDesc: { fontSize: 12, color: Colors.text3 },

  version:    { fontSize: 12, color: Colors.text3, textAlign: 'center', marginTop: 32 },
  disclaimer: { fontSize: 11, color: Colors.text3, textAlign: 'center', marginTop: 4 },
});

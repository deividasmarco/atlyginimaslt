import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../src/constants/colors';

type IoniconName = keyof typeof Ionicons.glyphMap;

// Visible tabs (5 max for mobile)
const VISIBLE: { name: string; icon: IoniconName; iconActive: IoniconName }[] = [
  { name: 'dashboard',  icon: 'home-outline',       iconActive: 'home' },
  { name: 'journal',    icon: 'book-outline',        iconActive: 'book' },
  { name: 'invoices',   icon: 'receipt-outline',     iconActive: 'receipt' },
  { name: 'reports',    icon: 'bar-chart-outline',   iconActive: 'bar-chart' },
  { name: 'more',       icon: 'ellipsis-horizontal-outline', iconActive: 'ellipsis-horizontal' },
];

// Screens accessible via router but NOT shown in the bottom bar
const HIDDEN = ['calculator', 'compare', 'settings'];

export default function TabsLayout() {
  const { t } = useTranslation();

  const LABELS: Record<string, string> = {
    dashboard: t('tabs.dashboard'),
    journal:   t('tabs.journal'),
    invoices:  'Sąskaitos',
    reports:   t('tabs.reports'),
    more:      'Daugiau',
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface1,
          borderTopColor:  Colors.border,
          borderTopWidth:  1,
          paddingTop:      2,
          paddingBottom:   2,
        },
        tabBarActiveTintColor:   Colors.blue,
        tabBarInactiveTintColor: Colors.text3,
        tabBarLabelStyle:  { fontSize: 10, fontWeight: '500', marginTop: 1 },
        tabBarItemStyle:   { paddingVertical: 2 },
      }}
    >
      {/* Visible tabs */}
      {VISIBLE.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: LABELS[tab.name] ?? tab.name,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? tab.iconActive : tab.icon}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}

      {/* Hidden screens — accessible via router.push but no tab bar button */}
      {HIDDEN.map(name => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ href: null }}
        />
      ))}
    </Tabs>
  );
}

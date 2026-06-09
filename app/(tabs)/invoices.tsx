import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useInvoiceStore, effectiveStatus } from '../../src/stores/invoiceStore';
import { useClientStore } from '../../src/stores/clientStore';
import { useAuthStore } from '../../src/stores/authStore';
import {
  SalesInvoice, InvoiceStatus, InvoiceFilterStatus, InvoiceFilters,
} from '../../src/types/business';

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT:     Colors.text3,
  ISSUED:    Colors.blue,
  PAID:      Colors.green,
  OVERDUE:   Colors.red,
  CANCELLED: Colors.text3,
};
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT:     'Juodraštis',
  ISSUED:    'Laukia apmokėjimo',
  PAID:      'Apmokėta',
  OVERDUE:   'Pradelsta',
  CANCELLED: 'Atšaukta',
};

const STATUS_FILTERS: { key: InvoiceFilterStatus; label: string }[] = [
  { key: 'ALL',       label: 'Visos' },
  { key: 'ISSUED',    label: 'Laukia' },
  { key: 'PAID',      label: 'Apmokėtos' },
  { key: 'OVERDUE',   label: 'Pradelstos' },
  { key: 'DRAFT',     label: 'Juodraščiai' },
  { key: 'CANCELLED', label: 'Atšauktos' },
];

const MONTHS = ['Visi', 'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
  'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'];

function eur(n: number): string {
  return n.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('lt-LT').format(new Date(iso));
}

type ViewMode = 'INVOICES' | 'CLIENTS';

export default function InvoicesScreen() {
  const router = useRouter();
  const { invoices, load, getFiltered, getClientStats, canCreateInvoice } = useInvoiceStore();
  const { clients, load: loadClients, getClient } = useClientStore();
  const { isPremium } = useAuthStore();

  const [view, setView] = useState<ViewMode>('INVOICES');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: 'ALL', clientId: null, year: new Date().getFullYear(), month: null,
    vat: 'ALL', minAmount: null, maxAmount: null,
  });

  useEffect(() => { load(); loadClients(); }, []);

  const clientName = (id: string) => getClient(id)?.name ?? id;

  // Summary across ALL non-cancelled invoices (year-scoped to filter year)
  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let paid = 0, waiting = 0, overdue = 0;
    for (const inv of invoices) {
      if (filters.year != null && new Date(inv.issueDate).getFullYear() !== filters.year) continue;
      const st = effectiveStatus(inv, today);
      if (st === 'PAID')    paid    += inv.total;
      if (st === 'ISSUED')  waiting += inv.total;
      if (st === 'OVERDUE') overdue += inv.total;
    }
    return { paid, waiting, overdue };
  }, [invoices, filters.year]);

  const filtered = useMemo(() => getFiltered(filters), [invoices, filters]);

  // Client list with stats (only clients that have invoices, sorted by total)
  const clientRows = useMemo(() => {
    return clients
      .map(c => ({ client: c, stats: getClientStats(c.id) }))
      .filter(r => r.stats.invoiceCount > 0)
      .sort((a, b) => b.stats.totalInvoiced - a.stats.totalInvoiced);
  }, [clients, invoices]);

  const activeFilterCount =
    (filters.clientId ? 1 : 0) +
    (filters.month != null ? 1 : 0) +
    (filters.vat !== 'ALL' ? 1 : 0) +
    (filters.minAmount != null || filters.maxAmount != null ? 1 : 0);

  function handleNew() {
    if (!canCreateInvoice(isPremium)) {
      Alert.alert(
        'Pasiekta riba',
        `Nemokamai galite sukurti ${5} sąskaitas per mėnesį. Įsigykite Premium neribotam sąskaitų skaičiui.`,
        [
          { text: 'Ne dabar', style: 'cancel' },
          { text: 'Žiūrėti Premium', onPress: () => router.push('/premium' as any) },
        ],
      );
      return;
    }
    router.push('/invoice/create' as any);
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Sąskaitos</Text>
          <TouchableOpacity style={s.addBtn} onPress={handleNew}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addBtnTxt}>Nauja</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={s.summaryRow}>
          <View style={[s.sumCard, { borderColor: 'rgba(45,212,191,0.25)' }]}>
            <Text style={s.sumLbl}>Apmokėta</Text>
            <Text style={[s.sumVal, { color: Colors.green }]}>{eur(summary.paid)}</Text>
          </View>
          <View style={[s.sumCard, { borderColor: 'rgba(79,142,247,0.25)' }]}>
            <Text style={s.sumLbl}>Laukia</Text>
            <Text style={[s.sumVal, { color: Colors.blue }]}>{eur(summary.waiting)}</Text>
          </View>
          <View style={[s.sumCard, { borderColor: 'rgba(248,113,113,0.25)' }]}>
            <Text style={s.sumLbl}>Pradelsta</Text>
            <Text style={[s.sumVal, { color: Colors.red }]}>{eur(summary.overdue)}</Text>
          </View>
        </View>

        {/* View toggle */}
        <View style={s.viewToggle}>
          {(['INVOICES', 'CLIENTS'] as ViewMode[]).map(v => (
            <TouchableOpacity
              key={v}
              style={[s.viewBtn, view === v && s.viewBtnOn]}
              onPress={() => setView(v)}
            >
              <Ionicons
                name={v === 'INVOICES' ? 'receipt-outline' : 'people-outline'}
                size={16}
                color={view === v ? Colors.blue : Colors.text3}
              />
              <Text style={[s.viewBtnTxt, view === v && s.viewBtnTxtOn]}>
                {v === 'INVOICES' ? 'Sąskaitos' : 'Klientai'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {view === 'INVOICES' ? (
          <>
            {/* Status chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsRow}>
              {STATUS_FILTERS.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[s.chip, filters.status === f.key && s.chipOn]}
                  onPress={() => setFilters(p => ({ ...p, status: f.key }))}
                >
                  <Text style={[s.chipTxt, filters.status === f.key && s.chipTxtOn]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Filter button */}
            <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilters(true)}>
              <Ionicons name="options-outline" size={16} color={Colors.text2} />
              <Text style={s.filterBtnTxt}>
                Filtrai{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                {filters.clientId ? ` · ${clientName(filters.clientId)}` : ''}
                {filters.year ? ` · ${filters.year}${filters.month ? ' ' + MONTHS[filters.month] : ''}` : ''}
              </Text>
            </TouchableOpacity>

            {/* Invoice list */}
            {filtered.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>📋</Text>
                <Text style={s.emptyTitle}>{invoices.length === 0 ? 'Nėra sąskaitų' : 'Nėra pagal filtrus'}</Text>
                <Text style={s.emptyDesc}>
                  {invoices.length === 0 ? 'Sukurkite pirmą sąskaitą faktūrą' : 'Pakeiskite filtrus arba sukurkite naują'}
                </Text>
                <TouchableOpacity style={s.emptyBtn} onPress={handleNew}>
                  <Text style={s.emptyBtnTxt}>+ Sukurti sąskaitą</Text>
                </TouchableOpacity>
              </View>
            ) : filtered.map(inv => {
              const st = effectiveStatus(inv);
              return (
                <TouchableOpacity key={inv.id} style={s.card} onPress={() => router.push(`/invoice/${inv.id}` as any)}>
                  <View style={s.cardTop}>
                    <Text style={s.invNumber}>{inv.invoiceNumber}</Text>
                    <View style={[s.badge, { backgroundColor: `${STATUS_COLORS[st]}22` }]}>
                      <Text style={[s.badgeTxt, { color: STATUS_COLORS[st] }]}>{STATUS_LABELS[st]}</Text>
                    </View>
                  </View>
                  <Text style={s.clientNameTxt}>{clientName(inv.clientId)}</Text>
                  <View style={s.cardBottom}>
                    <Text style={s.date}>
                      {fmtDate(inv.issueDate)}{inv.dueDate ? ` · iki ${fmtDate(inv.dueDate)}` : ''}
                    </Text>
                    <Text style={[s.amount, { color: st === 'PAID' ? Colors.green : Colors.text1 }]}>
                      {eur(inv.total)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        ) : (
          /* Clients view */
          clientRows.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>👥</Text>
              <Text style={s.emptyTitle}>Nėra klientų su sąskaitomis</Text>
              <Text style={s.emptyDesc}>Sukurkite sąskaitą ir priskirkite klientą</Text>
            </View>
          ) : clientRows.map(({ client, stats }) => (
            <TouchableOpacity key={client.id} style={s.card} onPress={() => router.push(`/client/${client.id}` as any)}>
              <View style={s.cardTop}>
                <Text style={s.invNumber}>{client.name}</Text>
                <Text style={s.clientCount}>{stats.invoiceCount} sąsk.</Text>
              </View>
              <View style={s.clientStatsRow}>
                <Text style={[s.clientStat, { color: Colors.green }]}>Apmokėta: {eur(stats.totalPaid)}</Text>
                {stats.totalUnpaid > 0 && <Text style={[s.clientStat, { color: Colors.blue }]}>Laukia: {eur(stats.totalUnpaid)}</Text>}
                {stats.totalOverdue > 0 && <Text style={[s.clientStat, { color: Colors.red }]}>Pradelsta: {eur(stats.totalOverdue)}</Text>}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Filter modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.titleRow}>
              <Text style={m.title}>Filtrai</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}><Ionicons name="close" size={22} color={Colors.text3} /></TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Client */}
              <Text style={m.lbl}>Klientas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[m.chip, !filters.clientId && m.chipOn]} onPress={() => setFilters(p => ({ ...p, clientId: null }))}>
                    <Text style={[m.chipTxt, !filters.clientId && m.chipTxtOn]}>Visi</Text>
                  </TouchableOpacity>
                  {clients.map(c => (
                    <TouchableOpacity key={c.id} style={[m.chip, filters.clientId === c.id && m.chipOn]} onPress={() => setFilters(p => ({ ...p, clientId: c.id }))}>
                      <Text style={[m.chipTxt, filters.clientId === c.id && m.chipTxtOn]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Year */}
              <Text style={m.lbl}>Metai</Text>
              <View style={m.rowWrap}>
                {[null, new Date().getFullYear(), new Date().getFullYear() - 1].map((y, idx) => (
                  <TouchableOpacity key={idx} style={[m.chip, filters.year === y && m.chipOn]} onPress={() => setFilters(p => ({ ...p, year: y, month: y == null ? null : p.month }))}>
                    <Text style={[m.chipTxt, filters.year === y && m.chipTxtOn]}>{y == null ? 'Visi' : y}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Month */}
              {filters.year != null && (
                <>
                  <Text style={m.lbl}>Mėnuo</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {MONTHS.map((mn, idx) => (
                        <TouchableOpacity key={idx} style={[m.chip, (filters.month ?? 0) === idx && m.chipOn]} onPress={() => setFilters(p => ({ ...p, month: idx === 0 ? null : idx }))}>
                          <Text style={[m.chipTxt, (filters.month ?? 0) === idx && m.chipTxtOn]}>{mn}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* VAT */}
              <Text style={m.lbl}>PVM</Text>
              <View style={m.rowWrap}>
                {([['ALL', 'Visos'], ['WITH_VAT', 'Su PVM'], ['NO_VAT', 'Be PVM']] as const).map(([v, label]) => (
                  <TouchableOpacity key={v} style={[m.chip, filters.vat === v && m.chipOn]} onPress={() => setFilters(p => ({ ...p, vat: v }))}>
                    <Text style={[m.chipTxt, filters.vat === v && m.chipTxtOn]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount range */}
              <Text style={m.lbl}>Suma (€)</Text>
              <View style={m.amountRow}>
                <TextInput style={m.amountInput} placeholder="Nuo" placeholderTextColor={Colors.text3} keyboardType="decimal-pad"
                  value={filters.minAmount?.toString() ?? ''}
                  onChangeText={t => setFilters(p => ({ ...p, minAmount: t ? parseFloat(t) : null }))} />
                <Text style={{ color: Colors.text3 }}>–</Text>
                <TextInput style={m.amountInput} placeholder="Iki" placeholderTextColor={Colors.text3} keyboardType="decimal-pad"
                  value={filters.maxAmount?.toString() ?? ''}
                  onChangeText={t => setFilters(p => ({ ...p, maxAmount: t ? parseFloat(t) : null }))} />
              </View>

              <TouchableOpacity style={m.applyBtn} onPress={() => setShowFilters(false)}>
                <Text style={m.applyTxt}>Taikyti</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.resetBtn} onPress={() => setFilters({ status: filters.status, clientId: null, year: new Date().getFullYear(), month: null, vat: 'ALL', minAmount: null, maxAmount: null })}>
                <Text style={m.resetTxt}>Išvalyti filtrus</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },

  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:    { fontSize: 26, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  addBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.blue, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnTxt:{ color: '#fff', fontWeight: '700', fontSize: 14 },

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  sumCard:    { flex: 1, backgroundColor: Colors.surface1, borderRadius: 14, padding: 12, borderWidth: 1 },
  sumLbl:     { fontSize: 10, color: Colors.text3, fontWeight: '600', marginBottom: 4 },
  sumVal:     { fontSize: 14, fontWeight: '800' },

  viewToggle: { flexDirection: 'row', backgroundColor: Colors.surface2, borderRadius: 12, padding: 4, marginBottom: 14, gap: 4 },
  viewBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
  viewBtnOn:  { backgroundColor: Colors.surface1 },
  viewBtnTxt: { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  viewBtnTxtOn:{ color: Colors.blue },

  chipsScroll: { marginBottom: 10, marginHorizontal: -16 },
  chipsRow:    { paddingHorizontal: 16, gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  chipOn:      { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.4)' },
  chipTxt:     { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  chipTxtOn:   { color: Colors.blue },

  filterBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  filterBtnTxt:{ fontSize: 12, color: Colors.text2, flex: 1 },

  card:      { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  invNumber: { fontSize: 15, fontWeight: '700', color: Colors.text1, flex: 1 },
  badge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt:  { fontSize: 11, fontWeight: '700' },
  clientNameTxt:{ fontSize: 13, color: Colors.text2, marginBottom: 10 },
  cardBottom:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date:      { fontSize: 11, color: Colors.text3, flex: 1 },
  amount:    { fontSize: 17, fontWeight: '800' },

  clientCount:   { fontSize: 12, color: Colors.text3, fontWeight: '600' },
  clientStatsRow:{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  clientStat:    { fontSize: 12, fontWeight: '600' },

  empty:       { alignItems: 'center', paddingVertical: 50 },
  emptyIcon:   { fontSize: 48, marginBottom: 16 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: Colors.text1, marginBottom: 8 },
  emptyDesc:   { fontSize: 13, color: Colors.text2, marginBottom: 24, textAlign: 'center' },
  emptyBtn:    { backgroundColor: Colors.blueDim, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(79,142,247,0.25)' },
  emptyBtnTxt: { color: Colors.blue, fontWeight: '700', fontSize: 15 },
});

const m = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: Colors.surface1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '85%', borderWidth: 1, borderColor: Colors.border2 },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.text3, alignSelf: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:    { fontSize: 18, fontWeight: '800', color: Colors.text1 },
  lbl:      { fontSize: 11, fontWeight: '700', color: Colors.text2, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rowWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  chipOn:   { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.4)' },
  chipTxt:  { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  chipTxtOn:{ color: Colors.blue },
  amountRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  amountInput:{ flex: 1, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: Colors.text1 },
  applyBtn: { backgroundColor: Colors.blue, borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 8 },
  applyTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  resetBtn: { alignItems: 'center', padding: 10 },
  resetTxt: { color: Colors.text2, fontSize: 14 },
});

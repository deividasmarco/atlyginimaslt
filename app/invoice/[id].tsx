import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useInvoiceStore, effectiveStatus } from '../../src/stores/invoiceStore';
import { useClientStore } from '../../src/stores/clientStore';
import { useBusinessStore } from '../../src/stores/businessStore';
import { generateAndShareInvoicePDF } from '../../src/services/invoicePdf.service';
import { InvoiceStatus } from '../../src/types/business';

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: Colors.text3, ISSUED: Colors.blue, PAID: Colors.green, OVERDUE: Colors.red, CANCELLED: Colors.text3,
};
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Juodraštis', ISSUED: 'Laukia apmokėjimo', PAID: 'Apmokėta', OVERDUE: 'Pradelsta', CANCELLED: 'Atšaukta',
};

function eur(n: number) { return n.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
function fmtDate(iso: string) { return new Intl.DateTimeFormat('lt-LT').format(new Date(iso)); }

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getInvoice, markPaid, markUnpaid, markIssued, cancelInvoice, duplicateInvoice, deleteInvoice, load,
  } = useInvoiceStore();
  const { getClient, load: loadClients } = useClientStore();
  const { profile } = useBusinessStore();

  useEffect(() => { load(); loadClients(); }, []);

  const invoice = getInvoice(id ?? '');
  const client  = invoice ? getClient(invoice.clientId) : undefined;

  if (!invoice) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.notFound}>Sąskaita nerasta</Text>
          <TouchableOpacity onPress={() => router.back()}><Text style={{ color: Colors.blue }}>← Atgal</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const st = effectiveStatus(invoice);
  const buyer = invoice.buyerSnapshot ?? (client ? { name: client.name, companyCode: client.companyCode, vatCode: client.vatCode, address: client.address, email: client.email } : undefined);

  async function handlePDF() {
    if (!client && !invoice!.buyerSnapshot) { Alert.alert('Klaida', 'Kliento duomenys nerasti'); return; }
    const buyerClient = client ?? {
      id: invoice!.clientId, userId: '', type: 'COMPANY' as const,
      name: invoice!.buyerSnapshot?.name ?? '', companyCode: invoice!.buyerSnapshot?.companyCode,
      vatCode: invoice!.buyerSnapshot?.vatCode, address: invoice!.buyerSnapshot?.address,
      email: invoice!.buyerSnapshot?.email, createdAt: '', updatedAt: '',
    };
    await generateAndShareInvoicePDF(invoice!, buyerClient, profile);
  }

  function handleActions() {
    const inv = invoice!;
    const opts: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Atšaukti', style: 'cancel' },
    ];

    if (st === 'DRAFT') {
      opts.push({ text: 'Žymėti kaip išrašytą', onPress: () => markIssued(inv.id) });
    }
    if (st !== 'PAID' && st !== 'CANCELLED') {
      opts.push({ text: 'Žymėti kaip apmokėtą', onPress: () => {
        markPaid(inv.id);
        Alert.alert('Apmokėta', 'Sąskaita pažymėta kaip apmokėta. Pajamos įrašytos į žurnalą.');
      }});
    }
    if (st === 'PAID') {
      opts.push({ text: 'Žymėti kaip neapmokėtą', onPress: () => {
        markUnpaid(inv.id);
        Alert.alert('Atnaujinta', 'Sąskaita pažymėta kaip laukianti. Pajamos pašalintos iš žurnalo.');
      }});
    }
    opts.push({ text: 'Dubliuoti sąskaitą', onPress: () => {
      const copy = duplicateInvoice(inv.id);
      if (copy) router.replace(`/invoice/${copy.id}` as any);
    }});
    if (st !== 'CANCELLED') {
      opts.push({ text: 'Atšaukti sąskaitą', onPress: () => {
        Alert.alert('Atšaukti sąskaitą?', inv.invoiceNumber, [
          { text: 'Ne', style: 'cancel' },
          { text: 'Taip', style: 'destructive', onPress: () => cancelInvoice(inv.id) },
        ]);
      }});
    }
    opts.push({ text: 'Ištrinti', style: 'destructive', onPress: () => {
      Alert.alert('Ištrinti sąskaitą?', 'Šis veiksmas negrįžtamas.', [
        { text: 'Ne', style: 'cancel' },
        { text: 'Ištrinti', style: 'destructive', onPress: () => { deleteInvoice(inv.id); router.back(); } },
      ]);
    }});

    Alert.alert(inv.invoiceNumber, STATUS_LABELS[st], opts);
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.blue} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{invoice.invoiceNumber}</Text>
        <TouchableOpacity onPress={handleActions} style={s.backBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.blue} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* Status badge (tap = actions) */}
        <TouchableOpacity
          style={[s.statusBadge, { backgroundColor: `${STATUS_COLORS[st]}22` }]}
          onPress={handleActions}
        >
          <Text style={[s.statusTxt, { color: STATUS_COLORS[st] }]}>{STATUS_LABELS[st]}  ›</Text>
        </TouchableOpacity>

        {/* Buyer & dates */}
        <View style={s.card}>
          <View style={s.infoRow}>
            <Text style={s.infoLbl}>Pirkėjas</Text>
            <Text style={s.infoVal}>{buyer?.name ?? invoice.clientId}</Text>
          </View>
          {buyer?.companyCode && <View style={s.infoRow}><Text style={s.infoLbl}>Įmonės kodas</Text><Text style={s.infoVal}>{buyer.companyCode}</Text></View>}
          {buyer?.vatCode && <View style={s.infoRow}><Text style={s.infoLbl}>PVM kodas</Text><Text style={s.infoVal}>{buyer.vatCode}</Text></View>}
          <View style={s.infoRow}>
            <Text style={s.infoLbl}>Išrašymo data</Text>
            <Text style={s.infoVal}>{fmtDate(invoice.issueDate)}</Text>
          </View>
          {invoice.dueDate && (
            <View style={s.infoRow}>
              <Text style={s.infoLbl}>Apmokėti iki</Text>
              <Text style={[s.infoVal, st === 'OVERDUE' && { color: Colors.red }]}>{fmtDate(invoice.dueDate)}</Text>
            </View>
          )}
          {invoice.paymentDate && (
            <View style={s.infoRow}>
              <Text style={s.infoLbl}>Apmokėta</Text>
              <Text style={[s.infoVal, { color: Colors.green }]}>{fmtDate(invoice.paymentDate)}</Text>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={s.card}>
          {invoice.items.map((item, i) => (
            <View key={item.id} style={[s.itemRow, i < invoice.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemDesc}>{item.description}</Text>
                <Text style={s.itemSub}>{item.quantity} × {eur(item.unitPrice)}{item.vatRate > 0 ? ` + ${Math.round(item.vatRate * 100)}% PVM` : ''}</Text>
              </View>
              <Text style={s.itemTotal}>{eur(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totalsCard}>
          <View style={s.totalRow}><Text style={s.totalLbl}>Be PVM</Text><Text style={s.totalVal}>{eur(invoice.subtotal)}</Text></View>
          {invoice.vatAmount > 0
            ? <View style={s.totalRow}><Text style={s.totalLbl}>PVM</Text><Text style={s.totalVal}>{eur(invoice.vatAmount)}</Text></View>
            : <View style={s.totalRow}><Text style={s.totalLbl}>PVM</Text><Text style={s.totalVal}>PVM netaikomas</Text></View>}
          <View style={[s.totalRow, s.totalFinal]}>
            <Text style={s.totalFinalLbl}>Mokėti iš viso</Text>
            <Text style={s.totalFinalVal}>{eur(invoice.total)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={s.notesCard}>
            <Text style={s.notesLbl}>Pastabos</Text>
            <Text style={s.notesTxt}>{invoice.notes}</Text>
          </View>
        )}

        {/* Quick actions */}
        {st !== 'PAID' && st !== 'CANCELLED' && (
          <TouchableOpacity style={s.paidBtn} onPress={() => { markPaid(invoice.id); Alert.alert('Apmokėta', 'Pajamos įrašytos į žurnalą.'); }}>
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.green} />
            <Text style={s.paidBtnTxt}>Žymėti kaip apmokėtą</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.pdfBtn} onPress={handlePDF}>
          <Ionicons name="document-text-outline" size={18} color={Colors.amber} />
          <Text style={s.pdfBtnTxt}>Generuoti ir dalintis PDF</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFound:{ fontSize: 16, color: Colors.text2 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text1 },

  statusBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16 },
  statusTxt:   { fontSize: 14, fontWeight: '700' },

  card:     { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  infoRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLbl:  { fontSize: 13, color: Colors.text2 },
  infoVal:  { fontSize: 13, fontWeight: '600', color: Colors.text1, maxWidth: '60%', textAlign: 'right' },

  itemRow:   { paddingVertical: 10 },
  itemDesc:  { fontSize: 14, fontWeight: '600', color: Colors.text1, marginBottom: 3 },
  itemSub:   { fontSize: 12, color: Colors.text3 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: Colors.blue },

  totalsCard:    { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLbl:      { fontSize: 13, color: Colors.text2 },
  totalVal:      { fontSize: 13, fontWeight: '600', color: Colors.text1 },
  totalFinal:    { borderTopWidth: 1, borderTopColor: Colors.border2, marginTop: 6, paddingTop: 10 },
  totalFinalLbl: { fontSize: 15, fontWeight: '700', color: Colors.text1 },
  totalFinalVal: { fontSize: 20, fontWeight: '800', color: Colors.blue },

  notesCard: { backgroundColor: Colors.surface1, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  notesLbl:  { fontSize: 11, color: Colors.text3, fontWeight: '600', marginBottom: 6 },
  notesTxt:  { fontSize: 13, color: Colors.text2, lineHeight: 20 },

  paidBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.greenDim, borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(45,212,191,0.3)' },
  paidBtnTxt:{ color: Colors.green, fontWeight: '800', fontSize: 15 },
  pdfBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.amberDim, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  pdfBtnTxt: { color: Colors.amber, fontWeight: '800', fontSize: 15 },
});

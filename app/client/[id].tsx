import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useInvoiceStore, effectiveStatus } from '../../src/stores/invoiceStore';
import { useClientStore } from '../../src/stores/clientStore';
import { InvoiceStatus } from '../../src/types/business';

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: Colors.text3, ISSUED: Colors.blue, PAID: Colors.green, OVERDUE: Colors.red, CANCELLED: Colors.text3,
};
const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Juodraštis', ISSUED: 'Laukia', PAID: 'Apmokėta', OVERDUE: 'Pradelsta', CANCELLED: 'Atšaukta',
};

function eur(n: number) {
  return n.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtDate(iso: string) { return new Intl.DateTimeFormat('lt-LT').format(new Date(iso)); }

export default function ClientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getClient, updateClient, deleteClient, load: loadClients } = useClientStore();
  const { invoices, load, getClientStats } = useInvoiceStore();

  useEffect(() => { load(); loadClients(); }, []);

  const client = getClient(id ?? '');
  const stats  = getClientStats(id ?? '');
  const clientInvoices = invoices
    .filter(i => i.clientId === id)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));

  const [showEdit, setShowEdit] = useState(false);
  const [eName, setEName] = useState('');
  const [eCode, setECode] = useState('');
  const [eVat,  setEVat]  = useState('');
  const [eAddr, setEAddr] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eNotes, setENotes] = useState('');

  function openEdit() {
    if (!client) return;
    setEName(client.name);
    setECode(client.companyCode ?? '');
    setEVat(client.vatCode ?? '');
    setEAddr(client.address ?? '');
    setEEmail(client.email ?? '');
    setePhoneSafe(client.phone ?? '');
    setENotes(client.notes ?? '');
    setShowEdit(true);
  }
  function setePhoneSafe(v: string) { setEPhone(v); }

  function saveEdit() {
    if (!client) return;
    if (!eName.trim()) { Alert.alert('Klaida', 'Įveskite pavadinimą'); return; }
    updateClient(client.id, {
      name: eName.trim(),
      companyCode: eCode.trim() || undefined,
      vatCode: eVat.trim() || undefined,
      address: eAddr.trim() || undefined,
      email: eEmail.trim() || undefined,
      phone: ePhone.trim() || undefined,
      notes: eNotes.trim() || undefined,
    });
    setShowEdit(false);
  }

  function handleDelete() {
    if (!client) return;
    if (clientInvoices.length > 0) {
      Alert.alert('Negalima ištrinti', 'Šis klientas turi sąskaitų. Pirma ištrinkite arba perkelkite sąskaitas.');
      return;
    }
    Alert.alert('Ištrinti klientą?', client.name, [
      { text: 'Atšaukti', style: 'cancel' },
      { text: 'Ištrinti', style: 'destructive', onPress: () => { deleteClient(client.id); router.back(); } },
    ]);
  }

  if (!client) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.center}>
          <Text style={s.notFound}>Klientas nerastas</Text>
          <TouchableOpacity onPress={() => router.back()}><Text style={{ color: Colors.blue }}>← Atgal</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.blue} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{client.name}</Text>
        <TouchableOpacity onPress={openEdit} style={s.backBtn}>
          <Ionicons name="create-outline" size={20} color={Colors.blue} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Client info */}
        <View style={s.card}>
          <View style={s.clientTitleRow}>
            <Ionicons name={client.type === 'PERSON' ? 'person-circle-outline' : 'business-outline'} size={22} color={Colors.blue} />
            <Text style={s.clientName}>{client.name}</Text>
          </View>
          {client.companyCode && <InfoLine label="Įmonės kodas" value={client.companyCode} />}
          {client.vatCode     && <InfoLine label="PVM kodas" value={client.vatCode} />}
          {client.address     && <InfoLine label="Adresas" value={client.address} />}
          {client.email       && <InfoLine label="El. paštas" value={client.email} />}
          {client.phone       && <InfoLine label="Telefonas" value={client.phone} />}
          {client.notes       && <InfoLine label="Pastabos" value={client.notes} />}
        </View>

        {/* Stats */}
        <Text style={s.sectionLbl}>Sąskaitų suvestinė</Text>
        <View style={s.statsCard}>
          <View style={s.statRow}><Text style={s.statLbl}>Išrašyta</Text><Text style={s.statVal}>{eur(stats.totalInvoiced)}</Text></View>
          <View style={s.statRow}><Text style={s.statLbl}>Apmokėta</Text><Text style={[s.statVal, { color: Colors.green }]}>{eur(stats.totalPaid)}</Text></View>
          {stats.totalUnpaid > 0  && <View style={s.statRow}><Text style={s.statLbl}>Laukia</Text><Text style={[s.statVal, { color: Colors.blue }]}>{eur(stats.totalUnpaid)}</Text></View>}
          {stats.totalOverdue > 0 && <View style={s.statRow}><Text style={s.statLbl}>Pradelsta</Text><Text style={[s.statVal, { color: Colors.red }]}>{eur(stats.totalOverdue)}</Text></View>}
        </View>

        {/* Invoices */}
        <Text style={s.sectionLbl}>Sąskaitos ({clientInvoices.length})</Text>
        {clientInvoices.length === 0 ? (
          <Text style={s.emptyTxt}>Šiam klientui dar nėra sąskaitų.</Text>
        ) : clientInvoices.map(inv => {
          const st = effectiveStatus(inv);
          return (
            <TouchableOpacity key={inv.id} style={s.invCard} onPress={() => router.push(`/invoice/${inv.id}` as any)}>
              <View style={{ flex: 1 }}>
                <Text style={s.invNumber}>{inv.invoiceNumber}</Text>
                <Text style={s.invDate}>{fmtDate(inv.issueDate)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.invAmount}>{eur(inv.total)}</Text>
                <Text style={[s.invStatus, { color: STATUS_COLORS[st] }]}>{STATUS_LABELS[st]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
          <Text style={s.deleteTxt}>Ištrinti klientą</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={showEdit} animationType="slide" transparent>
        <View style={mo.overlay}>
          <ScrollView style={mo.sheet} contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
            <View style={mo.handle} />
            <Text style={mo.title}>Redaguoti klientą</Text>
            {([
              ['Pavadinimas *', eName, setEName],
              ['Įmonės kodas', eCode, setECode],
              ['PVM kodas', eVat, setEVat],
              ['Adresas', eAddr, setEAddr],
              ['El. paštas', eEmail, setEEmail],
              ['Telefonas', ePhone, setEPhone],
              ['Pastabos', eNotes, setENotes],
            ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
              <View key={label}>
                <Text style={mo.lbl}>{label}</Text>
                <TextInput style={mo.input} value={val} onChangeText={setter} placeholderTextColor={Colors.text3} />
              </View>
            ))}
            <TouchableOpacity style={mo.saveBtn} onPress={saveEdit}><Text style={mo.saveTxt}>Išsaugoti</Text></TouchableOpacity>
            <TouchableOpacity style={mo.cancelBtn} onPress={() => setShowEdit(false)}><Text style={mo.cancelTxt}>Atšaukti</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLbl}>{label}</Text>
      <Text style={s.infoVal}>{value}</Text>
    </View>
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
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text1, textAlign: 'center', marginHorizontal: 8 },

  card:          { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  clientTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  clientName:    { fontSize: 18, fontWeight: '800', color: Colors.text1, flex: 1 },
  infoRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: Colors.border },
  infoLbl:  { fontSize: 12, color: Colors.text3 },
  infoVal:  { fontSize: 12, fontWeight: '600', color: Colors.text1, maxWidth: '60%', textAlign: 'right' },

  sectionLbl: { fontSize: 11, fontWeight: '700', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  statsCard:  { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  statRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  statLbl:    { fontSize: 13, color: Colors.text2 },
  statVal:    { fontSize: 14, fontWeight: '700', color: Colors.text1 },

  invCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface1, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  invNumber: { fontSize: 14, fontWeight: '700', color: Colors.text1, marginBottom: 2 },
  invDate:   { fontSize: 11, color: Colors.text3 },
  invAmount: { fontSize: 15, fontWeight: '800', color: Colors.text1, marginBottom: 2 },
  invStatus: { fontSize: 11, fontWeight: '700' },
  emptyTxt:  { fontSize: 13, color: Colors.text3, textAlign: 'center', paddingVertical: 16 },

  deleteBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  deleteTxt: { fontSize: 13, color: Colors.red, textDecorationLine: 'underline' },
});

const mo = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: Colors.surface1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%', borderWidth: 1, borderColor: Colors.border2 },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.text3, alignSelf: 'center', marginBottom: 16 },
  title:    { fontSize: 18, fontWeight: '800', color: Colors.text1, marginBottom: 16 },
  lbl:      { fontSize: 11, color: Colors.text3, marginBottom: 6, fontWeight: '500' },
  input:    { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: Colors.text1, marginBottom: 12 },
  saveBtn:  { backgroundColor: Colors.blue, borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 8 },
  saveTxt:  { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn:{ alignItems: 'center', padding: 10 },
  cancelTxt:{ color: Colors.text2, fontSize: 14 },
});

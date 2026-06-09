import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { useInvoiceStore } from '../../src/stores/invoiceStore';
import { useClientStore } from '../../src/stores/clientStore';
import { useBusinessStore } from '../../src/stores/businessStore';
import { useAuthStore } from '../../src/stores/authStore';
import { generateAndShareInvoicePDF } from '../../src/services/invoicePdf.service';
import { InvoiceItem, Client } from '../../src/types/business';
import { searchLTCompanies } from '../../src/data/ltCompanies';

const VAT_RATES = [0, 0.09, 0.21];

function newItem(): InvoiceItem {
  return { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, vatRate: 0, total: 0 };
}

function calcItem(item: InvoiceItem): InvoiceItem {
  const total = Math.round(item.quantity * item.unitPrice * (1 + item.vatRate) * 100) / 100;
  return { ...item, total };
}

export default function CreateInvoiceScreen() {
  const router                = useRouter();
  const { createInvoice, settings, load, canCreateInvoice } = useInvoiceStore();
  const { clients, addClient, load: loadClients } = useClientStore();
  const { profile }           = useBusinessStore();
  const { isPremium }         = useAuthStore();

  useEffect(() => { load(); loadClients(); }, []);

  const today     = new Date().toISOString().slice(0, 10);
  const dueDefault = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  const [issueDate,    setIssueDate]    = useState(today);
  const [dueDate,      setDueDate]      = useState(dueDefault);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [items,        setItems]        = useState<InvoiceItem[]>([newItem()]);
  const [notes,        setNotes]        = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // New client form
  const [newClientName, setNewClientName] = useState('');
  const [newClientCode, setNewClientCode] = useState('');
  const [newClientVat,  setNewClientVat]  = useState('');

  // Filtered existing clients + LT company suggestions based on search
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.companyCode ?? '').includes(q)
    );
  }, [clients, clientSearch]);

  const ltSuggestions = useMemo(
    () => searchLTCompanies(clientSearch, 5),
    [clientSearch],
  );

  const totals = (() => {
    const sub = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const vat = items.reduce((s, i) => s + i.unitPrice * i.quantity * i.vatRate, 0);
    return {
      subtotal:  Math.round(sub * 100) / 100,
      vatAmount: Math.round(vat * 100) / 100,
      total:     Math.round((sub + vat) * 100) / 100,
    };
  })();

  function updateItem(id: string, partial: Partial<InvoiceItem>) {
    setItems(prev => prev.map(it => it.id === id ? calcItem({ ...it, ...partial }) : it));
  }

  function removeItem(id: string) {
    if (items.length === 1) return;
    setItems(prev => prev.filter(it => it.id !== id));
  }

  function handleAddClient() {
    if (!newClientName.trim()) { Alert.alert('Klaida', 'Įveskite kliento pavadinimą'); return; }
    const client = addClient({
      userId: '',
      name: newClientName.trim(),
      companyCode: newClientCode.trim() || undefined,
      vatCode: newClientVat.trim() || undefined,
    });
    setSelectedClient(client);
    setShowClientPicker(false);
    setNewClientName(''); setNewClientCode(''); setNewClientVat('');
  }

  async function handleCreate(asDraft: boolean) {
    if (!selectedClient) { Alert.alert('Klaida', 'Pasirinkite klientą'); return; }
    const validItems = items.filter(i => i.description.trim() && i.unitPrice > 0);
    if (validItems.length === 0) { Alert.alert('Klaida', 'Pridėkite bent vieną paslaugą'); return; }

    // Premium gate: free users limited to 5 invoices/month
    if (!canCreateInvoice(isPremium)) {
      Alert.alert(
        'Pasiekta riba',
        'Nemokamai galite sukurti 5 sąskaitas per mėnesį. Įsigykite Premium neribotam skaičiui.',
        [
          { text: 'Ne dabar', style: 'cancel' },
          { text: 'Žiūrėti Premium', onPress: () => router.push('/premium' as any) },
        ],
      );
      return;
    }

    const invoice = createInvoice({
      userId: '',
      businessProfileId: profile.id,
      clientId: selectedClient.id,
      issueDate, dueDate,
      currency: 'EUR',
      status: asDraft ? 'DRAFT' : 'ISSUED',
      // Freeze party data at creation time
      buyerSnapshot: {
        name: selectedClient.name,
        companyCode: selectedClient.companyCode,
        vatCode: selectedClient.vatCode,
        address: selectedClient.address,
        email: selectedClient.email,
      },
      sellerSnapshot: {
        name: profile.businessType === 'MB' ? (profile.companyName ?? '') : (profile.personName ?? ''),
        companyCode: profile.businessType === 'MB' ? profile.companyCode : profile.personalCode,
        vatCode: profile.vatPayer ? profile.vatCode : undefined,
        address: profile.address,
        email: profile.email,
        iban: profile.iban,
      },
      items: validItems,
      notes: notes.trim() || undefined,
    });

    if (!asDraft) {
      await generateAndShareInvoicePDF(invoice, selectedClient, profile);
    }

    router.back();
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>✕</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nauja sąskaita</Text>
        <Text style={s.invNum}>{settings.prefix}-{settings.year}-{String(settings.nextNumber).padStart(4,'0')}</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        {/* Client selection */}
        <Text style={s.sectionLbl}>Pirkėjas</Text>
        <TouchableOpacity style={s.clientRow} onPress={() => { setClientSearch(''); setShowClientPicker(true); }}>
          {selectedClient ? (
            <View>
              <Text style={s.clientName}>{selectedClient.name}</Text>
              {selectedClient.companyCode && <Text style={s.clientDetail}>Kodas: {selectedClient.companyCode}</Text>}
            </View>
          ) : (
            <Text style={s.clientPlaceholder}>Pasirinkite arba sukurkite klientą</Text>
          )}
          <Text style={s.chevron}>›</Text>
        </TouchableOpacity>

        {/* Dates */}
        <View style={s.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.lbl}>Išrašymo data</Text>
            <TextInput style={s.input} value={issueDate} onChangeText={setIssueDate} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.lbl}>Apmokėti iki</Text>
            <TextInput style={s.input} value={dueDate} onChangeText={setDueDate} />
          </View>
        </View>

        {/* Items */}
        <Text style={s.sectionLbl}>Paslaugos / Prekės</Text>
        {items.map((item, idx) => (
          <View key={item.id} style={s.itemCard}>
            <View style={s.itemHeader}>
              <Text style={s.itemNum}>{idx + 1}.</Text>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Text style={{ color: Colors.red, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={s.lbl}>Aprašymas</Text>
            <TextInput
              style={s.input}
              value={item.description}
              onChangeText={v => updateItem(item.id, { description: v })}
              placeholder="Paslaugos pavadinimas"
              placeholderTextColor={Colors.text3}
            />
            <View style={s.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.lbl}>Kiekis</Text>
                <TextInput
                  style={s.input}
                  value={String(item.quantity)}
                  onChangeText={v => updateItem(item.id, { quantity: parseFloat(v) || 1 })}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 2, marginLeft: 8 }}>
                <Text style={s.lbl}>Vnt. kaina (€)</Text>
                <TextInput
                  style={s.input}
                  value={item.unitPrice > 0 ? String(item.unitPrice) : ''}
                  onChangeText={v => updateItem(item.id, { unitPrice: parseFloat(v) || 0 })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.text3}
                />
              </View>
            </View>
            <Text style={s.lbl}>PVM</Text>
            <View style={s.vatRow}>
              {VAT_RATES.map(rate => (
                <TouchableOpacity
                  key={rate}
                  style={[s.vatBtn, item.vatRate === rate && s.vatBtnActive]}
                  onPress={() => updateItem(item.id, { vatRate: rate })}
                >
                  <Text style={[s.vatTxt, item.vatRate === rate && { color: Colors.blue }]}>
                    {rate === 0 ? 'Be PVM' : `${Math.round(rate * 100)}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.itemTotal}>Suma: {(item.total).toLocaleString('lt-LT', { minimumFractionDigits: 2 })} €</Text>
          </View>
        ))}

        <TouchableOpacity style={s.addItemBtn} onPress={() => setItems(prev => [...prev, newItem()])}>
          <Text style={s.addItemTxt}>+ Pridėti eilutę</Text>
        </TouchableOpacity>

        {/* Notes */}
        <Text style={s.lbl}>Pastabos (neprivaloma)</Text>
        <TextInput
          style={[s.input, { height: 70, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholderTextColor={Colors.text3}
        />

        {/* Totals */}
        <View style={s.totalsCard}>
          <View style={s.totalRow}><Text style={s.totalLbl}>Be PVM</Text><Text style={s.totalVal}>{totals.subtotal.toLocaleString('lt-LT',{minimumFractionDigits:2})} €</Text></View>
          {totals.vatAmount > 0 && <View style={s.totalRow}><Text style={s.totalLbl}>PVM</Text><Text style={s.totalVal}>{totals.vatAmount.toLocaleString('lt-LT',{minimumFractionDigits:2})} €</Text></View>}
          <View style={[s.totalRow, s.totalFinal]}>
            <Text style={s.totalFinalLbl}>Mokėti iš viso</Text>
            <Text style={s.totalFinalVal}>{totals.total.toLocaleString('lt-LT',{minimumFractionDigits:2})} €</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity style={s.saveBtn} onPress={() => handleCreate(false)}>
          <Text style={s.saveBtnTxt}>Išrašyti ir generuoti PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.saveDraftBtn} onPress={() => handleCreate(true)}>
          <Text style={s.saveDraftTxt}>Išsaugoti kaip juodraštį</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Client picker modal — with KeyboardAvoidingView so inputs are never covered */}
      <Modal visible={showClientPicker} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={m.overlay}>
            <View style={m.sheet}>
              <View style={m.handle} />

              <View style={m.titleRow}>
                <Text style={m.title}>Klientas</Text>
                <TouchableOpacity onPress={() => setShowClientPicker(false)}>
                  <Ionicons name="close" size={22} color={Colors.text3} />
                </TouchableOpacity>
              </View>

              {/* Search field */}
              <View style={m.searchWrap}>
                <Ionicons name="search-outline" size={16} color={Colors.text3} style={{ marginRight: 8 }} />
                <TextInput
                  style={m.searchInput}
                  value={clientSearch}
                  onChangeText={setClientSearch}
                  placeholder="Ieškoti kliento arba įmonės..."
                  placeholderTextColor={Colors.text3}
                  autoFocus={false}
                />
                {!!clientSearch && (
                  <TouchableOpacity onPress={() => setClientSearch('')}>
                    <Ionicons name="close-circle" size={16} color={Colors.text3} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {/* Existing saved clients */}
                {filteredClients.length > 0 && (
                  <>
                    <Text style={m.sectionLbl}>Mano klientai</Text>
                    {filteredClients.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={m.clientRow}
                        onPress={() => { setSelectedClient(c); setClientSearch(''); setShowClientPicker(false); }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={m.clientName}>{c.name}</Text>
                          {c.companyCode && <Text style={m.clientDetail}>Kodas: {c.companyCode}</Text>}
                        </View>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* Lithuanian company suggestions */}
                {ltSuggestions.length > 0 && (
                  <>
                    <Text style={m.sectionLbl}>🇱🇹 Lietuvos įmonės</Text>
                    {ltSuggestions.map(c => (
                      <TouchableOpacity
                        key={c.code}
                        style={m.clientRow}
                        onPress={() => {
                          setNewClientName(c.name);
                          setNewClientCode(c.code);
                          setNewClientVat(c.vatCode ?? '');
                          setClientSearch('');
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={m.clientName}>{c.name}</Text>
                          <Text style={m.clientDetail}>Kodas: {c.code}{c.vatCode ? `  ·  PVM: ${c.vatCode}` : ''}</Text>
                        </View>
                        <Ionicons name="arrow-down-circle-outline" size={16} color={Colors.blue} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* New client form */}
                <Text style={m.newTitle}>Naujas klientas</Text>
                <TextInput style={m.input} value={newClientName} onChangeText={setNewClientName} placeholder="Pavadinimas *" placeholderTextColor={Colors.text3} />
                <TextInput style={m.input} value={newClientCode} onChangeText={setNewClientCode} placeholder="Įmonės kodas" placeholderTextColor={Colors.text3} keyboardType="numeric" />
                <TextInput style={m.input} value={newClientVat}  onChangeText={setNewClientVat}  placeholder="PVM kodas (pvz. LT100001234)" placeholderTextColor={Colors.text3} autoCapitalize="characters" />
                <TouchableOpacity style={m.addBtn} onPress={handleAddClient}>
                  <Text style={m.addBtnTxt}>Išsaugoti klientą</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backTxt:     { fontSize: 20, color: Colors.text1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text1 },
  invNum:      { fontSize: 12, color: Colors.blue, fontWeight: '600' },

  sectionLbl: { fontSize: 11, fontWeight: '600', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  lbl:        { fontSize: 11, color: Colors.text3, marginBottom: 6, fontWeight: '500' },
  input:      { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 13, fontSize: 15, color: Colors.text1, marginBottom: 12 },

  clientRow:         { backgroundColor: Colors.surface1, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.border },
  clientName:        { fontSize: 15, fontWeight: '600', color: Colors.text1 },
  clientDetail:      { fontSize: 12, color: Colors.text3, marginTop: 2 },
  clientPlaceholder: { fontSize: 14, color: Colors.text3 },
  chevron:           { fontSize: 20, color: Colors.text3 },

  dateRow: { flexDirection: 'row', gap: 10 },

  itemCard:   { backgroundColor: Colors.surface1, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemNum:    { fontSize: 13, fontWeight: '700', color: Colors.text2 },
  itemRow:    { flexDirection: 'row' },
  vatRow:     { flexDirection: 'row', gap: 8, marginBottom: 10 },
  vatBtn:     { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surface2, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  vatBtnActive: { backgroundColor: Colors.blueDim, borderColor: 'rgba(79,142,247,0.3)' },
  vatTxt:     { fontSize: 12, fontWeight: '600', color: Colors.text3 },
  itemTotal:  { fontSize: 13, fontWeight: '700', color: Colors.blue, textAlign: 'right' },

  addItemBtn: { backgroundColor: Colors.surface2, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  addItemTxt: { color: Colors.blue, fontWeight: '600', fontSize: 14 },

  totalsCard:    { backgroundColor: Colors.surface1, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.border },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLbl:      { fontSize: 13, color: Colors.text2 },
  totalVal:      { fontSize: 13, fontWeight: '600', color: Colors.text1 },
  totalFinal:    { borderTopWidth: 1, borderTopColor: Colors.border2, marginTop: 6, paddingTop: 10 },
  totalFinalLbl: { fontSize: 15, fontWeight: '700', color: Colors.text1 },
  totalFinalVal: { fontSize: 18, fontWeight: '800', color: Colors.blue },

  saveBtn:     { backgroundColor: Colors.blue, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnTxt:  { color: '#fff', fontWeight: '800', fontSize: 16 },
  saveDraftBtn:{ alignItems: 'center', padding: 12 },
  saveDraftTxt:{ color: Colors.text2, fontSize: 14 },
});

const m = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: Colors.surface1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '85%', borderWidth: 1, borderColor: Colors.border2 },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.text3, alignSelf: 'center', marginBottom: 16 },
  titleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title:      { fontSize: 18, fontWeight: '800', color: Colors.text1 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  searchInput:{ flex: 1, fontSize: 14, color: Colors.text1 },
  sectionLbl: { fontSize: 10, fontWeight: '700', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  newTitle:   { fontSize: 13, fontWeight: '700', color: Colors.text2, marginTop: 16, marginBottom: 10 },
  clientRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  clientName: { fontSize: 15, fontWeight: '600', color: Colors.text1 },
  clientDetail:{ fontSize: 12, color: Colors.text3, marginTop: 2 },
  input:      { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 13, fontSize: 15, color: Colors.text1, marginBottom: 10 },
  addBtn:     { backgroundColor: Colors.blue, borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 8 },
  addBtnTxt:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn:  { alignItems: 'center', padding: 10 },
  cancelTxt:  { color: Colors.text2, fontSize: 14 },
});

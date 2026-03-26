import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, Share, Switch,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { api, type CategoryBudget, type RecurringTransaction } from '../../lib/api';
import { CATEGORIES } from '../../components/TransactionFormModal';
import { RecurringTransactionModal } from '../../components/RecurringTransactionModal';

export default function SettingsScreen() {
  const { member, signOut, refreshMember } = useAuth();
  const { colors, isDark, toggle } = useTheme();
  const queryClient = useQueryClient();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(member?.name ?? '');

  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState(
    member?.household?.monthlyIncome?.toString() ?? ''
  );

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(
    member?.household?.budgetLimit?.toString() ?? ''
  );

  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Category budgets state
  const [catBudgets, setCatBudgets] = useState<CategoryBudget[]>([]);
  const [newCatBudgetCategory, setNewCatBudgetCategory] = useState(CATEGORIES[0]);
  const [newCatBudgetAmount, setNewCatBudgetAmount] = useState('');
  const [addingCatBudget, setAddingCatBudget] = useState(false);

  // Recurring transactions state
  const [recurringItems, setRecurringItems] = useState<RecurringTransaction[]>([]);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);

  const household = member?.household;

  useEffect(() => {
    if (member?.householdId) {
      api.get<{ budgets: CategoryBudget[] }>('/category-budgets')
        .then((r) => setCatBudgets(r.budgets))
        .catch(() => {});
      api.get<{ recurringTransactions: RecurringTransaction[] }>('/recurring-transactions')
        .then((r) => setRecurringItems(r.recurringTransactions))
        .catch(() => {});
    }
  }, [member?.householdId]);

  const s = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 20, paddingTop: 60, gap: 12, paddingBottom: 40 },
    pageTitle: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'right', marginBottom: 4 },
    sectionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'right', marginTop: 8 },
    card: { backgroundColor: colors.cardBg, borderRadius: 14, padding: 16, gap: 0 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
    fieldRow: { gap: 6 },
    fieldLabel: { color: colors.textMuted, fontSize: 12, textAlign: 'right' },
    valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fieldValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
    codeText: { color: colors.accent, letterSpacing: 2 },
    editBlock: { gap: 8 },
    input: { backgroundColor: colors.inputBg, borderRadius: 8, padding: 10, fontSize: 15, color: colors.text },
    codeInput: { letterSpacing: 4, fontSize: 18, textAlign: 'center', fontWeight: '700' },
    btnRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    saveBtn: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 8 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    cancelText: { color: colors.textMuted, fontSize: 14 },
    joinHint: { color: colors.textSecondary, fontSize: 13, textAlign: 'right', marginBottom: 8 },
    joinBtn: { backgroundColor: colors.accent, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
    joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    btnDisabled: { opacity: 0.5 },
    signOutBtn: {
      marginTop: 12, backgroundColor: colors.expense + '20', borderRadius: 12,
      padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.expense,
    },
    signOutText: { color: colors.expense, fontWeight: '700', fontSize: 16 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
      backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, marginRight: 6,
    },
    chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { color: colors.textMuted, fontSize: 12 },
    chipTextActive: { color: '#fff', fontWeight: '700' },
    themeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    themeLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
    themeSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  }), [colors]);

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) { Alert.alert('שם קצר מדי', 'הזן לפחות 2 תווים.'); return; }
    setSaving(true);
    try {
      await api.put('/profile', { name: trimmed });
      await refreshMember();
      setEditingName(false);
    } catch { Alert.alert('שגיאה', 'לא ניתן לשמור את השם.'); }
    finally { setSaving(false); }
  };

  const saveIncome = async () => {
    const val = parseFloat(incomeInput);
    if (isNaN(val) || val < 0) { Alert.alert('סכום לא תקין', 'הזן סכום חיובי.'); return; }
    setSaving(true);
    try {
      await api.put('/household', { monthlyIncome: val });
      await refreshMember();
      queryClient.invalidateQueries({ queryKey: ['report'] });
      setEditingIncome(false);
    } catch { Alert.alert('שגיאה', 'לא ניתן לשמור את ההכנסה.'); }
    finally { setSaving(false); }
  };

  const saveBudget = async () => {
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val <= 0) { Alert.alert('תקציב לא תקין', 'הזן סכום גדול מ-0.'); return; }
    setSaving(true);
    try {
      await api.put('/household', { budgetLimit: val });
      await refreshMember();
      queryClient.invalidateQueries({ queryKey: ['report'] });
      setEditingBudget(false);
    } catch { Alert.alert('שגיאה', 'לא ניתן לשמור את התקציב.'); }
    finally { setSaving(false); }
  };

  const joinHousehold = async () => {
    if (!joinCode.trim()) { Alert.alert('חובה', 'הזן קוד הזמנה.'); return; }
    setJoinLoading(true);
    try {
      await api.post('/household/join', { inviteCode: joinCode.trim().toUpperCase() });
      await refreshMember();
      queryClient.invalidateQueries({ queryKey: ['household'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setJoinCode('');
      Alert.alert('✅ הצטרפת!', 'הצטרפת בהצלחה למשק הבית.');
    } catch (e: unknown) {
      Alert.alert('לא נמצא', e instanceof Error ? e.message : 'קוד לא תקין.');
    }
    finally { setJoinLoading(false); }
  };

  const shareInvite = () => {
    if (!household?.inviteCode) return;
    Share.share({ message: `הצטרף למשק הבית שלי ב-FinancialAssistant! קוד: ${household.inviteCode}` });
  };

  const saveCatBudget = async () => {
    const val = parseFloat(newCatBudgetAmount);
    if (isNaN(val) || val <= 0) { Alert.alert('סכום לא תקין', 'הזן סכום חיובי.'); return; }
    try {
      await api.put('/category-budgets', { category: newCatBudgetCategory, budgetLimit: val });
      const r = await api.get<{ budgets: CategoryBudget[] }>('/category-budgets');
      setCatBudgets(r.budgets);
      queryClient.invalidateQueries({ queryKey: ['report'] });
      setNewCatBudgetAmount('');
      setAddingCatBudget(false);
    } catch { Alert.alert('שגיאה', 'לא ניתן לשמור.'); }
  };

  const deleteCatBudget = (category: string) => {
    Alert.alert('מחיקת יעד', `למחוק את יעד "${category}"?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/category-budgets/${encodeURIComponent(category)}`);
            setCatBudgets((prev) => prev.filter((b) => b.category !== category));
            queryClient.invalidateQueries({ queryKey: ['report'] });
          } catch { Alert.alert('שגיאה', 'לא ניתן למחוק.'); }
        },
      },
    ]);
  };

  const saveRecurring = async (data: {
    type: 'EXPENSE' | 'INCOME';
    amount: number;
    category: string;
    description: string;
    frequency: 'WEEKLY' | 'MONTHLY';
    dayOfWeek?: number;
    dayOfMonth?: number;
  }) => {
    await api.post('/recurring-transactions', data);
    const r = await api.get<{ recurringTransactions: RecurringTransaction[] }>('/recurring-transactions');
    setRecurringItems(r.recurringTransactions);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['report'] });
  };

  const deleteRecurring = (id: string, description: string) => {
    Alert.alert('מחיקת תשלום', `למחוק את "${description}"?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/recurring-transactions/${id}`);
            setRecurringItems((prev) => prev.filter((r) => r.id !== id));
          } catch { Alert.alert('שגיאה', 'לא ניתן למחוק.'); }
        },
      },
    ]);
  };

  const handleSignOut = () => {
    Alert.alert('התנתקות', 'האם אתה בטוח שברצונך להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'התנתק', style: 'destructive', onPress: () => signOut().catch(() => {}) },
    ]);
  };

  return (
    <>
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.pageTitle}>הגדרות</Text>

      {/* ─── Appearance ─── */}
      <Text style={s.sectionLabel}>מראה</Text>
      <View style={s.card}>
        <View style={s.themeRow}>
          <Switch
            value={isDark}
            onValueChange={toggle}
            trackColor={{ false: '#ccc', true: colors.accent }}
            thumbColor="#fff"
          />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.themeLabel}>{isDark ? '🌙 מצב לילה' : '☀️ מצב יום'}</Text>
            <Text style={s.themeSub}>{isDark ? 'ערכת צבעים כהה' : 'ערכת צבעים בהירה'}</Text>
          </View>
        </View>
      </View>

      {/* ─── Profile ─── */}
      <Text style={s.sectionLabel}>פרופיל אישי</Text>
      <View style={s.card}>
        <View style={s.fieldRow}>
          <Text style={s.fieldLabel}>שם</Text>
          {editingName ? (
            <View style={s.editBlock}>
              <TextInput
                style={s.input} value={nameInput} onChangeText={setNameInput}
                autoFocus textAlign="right" placeholder="שמך" placeholderTextColor={colors.textMuted}
              />
              <View style={s.btnRow}>
                <TouchableOpacity style={s.saveBtn} onPress={saveName} disabled={saving}>
                  <Text style={s.saveBtnText}>{saving ? '...' : 'שמור'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditingName(false); setNameInput(member?.name ?? ''); }}>
                  <Text style={s.cancelText}>ביטול</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.valueRow}>
              <Text style={s.fieldValue}>{member?.name ?? '—'}</Text>
              <TouchableOpacity onPress={() => { setNameInput(member?.name ?? ''); setEditingName(true); }}>
                <Ionicons name="pencil-outline" size={16} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={s.divider} />

        <View style={s.fieldRow}>
          <Text style={s.fieldLabel}>אימייל</Text>
          <Text style={s.fieldValue}>{member?.email ?? '—'}</Text>
        </View>
      </View>

      {/* ─── Household settings ─── */}
      {household && (
        <>
          <Text style={s.sectionLabel}>משק בית</Text>
          <View style={s.card}>
            {/* Monthly income */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>הכנסה חודשית</Text>
              {editingIncome ? (
                <View style={s.editBlock}>
                  <TextInput
                    style={s.input} value={incomeInput} onChangeText={setIncomeInput}
                    keyboardType="numeric" autoFocus textAlign="right" placeholder="0" placeholderTextColor={colors.textMuted}
                  />
                  <View style={s.btnRow}>
                    <TouchableOpacity style={s.saveBtn} onPress={saveIncome} disabled={saving}>
                      <Text style={s.saveBtnText}>{saving ? '...' : 'שמור'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingIncome(false)}>
                      <Text style={s.cancelText}>ביטול</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={s.valueRow}>
                  <Text style={s.fieldValue}>₪{household.monthlyIncome?.toFixed(0) ?? '0'}</Text>
                  <TouchableOpacity onPress={() => { setIncomeInput(household.monthlyIncome?.toString() ?? ''); setEditingIncome(true); }}>
                    <Ionicons name="pencil-outline" size={16} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={s.divider} />

            {/* Budget limit */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>תקציב חודשי</Text>
              {editingBudget ? (
                <View style={s.editBlock}>
                  <TextInput
                    style={s.input} value={budgetInput} onChangeText={setBudgetInput}
                    keyboardType="numeric" autoFocus textAlign="right" placeholder="0" placeholderTextColor={colors.textMuted}
                  />
                  <View style={s.btnRow}>
                    <TouchableOpacity style={s.saveBtn} onPress={saveBudget} disabled={saving}>
                      <Text style={s.saveBtnText}>{saving ? '...' : 'שמור'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingBudget(false)}>
                      <Text style={s.cancelText}>ביטול</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={s.valueRow}>
                  <Text style={s.fieldValue}>₪{household.budgetLimit?.toFixed(0) ?? '0'}</Text>
                  <TouchableOpacity onPress={() => { setBudgetInput(household.budgetLimit?.toString() ?? ''); setEditingBudget(true); }}>
                    <Ionicons name="pencil-outline" size={16} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={s.divider} />

            {/* Invite code */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>קוד הזמנה למשק הבית</Text>
              <View style={s.valueRow}>
                <Text style={[s.fieldValue, s.codeText]}>{household.inviteCode}</Text>
                <TouchableOpacity onPress={shareInvite}>
                  <Ionicons name="share-outline" size={18} color={colors.accent} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </>
      )}

      {/* ─── Category budgets ─── */}
      {household && (
        <>
          <Text style={s.sectionLabel}>🎯 תקציב לפי תחום</Text>
          <View style={s.card}>
            {catBudgets.length === 0 && !addingCatBudget && (
              <Text style={s.joinHint}>לא הוגדרו יעדים לפי תחום עדיין.</Text>
            )}
            {catBudgets.map((b) => (
              <View key={b.category} style={[s.fieldRow, { marginBottom: 8 }]}>
                <View style={s.valueRow}>
                  <Text style={s.fieldValue}>{b.category}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={[s.fieldValue, { color: colors.accent }]}>₪{b.budgetLimit.toFixed(0)}</Text>
                    <TouchableOpacity onPress={() => deleteCatBudget(b.category)}>
                      <Ionicons name="trash-outline" size={16} color={colors.expense} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {addingCatBudget ? (
              <View style={{ gap: 8, marginTop: 4 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[s.chip, newCatBudgetCategory === c && s.chipActive]}
                      onPress={() => setNewCatBudgetCategory(c)}
                    >
                      <Text style={[s.chipText, newCatBudgetCategory === c && s.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  style={s.input} value={newCatBudgetAmount} onChangeText={setNewCatBudgetAmount}
                  keyboardType="numeric" placeholder="תקציב חודשי לתחום (₪)" placeholderTextColor={colors.textMuted}
                  textAlign="right" autoFocus
                />
                <View style={s.btnRow}>
                  <TouchableOpacity style={s.saveBtn} onPress={saveCatBudget}>
                    <Text style={s.saveBtnText}>שמור</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setAddingCatBudget(false)}>
                    <Text style={s.cancelText}>ביטול</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={[s.joinBtn, { marginTop: catBudgets.length > 0 ? 8 : 0 }]} onPress={() => setAddingCatBudget(true)}>
                <Text style={s.joinBtnText}>+ הוסף יעד לתחום</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* ─── Recurring transactions ─── */}
      {household && (
        <>
          <Text style={s.sectionLabel}>🔁 תשלומים קבועים</Text>
          <View style={s.card}>
            {recurringItems.length === 0 && (
              <Text style={s.joinHint}>לא הוגדרו תשלומים קבועים עדיין.</Text>
            )}
            {recurringItems.map((item) => (
              <View key={item.id} style={[s.fieldRow, { marginBottom: 8 }]}>
                <View style={s.valueRow}>
                  <TouchableOpacity onPress={() => deleteRecurring(item.id, item.description)}>
                    <Ionicons name="trash-outline" size={16} color={colors.expense} />
                  </TouchableOpacity>
                  <View style={{ alignItems: 'flex-end', flex: 1 }}>
                    <Text style={s.fieldValue}>{item.description}</Text>
                    <Text style={[s.fieldLabel, { marginTop: 2 }]}>
                      {item.frequency === 'MONTHLY'
                        ? `חודשי — יום ${item.dayOfMonth}`
                        : `שבועי — ${['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'][item.dayOfWeek ?? 0]}`}
                    </Text>
                  </View>
                  <Text style={[s.fieldValue, { color: item.type === 'EXPENSE' ? colors.expense : colors.income, marginLeft: 8 }]}>
                    {item.type === 'EXPENSE' ? '-' : '+'}₪{item.amount.toFixed(0)}
                  </Text>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={[s.joinBtn, { marginTop: recurringItems.length > 0 ? 8 : 0 }]}
              onPress={() => setRecurringModalVisible(true)}
            >
              <Text style={s.joinBtnText}>+ הוסף תשלום קבוע</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ─── Join household ─── */}
      <Text style={s.sectionLabel}>הצטרף למשק בית אחר</Text>
      <View style={s.card}>
        <Text style={s.joinHint}>הזן קוד הזמנה ממשק בית אחר:</Text>
        <TextInput
          style={[s.input, s.codeInput]} value={joinCode} onChangeText={setJoinCode}
          placeholder="HH-A3B9C2" placeholderTextColor={colors.textMuted}
          autoCapitalize="characters" textAlign="center"
        />
        <TouchableOpacity style={[s.joinBtn, joinLoading && s.btnDisabled]} onPress={joinHousehold} disabled={joinLoading}>
          <Text style={s.joinBtnText}>{joinLoading ? 'מצטרף...' : 'הצטרף ←'}</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Sign out ─── */}
      <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
        <Text style={s.signOutText}>התנתק</Text>
      </TouchableOpacity>
    </ScrollView>

    <RecurringTransactionModal
      visible={recurringModalVisible}
      onClose={() => setRecurringModalVisible(false)}
      onSave={saveRecurring}
    />
    </>
  );
}

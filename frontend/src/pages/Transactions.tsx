import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/api/transactions';
import { accountsApi } from '@/api/accounts';
import { categoriesApi } from '@/api/categories';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import type { Transaction, FinancialProduct, Category, TransactionType } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Transactions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Edit/Delete state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsApi.getTransactions(),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => accountsApi.getProducts(),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: transactionsApi.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Transacción registrada', 'success');
      setShowForm(false);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al crear transacción', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => transactionsApi.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Transacción actualizada', 'success');
      setEditingTransaction(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al actualizar', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionsApi.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Transacción eliminada', 'success');
      setDeletingTransaction(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al eliminar', 'error');
    },
  });

  // --- Handlers ---
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      amount: parseFloat(formData.get('amount') as string),
      date: formData.get('date') as string,
      description: formData.get('description') as string,
      transaction_type: formData.get('transaction_type') as TransactionType,
      from_product_id: formData.get('from_product_id') as string,
      category_id: formData.get('category_id') as string || undefined,
      installments: parseInt(formData.get('installments') as string) || 1,
      plan_z: formData.get('plan_z') === 'on',
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingTransaction.id,
      data: {
        amount: parseFloat(formData.get('amount') as string),
        date: formData.get('date') as string,
        description: formData.get('description') as string,
        category_id: formData.get('category_id') as string || undefined,
      },
    });
  };

  // --- Config ---
  const transactionTypeConfig: Record<string, { label: string; icon: string; color: string }> = {
    EXPENSE: { label: 'Gasto', icon: '↓', color: 'red' },
    INCOME: { label: 'Ingreso', icon: '↑', color: 'emerald' },
    TRANSFER: { label: 'Transferencia', icon: '↔', color: 'blue' },
  };

  const filteredTransactions = transactions?.filter(tx =>
    filterType === 'ALL' ? true : tx.transaction_type === filterType
  ) || [];

  const totalIncome = transactions?.filter(t => t.transaction_type === 'INCOME').reduce((s, t) => s + t.amount, 0) || 0;
  const totalExpense = transactions?.filter(t => t.transaction_type === 'EXPENSE').reduce((s, t) => s + t.amount, 0) || 0;
  const transactionCount = transactions?.length || 0;

  // Group by date
  const groupedTransactions = new Map<string, Transaction[]>();
  filteredTransactions.forEach(tx => {
    const dateKey = format(new Date(tx.date), 'yyyy-MM-dd');
    if (!groupedTransactions.has(dateKey)) groupedTransactions.set(dateKey, []);
    groupedTransactions.get(dateKey)!.push(tx);
  });
  const sortedDateGroups = Array.from(groupedTransactions.entries()).sort(([a], [b]) => b.localeCompare(a));

  const getProductName = (productId: string) => products?.find(p => p.id === productId)?.name || '—';
  const getCategoryInfo = (categoryId?: string) => categoryId ? categories?.find(c => c.id === categoryId) : null;

  const handleBackgroundClick = () => setOpenMenuId(null);

  // Reusable components
  const ActionMenu = ({ id, children }: { id: string; children: React.ReactNode }) => (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === id ? null : id); }}
        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all" aria-label="Acciones">
        <svg className="w-4 h-4 text-white/40" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {openMenuId === id && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
          <div className="absolute right-0 top-8 z-20 w-40 bg-slate-800/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-xl py-1 overflow-hidden">
            {children}
          </div>
        </>
      )}
    </div>
  );

  const MenuItem = ({ onClick, destructive, children }: { onClick: () => void; destructive?: boolean; children: React.ReactNode }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); setOpenMenuId(null); }}
      className={`w-full text-left px-4 py-2 text-sm transition-colors ${destructive ? 'text-red-400 hover:bg-red-500/10' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}`}>
      {children}
    </button>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto" onClick={handleBackgroundClick}>
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-primary-400 font-medium mb-1 text-sm">Registro financiero</p>
          <h1 className="text-4xl font-bold text-white tracking-tight">Transacciones</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="glass-button-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva Transacción
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Ingresos Totales</p>
          <p className="text-3xl font-bold text-emerald-400">+${totalIncome.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">Suma de todos los ingresos</p>
        </Card>
        <Card className="relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Gastos Totales</p>
          <p className="text-3xl font-bold text-red-400">-${totalExpense.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">Suma de todos los egresos</p>
        </Card>
        <Card className="relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Movimientos</p>
          <p className="text-3xl font-bold text-white">{transactionCount}</p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">Transacciones registradas</p>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
        {[
          { key: 'ALL', label: 'Todos' },
          { key: 'INCOME', label: 'Ingresos' },
          { key: 'EXPENSE', label: 'Gastos' },
          { key: 'TRANSFER', label: 'Transferencias' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilterType(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${filterType === tab.key ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              }`}>{tab.label}</button>
        ))}
      </div>

      {/* Transaction List */}
      {sortedDateGroups.length > 0 ? (
        <div className="space-y-6">
          {sortedDateGroups.map(([dateKey, txs]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-3 mb-3 px-2">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
                  {format(new Date(dateKey + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: es })}
                </p>
                <div className="flex-1 h-px bg-white/[0.06]" />
                <p className="text-white/30 text-xs">{txs.length} {txs.length === 1 ? 'movimiento' : 'movimientos'}</p>
              </div>
              <div className="space-y-2">
                {txs.map((tx: Transaction) => {
                  const typeConfig = transactionTypeConfig[tx.transaction_type];
                  const category = getCategoryInfo(tx.category_id);
                  const isIncome = tx.transaction_type === 'INCOME';
                  return (
                    <div key={tx.id}
                      className="group flex items-center gap-4 px-5 py-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl transition-all duration-200">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 border ${typeConfig.color === 'red' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                          typeConfig.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                            'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        }`}>
                        {category?.icon || typeConfig.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium truncate">{tx.description}</p>
                          {tx.installment_total && tx.installment_total > 1 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 flex-shrink-0">
                              {tx.installment_number}/{tx.installment_total}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-white/40 text-xs truncate">
                            {tx.from_product_id ? getProductName(tx.from_product_id) : '—'}
                          </p>
                          {category && (
                            <><span className="text-white/20">·</span><span className="text-white/40 text-xs">{category.name}</span></>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg font-bold ${isIncome ? 'text-emerald-400' : 'text-white'}`}>
                          {isIncome ? '+' : '-'}${tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <ActionMenu id={`tx-${tx.id}`}>
                        <MenuItem onClick={() => setEditingTransaction(tx)}>✏️ Editar</MenuItem>
                        <MenuItem onClick={() => setDeletingTransaction(tx)} destructive>🗑️ Eliminar</MenuItem>
                      </ActionMenu>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-20 text-center border border-white/10 bg-white/[0.01]">
          <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full" />
            <svg className="w-12 h-12 text-primary-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Sin transacciones</h3>
          <p className="text-white/40 max-w-sm mb-10 leading-relaxed font-medium">Registrá tus ingresos y gastos para tener un control detallado de tu flujo financiero.</p>
          <button onClick={() => setShowForm(true)} className="glass-button-primary px-8 py-3 text-lg hover:scale-105 transition-transform shadow-xl shadow-primary-900/40">
            Registrar mi primer movimiento
          </button>
        </Card>
      )}

      {/* ======================== MODALS ======================== */}

      {/* Create Transaction */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <div><h2 className="text-lg font-semibold text-white">Nueva Transacción</h2><p className="text-white/40 text-xs">Registrá un ingreso o gasto</p></div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Tipo</label>
                <select name="transaction_type" required className="glass-input w-full">
                  <option value="EXPENSE">↓ Gasto</option>
                  <option value="INCOME">↑ Ingreso</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Monto</label>
                  <input name="amount" type="number" step="0.01" required className="glass-input w-full" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Fecha</label>
                  <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="glass-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Descripción</label>
                <input name="description" type="text" required className="glass-input w-full" placeholder="Ej: Compra supermercado" />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Producto</label>
                <select name="from_product_id" required className="glass-input w-full">
                  <option value="">Seleccionar cuenta...</option>
                  {products?.map((p: FinancialProduct) => (<option key={p.id} value={p.id}>{p.name} (${p.balance.toFixed(2)})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Categoría</label>
                <select name="category_id" className="glass-input w-full">
                  <option value="">Sin categoría</option>
                  {categories?.map((c: Category) => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Cuotas</label>
                  <input name="installments" type="number" min="1" max="48" defaultValue="1" className="glass-input w-full" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input name="plan_z" type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 accent-primary-500" />
                    <span className="text-white/60 text-xs font-medium group-hover:text-white/80 transition-colors">Plan Z (3 sin interés)</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
                <button type="submit" className="glass-button-primary flex-1" disabled={createMutation.isPending}>{createMutation.isPending ? 'Registrando...' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setEditingTransaction(null)}>
          <div className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Editar Transacción</h2>
                <p className="text-white/40 text-xs">{transactionTypeConfig[editingTransaction.transaction_type]?.label} · {format(new Date(editingTransaction.date), 'dd/MM/yyyy')}</p>
              </div>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Monto</label>
                  <input name="amount" type="number" step="0.01" required className="glass-input w-full" defaultValue={editingTransaction.amount} />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Fecha</label>
                  <input name="date" type="date" required defaultValue={editingTransaction.date.split('T')[0]} className="glass-input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Descripción</label>
                <input name="description" type="text" required className="glass-input w-full" defaultValue={editingTransaction.description} />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Categoría</label>
                <select name="category_id" className="glass-input w-full" defaultValue={editingTransaction.category_id || ''}>
                  <option value="">Sin categoría</option>
                  {categories?.map((c: Category) => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingTransaction(null)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
                <button type="submit" className="glass-button-primary flex-1" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Transaction Confirm */}
      {deletingTransaction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setDeletingTransaction(null)}>
          <div className="glass-card p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Eliminar Transacción</h3>
            <p className="text-white/50 text-sm mb-2">¿Estás seguro de eliminar esta transacción?</p>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 mb-6">
              <p className="text-white font-medium">{deletingTransaction.description}</p>
              <p className="text-white/40 text-xs mt-0.5">
                {transactionTypeConfig[deletingTransaction.transaction_type]?.label} · ${deletingTransaction.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })} · {format(new Date(deletingTransaction.date), 'dd/MM/yyyy')}
              </p>
            </div>
            <p className="text-white/30 text-[10px] mb-4">El balance de la cuenta se actualizará automáticamente.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingTransaction(null)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(deletingTransaction.id)}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm font-medium text-red-400 transition-all"
                disabled={deleteMutation.isPending}>{deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '@/api/accounts';
import { categoriesApi } from '@/api/categories';
import { transactionsApi } from '@/api/transactions';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import type { FinancialProduct, Category, TransactionType } from '@/types';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => accountsApi.getProducts(),
  });

  const { data: institutions } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => accountsApi.getInstitutions(),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const createMutation = useMutation({
    mutationFn: transactionsApi.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Transacción registrada', 'success');
      setShowTransactionModal(false);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al crear transacción', 'error');
    },
  });

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

  const totalBalance = products?.reduce((sum, p) => sum + p.balance, 0) || 0;
  const creditCards = products?.filter(p => p.product_type === 'CREDIT_CARD') || [];
  const totalDebt = creditCards.reduce((sum, card) => sum + Math.abs(card.balance || 0), 0);
  const productCount = products?.length || 0;

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header with Greeting and Date */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-primary-400 font-medium mb-1 capitalize text-sm">{today}</p>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            ¡Hola, Demo User! 👋
          </h1>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Balance Total</p>
          <p className="text-3xl font-bold text-white">
            ${totalBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">Suma de liquidez disponible</p>
        </Card>

        <Card className="relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Deudas y créditos</p>
          <p className={`text-3xl font-bold ${totalDebt > 0 ? 'text-red-400' : 'text-white'}`}>
            ${totalDebt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">
            {totalDebt > 0 ? 'Vencimientos próximos' : 'Sin deudas pendientes'}
          </p>
        </Card>

        <Card className="relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Productos Activos</p>
          <p className="text-3xl font-bold text-white">{productCount}</p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">En {institutions?.length || 0} {(institutions?.length || 0) === 1 ? 'institución' : 'instituciones'}</p>
        </Card>
      </div>

      {/* Main Content Area / Empty State */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {products && products.length > 0 ? (
            <Card title="Estado Financiero">
              <div className="h-72 flex flex-col items-center justify-center border border-white/5 bg-white/[0.02] rounded-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent pointer-events-none" />
                <div className="text-center p-8 relative z-10">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-8 h-8 opacity-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-white/40 font-medium italic">Gráficos de actividad y flujos próximamente...</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center py-20 text-center border border-white/10 bg-white/[0.01]">
              <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full" />
                <svg className="w-12 h-12 text-primary-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Tu banquito está vacío</h3>
              <p className="text-white/40 max-w-sm mb-10 leading-relaxed font-medium">
                Conecta tus instituciones financieras para centralizar tus saldos, controlar deudas y planificar tu ahorro.
              </p>
              <Link to="/accounts" className="glass-button-primary px-8 py-3 text-lg hover:scale-105 transition-transform shadow-xl shadow-primary-900/40">
                Vincular mi primera cuenta
              </Link>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Acciones Rápidas">
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setShowTransactionModal(true)}
                className="w-full flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Transacción</p>
                  <p className="text-[10px] text-white/40">Ingreso o gasto manual</p>
                </div>
              </button>
            </div>
          </Card>
        </div>
      </div>
      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowTransactionModal(false)}>
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
                <button type="button" onClick={() => setShowTransactionModal(false)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
                <button type="submit" className="glass-button-primary flex-1" disabled={createMutation.isPending}>{createMutation.isPending ? 'Registrando...' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

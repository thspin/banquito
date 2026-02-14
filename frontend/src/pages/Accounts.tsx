import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { accountsApi } from '@/api/accounts';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import type { FinancialProduct, FinancialInstitution, ProductType, Currency, InstitutionType } from '@/types';

export default function Accounts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [showProductForm, setShowProductForm] = useState(false);
  const [showInstitutionForm, setShowInstitutionForm] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState('');

  const { data: institutions } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => accountsApi.getInstitutions(),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => accountsApi.getProducts(),
  });

  const createInstitutionMutation = useMutation({
    mutationFn: accountsApi.createInstitution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      showToast('Institución creada exitosamente', 'success');
      setShowInstitutionForm(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Error al crear institución';
      showToast(message, 'error');
    },
  });

  const createProductMutation = useMutation({
    mutationFn: accountsApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Producto creado exitosamente', 'success');
      setShowProductForm(false);
      setSelectedInstitution('');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Error al crear producto.';
      showToast(message, 'error');
    },
  });

  const handleCreateInstitution = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createInstitutionMutation.mutate({
      name: formData.get('name') as string,
      institution_type: formData.get('institution_type') as InstitutionType,
    });
  };

  const handleCreateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = {
      name: formData.get('name') as string,
      product_type: formData.get('product_type') as ProductType,
      currency: formData.get('currency') as Currency,
      balance: 0,
    };
    if (selectedInstitution) {
      data.institution_id = selectedInstitution;
    }
    createProductMutation.mutate(data);
  };

  const institutionTypes: Record<string, { label: string; icon: string; color: string }> = {
    BANK: { label: 'Banco', icon: '🏦', color: 'blue' },
    WALLET: { label: 'Billetera Digital', icon: '👛', color: 'purple' },
  };

  const productTypeConfig: Record<string, { label: string; icon: string }> = {
    CASH: { label: 'Efectivo', icon: '💵' },
    SAVINGS_ACCOUNT: { label: 'Caja de Ahorro', icon: '🏦' },
    CHECKING_ACCOUNT: { label: 'Cuenta Corriente', icon: '📋' },
    DEBIT_CARD: { label: 'Tarjeta de Débito', icon: '💳' },
    CREDIT_CARD: { label: 'Tarjeta de Crédito', icon: '💳' },
    LOAN: { label: 'Préstamo', icon: '📄' },
  };

  const currencies: Record<string, string> = {
    ARS: '$ ARS',
    USD: '$ USD',
    USDT: '₮ USDT',
    USDC: '$ USDC',
    BTC: '₿ BTC',
  };

  // Group products by institution
  const productsByInstitution = new Map<string, { institution: FinancialInstitution | null; products: FinancialProduct[] }>();

  if (products) {
    // Group products with institutions
    products.forEach((product) => {
      const instId = product.institution_id || '__none__';
      if (!productsByInstitution.has(instId)) {
        const inst = institutions?.find(i => i.id === product.institution_id) || null;
        productsByInstitution.set(instId, { institution: inst, products: [] });
      }
      productsByInstitution.get(instId)!.products.push(product);
    });
  }

  // Add institutions with no products
  institutions?.forEach((inst) => {
    if (!productsByInstitution.has(inst.id)) {
      productsByInstitution.set(inst.id, { institution: inst, products: [] });
    }
  });

  const totalBalance = products?.reduce((sum, p) => sum + (p.product_type !== 'CREDIT_CARD' ? p.balance : 0), 0) || 0;
  const totalDebt = products?.filter(p => p.product_type === 'CREDIT_CARD').reduce((sum, p) => sum + Math.abs(p.balance || 0), 0) || 0;
  const productCount = products?.length || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-primary-400 font-medium mb-1 text-sm">Gestión financiera</p>
          <h1 className="text-4xl font-bold text-white tracking-tight">Mis Cuentas</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowInstitutionForm(true)}
            className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Nueva Institución
          </button>
          <button
            onClick={() => setShowProductForm(true)}
            className="glass-button-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Producto
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Balance Disponible</p>
          <p className="text-3xl font-bold text-white">
            ${totalBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">Suma de liquidez en cuentas</p>
        </Card>

        <Card className="relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Deuda Tarjetas</p>
          <p className={`text-3xl font-bold ${totalDebt > 0 ? 'text-red-400' : 'text-white'}`}>
            ${totalDebt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">
            {totalDebt > 0 ? 'Consumos pendientes de pago' : 'Sin deudas pendientes'}
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
          <p className="text-[10px] text-white/30 mt-2 font-medium">
            En {institutions?.length || 0} {(institutions?.length || 0) === 1 ? 'institución' : 'instituciones'}
          </p>
        </Card>
      </div>

      {/* Institution Groups — Wallet-style layout */}
      {productsByInstitution.size > 0 ? (
        <div className="space-y-6">
          {Array.from(productsByInstitution.entries()).map(([key, { institution, products: instProducts }]) => {
            const instConfig = institution ? institutionTypes[institution.institution_type] : null;
            const instColor = instConfig?.color || 'slate';

            return (
              <div key={key} className="space-y-1">
                {/* Institution Header */}
                <div className="flex items-center gap-3 px-2 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${instColor === 'blue' ? 'bg-blue-500/10 border-blue-500/20' :
                      instColor === 'purple' ? 'bg-purple-500/10 border-purple-500/20' :
                        'bg-white/5 border-white/10'
                    }`}>
                    <span className="text-lg">{instConfig?.icon || '💰'}</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white font-semibold text-base">
                      {institution?.name || 'Sin Institución'}
                    </h2>
                    <p className="text-white/40 text-xs">
                      {instConfig?.label || 'Productos independientes'} · {instProducts.length} {instProducts.length === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>
                  {instProducts.length > 0 && (
                    <div className="text-right">
                      <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold">Total</p>
                      <p className="text-white font-bold text-lg">
                        ${instProducts.reduce((s, p) => s + (p.product_type !== 'CREDIT_CARD' ? p.balance : 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Product Cards */}
                {instProducts.length > 0 ? (
                  <div className="space-y-2">
                    {instProducts.map((product) => {
                      const ptConfig = productTypeConfig[product.product_type];
                      const isCreditCard = product.product_type === 'CREDIT_CARD';

                      return (
                        <div
                          key={product.id}
                          className="group flex items-center gap-4 px-5 py-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl transition-all duration-200 cursor-pointer"
                          onClick={() => isCreditCard ? navigate(`/accounts/${product.id}/summaries`) : undefined}
                        >
                          {/* Product Icon */}
                          <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                            {ptConfig?.icon || '💰'}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium truncate">{product.name}</p>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 flex-shrink-0 uppercase tracking-wider">
                                {currencies[product.currency]?.split(' ')[1] || product.currency}
                              </span>
                            </div>
                            <p className="text-white/40 text-xs mt-0.5">
                              {ptConfig?.label || product.product_type}
                              {isCreditCard && product.last_four_digits && ` · ****${product.last_four_digits}`}
                            </p>
                          </div>

                          {/* Balance */}
                          <div className="text-right flex-shrink-0">
                            <p className={`text-lg font-bold ${isCreditCard && product.balance < 0 ? 'text-red-400' :
                                product.balance > 0 ? 'text-white' : 'text-white/50'
                              }`}>
                              {isCreditCard && product.balance < 0 ? '-' : ''}
                              ${Math.abs(product.balance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </p>
                            {isCreditCard && product.available_limit !== undefined && product.available_limit !== null && (
                              <p className="text-[10px] text-primary-400 font-medium mt-0.5">
                                Disponible ${product.available_limit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>

                          {/* Arrow for credit cards */}
                          {isCreditCard && (
                            <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-8 bg-white/[0.02] border border-dashed border-white/[0.06] rounded-2xl text-center">
                    <p className="text-white/30 text-sm">Sin productos asociados</p>
                    <button
                      onClick={() => {
                        if (institution) setSelectedInstitution(institution.id);
                        setShowProductForm(true);
                      }}
                      className="text-primary-400 hover:text-primary-300 text-xs font-medium mt-2 transition-colors"
                    >
                      + Agregar producto
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <Card className="flex flex-col items-center justify-center py-20 text-center border border-white/10 bg-white/[0.01]">
          <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full" />
            <svg className="w-12 h-12 text-primary-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Tus cuentas te esperan</h3>
          <p className="text-white/40 max-w-sm mb-10 leading-relaxed font-medium">
            Comienza agregando una institución financiera y luego vinculá tus cuentas, tarjetas y más.
          </p>
          <button
            onClick={() => setShowInstitutionForm(true)}
            className="glass-button-primary px-8 py-3 text-lg hover:scale-105 transition-transform shadow-xl shadow-primary-900/40"
          >
            Agregar mi primer banco
          </button>
        </Card>
      )}

      {/* Create Institution Modal */}
      {showInstitutionForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowInstitutionForm(false)}>
          <div className="glass-card p-6 w-full max-w-md animate-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Nueva Institución</h2>
                <p className="text-white/40 text-xs">Banco, billetera digital o fintech</p>
              </div>
            </div>
            <form onSubmit={handleCreateInstitution} className="space-y-4">
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Nombre</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="glass-input w-full"
                  placeholder="Ej: Banco Galicia"
                />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Tipo</label>
                <select name="institution_type" required className="glass-input w-full">
                  {Object.entries(institutionTypes).map(([value, config]) => (
                    <option key={value} value={value}>{config.icon} {config.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInstitutionForm(false)}
                  className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="glass-button-primary flex-1"
                  disabled={createInstitutionMutation.isPending}
                >
                  {createInstitutionMutation.isPending ? 'Creando...' : 'Crear Institución'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowProductForm(false)}>
          <div className="glass-card p-6 w-full max-w-md animate-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Nuevo Producto</h2>
                <p className="text-white/40 text-xs">Cuenta, tarjeta o instrumento financiero</p>
              </div>
            </div>
            {!institutions || institutions.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏦</span>
                </div>
                <p className="text-white/60 mb-2 font-medium">Sin instituciones</p>
                <p className="text-white/30 text-sm mb-6">Creá al menos una institución antes de agregar productos.</p>
                <button
                  onClick={() => {
                    setShowProductForm(false);
                    setShowInstitutionForm(true);
                  }}
                  className="glass-button-primary"
                >
                  Crear Institución Primero
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Nombre</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="glass-input w-full"
                    placeholder="Ej: Caja de Ahorro Pesos"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Tipo</label>
                    <select name="product_type" required className="glass-input w-full text-sm">
                      {Object.entries(productTypeConfig).map(([value, config]) => (
                        <option key={value} value={value}>{config.icon} {config.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Moneda</label>
                    <select name="currency" required className="glass-input w-full text-sm">
                      {Object.entries(currencies).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Institución</label>
                  <select
                    value={selectedInstitution}
                    onChange={(e) => setSelectedInstitution(e.target.value)}
                    className="glass-input w-full"
                    required
                  >
                    <option value="">Selecciona una institución</option>
                    {institutions?.map((inst: FinancialInstitution) => (
                      <option key={inst.id} value={inst.id}>
                        {institutionTypes[inst.institution_type]?.icon || '🏦'} {inst.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-white/30 text-[10px] mt-1.5">
                    ¿No ves tu institución?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductForm(false);
                        setShowInstitutionForm(true);
                      }}
                      className="text-primary-400 hover:text-primary-300 hover:underline transition-colors"
                    >
                      Crear nueva
                    </button>
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProductForm(false)}
                    className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="glass-button-primary flex-1"
                    disabled={createProductMutation.isPending || !selectedInstitution}
                  >
                    {createProductMutation.isPending ? 'Creando...' : 'Crear Producto'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

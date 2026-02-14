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

  // Edit/Delete state
  const [editingInstitution, setEditingInstitution] = useState<FinancialInstitution | null>(null);
  const [editingProduct, setEditingProduct] = useState<FinancialProduct | null>(null);
  const [deletingInstitution, setDeletingInstitution] = useState<FinancialInstitution | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<FinancialProduct | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data: institutions } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => accountsApi.getInstitutions(),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => accountsApi.getProducts(),
  });

  // --- Mutations ---
  const createInstitutionMutation = useMutation({
    mutationFn: accountsApi.createInstitution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      showToast('Institución creada exitosamente', 'success');
      setShowInstitutionForm(false);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al crear institución', 'error');
    },
  });

  const updateInstitutionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => accountsApi.updateInstitution(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      showToast('Institución actualizada', 'success');
      setEditingInstitution(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al actualizar', 'error');
    },
  });

  const deleteInstitutionMutation = useMutation({
    mutationFn: (id: string) => accountsApi.deleteInstitution(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Institución eliminada', 'success');
      setDeletingInstitution(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al eliminar', 'error');
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
      showToast(error?.response?.data?.detail || 'Error al crear producto', 'error');
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => accountsApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Producto actualizado', 'success');
      setEditingProduct(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al actualizar', 'error');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => accountsApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Producto eliminado', 'success');
      setDeletingProduct(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al eliminar', 'error');
    },
  });

  // --- Handlers ---
  const handleCreateInstitution = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createInstitutionMutation.mutate({
      name: formData.get('name') as string,
      institution_type: formData.get('institution_type') as InstitutionType,
    });
  };

  const handleUpdateInstitution = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingInstitution) return;
    const formData = new FormData(e.currentTarget);
    updateInstitutionMutation.mutate({
      id: editingInstitution.id,
      data: { name: formData.get('name') as string },
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
    if (selectedInstitution) data.institution_id = selectedInstitution;
    createProductMutation.mutate(data);
  };

  const handleUpdateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;
    const formData = new FormData(e.currentTarget);
    updateProductMutation.mutate({
      id: editingProduct.id,
      data: { name: formData.get('name') as string },
    });
  };

  // --- Config ---
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
    ARS: '$ ARS', USD: '$ USD', USDT: '₮ USDT', USDC: '$ USDC', BTC: '₿ BTC',
  };

  // --- Group products by institution ---
  const productsByInstitution = new Map<string, { institution: FinancialInstitution | null; products: FinancialProduct[] }>();
  if (products) {
    products.forEach((product) => {
      const instId = product.institution_id || '__none__';
      if (!productsByInstitution.has(instId)) {
        const inst = institutions?.find(i => i.id === product.institution_id) || null;
        productsByInstitution.set(instId, { institution: inst, products: [] });
      }
      productsByInstitution.get(instId)!.products.push(product);
    });
  }
  institutions?.forEach((inst) => {
    if (!productsByInstitution.has(inst.id)) {
      productsByInstitution.set(inst.id, { institution: inst, products: [] });
    }
  });

  const totalBalance = products?.reduce((sum, p) => sum + (p.product_type !== 'CREDIT_CARD' ? p.balance : 0), 0) || 0;
  const totalDebt = products?.filter(p => p.product_type === 'CREDIT_CARD').reduce((sum, p) => sum + Math.abs(p.balance || 0), 0) || 0;
  const productCount = products?.length || 0;

  // Close menu when clicking outside
  const handleBackgroundClick = () => setOpenMenuId(null);

  // Reusable 3-dot menu
  const ActionMenu = ({ id, children }: { id: string; children: React.ReactNode }) => (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === id ? null : id); }}
        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
        aria-label="Acciones"
      >
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
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); setOpenMenuId(null); }}
      className={`w-full text-left px-4 py-2 text-sm transition-colors ${destructive ? 'text-red-400 hover:bg-red-500/10' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
        }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto" onClick={handleBackgroundClick}>
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-primary-400 font-medium mb-1 text-sm">Gestión financiera</p>
          <h1 className="text-4xl font-bold text-white tracking-tight">Mis Cuentas</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowInstitutionForm(true)}
            className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            Nueva Institución
          </button>
          <button onClick={() => setShowProductForm(true)} className="glass-button-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nuevo Producto
          </button>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Balance Disponible</p>
          <p className="text-3xl font-bold text-white">${totalBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">Suma de liquidez en cuentas</p>
        </Card>
        <Card className="relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Deuda Tarjetas</p>
          <p className={`text-3xl font-bold ${totalDebt > 0 ? 'text-red-400' : 'text-white'}`}>${totalDebt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">{totalDebt > 0 ? 'Consumos pendientes de pago' : 'Sin deudas pendientes'}</p>
        </Card>
        <Card className="relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Productos Activos</p>
          <p className="text-3xl font-bold text-white">{productCount}</p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">En {institutions?.length || 0} {(institutions?.length || 0) === 1 ? 'institución' : 'instituciones'}</p>
        </Card>
      </div>

      {/* Institution Groups */}
      {productsByInstitution.size > 0 ? (
        <div className="space-y-6">
          {Array.from(productsByInstitution.entries()).map(([key, { institution, products: instProducts }]) => {
            const instConfig = institution ? institutionTypes[institution.institution_type] : null;
            const instColor = instConfig?.color || 'slate';
            return (
              <div key={key} className="space-y-1">
                {/* Institution Header */}
                <div className="group flex items-center gap-3 px-2 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${instColor === 'blue' ? 'bg-blue-500/10 border-blue-500/20' :
                      instColor === 'purple' ? 'bg-purple-500/10 border-purple-500/20' :
                        'bg-white/5 border-white/10'
                    }`}>
                    <span className="text-lg">{instConfig?.icon || '💰'}</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-white font-semibold text-base">{institution?.name || 'Sin Institución'}</h2>
                    <p className="text-white/40 text-xs">{instConfig?.label || 'Productos independientes'} · {instProducts.length} {instProducts.length === 1 ? 'producto' : 'productos'}</p>
                  </div>
                  {instProducts.length > 0 && (
                    <div className="text-right mr-2">
                      <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold">Total</p>
                      <p className="text-white font-bold text-lg">
                        ${instProducts.reduce((s, p) => s + (p.product_type !== 'CREDIT_CARD' ? p.balance : 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {institution && (
                    <ActionMenu id={`inst-${institution.id}`}>
                      <MenuItem onClick={() => setEditingInstitution(institution)}>✏️ Editar</MenuItem>
                      <MenuItem onClick={() => setDeletingInstitution(institution)} destructive>🗑️ Eliminar</MenuItem>
                    </ActionMenu>
                  )}
                </div>

                {/* Products */}
                {instProducts.length > 0 ? (
                  <div className="space-y-2">
                    {instProducts.map((product) => {
                      const ptConfig = productTypeConfig[product.product_type];
                      const isCreditCard = product.product_type === 'CREDIT_CARD';
                      return (
                        <div key={product.id}
                          className="group flex items-center gap-4 px-5 py-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl transition-all duration-200 cursor-pointer"
                          onClick={() => isCreditCard ? navigate(`/accounts/${product.id}/summaries`) : undefined}
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                            {ptConfig?.icon || '💰'}
                          </div>
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
                          <div className="text-right flex-shrink-0">
                            <p className={`text-lg font-bold ${isCreditCard && product.balance < 0 ? 'text-red-400' :
                                product.balance > 0 ? 'text-white' : 'text-white/50'
                              }`}>
                              {isCreditCard && product.balance < 0 ? '-' : ''}${Math.abs(product.balance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </p>
                            {isCreditCard && product.available_limit != null && (
                              <p className="text-[10px] text-primary-400 font-medium mt-0.5">Disponible ${product.available_limit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                            )}
                          </div>
                          <ActionMenu id={`prod-${product.id}`}>
                            <MenuItem onClick={() => setEditingProduct(product)}>✏️ Editar</MenuItem>
                            <MenuItem onClick={() => setDeletingProduct(product)} destructive>🗑️ Eliminar</MenuItem>
                          </ActionMenu>
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
                    <button onClick={() => { if (institution) setSelectedInstitution(institution.id); setShowProductForm(true); }}
                      className="text-primary-400 hover:text-primary-300 text-xs font-medium mt-2 transition-colors">+ Agregar producto</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-20 text-center border border-white/10 bg-white/[0.01]">
          <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center mb-8 relative">
            <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full" />
            <svg className="w-12 h-12 text-primary-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Tus cuentas te esperan</h3>
          <p className="text-white/40 max-w-sm mb-10 leading-relaxed font-medium">Comienza agregando una institución financiera y luego vinculá tus cuentas, tarjetas y más.</p>
          <button onClick={() => setShowInstitutionForm(true)} className="glass-button-primary px-8 py-3 text-lg hover:scale-105 transition-transform shadow-xl shadow-primary-900/40">
            Agregar mi primer banco
          </button>
        </Card>
      )}

      {/* ======================== MODALS ======================== */}

      {/* Create Institution */}
      {showInstitutionForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowInstitutionForm(false)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <div><h2 className="text-lg font-semibold text-white">Nueva Institución</h2><p className="text-white/40 text-xs">Banco, billetera digital o fintech</p></div>
            </div>
            <form onSubmit={handleCreateInstitution} className="space-y-4">
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Nombre</label>
                <input name="name" type="text" required className="glass-input w-full" placeholder="Ej: Banco Galicia" />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Tipo</label>
                <select name="institution_type" required className="glass-input w-full">
                  {Object.entries(institutionTypes).map(([value, config]) => (<option key={value} value={value}>{config.icon} {config.label}</option>))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowInstitutionForm(false)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
                <button type="submit" className="glass-button-primary flex-1" disabled={createInstitutionMutation.isPending}>{createInstitutionMutation.isPending ? 'Creando...' : 'Crear Institución'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Institution */}
      {editingInstitution && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setEditingInstitution(null)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <div><h2 className="text-lg font-semibold text-white">Editar Institución</h2><p className="text-white/40 text-xs">{editingInstitution.name}</p></div>
            </div>
            <form onSubmit={handleUpdateInstitution} className="space-y-4">
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Nombre</label>
                <input name="name" type="text" required className="glass-input w-full" defaultValue={editingInstitution.name} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingInstitution(null)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
                <button type="submit" className="glass-button-primary flex-1" disabled={updateInstitutionMutation.isPending}>{updateInstitutionMutation.isPending ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Institution Confirm */}
      {deletingInstitution && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setDeletingInstitution(null)}>
          <div className="glass-card p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Eliminar Institución</h3>
            <p className="text-white/50 text-sm mb-6">¿Estás seguro de eliminar <strong className="text-white">{deletingInstitution.name}</strong>? Los productos asociados también se eliminarán. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingInstitution(null)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
              <button onClick={() => deleteInstitutionMutation.mutate(deletingInstitution.id)}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm font-medium text-red-400 transition-all"
                disabled={deleteInstitutionMutation.isPending}>{deleteInstitutionMutation.isPending ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Product */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowProductForm(false)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <div><h2 className="text-lg font-semibold text-white">Nuevo Producto</h2><p className="text-white/40 text-xs">Cuenta, tarjeta o instrumento financiero</p></div>
            </div>
            {!institutions || institutions.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">🏦</span></div>
                <p className="text-white/60 mb-2 font-medium">Sin instituciones</p>
                <p className="text-white/30 text-sm mb-6">Creá al menos una institución antes de agregar productos.</p>
                <button onClick={() => { setShowProductForm(false); setShowInstitutionForm(true); }} className="glass-button-primary">Crear Institución Primero</button>
              </div>
            ) : (
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Nombre</label>
                  <input name="name" type="text" required className="glass-input w-full" placeholder="Ej: Caja de Ahorro Pesos" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Tipo</label>
                    <select name="product_type" required className="glass-input w-full text-sm">
                      {Object.entries(productTypeConfig).map(([value, config]) => (<option key={value} value={value}>{config.icon} {config.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Moneda</label>
                    <select name="currency" required className="glass-input w-full text-sm">
                      {Object.entries(currencies).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Institución</label>
                  <select value={selectedInstitution} onChange={(e) => setSelectedInstitution(e.target.value)} className="glass-input w-full" required>
                    <option value="">Selecciona una institución</option>
                    {institutions?.map((inst: FinancialInstitution) => (<option key={inst.id} value={inst.id}>{institutionTypes[inst.institution_type]?.icon || '🏦'} {inst.name}</option>))}
                  </select>
                  <p className="text-white/30 text-[10px] mt-1.5">¿No ves tu institución?{' '}<button type="button" onClick={() => { setShowProductForm(false); setShowInstitutionForm(true); }} className="text-primary-400 hover:text-primary-300 hover:underline transition-colors">Crear nueva</button></p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowProductForm(false)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
                  <button type="submit" className="glass-button-primary flex-1" disabled={createProductMutation.isPending || !selectedInstitution}>{createProductMutation.isPending ? 'Creando...' : 'Crear Producto'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Product */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setEditingProduct(null)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <div><h2 className="text-lg font-semibold text-white">Editar Producto</h2><p className="text-white/40 text-xs">{productTypeConfig[editingProduct.product_type]?.label || editingProduct.product_type}</p></div>
            </div>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Nombre</label>
                <input name="name" type="text" required className="glass-input w-full" defaultValue={editingProduct.name} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
                <button type="submit" className="glass-button-primary flex-1" disabled={updateProductMutation.isPending}>{updateProductMutation.isPending ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirm */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setDeletingProduct(null)}>
          <div className="glass-card p-6 w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Eliminar Producto</h3>
            <p className="text-white/50 text-sm mb-6">¿Estás seguro de eliminar <strong className="text-white">{deletingProduct.name}</strong>? Las transacciones asociadas permanecerán. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingProduct(null)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
              <button onClick={() => deleteProductMutation.mutate(deletingProduct.id)}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm font-medium text-red-400 transition-all"
                disabled={deleteProductMutation.isPending}>{deleteProductMutation.isPending ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

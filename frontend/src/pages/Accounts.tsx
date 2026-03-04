import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '@/api/accounts';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import type { FinancialProduct, FinancialInstitution, ProductType, Currency, InstitutionType } from '@/types';

export default function Accounts() {

  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [newProductType, setNewProductType] = useState<ProductType>('SAVINGS_ACCOUNT');

  // Edit/Delete state
  const [editingInstitution, setEditingInstitution] = useState<FinancialInstitution | null>(null);
  const [editingProduct, setEditingProduct] = useState<FinancialProduct | null>(null);
  const [deletingInstitution, setDeletingInstitution] = useState<FinancialInstitution | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<FinancialProduct | null>(null);
  const [infoInstitution, setInfoInstitution] = useState<FinancialInstitution | null>(null);
  const [institutionDescription, setInstitutionDescription] = useState('');
  const [showInstitutionForm, setShowInstitutionForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productFormReturnToInstitution, setProductFormReturnToInstitution] = useState<FinancialInstitution | null>(null);

  const [instFormSharedLimit, setInstFormSharedLimit] = useState(false);
  const [editInstFormSharedLimit, setEditInstFormSharedLimit] = useState(false);

  const closeProductForm = () => {
    setShowProductForm(false);
    if (productFormReturnToInstitution) {
      setInfoInstitution(productFormReturnToInstitution);
      setInstitutionDescription(productFormReturnToInstitution.description || '');
      setProductFormReturnToInstitution(null);
    }
  };

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
      closeProductForm();
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
      has_shared_credit_limit: formData.get('has_shared_credit_limit') === 'on',
      shared_credit_limit: parseFloat(formData.get('shared_credit_limit') as string) || undefined,
    });
  };

  const handleUpdateInstitution = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingInstitution) return;
    const formData = new FormData(e.currentTarget);
    updateInstitutionMutation.mutate({
      id: editingInstitution.id,
      data: {
        name: formData.get('name') as string,
        has_shared_credit_limit: formData.get('has_shared_credit_limit') === 'on',
        shared_credit_limit: parseFloat(formData.get('shared_credit_limit') as string) || undefined,
      },
    });
  };

  const handleCreateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const pType = formData.get('product_type') as ProductType;
    const isCard = pType === 'CREDIT_CARD' || pType === 'DEBIT_CARD';

    const data: any = {
      product_type: pType,
      balance: parseFloat(formData.get('balance') as string) || 0,
    };

    if (isCard) {
      const provider = formData.get('provider') as string;
      const last4 = formData.get('last_four_digits') as string;
      data.name = `T${pType === 'CREDIT_CARD' ? 'C' : 'D'} ${provider} ${last4}`;
      data.currency = 'ARS';
      data.provider = provider;
      data.last_four_digits = last4;
      const expMonth = formData.get('expiration_month') as string;
      const expYear = formData.get('expiration_year') as string;
      if (expMonth && expYear) {
        data.expiration_date = new Date(`20${expYear.padStart(2, '0')}-${expMonth.padStart(2, '0')}-01T12:00:00Z`).toISOString();
      }
    } else {
      data.name = formData.get('name') as string;
      data.currency = formData.get('currency') as Currency;
    }

    if (selectedInstitution) data.institution_id = selectedInstitution;

    if (pType === 'CREDIT_CARD') {
      data.limit_amount = parseFloat(formData.get('limit_amount') as string) || 0;
      data.closing_day = parseInt(formData.get('closing_day') as string) || 1;
      data.due_day = parseInt(formData.get('due_day') as string) || 1;
    }

    createProductMutation.mutate(data);
  };

  const handleUpdateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;
    const formData = new FormData(e.currentTarget);
    const isCard = editingProduct.product_type === 'CREDIT_CARD' || editingProduct.product_type === 'DEBIT_CARD';

    const data: any = {};

    if (isCard) {
      const provider = formData.get('provider') as string;
      const last4 = formData.get('last_four_digits') as string;
      data.name = `T${editingProduct.product_type === 'CREDIT_CARD' ? 'C' : 'D'} ${provider} ${last4}`;
      data.provider = provider;
      data.last_four_digits = last4;
      const expMonth = formData.get('expiration_month') as string;
      const expYear = formData.get('expiration_year') as string;
      if (expMonth && expYear) {
        data.expiration_date = new Date(`20${expYear.padStart(2, '0')}-${expMonth.padStart(2, '0')}-01T12:00:00Z`).toISOString();
      }
    } else {
      data.name = formData.get('name') as string;
    }

    if (editingProduct.product_type === 'CREDIT_CARD') {
      data.limit_amount = parseFloat(formData.get('limit_amount') as string) || 0;
      data.closing_day = parseInt(formData.get('closing_day') as string) || 1;
      data.due_day = parseInt(formData.get('due_day') as string) || 1;
    } else {
      const balanceStr = formData.get('balance') as string;
      if (balanceStr !== null && balanceStr !== '') {
        data.balance = parseFloat(balanceStr) || 0;
      }
    }

    updateProductMutation.mutate({
      id: editingProduct.id,
      data
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



  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-primary-400 font-medium mb-1 text-sm">Gestión financiera</p>
          <h1 className="text-4xl font-bold text-white tracking-tight">Mis Cuentas</h1>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setInstFormSharedLimit(false); setShowInstitutionForm(true); }}
            className="glass-button-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            Nueva Institución
          </button>
        </div>
      </header>

      <div className="mt-8">

        {/* Institution Grid / Split by Type */}
        {productsByInstitution.size > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {[
              { title: 'Bancos', icon: '🏦', items: Array.from(productsByInstitution.entries()).filter(([_, { institution }]) => institution?.institution_type === 'BANK' || !institution) },
              { title: 'Billeteras Digitales', icon: '👛', items: Array.from(productsByInstitution.entries()).filter(([_, { institution }]) => institution?.institution_type === 'WALLET') }
            ].map(({ title, icon, items }) => items.length > 0 && (
              <div key={title} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h2 className="text-white/60 font-semibold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="text-lg opacity-80">{icon}</span> {title}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                  {items.map(([key, { institution, products: instProducts }]) => {
                    const instConfig = institution ? institutionTypes[institution.institution_type] : null;
                    const instColor = instConfig?.color || 'slate';
                    const totalInst = instProducts.reduce((s, p) => s + (p.product_type !== 'CREDIT_CARD' ? p.balance : 0), 0);
                    const debtInst = instProducts.filter(p => p.product_type === 'CREDIT_CARD').reduce((s, p) => s + Math.abs(p.balance || 0), 0);

                    return (
                      <div
                        key={key}
                        onClick={() => {
                          if (institution) {
                            setInfoInstitution(institution);
                            setInstitutionDescription(institution.description || '');
                          }
                        }}
                        className="group relative cursor-pointer rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]"
                      >
                        {instProducts.length === 0 && (
                          <div className="absolute top-4 right-4 flex items-center gap-1.5" title="Sin productos vinculados">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                            </span>
                          </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-3 transition-transform duration-300 group-hover:scale-110 ${instColor === 'blue' ? 'bg-blue-500/10 border-blue-500/20' :
                          instColor === 'purple' ? 'bg-purple-500/10 border-purple-500/20' :
                            'bg-white/5 border-white/10'
                          }`}>
                          <span className="text-2xl">{instConfig?.icon || '💰'}</span>
                        </div>
                        <h3 className="text-white font-semibold text-sm truncate">{institution?.name || 'Sin Institución'}</h3>
                        <p className="text-white/40 text-xs mt-0.5">{instConfig?.label || 'Independiente'}</p>
                        <div className="mt-3 pt-3 border-t border-white/[0.06]">
                          <p className="text-white font-bold text-lg">${totalInst.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                          {debtInst > 0 && (
                            <p className="text-red-400/70 text-[10px] font-bold mt-0.5">Deuda: ${debtInst.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                          )}
                          <p className="text-white/30 text-[10px] uppercase tracking-wider font-bold mt-1">{instProducts.length} {instProducts.length === 1 ? 'producto' : 'productos'}</p>
                        </div>
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

      </div>


      {/* ======================== MODALS ======================== */}

      {/* Create Institution */}
      {showInstitutionForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
                <input name="name" type="text" required className="glass-input w-full" placeholder="Ej: Banco Galicia" title="Nombre" />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Tipo</label>
                <select name="institution_type" required className="glass-input w-full" title="Tipo de institución">
                  {Object.entries(institutionTypes).map(([value, config]) => (<option key={value} value={value}>{config.icon} {config.label}</option>))}
                </select>
              </div>
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5 rounded border border-white/20 bg-white/5 group-hover:border-primary-500/50 transition-colors">
                    <input type="checkbox" name="has_shared_credit_limit" className="absolute opacity-0 w-full h-full cursor-pointer" checked={instFormSharedLimit} onChange={(e) => setInstFormSharedLimit(e.target.checked)} />
                    {instFormSharedLimit && <svg className="w-3.5 h-3.5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">Compartir límite de crédito</span>
                </label>
                {instFormSharedLimit && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Límite Total Compartido</label>
                    <CurrencyInput name="shared_credit_limit" required className="glass-input w-full text-sm" placeholder="0.00" title="Límite Total Compartido" />
                  </div>
                )}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
                <input name="name" type="text" required className="glass-input w-full" defaultValue={editingInstitution.name} title="Nombre" placeholder="Ej: Banco Galicia" />
              </div>
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5 rounded border border-white/20 bg-white/5 group-hover:border-primary-500/50 transition-colors">
                    <input type="checkbox" name="has_shared_credit_limit" className="absolute opacity-0 w-full h-full cursor-pointer" checked={editInstFormSharedLimit} onChange={(e) => setEditInstFormSharedLimit(e.target.checked)} />
                    {editInstFormSharedLimit && <svg className="w-3.5 h-3.5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">Compartir límite de crédito</span>
                </label>
                {editInstFormSharedLimit && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Límite Total Compartido</label>
                    <CurrencyInput name="shared_credit_limit" required className="glass-input w-full text-sm" defaultValue={editingInstitution.shared_credit_limit} placeholder="0.00" title="Límite Total Compartido" />
                  </div>
                )}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
                {(() => {
                  const selectedInstObj = institutions?.find((i: FinancialInstitution) => i.id === selectedInstitution);
                  const hideLimitCreate = selectedInstObj?.has_shared_credit_limit;
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={newProductType === 'CREDIT_CARD' || newProductType === 'DEBIT_CARD' ? 'col-span-2' : ''}>
                          <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Tipo</label>
                          <select
                            name="product_type"
                            required
                            className="glass-input w-full text-sm"
                            onChange={(e) => setNewProductType(e.target.value as ProductType)}
                            defaultValue={newProductType}
                            title="Tipo de producto"
                          >
                            {Object.entries(productTypeConfig).map(([value, config]) => (<option key={value} value={value}>{config.icon} {config.label}</option>))}
                          </select>
                        </div>
                        {newProductType !== 'CREDIT_CARD' && newProductType !== 'DEBIT_CARD' && (
                          <div>
                            <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Moneda</label>
                            <select name="currency" required className="glass-input w-full text-sm" title="Moneda">
                              {Object.entries(currencies).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                            </select>
                          </div>
                        )}
                      </div>
                      {newProductType !== 'CREDIT_CARD' && newProductType !== 'DEBIT_CARD' && (
                        <div>
                          <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Nombre</label>
                          <input name="name" type="text" required className="glass-input w-full" placeholder="Ej: Caja de Ahorro Pesos" title="Nombre" />
                        </div>
                      )}

                      {(newProductType === 'CREDIT_CARD' || newProductType === 'DEBIT_CARD') && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Proveedor</label>
                              <select name="provider" required className="glass-input w-full text-sm" title="Proveedor">
                                <option value="VISA">VISA</option>
                                <option value="MASTERCARD">Mastercard</option>
                                <option value="AMEX">AMEX</option>
                                <option value="X">X (Otra)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Últimos 4 dígitos</label>
                              <input name="last_four_digits" type="text" required maxLength={4} pattern="\d{4}" className="glass-input w-full text-sm" placeholder="1234" title="Últimos 4 dígitos" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Mes Vto.</label>
                              <input name="expiration_month" type="number" required min="1" max="12" className="glass-input w-full text-sm" placeholder="MM" title="Mes Vto." />
                            </div>
                            <div>
                              <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Año Vto.</label>
                              <input name="expiration_year" type="number" required min="0" max="99" className="glass-input w-full text-sm" placeholder="AA" title="Año Vto." />
                            </div>
                          </div>
                        </div>
                      )}

                      {newProductType !== 'CREDIT_CARD' && (
                        <div>
                          <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Saldo Inicial</label>
                          <CurrencyInput name="balance" className="glass-input w-full" placeholder="0.00" title="Saldo Inicial" />
                        </div>
                      )}

                      {newProductType === 'CREDIT_CARD' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          {!hideLimitCreate && (
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Límite Total</label>
                                <CurrencyInput name="limit_amount" required className="glass-input w-full text-sm" placeholder="0.00" title="Límite Total" />
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Día de Cierre</label>
                              <input name="closing_day" type="number" min="1" max="31" required className="glass-input w-full text-sm" placeholder="15" title="Día de Cierre" />
                            </div>
                            <div>
                              <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Día de Vencimiento</label>
                              <input name="due_day" type="number" min="1" max="31" required className="glass-input w-full text-sm" placeholder="5" title="Día de Vencimiento" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Institución</label>
                        <select value={selectedInstitution} disabled className="glass-input w-full opacity-50 cursor-not-allowed" required title="Institución">
                          {institutions?.filter((i: FinancialInstitution) => i.id === selectedInstitution).map((inst: FinancialInstitution) => (<option key={inst.id} value={inst.id}>{institutionTypes[inst.institution_type]?.icon || '🏦'} {inst.name}</option>))}
                        </select>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button type="button" onClick={closeProductForm} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
                        <button type="submit" className="glass-button-primary flex-1" disabled={createProductMutation.isPending || !selectedInstitution}>{createProductMutation.isPending ? 'Creando...' : 'Crear Producto'}</button>
                      </div>
                    </>
                  );
                })()}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Product */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <div><h2 className="text-lg font-semibold text-white">Editar Producto</h2><p className="text-white/40 text-xs">{productTypeConfig[editingProduct.product_type]?.label || editingProduct.product_type}</p></div>
            </div>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              {(() => {
                const editInstObj = institutions?.find((i: FinancialInstitution) => i.id === editingProduct.institution_id);
                const hideLimitEdit = editInstObj?.has_shared_credit_limit;
                return (
                  <>
                    {editingProduct.product_type !== 'CREDIT_CARD' && editingProduct.product_type !== 'DEBIT_CARD' && (
                      <div>
                        <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Nombre</label>
                        <input name="name" type="text" required className="glass-input w-full" defaultValue={editingProduct.name} title="Nombre" placeholder="Ej: Caja de Ahorro Pesos" />
                      </div>
                    )}

                    {(editingProduct.product_type === 'CREDIT_CARD' || editingProduct.product_type === 'DEBIT_CARD') && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Proveedor</label>
                            <select name="provider" required className="glass-input w-full text-sm" defaultValue={editingProduct.provider} title="Proveedor">
                              <option value="VISA">VISA</option>
                              <option value="MASTERCARD">Mastercard</option>
                              <option value="AMEX">AMEX</option>
                              <option value="X">X (Otra)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Últimos 4 dígitos</label>
                            <input name="last_four_digits" type="text" required maxLength={4} pattern="\d{4}" className="glass-input w-full text-sm" defaultValue={editingProduct.last_four_digits} title="Últimos 4 dígitos" placeholder="1234" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Mes Vto.</label>
                            <input name="expiration_month" type="number" required min="1" max="12" className="glass-input w-full text-sm" defaultValue={editingProduct.expiration_date ? new Date(editingProduct.expiration_date).getUTCMonth() + 1 : ''} placeholder="MM" title="Mes Vto." />
                          </div>
                          <div>
                            <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Año Vto.</label>
                            <input name="expiration_year" type="number" required min="0" max="99" className="glass-input w-full text-sm" defaultValue={editingProduct.expiration_date ? parseInt(new Date(editingProduct.expiration_date).getUTCFullYear().toString().substring(2)) : ''} placeholder="AA" title="Año Vto." />
                          </div>
                        </div>
                      </div>
                    )}

                    {editingProduct.product_type !== 'CREDIT_CARD' && (
                      <div>
                        <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">Saldo</label>
                        <CurrencyInput name="balance" className="glass-input w-full" defaultValue={editingProduct.balance} title="Saldo" placeholder="0.00" />
                      </div>
                    )}
                    {editingProduct.product_type === 'CREDIT_CARD' && (
                      <div className="space-y-4 pt-2">
                        {!hideLimitEdit && (
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Límite Total</label>
                              <CurrencyInput name="limit_amount" required className="glass-input w-full text-sm" defaultValue={editingProduct.limit_amount} title="Límite Total" placeholder="0.00" />
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Día de Cierre</label>
                            <input name="closing_day" type="number" min="1" max="31" required className="glass-input w-full text-sm" defaultValue={editingProduct.closing_day} title="Día de Cierre" placeholder="15" />
                          </div>
                          <div>
                            <label className="block text-white/60 text-[10px] font-bold mb-1.5 uppercase tracking-widest">Día de Vencimiento</label>
                            <input name="due_day" type="number" min="1" max="31" required className="glass-input w-full text-sm" defaultValue={editingProduct.due_day} title="Día de Vencimiento" placeholder="5" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
                      <button type="submit" className="glass-button-primary flex-1" disabled={updateProductMutation.isPending}>{updateProductMutation.isPending ? 'Guardando...' : 'Guardar'}</button>
                    </div>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirm */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
      {/* Institution Info Modal */}
      {infoInstitution && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card p-0 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={`p-6 border-b border-white/10 flex items-center justify-between ${institutionTypes[infoInstitution.institution_type]?.color === 'blue' ? 'bg-blue-500/5' : 'bg-purple-400/5'
              }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${institutionTypes[infoInstitution.institution_type]?.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-purple-500/10 border-purple-500/20'
                  }`}>
                  {institutionTypes[infoInstitution.institution_type]?.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{infoInstitution.name}</h2>
                  <p className="text-white/40 text-sm font-medium uppercase tracking-wider">{institutionTypes[infoInstitution.institution_type]?.label}</p>
                </div>
              </div>
              <button
                onClick={() => setInfoInstitution(null)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                title="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Description Section */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Notas e Información
                  </h3>
                  <button
                    onClick={() => updateInstitutionMutation.mutate({ id: infoInstitution.id, data: { description: institutionDescription } })}
                    className="text-[10px] font-bold text-primary-400 hover:text-white uppercase tracking-tighter bg-primary-400/10 px-2 py-1 rounded transition-all"
                    disabled={updateInstitutionMutation.isPending}
                  >
                    {updateInstitutionMutation.isPending ? 'Guardando...' : 'Guardar Notas'}
                  </button>
                </div>
                <textarea
                  value={institutionDescription}
                  onChange={(e) => setInstitutionDescription(e.target.value)}
                  placeholder="Escribe recordatorios, números de cuenta, CBU o cualquier información relevante..."
                  title="Notas e Información"
                  className="w-full h-32 glass-input resize-none text-sm p-4 leading-relaxed"
                />
              </section>

              {/* Products List Section */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-sm uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Productos Vinculados
                  </h3>
                  <button
                    onClick={() => { setProductFormReturnToInstitution(infoInstitution); setSelectedInstitution(infoInstitution.id); setShowProductForm(true); setInfoInstitution(null); }}
                    className="text-[10px] font-bold text-emerald-400 hover:text-white uppercase tracking-tighter bg-emerald-400/10 px-2 py-1 rounded transition-all flex items-center gap-1"
                  >
                    + Agregar Producto
                  </button>
                </div>
                <div className="space-y-2">
                  {(productsByInstitution.get(infoInstitution.id)?.products || []).map((product) => {
                    const ptConfig = productTypeConfig[product.product_type];
                    return (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.06] transition-colors group">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{ptConfig?.icon || '💰'}</span>
                          <div>
                            <p className="text-white text-sm font-medium">{product.name}</p>
                            <p className="text-white/30 text-[10px] uppercase font-bold tracking-wider">{ptConfig?.label || product.product_type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${product.product_type === 'CREDIT_CARD' && product.balance < 0 ? 'text-red-400' : 'text-white'}`}>
                            ${Math.abs(product.balance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </p>
                          <span className="text-[9px] font-bold text-white/40 uppercase">{product.currency}</span>
                        </div>
                      </div>
                    );
                  })}
                  {(!productsByInstitution.get(infoInstitution.id)?.products || productsByInstitution.get(infoInstitution.id)?.products.length === 0) && (
                    <div className="text-center py-6 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                      <p className="text-white/20 text-xs italic">No hay productos registrados en esta institución</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-end">
              <button
                onClick={() => setInfoInstitution(null)}
                className="px-6 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/60 hover:text-white text-sm font-semibold transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

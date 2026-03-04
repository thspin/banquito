import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/api/services';
import { accountsApi } from '@/api/accounts';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import type { Service, ServiceBill, FinancialProduct } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ─── Helpers ───────────────────────────────────────────────
const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2024, i, 1), 'MMMM', { locale: es })
);

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: 'Pendiente', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  PAID: { label: 'Pagada', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  SKIPPED: { label: 'Omitida', bg: 'bg-white/[0.06]', text: 'text-white/40' },
};

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function formatCurrency(n: number, currency: string = 'ARS') {
  if (currency === 'USD') return 'U$S ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Reusable sub‑components ──────────────────────────────
function ActionMenu({ id, openMenuId, setOpenMenuId, children }: {
  id: string; openMenuId: string | null; setOpenMenuId: (v: string | null) => void; children: React.ReactNode;
}) {
  return (
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
          <div className="absolute right-0 top-8 z-20 w-44 bg-slate-800/95 backdrop-blur-lg border border-white/10 rounded-xl shadow-xl py-1 overflow-hidden">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ onClick, destructive, children }: { onClick: () => void; destructive?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full text-left px-4 py-2 text-sm transition-colors ${destructive ? 'text-red-400 hover:bg-red-500/10' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}`}
    >
      {children}
    </button>
  );
}

// ─── Modal shell ──────────────────────────────────────────
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ icon, iconColor, title, subtitle }: { icon: React.ReactNode; iconColor: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-white/40 text-xs">{subtitle}</p>}
      </div>
    </div>
  );
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">{children}</label>;
}

// ════════════════════════════════════════════════════════════
// ═══ MAIN COMPONENT ════════════════════════════════════════
// ════════════════════════════════════════════════════════════

export default function Services() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // ─── State ────────────────────────────────────────────
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const [showCreateService, setShowCreateService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [payingBill, setPayingBill] = useState<ServiceBill | null>(null);
  const [editingBill, setEditingBill] = useState<ServiceBill | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // ─── Queries ──────────────────────────────────────────
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getServices(),
  });

  const { data: bills = [], isLoading: loadingBills } = useQuery({
    queryKey: ['bills', currentYear, currentMonth],
    queryFn: () => servicesApi.getMonthlyBills(currentYear, currentMonth),
  });



  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => accountsApi.getProducts(),
  });

  // Products that can be used for payment (not credit cards or loans)
  const paymentProducts = useMemo(() =>
    products.filter((p: FinancialProduct) => !['CREDIT_CARD', 'LOAN'].includes(p.product_type)),
    [products]
  );

  // ─── Computed stats ───────────────────────────────────
  const totalByARS = useMemo(() =>
    bills.filter((b: ServiceBill) => b.currency === 'ARS').reduce((sum: number, b: ServiceBill) => sum + b.amount, 0),
    [bills]
  );
  const totalByUSD = useMemo(() =>
    bills.filter((b: ServiceBill) => b.currency === 'USD').reduce((sum: number, b: ServiceBill) => sum + b.amount, 0),
    [bills]
  );

  const activeCount = services.length;

  const pendingBills = useMemo(() =>
    bills.filter((b: ServiceBill) => b.status === 'PENDING'),
    [bills]
  );

  const pendingByARS = useMemo(() =>
    pendingBills.filter((b: ServiceBill) => b.currency === 'ARS').reduce((sum: number, b: ServiceBill) => sum + b.amount, 0),
    [pendingBills]
  );
  const pendingByUSD = useMemo(() =>
    pendingBills.filter((b: ServiceBill) => b.currency === 'USD').reduce((sum: number, b: ServiceBill) => sum + b.amount, 0),
    [pendingBills]
  );

  // ─── Mutations ────────────────────────────────────────

  const createServiceMutation = useMutation({
    mutationFn: servicesApi.createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      showToast('Servicio creado exitosamente', 'success');
      setShowCreateService(false);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al crear servicio', 'error');
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => servicesApi.updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      showToast('Servicio actualizado', 'success');
      setEditingService(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al actualizar servicio', 'error');
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => servicesApi.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      showToast('Servicio eliminado', 'success');
      setDeletingService(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al eliminar', 'error');
    },
  });

  const payBillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { from_product_id: string; amount?: number } }) =>
      servicesApi.payBill(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast('Boleta pagada exitosamente', 'success');
      setPayingBill(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al pagar boleta', 'error');
    },
  });

  const skipBillMutation = useMutation({
    mutationFn: (id: string) => servicesApi.skipBill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      showToast('Boleta omitida', 'success');
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al omitir boleta', 'error');
    },
  });

  const updateBillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => servicesApi.updateBill(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      showToast('Boleta actualizada', 'success');
      setEditingBill(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al actualizar boleta', 'error');
    },
  });

  const createBillMutation = useMutation({
    mutationFn: servicesApi.createBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      showToast('Boleta creada exitosamente', 'success');
      setShowCreateBill(false);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al crear boleta', 'error');
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: servicesApi.deleteBill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      showToast('Boleta eliminada', 'success');
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al eliminar boleta', 'error');
    },
  });

  // ─── Handlers ─────────────────────────────────────────

  const handleCreateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;
    if (!name) { showToast('El nombre es requerido', 'error'); return; }

    createServiceMutation.mutate({
      name,
      auto_debit: !!fd.get('auto_debit'),
      active: true,
    });
  };

  const handleUpdateService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingService) return;
    const fd = new FormData(e.currentTarget);

    updateServiceMutation.mutate({
      id: editingService.id,
      data: {
        name: fd.get('name') as string,
        auto_debit: !!fd.get('auto_debit'),
      },
    });
  };

  const handleCreateBill = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const service_id = fd.get('service_id') as string;
    const amount = fd.get('amount') as string;
    const due_date = fd.get('due_date') as string;

    if (!service_id || !amount || !due_date) {
      showToast('Servicio, monto y fecha son requeridos', 'error');
      return;
    }

    createBillMutation.mutate({
      service_id,
      amount: parseFloat(amount),
      currency: fd.get('currency') as string || 'ARS',
      due_date,
      month: currentMonth,
      year: currentYear,
      status: 'PENDING',
    });
  };

  const handlePayBill = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payingBill) return;
    const fd = new FormData(e.currentTarget);
    const from_product_id = fd.get('from_product_id') as string;
    const customAmount = fd.get('amount') as string;

    if (!from_product_id) { showToast('Seleccioná una cuenta de pago', 'error'); return; }

    payBillMutation.mutate({
      id: payingBill.id,
      data: {
        from_product_id,
        amount: customAmount ? parseFloat(customAmount) : undefined,
      },
    });
  };

  const handleUpdateBill = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBill) return;
    const fd = new FormData(e.currentTarget);

    updateBillMutation.mutate({
      id: editingBill.id,
      data: {
        amount: parseFloat(fd.get('amount') as string),
        due_date: (fd.get('due_date') as string) || undefined,
      },
    });
  };

  const navigateMonth = (delta: number) => {
    let m = currentMonth + delta;
    let y = currentYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setCurrentMonth(m);
    setCurrentYear(y);
  };

  const handleBackgroundClick = () => setOpenMenuId(null);

  // ─── Service form fields (shared between create & edit) ─
  const ServiceFormFields = ({ service }: { service?: Service }) => (
    <div className="space-y-4">
      <div>
        <FieldLabel>Nombre</FieldLabel>
        <input name="name" type="text" required className="glass-input w-full" placeholder="Ej: Netflix, Spotify, Internet" defaultValue={service?.name} />
      </div>
      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          name="auto_debit"
          type="checkbox"
          defaultChecked={service?.auto_debit || false}
          className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/30 focus:ring-offset-0 cursor-pointer"
        />
        <div>
          <span className="text-white/80 text-sm font-medium group-hover:text-white transition-colors">Débito automático</span>
          <p className="text-white/30 text-[10px]">Se paga con el resumen de la tarjeta</p>
        </div>
      </label>
    </div>
  );

  // ═══════════════════════════════════════════════════════
  // ═══ RENDER ═══════════════════════════════════════════
  // ═══════════════════════════════════════════════════════

  return (
    <div className="space-y-8 max-w-7xl mx-auto" onClick={handleBackgroundClick}>

      {/* ── Header ────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-primary-400 font-medium mb-1 text-sm">Gastos recurrentes</p>
          <h1 className="text-4xl font-bold text-white tracking-tight">Servicios</h1>
        </div>
        <button onClick={() => setShowCreateService(true)} className="glass-button-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo Servicio
        </button>
      </header>

      {/* ── Stats Strip ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Total del Mes</p>
          <p className="text-3xl font-bold text-primary-400">{formatCurrency(totalByARS)}</p>
          {totalByUSD > 0 && <p className="text-lg font-bold text-primary-300 mt-0.5">{formatCurrency(totalByUSD, 'USD')}</p>}
          <p className="text-[10px] text-white/30 mt-2 font-medium">Suma de boletas del mes</p>
        </Card>

        <Card className="relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Servicios Activos</p>
          <p className="text-3xl font-bold text-blue-400">{activeCount}</p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">Servicios registrados</p>
        </Card>

        <Card className="relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Pendiente Este Mes</p>
          <p className="text-3xl font-bold text-amber-400">{formatCurrency(pendingByARS)}</p>
          {pendingByUSD > 0 && <p className="text-lg font-bold text-amber-300 mt-0.5">{formatCurrency(pendingByUSD, 'USD')}</p>}
          <p className="text-[10px] text-white/30 mt-2 font-medium">{pendingBills.length} boleta{pendingBills.length !== 1 ? 's' : ''} por pagar</p>
        </Card>
      </div>

      {/* ── Active Services ───────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-white">Servicios Activos</h2>
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-white/30 text-xs">{activeCount} servicio{activeCount !== 1 ? 's' : ''}</span>
        </div>

        {loadingServices ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card p-5 animate-pulse">
                <div className="h-4 w-24 bg-white/10 rounded mb-3" />
                <div className="h-6 w-20 bg-white/10 rounded mb-2" />
                <div className="h-3 w-32 bg-white/[0.05] rounded" />
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center border border-white/10 bg-white/[0.01]">
            <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full" />
              <svg className="w-10 h-10 text-primary-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Sin servicios</h3>
            <p className="text-white/40 max-w-sm mb-8 leading-relaxed font-medium">
              Registrá tus servicios recurrentes como Netflix, Spotify o Internet para llevar control de tus gastos fijos.
            </p>
            <button onClick={() => setShowCreateService(true)} className="glass-button-primary px-8 py-3 text-lg hover:scale-105 transition-transform shadow-xl shadow-primary-900/40">
              Agregar mi primer servicio
            </button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service: Service) => {
              const monthBill = bills.find((b: ServiceBill) => b.service_id === service.id);
              return (
                <div
                  key={service.id}
                  className="group glass-card p-5 hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-200 cursor-default"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{service.category?.icon || '📦'}</span>
                      <div>
                        <h3 className="text-white font-semibold leading-tight">{service.name}</h3>
                        <p className="text-white/40 text-xs mt-0.5">{service.category?.name || 'Sin categoría'}</p>
                      </div>
                    </div>
                    <ActionMenu id={`svc-${service.id}`} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId}>
                      <MenuItem onClick={() => { setEditingService(service); setOpenMenuId(null); }}>✏️ Editar</MenuItem>
                      <MenuItem onClick={() => { setDeletingService(service); setOpenMenuId(null); }} destructive>🗑️ Eliminar</MenuItem>
                    </ActionMenu>
                  </div>

                  {/* Bill info for current month */}
                  {service.auto_debit ? (
                    <div className="pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400">
                          Débito automático ✓
                        </span>
                      </div>
                      <p className="text-white/30 text-[10px] mt-1.5">Se cobra con la tarjeta</p>
                    </div>
                  ) : monthBill ? (
                    <>
                      <p className="text-2xl font-bold text-white mb-3">
                        {formatCurrency(monthBill.amount, monthBill.currency)}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusConfig[monthBill.status]?.bg} ${statusConfig[monthBill.status]?.text}`}>
                            {statusConfig[monthBill.status]?.label}
                          </span>
                          <span className="text-white/30 text-[10px]">Vence {format(new Date(monthBill.due_date), 'dd/MM')}</span>
                        </div>
                        {monthBill.status === 'PENDING' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPayingBill(monthBill); }}
                            className="text-xs text-primary-400 hover:text-primary-300 font-medium transition-colors"
                          >
                            Pagar →
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-white/30 text-sm">Sin boleta este mes</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Monthly Bills ─────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Boletas del Mes</h2>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>
          <div className="flex items-center gap-3">
            {services.length > 0 && (
              <button onClick={() => setShowCreateBill(true)} className="glass-button-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nueva Boleta
              </button>
            )}
            <button onClick={() => navigateMonth(-1)} aria-label="Mes anterior" className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-white font-medium text-sm min-w-[140px] text-center">
              {capitalize(MONTH_NAMES[currentMonth - 1])} {currentYear}
            </span>
            <button onClick={() => navigateMonth(1)} aria-label="Mes siguiente" className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {loadingBills ? (
          <Card>
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/[0.04] rounded-xl" />)}
            </div>
          </Card>
        ) : bills.length === 0 ? (
          <Card className="text-center py-12 border border-white/10 bg-white/[0.01]">
            <p className="text-white/40 font-medium">No hay boletas para este mes</p>
            <p className="text-white/25 text-xs mt-1">Agregá boletas manualmente con el botón "+ Nueva Boleta"</p>
            {services.length > 0 && (
              <button onClick={() => setShowCreateBill(true)} className="glass-button-primary mt-4 px-6 py-2">
                + Nueva Boleta
              </button>
            )}
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-3 px-5 text-white/40 text-[10px] font-bold uppercase tracking-widest">Servicio</th>
                    <th className="text-left py-3 px-5 text-white/40 text-[10px] font-bold uppercase tracking-widest">Vencimiento</th>
                    <th className="text-right py-3 px-5 text-white/40 text-[10px] font-bold uppercase tracking-widest">Monto</th>
                    <th className="text-left py-3 px-5 text-white/40 text-[10px] font-bold uppercase tracking-widest">Estado</th>
                    <th className="py-3 px-5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill: ServiceBill) => {
                    const isPending = bill.status === 'PENDING';
                    const isPaid = bill.status === 'PAID';
                    const isOverdue = isPending && new Date(bill.due_date) < now;

                    return (
                      <tr key={bill.id} className="group border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{bill.service?.category?.icon || '📦'}</span>
                            <span className="text-white font-medium text-sm">{bill.service?.name || 'Servicio'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-white/60'}`}>
                            {format(new Date(bill.due_date), 'dd/MM/yyyy')}
                            {isOverdue && <span className="text-[9px] ml-1.5 text-red-400/80">VENCIDA</span>}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className={`text-sm font-semibold ${isPaid ? 'text-white/40 line-through' : 'text-white'}`}>
                            {formatCurrency(bill.amount, bill.currency)}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusConfig[bill.status]?.bg} ${statusConfig[bill.status]?.text}`}>
                            {statusConfig[bill.status]?.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <ActionMenu id={`bill-${bill.id}`} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId}>
                            {isPending && (
                              <>
                                <MenuItem onClick={() => { setPayingBill(bill); setOpenMenuId(null); }}>💰 Pagar</MenuItem>
                                <MenuItem onClick={() => { setEditingBill(bill); setOpenMenuId(null); }}>✏️ Editar monto</MenuItem>
                                <MenuItem onClick={() => { skipBillMutation.mutate(bill.id); setOpenMenuId(null); }}>⏭️ Omitir</MenuItem>
                              </>
                            )}
                            {bill.status === 'SKIPPED' && (
                              <MenuItem onClick={() => { updateBillMutation.mutate({ id: bill.id, data: { status: 'PENDING' } }); setOpenMenuId(null); }}>↩️ Reactivar</MenuItem>
                            )}
                            <MenuItem onClick={() => { deleteBillMutation.mutate(bill.id); setOpenMenuId(null); }} destructive>🗑️ Eliminar</MenuItem>
                          </ActionMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t border-white/[0.08] bg-white/[0.02]">
                    <td className="py-3 px-5 text-white/50 text-xs font-semibold" colSpan={2}>Total del mes</td>
                    <td className="py-3 px-5 text-right">
                      <span className="text-white font-bold text-sm">{formatCurrency(totalByARS)}</span>
                      {totalByUSD > 0 && <span className="text-white/60 font-semibold text-xs ml-2">{formatCurrency(totalByUSD, 'USD')}</span>}
                    </td>
                    <td colSpan={2} className="py-3 px-5">
                      <span className="text-white/30 text-xs">
                        {bills.filter((b: ServiceBill) => b.status === 'PAID').length}/{bills.length} pagadas
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </section>


      {/* ══════════════════════════════════════════════════ */}
      {/* ═══ MODALS ═══════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════ */}

      {/* ── Create Service ────────────────────────────── */}
      {showCreateService && (
        <Modal onClose={() => setShowCreateService(false)}>
          <ModalHeader
            icon={<svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
            iconColor="bg-emerald-500/10 border border-emerald-500/20"
            title="Nuevo Servicio"
            subtitle="Registrá un gasto recurrente"
          />
          <form onSubmit={handleCreateService} className="space-y-4">
            <ServiceFormFields />
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowCreateService(false)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
              <button type="submit" className="glass-button-primary flex-1" disabled={createServiceMutation.isPending}>
                {createServiceMutation.isPending ? 'Creando...' : 'Crear Servicio'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Service ──────────────────────────────── */}
      {editingService && (
        <Modal onClose={() => setEditingService(null)}>
          <ModalHeader
            icon={<svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
            iconColor="bg-primary-500/10 border border-primary-500/20"
            title="Editar Servicio"
            subtitle={editingService.name}
          />
          <form onSubmit={handleUpdateService} className="space-y-4">
            <ServiceFormFields service={editingService} />
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setEditingService(null)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
              <button type="submit" className="glass-button-primary flex-1" disabled={updateServiceMutation.isPending}>
                {updateServiceMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Service Confirm ────────────────────── */}
      {deletingService && (
        <Modal onClose={() => setDeletingService(null)}>
          <div className="text-center">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Eliminar Servicio</h3>
            <p className="text-white/50 text-sm mb-2">¿Estás seguro de eliminar este servicio?</p>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 mb-4">
              <p className="text-white font-medium">{deletingService.category?.icon} {deletingService.name}</p>
              <p className="text-white/40 text-xs mt-0.5">{deletingService.category?.name}</p>
            </div>
            <p className="text-white/30 text-[10px] mb-4">Se eliminarán también todas las boletas asociadas.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingService(null)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
              <button
                onClick={() => deleteServiceMutation.mutate(deletingService.id)}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm font-medium text-red-400 transition-all"
                disabled={deleteServiceMutation.isPending}
              >
                {deleteServiceMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Pay Bill ──────────────────────────────────── */}
      {payingBill && (
        <Modal onClose={() => setPayingBill(null)}>
          <ModalHeader
            icon={<span className="text-lg">💰</span>}
            iconColor="bg-emerald-500/10 border border-emerald-500/20"
            title="Pagar Boleta"
            subtitle={payingBill.service?.name}
          />
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{payingBill.service?.name}</p>
                <p className="text-white/40 text-xs">Vence {format(new Date(payingBill.due_date), 'dd/MM/yyyy')}</p>
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(payingBill.amount, payingBill.currency)}</p>
            </div>
          </div>
          <form onSubmit={handlePayBill} className="space-y-4">
            <div>
              <FieldLabel>Cuenta de pago</FieldLabel>
              <select name="from_product_id" required title="Cuenta de pago" className="glass-input w-full">
                <option value="">Seleccionar cuenta...</option>
                {paymentProducts.map((p: FinancialProduct) => (
                  <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.balance)})</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Monto (dejar vacío para usar el monto original)</FieldLabel>
              <input name="amount" type="number" step="0.01" className="glass-input w-full" placeholder={payingBill.amount.toString()} />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setPayingBill(null)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
              <button type="submit" className="glass-button-primary flex-1" disabled={payBillMutation.isPending}>
                {payBillMutation.isPending ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Bill ─────────────────────────────────── */}
      {editingBill && (
        <Modal onClose={() => setEditingBill(null)}>
          <ModalHeader
            icon={<svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
            iconColor="bg-primary-500/10 border border-primary-500/20"
            title="Editar Boleta"
            subtitle={`${editingBill.service?.name} · ${capitalize(MONTH_NAMES[editingBill.month - 1])} ${editingBill.year}`}
          />
          <form onSubmit={handleUpdateBill} className="space-y-4">
            <div>
              <FieldLabel>Monto</FieldLabel>
              <input name="amount" type="number" step="0.01" required className="glass-input w-full" placeholder="0.00" defaultValue={editingBill.amount} />
            </div>
            <div>
              <FieldLabel>Fecha de vencimiento</FieldLabel>
              <input name="due_date" type="date" title="Fecha de vencimiento" className="glass-input w-full" defaultValue={editingBill.due_date.split('T')[0]} />
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setEditingBill(null)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
              <button type="submit" className="glass-button-primary flex-1" disabled={updateBillMutation.isPending}>
                {updateBillMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Create Bill ───────────────────────────── */}
      {showCreateBill && (
        <Modal onClose={() => setShowCreateBill(false)}>
          <ModalHeader
            icon={<svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            iconColor="bg-emerald-500/10 border border-emerald-500/20"
            title="Nueva Boleta"
            subtitle={`${capitalize(MONTH_NAMES[currentMonth - 1])} ${currentYear}`}
          />
          <form onSubmit={handleCreateBill} className="space-y-4">
            <div>
              <FieldLabel>Servicio</FieldLabel>
              <select name="service_id" required title="Seleccionar servicio" className="glass-input w-full">
                <option value="">Seleccionar servicio...</option>
                {services.map((s: Service) => (
                  <option key={s.id} value={s.id}>{s.category?.icon || '📦'} {s.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <FieldLabel>Monto</FieldLabel>
                <input name="amount" type="number" step="0.01" required className="glass-input w-full" placeholder="0.00" />
              </div>
              <div>
                <FieldLabel>Moneda</FieldLabel>
                <select name="currency" title="Moneda" className="glass-input w-full" defaultValue="ARS">
                  <option value="ARS">$ ARS</option>
                  <option value="USD">U$S USD</option>
                </select>
              </div>
              <div>
                <FieldLabel>Vencimiento</FieldLabel>
                <input name="due_date" type="date" required title="Fecha de vencimiento" className="glass-input w-full" />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowCreateBill(false)} className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 hover:text-white transition-all">Cancelar</button>
              <button type="submit" className="glass-button-primary flex-1" disabled={createBillMutation.isPending}>
                {createBillMutation.isPending ? 'Creando...' : 'Crear Boleta'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}

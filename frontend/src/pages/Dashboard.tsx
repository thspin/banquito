import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '@/api/accounts';
import { Card } from '@/components/ui/Card';
import { useUser } from "@clerk/clerk-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useUser();
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => accountsApi.getProducts(),
  });

  const totalBalance = products?.reduce((sum, p) => sum + p.balance, 0) || 0;
  const creditCards = products?.filter(p => p.product_type === 'CREDIT_CARD') || [];
  const totalDebt = creditCards.reduce((sum, card) => sum + Math.abs(card.balance || 0), 0);

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header with Greeting and Date */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-primary-400 font-medium mb-1 capitalize text-sm">{today}</p>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            ¡Hola, {user?.firstName || 'Usuario'}! 👋
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
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Deuda Tarjetas</p>
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
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Cuentas Activas</p>
          <p className="text-3xl font-bold text-white">{products?.filter(p => p.product_type !== 'CREDIT_CARD').length || 0}</p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">Bancos y billeteras virtuales</p>
        </Card>

        <Card className="relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Tarjetas</p>
          <p className="text-3xl font-bold text-white">{creditCards.length}</p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">Crédito y prepagas activas</p>
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
              <button className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all text-left group">
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

              <Link to="/accounts" className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all text-left group">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Gestionar</p>
                  <p className="text-[10px] text-white/40">Bancos y billeteras</p>
                </div>
              </Link>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-primary-600/10 via-transparent to-transparent border-primary-500/10 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-primary-500/10 blur-3xl rounded-full group-hover:bg-primary-500/20 transition-colors" />
            <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <div className="bg-primary-500/20 p-1.5 rounded-md">
                <svg className="w-3.5 h-3.5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Tip Financiero
            </h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-medium">
              Vincula tus tarjetas para prever deudas próximas y evitar intereses por pagos tardíos.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}


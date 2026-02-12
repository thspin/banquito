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

        {/* Compact Welcome Info */}
        <div className="hidden lg:flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-2 rounded-2xl backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
            {products?.length ? `${products.length} productos vinculados` : 'Listo para vincular cuentas'}
          </p>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-4xl">💰</span>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Balance Total</p>
          <p className="text-3xl font-bold text-white">
            ${totalBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">Suma de liquidez disponible</p>
        </Card>

        <Card className="relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-4xl">💳</span>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Deuda Tarjetas</p>
          <p className={`text-3xl font-bold ${totalDebt > 0 ? 'text-red-400' : 'text-white'}`}>
            ${totalDebt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">
            {totalDebt > 0 ? 'Vencimientos próximos' : 'Sin deudas pendientes ✨'}
          </p>
        </Card>

        <Card className="relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-4xl">🏦</span>
          </div>
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Cuentas Activas</p>
          <p className="text-3xl font-bold text-white">{products?.filter(p => p.product_type !== 'CREDIT_CARD').length || 0}</p>
          <p className="text-[10px] text-white/30 mt-2 font-medium">Bancos y billeteras virtuales</p>
        </Card>

        <Card className="relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-4xl">✨</span>
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
                    <span className="text-2xl opacity-40">📊</span>
                  </div>
                  <p className="text-white/40 font-medium italic">Gráficos de actividad y flujos próximamente...</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-white/5 bg-white/[0.01]">
              <div className="w-24 h-24 bg-primary-500/10 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full" />
                <span className="text-5xl relative z-10">🌱</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Tu banquito está vacío</h3>
              <p className="text-white/40 max-w-sm mb-10 leading-relaxed font-medium">
                Conecta tus instituciones financieras para centralizar tus saldos, controlar deudas y planificar tu ahorro.
              </p>
              <Link to="/accounts" className="glass-button-primary px-8 py-3 text-lg hover:scale-105 transition-transform shadow-xl shadow-primary-900/40">
                🚀 Vincular mi primera cuenta
              </Link>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Acciones Rápidas">
            <div className="grid grid-cols-1 gap-3">
              <button className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all text-left group">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <span className="text-lg">➕</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Transacción</p>
                  <p className="text-[10px] text-white/40">Ingreso o gasto manual</p>
                </div>
              </button>

              <Link to="/accounts" className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all text-left group">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                  <span className="text-lg">🏦</span>
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
              <span className="bg-primary-500/20 p-1 rounded-md">💡</span> Tip Financiero
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


import { Link, useLocation } from 'react-router-dom';
import { UserButton, useUser } from "@clerk/clerk-react";

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/accounts', label: 'Cuentas', icon: '🏦' },
  { path: '/transactions', label: 'Transacciones', icon: '💳' },
  { path: '/services', label: 'Servicios', icon: '📅', isLocked: true },
  { path: '/budgets', label: 'Presupuestos', icon: '📋', isLocked: true },
  { path: '/calendar', label: 'Calendario', icon: '📆', isLocked: true },
  { path: '/rentals', label: 'Alquileres', icon: '🏠', isLocked: true },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useUser();

  return (
    <div className="min-h-screen flex bg-[#0f172a]">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 glass-card m-4 flex flex-col border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center border border-primary-500/20">
              <svg className="w-6 h-6 text-primary-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.5 1L2 6v2h19V6L11.5 1zM2 22h19v-3H2v3zm3.5-4h3v-9h-3v9zm6.25-9v9h3v-9h-3zm6.25 0v9h3v-9h-3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-200 bg-clip-text text-transparent leading-none">
                banquito
              </h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2 mt-2">Menú Principal</p>

          {navItems.map((item) => (
            item.isLocked ? (
              <div
                key={item.path}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-white/[0.25] select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg opacity-30 grayscale">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <svg className="w-3.5 h-3.5 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            ) : (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${location.pathname === item.path
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/40'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <span className={`text-lg transition-transform duration-200 ${location.pathname === item.path ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          ))}

          <div className="mt-8 mb-2">
            <div className="h-px bg-white/5 mx-4" />
          </div>

          <p className="px-4 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2">Preferencias</p>
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${location.pathname === '/settings'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/40'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
          >
            <span className="text-lg group-hover:rotate-45 transition-transform duration-300">⚙️</span>
            <span className="text-sm font-medium">Configuración</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-white/5 bg-white/[0.01]">
          <div className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl flex items-center gap-3 group hover:bg-white/[0.05] transition-colors duration-200 cursor-pointer">
            <div className="relative">
              <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-9 h-9 border border-white/10" } }} />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#1e293b] rounded-full" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {user?.fullName || user?.firstName || 'Usuario'}
              </p>
              <p className="text-[10px] text-white/40 truncate mt-0.5">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto relative">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/accounts', label: 'Cuentas', icon: '🏦' },
  { path: '/transactions', label: 'Transacciones', icon: '💳' },
  { path: '/services', label: 'Servicios', icon: '📅' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 glass-card m-4 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <svg className="w-10 h-10 text-primary-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.5 1L2 6v2h19V6L11.5 1zM2 22h19v-3H2v3zm3.5-4h3v-9h-3v9zm6.25-9v9h3v-9h-3zm6.25 0v9h3v-9h-3z" />
            </svg>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-primary-200 bg-clip-text text-transparent">
                banquito
              </h1>
              <p className="text-sm text-white/60">Gestión Financiera</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${location.pathname === item.path
                  ? 'bg-primary-600 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <span className="text-xl">⚙️</span>
            <span className="font-medium">Configuración</span>
          </Link>
          <div className="glass-card p-4">
            <p className="text-sm text-white/60">Usuario Demo</p>
            <p className="text-white font-medium">demo@banquito.app</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}

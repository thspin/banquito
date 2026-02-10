import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, SignIn } from "@clerk/clerk-react";
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ui/Toast';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
// import Services from './pages/Services';
import CreditCardSummaries from './pages/CreditCardSummaries';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <SignedIn>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/accounts/:productId/summaries" element={<CreditCardSummaries />} />
                  <Route path="/transactions" element={<Transactions />} />
                  {/* <Route path="/services" element={<Services />} /> */}
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </SignedIn>
            <SignedOut>
              <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 z-0">
                  <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/30 rounded-full blur-[120px]" />
                  <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/30 rounded-full blur-[120px]" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center max-w-6xl w-full mx-4 gap-12">
                  {/* Left Side - Welcome Text */}
                  <div className="flex-1 text-center md:text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm text-primary-200">
                      <span>✨</span>
                      <span>La nueva forma de gestionar tu dinero</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
                      Tu banco, <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">
                        reimaginado.
                      </span>
                    </h1>

                    <p className="text-lg text-white/60 max-w-lg mx-auto md:mx-0 leading-relaxed">
                      Control total sobre tus finanzas con una interfaz hermosa, intuitiva y potente.
                      Únete a la revolución financiera hoy.
                    </p>

                    <div className="flex items-center justify-center md:justify-start gap-8 pt-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-white">100%</p>
                        <p className="text-sm text-white/40">Seguro</p>
                      </div>
                      <div className="w-px h-12 bg-white/10" />
                      <div className="text-center">
                        <p className="text-3xl font-bold text-white">24/7</p>
                        <p className="text-sm text-white/40">Soporte</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Login Box */}
                  <div className="flex-1 w-full max-w-md">
                    <div className="relative">
                      {/* Glow behind the form */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-blue-500 rounded-2xl blur opacity-30"></div>

                      <div className="relative bg-gray-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <SignIn
                          afterSignInUrl="/"
                          appearance={{
                            elements: {
                              rootBox: "w-full",
                              card: "bg-transparent shadow-none w-full p-0",
                              headerTitle: "text-white text-2xl",
                              headerSubtitle: "text-white/60",
                              socialButtonsBlockButton: "bg-white/5 border-white/10 hover:bg-white/10 text-white",
                              socialButtonsBlockButtonText: "text-white font-medium",
                              dividerLine: "bg-white/10",
                              dividerText: "text-white/40",
                              formFieldLabel: "text-white/70",
                              formFieldInput: "bg-white/5 border-white/10 text-white focus:border-primary-500 transition-colors",
                              footerActionText: "text-white/60",
                              footerActionLink: "text-primary-400 hover:text-primary-300"
                            },
                            layout: {
                              socialButtonsPlacement: "top",
                              showOptionalFields: false
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SignedOut>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
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
              <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-4">Bienvenido a Banquito</h1>
                  <p className="mb-4 text-gray-600">Por favor inicia sesión para continuar</p>
                  <RedirectToSignIn />
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

import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '@/api/accounts';
import { Card } from '@/components/ui/Card';

export default function Dashboard() {
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => accountsApi.getProducts(),
  });

  const totalBalance = products?.reduce((sum, p) => sum + p.balance, 0) || 0;
  const creditCards = products?.filter(p => p.product_type === 'CREDIT_CARD') || [];
  const totalDebt = creditCards.reduce((sum, card) => sum + Math.abs(card.balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <p className="text-white/60 text-sm">Balance Total</p>
          <p className="text-3xl font-bold text-white">
            ${totalBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card>
          <p className="text-white/60 text-sm">Deuda Tarjetas</p>
          <p className="text-3xl font-bold text-red-400">
            ${totalDebt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card>
          <p className="text-white/60 text-sm">Productos</p>
          <p className="text-3xl font-bold text-white">{products?.length || 0}</p>
        </Card>

        <Card>
          <p className="text-white/60 text-sm">Tarjetas</p>
          <p className="text-3xl font-bold text-white">{creditCards.length}</p>
        </Card>
      </div>

      {/* Welcome Message */}
      <Card className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-2">
          Bienvenido a Banquito
        </h2>
        <p className="text-white/70">
          Gestiona tus cuentas, transacciones y resúmenes de tarjetas de crédito.
          Usa el menú lateral para navegar entre las diferentes secciones.
        </p>
      </Card>
    </div>
  );
}

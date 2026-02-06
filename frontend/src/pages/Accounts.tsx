import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { accountsApi } from '@/api/accounts';
import { Card } from '@/components/ui/Card';
import type { FinancialProduct, FinancialInstitution, ProductType, Currency } from '@/types';

export default function Accounts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState('');

  const { data: institutions } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => accountsApi.getInstitutions(),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => accountsApi.getProducts(),
  });

  const createProductMutation = useMutation({
    mutationFn: accountsApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowProductForm(false);
    },
  });

  const handleCreateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createProductMutation.mutate({
      name: formData.get('name') as string,
      product_type: formData.get('product_type') as ProductType,
      currency: formData.get('currency') as Currency,
      institution_id: selectedInstitution || undefined,
      balance: 0,
    });
  };

  const productTypes: Record<string, string> = {
    CASH: '💵 Efectivo',
    SAVINGS_ACCOUNT: '🏦 Caja de Ahorro',
    CHECKING_ACCOUNT: '💳 Cuenta Corriente',
    DEBIT_CARD: '💳 Tarjeta de Débito',
    CREDIT_CARD: '💳 Tarjeta de Crédito',
    LOAN: '📄 Préstamo',
  };

  const currencies: Record<string, string> = {
    ARS: '$ ARS',
    USD: '$ USD',
    USDT: '₮ USDT',
    USDC: '$ USDC',
    BTC: '₿ BTC',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Cuentas</h1>
        <button
          onClick={() => setShowProductForm(true)}
          className="glass-button-primary"
        >
          + Nuevo Producto
        </button>
      </div>

      {/* Products List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map((product: FinancialProduct) => (
          <Card key={product.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/60 text-sm">
                  {productTypes[product.product_type]}
                </p>
                <h3 className="text-xl font-semibold text-white mt-1">
                  {product.name}
                </h3>
                <p className="text-2xl font-bold text-white mt-2">
                  ${product.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-white/50 text-sm mt-1">
                  {currencies[product.currency]}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {product.product_type === 'CREDIT_CARD' && (
                  <>
                    <div className="text-right">
                      <p className="text-white/60 text-xs">Disponible</p>
                      <p className="text-primary-400 font-semibold">
                        ${product.available_limit?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/accounts/${product.id}/summaries`)}
                      className="text-sm text-primary-400 hover:text-primary-300 underline"
                    >
                      Ver Resúmenes
                    </button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Product Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              Crear Producto
            </h2>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Nombre</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="glass-input w-full"
                  placeholder="Ej: Caja de Ahorro Galicia"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Tipo</label>
                <select name="product_type" required className="glass-input w-full">
                  {Object.entries(productTypes).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Moneda</label>
                <select name="currency" required className="glass-input w-full">
                  {Object.entries(currencies).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Institución (opcional)</label>
                <select
                  value={selectedInstitution}
                  onChange={(e) => setSelectedInstitution(e.target.value)}
                  className="glass-input w-full"
                >
                  <option value="">Sin institución</option>
                  {institutions?.map((inst: FinancialInstitution) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="glass-button flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="glass-button-primary flex-1"
                  disabled={createProductMutation.isPending}
                >
                  {createProductMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

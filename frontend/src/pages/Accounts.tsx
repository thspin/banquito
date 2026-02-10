import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { accountsApi } from '@/api/accounts';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import type { FinancialProduct, FinancialInstitution, ProductType, Currency, InstitutionType } from '@/types';

export default function Accounts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  // Estados para modales
  const [showProductForm, setShowProductForm] = useState(false);
  const [showInstitutionForm, setShowInstitutionForm] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState('');

  // Queries
  const { data: institutions } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => accountsApi.getInstitutions(),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => accountsApi.getProducts(),
  });

  // Mutación para crear institución
  const createInstitutionMutation = useMutation({
    mutationFn: accountsApi.createInstitution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      showToast('Institución creada exitosamente', 'success');
      setShowInstitutionForm(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Error al crear institución';
      showToast(message, 'error');
    },
  });

  // Mutación para crear producto
  const createProductMutation = useMutation({
    mutationFn: accountsApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('Producto creado exitosamente', 'success');
      setShowProductForm(false);
      setSelectedInstitution('');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 'Error al crear producto. Verifica que tengas al menos una institución creada o selecciona "Sin institución".';
      showToast(message, 'error');
    },
  });

  const handleCreateInstitution = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createInstitutionMutation.mutate({
      name: formData.get('name') as string,
      institution_type: formData.get('institution_type') as InstitutionType,
    });
  };

  const handleCreateProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: any = {
      name: formData.get('name') as string,
      product_type: formData.get('product_type') as ProductType,
      currency: formData.get('currency') as Currency,
      balance: 0,
    };

    // Solo agregar institution_id si se seleccionó una
    if (selectedInstitution) {
      data.institution_id = selectedInstitution;
    }

    createProductMutation.mutate(data);
  };

  const institutionTypes: Record<string, string> = {
    BANK: '🏦 Banco',
    WALLET: '👛 Billetera Digital',
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
        <div className="flex gap-3">
          <button
            onClick={() => setShowInstitutionForm(true)}
            className="glass-button"
          >
            + Nueva Institución
          </button>
          <button
            onClick={() => setShowProductForm(true)}
            className="glass-button-primary"
          >
            + Nuevo Producto
          </button>
        </div>
      </div>

      {/* Institutions List */}
      {institutions && institutions.length > 0 && (
        <Card title="Instituciones Financieras">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {institutions.map((inst: FinancialInstitution) => (
              <div
                key={inst.id}
                className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {institutionTypes[inst.institution_type] || '🏦'}
                  </span>
                  <div>
                    <h3 className="text-white font-medium">{inst.name}</h3>
                    <p className="text-white/50 text-sm">
                      {institutionTypes[inst.institution_type] || inst.institution_type}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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

      {/* Create Institution Modal */}
      {showInstitutionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              Nueva Institución
            </h2>
            <form onSubmit={handleCreateInstitution} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Nombre</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="glass-input w-full"
                  placeholder="Ej: Banco Galicia"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Tipo</label>
                <select name="institution_type" required className="glass-input w-full">
                  {Object.entries(institutionTypes).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInstitutionForm(false)}
                  className="glass-button flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="glass-button-primary flex-1"
                  disabled={createInstitutionMutation.isPending}
                >
                  {createInstitutionMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              Crear Producto
            </h2>
            {!institutions || institutions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-white/70 mb-4">
                  No tienes instituciones creadas. Debes crear al menos una institución antes de crear productos.
                </p>
                <button
                  onClick={() => {
                    setShowProductForm(false);
                    setShowInstitutionForm(true);
                  }}
                  className="glass-button-primary"
                >
                  Crear Institución Primero
                </button>
              </div>
            ) : (
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
                  <label className="block text-white/70 text-sm mb-1">Institución</label>
                  <select
                    value={selectedInstitution}
                    onChange={(e) => setSelectedInstitution(e.target.value)}
                    className="glass-input w-full"
                    required
                  >
                    <option value="">Selecciona una institución</option>
                    {institutions?.map((inst: FinancialInstitution) => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                  <p className="text-white/40 text-xs mt-1">
                    ¿No ves tu institución?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductForm(false);
                        setShowInstitutionForm(true);
                      }}
                      className="text-primary-400 hover:underline"
                    >
                      Crear nueva
                    </button>
                  </p>
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
                    disabled={createProductMutation.isPending || !selectedInstitution}
                  >
                    {createProductMutation.isPending ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

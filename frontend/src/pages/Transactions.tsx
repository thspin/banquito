import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/api/transactions';
import { accountsApi } from '@/api/accounts';
import { categoriesApi } from '@/api/categories';
import { Card } from '@/components/ui/Card';
import type { Transaction, FinancialProduct, Category, TransactionType } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Transactions() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsApi.getTransactions(),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => accountsApi.getProducts(),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const createMutation = useMutation({
    mutationFn: transactionsApi.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowForm(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createMutation.mutate({
      amount: parseFloat(formData.get('amount') as string),
      date: formData.get('date') as string,
      description: formData.get('description') as string,
      transaction_type: formData.get('transaction_type') as TransactionType,
      from_product_id: formData.get('from_product_id') as string,
      category_id: formData.get('category_id') as string || undefined,
      installments: parseInt(formData.get('installments') as string) || 1,
      plan_z: formData.get('plan_z') === 'on',
    });
  };

  const transactionTypes: Record<string, string> = {
    EXPENSE: 'Gasto',
    INCOME: 'Ingreso',
    TRANSFER: 'Transferencia',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Transacciones</h1>
        <button
          onClick={() => setShowForm(true)}
          className="glass-button-primary"
        >
          + Nueva Transacción
        </button>
      </div>

      {/* Transactions List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/60 font-medium">Fecha</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Descripción</th>
                <th className="text-left py-3 px-4 text-white/60 font-medium">Categoría</th>
                <th className="text-right py-3 px-4 text-white/60 font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {transactions?.map((tx: Transaction) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-4 text-white">
                    {format(new Date(tx.date), 'dd/MM/yyyy', { locale: es })}
                  </td>
                  <td className="py-3 px-4 text-white">
                    {tx.description}
                    {tx.installment_total && (
                      <span className="text-white/50 text-sm ml-2">
                        ({tx.installment_number}/{tx.installment_total})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${tx.transaction_type === 'INCOME'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                      }`}>
                      {transactionTypes[tx.transaction_type]}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold ${tx.transaction_type === 'INCOME' ? 'text-green-400' : 'text-white'
                    }`}>
                    {tx.transaction_type === 'INCOME' ? '+' : '-'}
                    ${tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Transaction Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">
              Nueva Transacción
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Tipo</label>
                <select name="transaction_type" required className="glass-input w-full">
                  <option value="EXPENSE">Gasto</option>
                  <option value="INCOME">Ingreso</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Monto</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  className="glass-input w-full"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Fecha</label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="glass-input w-full"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Descripción</label>
                <input
                  name="description"
                  type="text"
                  required
                  className="glass-input w-full"
                  placeholder="Ej: Compra supermercado"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Producto</label>
                <select name="from_product_id" required className="glass-input w-full">
                  <option value="">Seleccionar...</option>
                  {products?.map((p: FinancialProduct) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Categoría</label>
                <select name="category_id" className="glass-input w-full">
                  <option value="">Sin categoría</option>
                  {categories?.map((c: Category) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Cuotas</label>
                <input
                  name="installments"
                  type="number"
                  min="1"
                  max="48"
                  defaultValue="1"
                  className="glass-input w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  name="plan_z"
                  type="checkbox"
                  id="plan_z"
                  className="w-4 h-4"
                />
                <label htmlFor="plan_z" className="text-white/70 text-sm">
                  Plan Z (3 pagos sin interés)
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="glass-button flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="glass-button-primary flex-1"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

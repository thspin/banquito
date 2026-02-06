import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { summariesApi } from '@/api/summaries';
import { accountsApi } from '@/api/accounts';
import { Card } from '@/components/ui/Card';
import type { CreditCardSummary, CreditCardSummaryDetail, FinancialProduct } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CreditCardSummaries() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentProductId, setPaymentProductId] = useState('');

  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => accountsApi.getProduct(productId!),
    enabled: !!productId,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => accountsApi.getProducts(),
  });

  const { data: summaries } = useQuery({
    queryKey: ['summaries', productId],
    queryFn: () => summariesApi.getSummaries(productId!),
    enabled: !!productId,
  });

  const { data: summaryDetail } = useQuery({
    queryKey: ['summary', selectedSummary],
    queryFn: () => summariesApi.getSummary(selectedSummary!),
    enabled: !!selectedSummary,
  });

  const generateMutation = useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      summariesApi.generateSummary(productId!, year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summaries', productId] });
    },
  });

  const payMutation = useMutation({
    mutationFn: () =>
      summariesApi.paySummary(selectedSummary!, { from_product_id: paymentProductId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summaries', productId] });
      queryClient.invalidateQueries({ queryKey: ['summary', selectedSummary] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowPayModal(false);
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => summariesApi.closeSummary(selectedSummary!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summary', selectedSummary] });
    },
  });

  const handleGenerateCurrentMonth = () => {
    const now = new Date();
    generateMutation.mutate({ year: now.getFullYear(), month: now.getMonth() + 1 });
  };

  const liquidityProducts = products?.filter(
    p => !['CREDIT_CARD', 'LOAN'].includes(p.product_type)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/accounts')}
            className="text-white/60 hover:text-white text-sm mb-2"
          >
            ← Volver a Cuentas
          </button>
          <h1 className="text-3xl font-bold text-white">
            Resúmenes: {product?.name}
          </h1>
        </div>
        <button
          onClick={handleGenerateCurrentMonth}
          className="glass-button-primary"
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? 'Generando...' : 'Generar Resumen Actual'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaries?.map((summary: CreditCardSummary) => (
          <div
            key={summary.id}
            onClick={() => setSelectedSummary(summary.id)}
            className={`glass-card p-4 cursor-pointer transition-all hover:bg-white/10 ${
              selectedSummary === summary.id ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">
                {format(new Date(summary.year, summary.month - 1), 'MMMM yyyy', { locale: es })}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${
                summary.status === 'PAID' ? 'bg-green-500/20 text-green-400' :
                summary.status === 'CLOSED' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {summary.status === 'PAID' ? 'Pagado' :
                 summary.status === 'CLOSED' ? 'Cerrado' : 'Borrador'}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">
              ${summary.total_amount.toFixed(2)}
            </p>
            <p className="text-white/50 text-sm mt-1">
              Vence: {format(new Date(summary.due_date), 'dd/MM/yyyy')}
            </p>
          </div>
        ))}
      </div>

      {/* Summary Detail */}
      {summaryDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Summary Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Detalle del Resumen">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-white/60 text-sm">Compras</p>
                  <p className="text-xl font-semibold text-white">
                    ${summaryDetail.calculated_amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Ajustes</p>
                  <p className="text-xl font-semibold text-white">
                    ${summaryDetail.adjustments_amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Total</p>
                  <p className="text-xl font-semibold text-primary-400">
                    ${summaryDetail.total_amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Estado</p>
                  <p className={`text-xl font-semibold ${
                    summaryDetail.status === 'PAID' ? 'text-green-400' :
                    summaryDetail.status === 'CLOSED' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`}>
                    {summaryDetail.status === 'PAID' ? 'Pagado' :
                     summaryDetail.status === 'CLOSED' ? 'Cerrado' : 'Borrador'}
                  </p>
                </div>
              </div>

              {/* Transactions Table */}
              <h4 className="text-lg font-semibold text-white mb-3">Transacciones</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-white/60 text-sm">Fecha</th>
                      <th className="text-left py-2 px-3 text-white/60 text-sm">Descripción</th>
                      <th className="text-right py-2 px-3 text-white/60 text-sm">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryDetail.items?.map((item) => (
                      <tr key={item.id} className="border-b border-white/5">
                        <td className="py-2 px-3 text-white text-sm">
                          {format(new Date(item.transaction.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="py-2 px-3 text-white text-sm">
                          {item.transaction.description}
                          {item.transaction.plan_z && (
                            <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                              Plan Z
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-white text-sm">
                          ${item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Adjustments */}
            {summaryDetail.adjustments && summaryDetail.adjustments.length > 0 && (
              <Card title="Ajustes">
                <div className="space-y-2">
                  {summaryDetail.adjustments.map((adj) => (
                    <div key={adj.id} className="flex justify-between items-center py-2 border-b border-white/5">
                      <div>
                        <p className="text-white">{adj.description}</p>
                        <p className="text-white/50 text-sm">{adj.adjustment_type}</p>
                      </div>
                      <p className={`font-semibold ${adj.amount < 0 ? 'text-green-400' : 'text-white'}`}>
                        {adj.amount < 0 ? '' : '+'}${Math.abs(adj.amount).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-4">
            <Card title="Acciones">
              <div className="space-y-3">
                {summaryDetail.status === 'DRAFT' && (
                  <button
                    onClick={() => closeMutation.mutate()}
                    className="glass-button w-full"
                    disabled={closeMutation.isPending}
                  >
                    {closeMutation.isPending ? 'Cerrando...' : 'Cerrar Resumen'}
                  </button>
                )}

                {(summaryDetail.status === 'DRAFT' || summaryDetail.status === 'CLOSED') && (
                  <button
                    onClick={() => setShowPayModal(true)}
                    className="glass-button-primary w-full"
                  >
                    Pagar Resumen
                  </button>
                )}

                {summaryDetail.status === 'PAID' && (
                  <div className="p-4 bg-green-500/20 rounded-xl text-center">
                    <p className="text-green-400 font-semibold">Resumen Pagado</p>
                    <p className="text-green-400/70 text-sm">
                      {summaryDetail.paid_date && format(new Date(summaryDetail.paid_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Payment Info */}
            {summaryDetail.status === 'PAID' && summaryDetail.paid_from_product_id && (
              <Card title="Información de Pago">
                <p className="text-white/60 text-sm">Pagado desde:</p>
                <p className="text-white">
                  {products?.find(p => p.id === summaryDetail.paid_from_product_id)?.name}
                </p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && summaryDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              Pagar Resumen
            </h2>
            <p className="text-white/70 mb-4">
              Total a pagar: <span className="text-2xl font-bold text-white">${summaryDetail.total_amount.toFixed(2)}</span>
            </p>
            
            {summaryDetail.items?.some(item => item.transaction.plan_z) && (
              <div className="mb-4 p-3 bg-purple-500/20 rounded-lg">
                <p className="text-purple-300 text-sm">
                  Este resumen contiene transacciones con Plan Z. 
                  Al pagar, se convertirán automáticamente en 3 cuotas sin interés.
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-white/70 text-sm mb-2">
                Pagar desde:
              </label>
              <select
                value={paymentProductId}
                onChange={(e) => setPaymentProductId(e.target.value)}
                className="glass-input w-full"
              >
                <option value="">Seleccionar cuenta...</option>
                {liquidityProducts?.map((p: FinancialProduct) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPayModal(false)}
                className="glass-button flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => payMutation.mutate()}
                disabled={!paymentProductId || payMutation.isPending}
                className="glass-button-primary flex-1"
              >
                {payMutation.isPending ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

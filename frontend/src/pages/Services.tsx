import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi } from '@/api/services';
import { categoriesApi } from '@/api/categories';
import { Card } from '@/components/ui/Card';
import type { Service, ServiceBill, Category } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/components/ui/Toast';

export default function Services() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getServices(),
  });

  const { data: bills } = useQuery({
    queryKey: ['bills', currentYear, currentMonth],
    queryFn: () => servicesApi.getMonthlyBills(currentYear, currentMonth),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories('EXPENSE'),
  });

  const { showToast } = useToast();
  const createMutation = useMutation({
    mutationFn: servicesApi.createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      showToast('Servicio creado exitosamente', 'success');
      setShowForm(false);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al crear servicio', 'error');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const category_id = formData.get('category_id') as string;

    if (!name || !category_id) {
      showToast('Nombre y Categoría son requeridos', 'error');
      return;
    }

    createMutation.mutate({
      name,
      default_amount: parseFloat(formData.get('amount') as string) || undefined,
      default_due_day: parseInt(formData.get('due_day') as string) || undefined,
      category_id,
      active: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Servicios</h1>
        <button
          onClick={() => setShowForm(true)}
          className="glass-button-primary"
        >
          + Nuevo Servicio
        </button>
      </div>

      {/* Services List */}
      <Card title="Servicios Activos">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services?.map((service: Service) => (
            <div
              key={service.id}
              className="glass-card p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {service.category?.icon} {service.name}
                  </h3>
                  <p className="text-white/60 text-sm">
                    Vence día {service.default_due_day}
                  </p>
                </div>
                <p className="text-xl font-bold text-white">
                  ${service.default_amount?.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Monthly Bills */}
      <Card title={`Boletas ${currentMonth}/${currentYear}`}>
        <div className="flex gap-4 mb-4">
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
            className="glass-input"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {format(new Date(2024, i, 1), 'MMMM', { locale: es })}
              </option>
            ))}
          </select>
          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            className="glass-input"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/60">Servicio</th>
                <th className="text-left py-3 px-4 text-white/60">Vencimiento</th>
                <th className="text-right py-3 px-4 text-white/60">Monto</th>
                <th className="text-left py-3 px-4 text-white/60">Estado</th>
              </tr>
            </thead>
            <tbody>
              {bills?.map((bill: ServiceBill) => (
                <tr key={bill.id} className="border-b border-white/5">
                  <td className="py-3 px-4 text-white">
                    {bill.service?.name}
                  </td>
                  <td className="py-3 px-4 text-white">
                    {format(new Date(bill.due_date), 'dd/MM/yyyy')}
                  </td>
                  <td className="py-3 px-4 text-right text-white">
                    ${bill.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${bill.status === 'PAID'
                      ? 'bg-green-500/20 text-green-400'
                      : bill.status === 'PENDING'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                      }`}>
                      {bill.status === 'PAID' ? 'Pagada' :
                        bill.status === 'PENDING' ? 'Pendiente' : 'Omitida'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Service Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              Nuevo Servicio
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Nombre</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="glass-input w-full"
                  placeholder="Ej: Netflix"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Monto mensual</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  className="glass-input w-full"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Día de vencimiento</label>
                <input
                  name="due_day"
                  type="number"
                  min="1"
                  max="31"
                  className="glass-input w-full"
                  placeholder="15"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Categoría</label>
                <select name="category_id" required className="glass-input w-full">
                  <option value="">Seleccionar...</option>
                  {categories?.map((c: Category) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
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

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/api/categories';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import type { Category } from '@/types';

const categoryIcons = [
  { emoji: '🍔', name: 'Comida' },
  { emoji: '🚗', name: 'Transporte' },
  { emoji: '🏠', name: 'Vivienda' },
  { emoji: '💡', name: 'Servicios' },
  { emoji: '⚕️', name: 'Salud' },
  { emoji: '🎬', name: 'Entretenimiento' },
  { emoji: '📚', name: 'Educación' },
  { emoji: '👕', name: 'Ropa' },
  { emoji: '🎁', name: 'Regalos' },
  { emoji: '🛒', name: 'Compras' },
  { emoji: '💰', name: 'Salario' },
  { emoji: '💻', name: 'Trabajo' },
  { emoji: '📈', name: 'Inversiones' },
  { emoji: '✈️', name: 'Viajes' },
  { emoji: '🐾', name: 'Mascotas' },
  { emoji: '💪', name: 'Gimnasio' },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<{ name: string; icon: string; category_type: 'EXPENSE' | 'INCOME' }>({ name: '', icon: '📁', category_type: 'EXPENSE' });

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });

  const createCategoryMutation = useMutation({
    mutationFn: categoriesApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Categoría creada exitosamente', 'success');
      setShowCreateForm(false);
      setNewCategory({ name: '', icon: '📁', category_type: 'EXPENSE' });
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al crear categoría', 'error');
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => categoriesApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Categoría actualizada', 'success');
      setEditingCategory(null);
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al actualizar categoría', 'error');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: categoriesApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Categoría eliminada', 'success');
    },
    onError: (error: any) => {
      showToast(error?.response?.data?.detail || 'Error al eliminar categoría', 'error');
    },
  });

  const seedCategoriesMutation = useMutation<{ success: boolean; message: string }, Error>({
    mutationFn: categoriesApi.seedCategories,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast(data.message || 'Categorías creadas exitosamente', 'success');
    },
    onError: () => {
      showToast('Error al crear categorías por defecto', 'error');
    },
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;
    createCategoryMutation.mutate(newCategory);
  };

  const handleUpdateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) return;
    updateCategoryMutation.mutate({
      id: editingCategory.id,
      data: { name: editingCategory.name, icon: editingCategory.icon }
    });
  };

  const incomeCategories = categories?.filter((c: Category) => c.category_type === 'INCOME') || [];
  const expenseCategories = categories?.filter((c: Category) => c.category_type === 'EXPENSE') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Configuración</h1>
      </div>

      {/* Categories Section */}
      <Card title="Categorías">
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowCreateForm(true)}
            className="glass-button-primary"
          >
            + Nueva Categoría
          </button>
          <button
            onClick={() => seedCategoriesMutation.mutate()}
            className="glass-button"
            disabled={seedCategoriesMutation.isPending}
          >
            {seedCategoriesMutation.isPending ? 'Creando...' : 'Crear Categorías por Defecto'}
          </button>
        </div>

        {isLoading ? (
          <p className="text-white/60">Cargando categorías...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income Categories */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-green-400">↓</span> Ingresos
              </h3>
              <div className="space-y-2">
                {incomeCategories.map((category: Category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.icon}</span>
                      <span className="text-white">{category.name}</span>
                      {category.is_system && (
                        <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded">
                          Sistema
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="text-primary-400 hover:text-primary-300 text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?`)) {
                            deleteCategoryMutation.mutate(category.id);
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-sm"
                        disabled={deleteCategoryMutation.isPending}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {incomeCategories.length === 0 && (
                  <p className="text-white/40 text-sm">No hay categorías de ingresos</p>
                )}
              </div>
            </div>

            {/* Expense Categories */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-red-400">↑</span> Gastos
              </h3>
              <div className="space-y-2">
                {expenseCategories.map((category: Category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.icon}</span>
                      <span className="text-white">{category.name}</span>
                      {category.is_system && (
                        <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded">
                          Sistema
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="text-primary-400 hover:text-primary-300 text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?`)) {
                            deleteCategoryMutation.mutate(category.id);
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-sm"
                        disabled={deleteCategoryMutation.isPending}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {expenseCategories.length === 0 && (
                  <p className="text-white/40 text-sm">No hay categorías de gastos</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* API Info */}
      <Card title="Información del Sistema">
        <div className="space-y-2 text-white/70">
          <p><span className="text-white">URL:</span> {window.location.origin}</p>
          <p><span className="text-white">API:</span> {window.location.origin}/api</p>
          <p><span className="text-white">Versión:</span> 1.0.0</p>
          <p className="text-xs text-white/40 mt-2">Vercel + Neon PostgreSQL</p>
        </div>
      </Card>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              Editar Categoría
            </h2>
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="glass-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Icono</label>
                <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto p-2 bg-white/5 rounded-xl">
                  {categoryIcons.map((icon) => (
                    <button
                      key={icon.emoji}
                      type="button"
                      onClick={() => setEditingCategory({ ...editingCategory, icon: icon.emoji })}
                      className={`text-2xl p-2 rounded hover:bg-white/20 transition-colors ${editingCategory.icon === icon.emoji ? 'bg-white/30 ring-2 ring-primary-400' : ''
                        }`}
                    >
                      {icon.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="glass-button flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="glass-button-primary flex-1"
                  disabled={updateCategoryMutation.isPending}
                >
                  {updateCategoryMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">
              Nueva Categoría
            </h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-1">Nombre</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Ej: Supermercado"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Tipo</label>
                <select
                  value={newCategory.category_type}
                  onChange={(e) => setNewCategory({ ...newCategory, category_type: e.target.value as 'INCOME' | 'EXPENSE' })}
                  className="glass-input w-full"
                >
                  <option value="EXPENSE">Gasto</option>
                  <option value="INCOME">Ingreso</option>
                </select>
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Icono</label>
                <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto p-2 bg-white/5 rounded-xl">
                  {categoryIcons.map((icon) => (
                    <button
                      key={icon.emoji}
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, icon: icon.emoji })}
                      className={`text-2xl p-2 rounded hover:bg-white/20 transition-colors ${newCategory.icon === icon.emoji ? 'bg-white/30 ring-2 ring-primary-400' : ''
                        }`}
                      title={icon.name}
                    >
                      {icon.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="glass-button flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="glass-button-primary flex-1"
                  disabled={createCategoryMutation.isPending}
                >
                  {createCategoryMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

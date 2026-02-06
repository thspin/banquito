import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { Transaction } from '@/types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface CategoryData {
  name: string;
  value: number;
}

export function MonthlyChart({ transactions }: { transactions: Transaction[] }) {
  const data: MonthlyData[] = useMemo(() => {
    const grouped = transactions.reduce((acc, tx) => {
      const date = new Date(tx.date);
      const key = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!acc[key]) {
        acc[key] = { month: key, income: 0, expense: 0 };
      }
      
      if (tx.transaction_type === 'INCOME') {
        acc[key].income += tx.amount;
      } else if (tx.transaction_type === 'EXPENSE') {
        acc[key].expense += tx.amount;
      }
      
      return acc;
    }, {} as Record<string, MonthlyData>);
    
    return Object.values(grouped).slice(-6); // Last 6 months
  }, [transactions]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
          <YAxis stroke="rgba(255,255,255,0.5)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="income" fill="#10B981" name="Ingresos" />
          <Bar dataKey="expense" fill="#EF4444" name="Gastos" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryChart({ transactions, categories }: { transactions: Transaction[]; categories: any[] }) {
  const data: CategoryData[] = useMemo(() => {
    const expenses = transactions.filter(tx => tx.transaction_type === 'EXPENSE');
    
    const grouped = expenses.reduce((acc, tx) => {
      const category = categories.find(c => c.id === tx.category_id);
      const name = category?.name || 'Sin categoría';
      
      acc[name] = (acc[name] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Top 6 categories
  }, [transactions, categories]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

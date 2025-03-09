'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Printer, Download, Calendar } from 'lucide-react';
import { DateRangePicker } from '@/components/date-range-picker';
import { format } from 'date-fns';

interface CategoryTotal {
  name: string;
  value: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function Reports() {
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryTotal[]>([]);
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryTotal[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1),
    to: new Date(),
  });

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        amount,
        transaction_date,
        categories (
          name,
          type
        )
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', dateRange.from.toISOString())
      .lte('transaction_date', dateRange.to.toISOString());

    if (transactions) {
      // Process category totals
      const expenseTotals: { [key: string]: number } = {};
      const incomeTotals: { [key: string]: number } = {};
      const monthlyTotals: { [key: string]: { income: number; expenses: number } } = {};

      transactions.forEach((transaction) => {
        // Process category totals
        if (transaction.categories?.type === 'expense') {
          expenseTotals[transaction.categories.name] = 
            (expenseTotals[transaction.categories.name] || 0) + Number(transaction.amount);
        } else {
          incomeTotals[transaction.categories.name] = 
            (incomeTotals[transaction.categories.name] || 0) + Number(transaction.amount);
        }

        // Process monthly totals
        const monthKey = format(new Date(transaction.transaction_date), 'MMM yyyy');
        if (!monthlyTotals[monthKey]) {
          monthlyTotals[monthKey] = { income: 0, expenses: 0 };
        }
        if (transaction.categories?.type === 'expense') {
          monthlyTotals[monthKey].expenses += Number(transaction.amount);
        } else {
          monthlyTotals[monthKey].income += Number(transaction.amount);
        }
      });

      setExpensesByCategory(
        Object.entries(expenseTotals)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );
      
      setIncomeByCategory(
        Object.entries(incomeTotals)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      setMonthlyData(
        Object.entries(monthlyTotals)
          .map(([month, data]) => ({
            month,
            income: data.income,
            expenses: data.expenses,
          }))
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      );
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handlePrint = () => {
    const totalExpenses = expensesByCategory.reduce((sum, category) => sum + category.value, 0);
    const totalIncome = incomeByCategory.reduce((sum, category) => sum + category.value, 0);
    const netIncome = totalIncome - totalExpenses;

    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <style>
        @media print {
          body { font-family: Arial, sans-serif; }
          .report-header { text-align: center; margin-bottom: 30px; }
          .report-section { margin-bottom: 40px; }
          .category-list { margin-top: 15px; }
          .category-item { 
            display: flex; 
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .summary-box {
            border: 1px solid #ddd;
            padding: 15px;
            margin-top: 20px;
            border-radius: 5px;
          }
          .total { font-weight: bold; margin-top: 15px; }
          .net-income { 
            font-size: 1.2em;
            color: ${netIncome >= 0 ? '#10b981' : '#ef4444'};
          }
        }
      </style>
      <div class="report-header">
        <h1>Financial Report</h1>
        <p>Period: ${format(dateRange.from, 'PP')} - ${format(dateRange.to, 'PP')}</p>
      </div>

      <div class="report-section">
        <h2>Summary</h2>
        <div class="summary-box">
          <div>Total Income: $${totalIncome.toFixed(2)}</div>
          <div>Total Expenses: $${totalExpenses.toFixed(2)}</div>
          <div class="net-income">Net Income: $${netIncome.toFixed(2)}</div>
        </div>
      </div>
      
      <div class="report-section">
        <h2>Expenses by Category</h2>
        <div class="category-list">
          ${expensesByCategory.map(category => `
            <div class="category-item">
              <span>${category.name}</span>
              <span>$${category.value.toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="total">Total: $${totalExpenses.toFixed(2)}</div>
        </div>
      </div>

      <div class="report-section">
        <h2>Income by Category</h2>
        <div class="category-list">
          ${incomeByCategory.map(category => `
            <div class="category-item">
              <span>${category.name}</span>
              <span>$${category.value.toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="total">Total: $${totalIncome.toFixed(2)}</div>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Category', 'Amount', 'Type'],
      ...expensesByCategory.map(cat => [cat.name, cat.value, 'Expense']),
      ...incomeByCategory.map(cat => [cat.name, cat.value, 'Income']),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + cat.value, 0);
  const totalIncome = incomeByCategory.reduce((sum, cat) => sum + cat.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <div className="flex gap-4">
          <DateRangePicker
            from={dateRange.from}
            to={dateRange.to}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                setDateRange({ from: range.from, to: range.to });
              }
            }}
          />
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
            <CardDescription>For selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              ${totalIncome.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
            <CardDescription>For selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              ${totalExpenses.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net Income</CardTitle>
            <CardDescription>For selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(totalIncome - totalExpenses) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${(totalIncome - totalExpenses).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="hsl(var(--chart-1))" name="Income" />
                  <Bar dataKey="expenses" fill="hsl(var(--chart-2))" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

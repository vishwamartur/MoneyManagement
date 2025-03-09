'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Printer } from 'lucide-react';

interface CategoryTotal {
  name: string;
  value: number;
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

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          amount,
          categories (
            name,
            type
          )
        `)
        .eq('user_id', user.id);

      if (transactions) {
        const expenseTotals: { [key: string]: number } = {};
        const incomeTotals: { [key: string]: number } = {};

        transactions.forEach((transaction) => {
          if (transaction.categories?.type === 'expense') {
            expenseTotals[transaction.categories.name] = 
              (expenseTotals[transaction.categories.name] || 0) + Number(transaction.amount);
          } else {
            incomeTotals[transaction.categories.name] = 
              (incomeTotals[transaction.categories.name] || 0) + Number(transaction.amount);
          }
        });

        setExpensesByCategory(
          Object.entries(expenseTotals).map(([name, value]) => ({ name, value }))
        );
        setIncomeByCategory(
          Object.entries(incomeTotals).map(([name, value]) => ({ name, value }))
        );
      }
    };

    fetchData();
  }, []);

  const handlePrint = () => {
    const totalExpenses = expensesByCategory.reduce((sum, category) => sum + category.value, 0);
    const totalIncome = incomeByCategory.reduce((sum, category) => sum + category.value, 0);

    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <style>
        @media print {
          .report-section { margin-bottom: 30px; }
          .category-list { margin-top: 10px; }
          .category-item { margin: 5px 0; }
          .total { margin-top: 15px; font-weight: bold; }
        }
      </style>
      <h1 style="margin-bottom: 20px;">Financial Report</h1>
      <p style="margin-bottom: 20px;">Generated on ${new Date().toLocaleDateString()}</p>
      
      <div class="report-section">
        <h2>Expenses by Category</h2>
        <div class="category-list">
          ${expensesByCategory.map(category => `
            <div class="category-item">
              ${category.name}: $${category.value.toFixed(2)}
            </div>
          `).join('')}
        </div>
        <div class="total">
          Total Expenses: $${totalExpenses.toFixed(2)}
        </div>
      </div>

      <div class="report-section">
        <h2>Income by Category</h2>
        <div class="category-list">
          ${incomeByCategory.map(category => `
            <div class="category-item">
              ${category.name}: $${category.value.toFixed(2)}
            </div>
          `).join('')}
        </div>
        <div class="total">
          Total Income: $${totalIncome.toFixed(2)}
        </div>
      </div>

      <div class="report-section">
        <h2>Summary</h2>
        <div class="total">
          Net Income: $${(totalIncome - totalExpenses).toFixed(2)}
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Financial Reports</h1>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {incomeByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
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
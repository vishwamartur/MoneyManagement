'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Filter, Printer } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  description: string;
  transaction_date: string;
  category_id: string;
  categories: Category;
}

export default function Transactions() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    currency: 'USD',
    payment_method: 'cash',
    description: '',
    category_id: '',
  });
  const [filter, setFilter] = useState({
    type: 'all',
    payment_method: 'all',
  });

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);

  const fetchTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        categories (
          id,
          name,
          type
        )
      `)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch transactions',
        variant: 'destructive',
      });
      return;
    }

    setTransactions(data);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch categories',
        variant: 'destructive',
      });
      return;
    }

    setCategories(data);
  };

  const handleAddTransaction = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('transactions')
      .insert([
        {
          ...newTransaction,
          amount: Number(newTransaction.amount),
          user_id: user.id,
          transaction_date: new Date().toISOString(),
        },
      ]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add transaction',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Transaction added successfully',
    });

    setIsAddingTransaction(false);
    setNewTransaction({
      amount: '',
      currency: 'USD',
      payment_method: 'cash',
      description: '',
      category_id: '',
    });
    fetchTransactions();
  };

  const handlePrint = () => {
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <style>
        @media print {
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f3f4f6; }
          .amount-income { color: #10b981; }
          .amount-expense { color: #ef4444; }
        }
      </style>
      <h1 style="margin-bottom: 20px;">Transaction Report</h1>
      <p style="margin-bottom: 20px;">Generated on ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Payment Method</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTransactions.map(transaction => `
            <tr>
              <td>${new Date(transaction.transaction_date).toLocaleDateString()}</td>
              <td>${transaction.categories?.name}</td>
              <td>${transaction.description}</td>
              <td>${transaction.payment_method.replace('_', ' ')}</td>
              <td class="amount-${transaction.categories?.type}">
                ${transaction.categories?.type === 'income' ? '+' : '-'}
                $${Math.abs(transaction.amount).toFixed(2)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
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

  const filteredTransactions = transactions.filter((transaction) => {
    if (
      filter.type !== 'all' &&
      transaction.categories?.type !== filter.type
    ) {
      return false;
    }
    if (
      filter.payment_method !== 'all' &&
      transaction.payment_method !== filter.payment_method
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newTransaction.amount}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        amount: e.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={newTransaction.category_id}
                    onValueChange={(value) =>
                      setNewTransaction({
                        ...newTransaction,
                        category_id: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select
                    value={newTransaction.payment_method}
                    onValueChange={(value) =>
                      setNewTransaction({
                        ...newTransaction,
                        payment_method: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={newTransaction.description}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        description: e.target.value,
                      })
                    }
                    placeholder="Transaction description"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddTransaction}
                >
                  Add Transaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Select
            value={filter.type}
            onValueChange={(value) =>
              setFilter({ ...filter, type: value })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filter.payment_method}
            onValueChange={(value) =>
              setFilter({ ...filter, payment_method: value })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {new Date(transaction.transaction_date).toLocaleDateString()}
                </TableCell>
                <TableCell>{transaction.categories?.name}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell className="capitalize">
                  {transaction.payment_method.replace('_', ' ')}
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    transaction.categories?.type === 'income'
                      ? 'text-emerald-500'
                      : 'text-red-500'
                  }`}
                >
                  {transaction.categories?.type === 'income' ? '+' : '-'}
                  ${Math.abs(transaction.amount).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

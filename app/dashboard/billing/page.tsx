'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { Plus, Printer, Receipt } from 'lucide-react';
import { formatCurrency, validateGSTIN, generateBillNumber } from '@/lib/utils';

interface Bill {
  id: string;
  bill_number: string;
  customer_name: string;
  gstin: string;
  bill_date: string;
  total_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_with_gst: number;
  payment_status: string;
  notes: string;
}

interface BillItem {
  id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total: number;
  inventory_items: {
    name: string;
  };
}

interface InventoryItem {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

export default function Billing() {
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [newBill, setNewBill] = useState({
    customer_name: '',
    gstin: '',
    notes: '',
  });
  const [newBillItem, setNewBillItem] = useState({
    item_id: '',
    quantity: 1,
  });

  const fetchBills = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch bills',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const fetchInventoryItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, unit_price, quantity')
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch inventory items',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const fetchBillItems = useCallback(async (billId: string) => {
    try {
      const { data, error } = await supabase
        .from('bill_items')
        .select(`
          *,
          inventory_items (
            name
          )
        `)
        .eq('bill_id', billId);

      if (error) throw error;
      setBillItems(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to fetch bill items',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (mounted) {
        await Promise.all([
          fetchBills(),
          fetchInventoryItems()
        ]);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [fetchBills, fetchInventoryItems]);

  useEffect(() => {
    let mounted = true;

    if (selectedBill && mounted) {
      fetchBillItems(selectedBill);
    }

    return () => {
      mounted = false;
    };
  }, [selectedBill, fetchBillItems]);

  const handleCreateBill = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (newBill.gstin && !validateGSTIN(newBill.gstin)) {
        toast({
          title: 'Invalid GSTIN',
          description: 'Please enter a valid Karnataka GSTIN number',
          variant: 'destructive',
        });
        return;
      }

      const billNumber = generateBillNumber();

      const { data, error } = await supabase
        .from('bills')
        .insert([
          {
            ...newBill,
            bill_number: billNumber,
            user_id: user.id,
            payment_status: 'pending',
            bill_date: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Bill created successfully',
      });

      setIsCreatingBill(false);
      setNewBill({
        customer_name: '',
        gstin: '',
        notes: '',
      });
      await fetchBills();
      setSelectedBill(data.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create bill',
        variant: 'destructive',
      });
    }
  };

  const handleAddBillItem = async () => {
    try {
      if (!selectedBill) return;

      const selectedItem = items.find(item => item.id === newBillItem.item_id);
      if (!selectedItem) return;

      const { error } = await supabase
        .from('bill_items')
        .insert([
          {
            bill_id: selectedBill,
            ...newBillItem,
            unit_price: selectedItem.unit_price,
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Item added to bill',
      });

      setNewBillItem({
        item_id: '',
        quantity: 1,
      });
      await fetchBillItems(selectedBill);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to add item to bill',
        variant: 'destructive',
      });
    }
  };

  const handlePrint = useCallback((bill: Bill) => {
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <style>
        @media print {
          .bill-header { margin-bottom: 20px; }
          .bill-details { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; text-align: right; margin-top: 20px; }
          .gst-details { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
        }
      </style>
      <div class="bill-header">
        <h1>Tax Invoice</h1>
        <p>Bill Number: ${bill.bill_number}</p>
        <p>Date: ${new Date(bill.bill_date).toLocaleDateString()}</p>
      </div>
      <div class="bill-details">
        <h2>Customer Details</h2>
        <p>Name: ${bill.customer_name}</p>
        <p>GSTIN: ${bill.gstin || 'Not Provided'}</p>
        <p>Place of Supply: Karnataka</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Taxable Amount</th>
            <th>CGST (9%)</th>
            <th>SGST (9%)</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${billItems.map(item => `
            <tr>
              <td>${item.inventory_items.name}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.unit_price)}</td>
              <td>${formatCurrency(item.taxable_amount)}</td>
              <td>${formatCurrency(item.cgst_amount)}</td>
              <td>${formatCurrency(item.sgst_amount)}</td>
              <td>${formatCurrency(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="gst-details">
        <p>Taxable Amount: ${formatCurrency(bill.total_amount)}</p>
        <p>CGST (9%): ${formatCurrency(bill.cgst_amount)}</p>
        <p>SGST (9%): ${formatCurrency(bill.sgst_amount)}</p>
        <p class="total">Total Amount: ${formatCurrency(bill.total_with_gst)}</p>
      </div>
      ${bill.notes ? `<div class="notes"><p>Notes: ${bill.notes}</p></div>` : ''}
      <div style="margin-top: 40px; text-align: right;">
        <p>Authorized Signatory</p>
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
  }, [billItems]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Billing</h1>
        <Dialog open={isCreatingBill} onOpenChange={setIsCreatingBill}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Bill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bill</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name</label>
                <Input
                  value={newBill.customer_name}
                  onChange={(e) =>
                    setNewBill({ ...newBill, customer_name: e.target.value })
                  }
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">GSTIN (Optional)</label>
                <Input
                  value={newBill.gstin}
                  onChange={(e) =>
                    setNewBill({ ...newBill, gstin: e.target.value })
                  }
                  placeholder="Customer GSTIN"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Input
                  value={newBill.notes}
                  onChange={(e) =>
                    setNewBill({ ...newBill, notes: e.target.value })
                  }
                  placeholder="Add notes"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateBill}
                disabled={!newBill.customer_name}
              >
                Create Bill
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedBill && (
        <div className="space-y-4 border rounded-lg p-4">
          <h2 className="text-xl font-semibold">Add Items to Bill</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select
                value={newBillItem.item_id}
                onValueChange={(value) =>
                  setNewBillItem({ ...newBillItem, item_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - {formatCurrency(item.unit_price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Input
                type="number"
                min="1"
                value={newBillItem.quantity}
                onChange={(e) =>
                  setNewBillItem({
                    ...newBillItem,
                    quantity: Number(e.target.value),
                  })
                }
                placeholder="Quantity"
              />
            </div>
            <Button
              onClick={handleAddBillItem}
              disabled={!newBillItem.item_id || newBillItem.quantity < 1}
            >
              Add Item
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Taxable Amount</TableHead>
                <TableHead>CGST (9%)</TableHead>
                <TableHead>SGST (9%)</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.inventory_items.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell>{formatCurrency(item.taxable_amount)}</TableCell>
                  <TableCell>{formatCurrency(item.cgst_amount)}</TableCell>
                  <TableCell>{formatCurrency(item.sgst_amount)}</TableCell>
                  <TableCell>{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bill Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Taxable Amount</TableHead>
              <TableHead>GST</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell>{bill.bill_number}</TableCell>
                <TableCell>{bill.customer_name}</TableCell>
                <TableCell>
                  {new Date(bill.bill_date).toLocaleDateString()}
                </TableCell>
                <TableCell>{formatCurrency(bill.total_amount)}</TableCell>
                <TableCell>{formatCurrency(bill.cgst_amount + bill.sgst_amount)}</TableCell>
                <TableCell>{formatCurrency(bill.total_with_gst)}</TableCell>
                <TableCell className="capitalize">{bill.payment_status}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBill(bill.id);
                        fetchBillItems(bill.id);
                      }}
                    >
                      <Receipt className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(bill)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

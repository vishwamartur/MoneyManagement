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
import { Plus, Printer, AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  category: string;
  reorder_point: number;
  created_at: string;
  updated_at: string;
}

export default function Inventory() {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingMovement, setIsAddingMovement] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [movementQuantity, setMovementQuantity] = useState<number>(0);
  const [movementNotes, setMovementNotes] = useState<string>('');
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    quantity: 0,
    unit_price: 0,
    category: '',
    reorder_point: 0,
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch inventory items',
        variant: 'destructive',
      });
      return;
    }

    setItems(data);
  };

  const handleAddItem = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('inventory_items')
      .insert([
        {
          ...newItem,
          user_id: user.id,
        },
      ]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add inventory item',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Inventory item added successfully',
    });

    setIsAddingItem(false);
    setNewItem({
      name: '',
      description: '',
      quantity: 0,
      unit_price: 0,
      category: '',
      reorder_point: 0,
    });
    fetchInventory();
  };

  const handleAddMovement = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('inventory_transactions')
      .insert([
        {
          item_id: selectedItem,
          user_id: user.id,
          type: movementType,
          quantity: movementQuantity,
          notes: movementNotes,
        },
      ]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to record inventory movement',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Inventory movement recorded successfully',
    });

    setIsAddingMovement(false);
    setSelectedItem('');
    setMovementType('in');
    setMovementQuantity(0);
    setMovementNotes('');
    fetchInventory();
  };

  const handlePrint = () => {
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <style>
        @media print {
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f3f4f6; }
          .low-stock { color: #ef4444; }
          .currency { font-family: monospace; }
        }
      </style>
      <h1 style="margin-bottom: 20px;">Inventory Report</h1>
      <p style="margin-bottom: 20px;">Generated on ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.category}</td>
              <td>${item.quantity}</td>
              <td class="currency">${formatCurrency(item.unit_price)}</td>
              <td class="currency">${formatCurrency(item.quantity * item.unit_price)}</td>
              <td class="${item.quantity <= item.reorder_point ? 'low-stock' : ''}">
                ${item.quantity <= item.reorder_point ? 'Low Stock' : 'In Stock'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px;">
        <h2>Inventory Summary</h2>
        <p>Total Items: ${items.length}</p>
        <p>Total Value: ${formatCurrency(items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}</p>
        <p>Low Stock Items: ${items.filter(item => item.quantity <= item.reorder_point).length}</p>
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
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Dialog open={isAddingMovement} onOpenChange={setIsAddingMovement}>
            <DialogTrigger asChild>
              <Button variant="outline">
                {movementType === 'in' ? (
                  <ArrowDownLeft className="mr-2 h-4 w-4" />
                ) : (
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                )}
                Stock Movement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Stock Movement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Movement Type</label>
                  <Select
                    value={movementType}
                    onValueChange={(value: 'in' | 'out') => setMovementType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Stock In</SelectItem>
                      <SelectItem value="out">Stock Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Item</label>
                  <Select
                    value={selectedItem}
                    onValueChange={setSelectedItem}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={movementQuantity}
                    onChange={(e) => setMovementQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Input
                    value={movementNotes}
                    onChange={(e) => setMovementNotes(e.target.value)}
                    placeholder="Add notes about this movement"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddMovement}
                  disabled={!selectedItem || movementQuantity <= 0}
                >
                  Record Movement
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={newItem.name}
                    onChange={(e) =>
                      setNewItem({ ...newItem, name: e.target.value })
                    }
                    placeholder="Item name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={newItem.description}
                    onChange={(e) =>
                      setNewItem({ ...newItem, description: e.target.value })
                    }
                    placeholder="Item description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) =>
                        setNewItem({ ...newItem, quantity: Number(e.target.value) })
                      }
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newItem.unit_price}
                      onChange={(e) =>
                        setNewItem({ ...newItem, unit_price: Number(e.target.value) })
                      }
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    value={newItem.category}
                    onChange={(e) =>
                      setNewItem({ ...newItem, category: e.target.value })
                    }
                    placeholder="Item category"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reorder Point</label>
                  <Input
                    type="number"
                    value={newItem.reorder_point}
                    onChange={(e) =>
                      setNewItem({ ...newItem, reorder_point: Number(e.target.value) })
                    }
                    min="0"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddItem}
                >
                  Add Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                <TableCell>{formatCurrency(item.quantity * item.unit_price)}</TableCell>
                <TableCell>
                  {item.quantity <= item.reorder_point ? (
                    <div className="flex items-center text-red-500">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Low Stock
                    </div>
                  ) : (
                    <span className="text-green-500">In Stock</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Download, Filter } from 'lucide-react';

interface Log {
  id: string;
  table_name: string;
  action: string;
  old_data: any;
  new_data: any;
  created_at: string;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  metadata: any;
  created_at: string;
}

export default function Logs() {
  const { toast } = useToast();
  const [auditLogs, setAuditLogs] = useState<Log[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState({
    type: 'all',
    table: 'all',
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch audit logs
    const { data: auditData, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (auditError) {
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs',
        variant: 'destructive',
      });
      return;
    }

    setAuditLogs(auditData);

    // Fetch activity logs
    const { data: activityData, error: activityError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (activityError) {
      toast({
        title: 'Error',
        description: 'Failed to fetch activity logs',
        variant: 'destructive',
      });
      return;
    }

    setActivityLogs(activityData);
  };

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Table', 'Action', 'Details'].join(','),
      ...auditLogs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.table_name,
        log.action,
        JSON.stringify({ old: log.old_data, new: log.new_data }),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (filter.table !== 'all' && log.table_name !== filter.table) {
      return false;
    }
    if (filter.type !== 'all' && log.action !== filter.type) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">System Logs</h1>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
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
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="INSERT">Insert</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filter.table}
            onValueChange={(value) =>
              setFilter({ ...filter, table: value })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              <SelectItem value="inventory_items">Inventory</SelectItem>
              <SelectItem value="transactions">Transactions</SelectItem>
              <SelectItem value="bills">Bills</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAuditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="capitalize">
                    {log.table_name.replace('_', ' ')}
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {log.action === 'UPDATE' ? (
                      <span>
                        Changed from {JSON.stringify(log.old_data)} to{' '}
                        {JSON.stringify(log.new_data)}
                      </span>
                    ) : log.action === 'INSERT' ? (
                      <span>Created: {JSON.stringify(log.new_data)}</span>
                    ) : (
                      <span>Deleted: {JSON.stringify(log.old_data)}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="capitalize">
                    {log.activity_type.replace('_', ' ')}
                  </TableCell>
                  <TableCell>{log.description}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {JSON.stringify(log.metadata)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
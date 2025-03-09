'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Settings,
  LogOut,
  Package,
  FileText,
  History,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
      }
    };

    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r">
          <div className="h-full flex flex-col">
            <div className="p-6">
              <h2 className="text-lg font-semibold">Money Management</h2>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/transactions">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Transactions
                </Button>
              </Link>
              <Link href="/dashboard/inventory">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Inventory
                </Button>
              </Link>
              <Link href="/dashboard/billing">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Billing
                </Button>
              </Link>
              <Link href="/dashboard/reports">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <PieChart className="mr-2 h-4 w-4" />
                  Reports
                </Button>
              </Link>
              <Link href="/dashboard/logs">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <History className="mr-2 h-4 w-4" />
                  System Logs
                </Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </nav>
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
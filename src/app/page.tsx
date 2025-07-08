'use client';
import { useState } from 'react';
import { User, Gauge, Droplets } from 'lucide-react';
import CustomerDashboard from '@/components/customer-dashboard';
import AdminDashboard from '@/components/admin-dashboard';
import { cn } from '@/lib/utils';

export default function Home() {
  const [view, setView] = useState('customer');

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-20 bg-gray-800 text-white flex flex-col items-center py-6 space-y-6 flex-shrink-0">
        <div className="text-2xl font-bold text-blue-400">
          <Droplets size={32} />
        </div>
        <nav className="flex flex-col items-center space-y-4">
          <button
            onClick={() => setView('customer')}
            className={cn(
              "p-4 rounded-lg transition-colors",
              view === 'customer' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
            )}
            title="Customer View"
            aria-pressed={view === 'customer'}
          >
            <User />
          </button>
          <button
            onClick={() => setView('admin')}
            className={cn(
              "p-4 rounded-lg transition-colors",
              view === 'admin' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'
            )}
            title="Admin View"
            aria-pressed={view === 'admin'}
          >
            <Gauge />
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {view === 'customer' ? <CustomerDashboard /> : <AdminDashboard />}
      </main>
    </div>
  );
}

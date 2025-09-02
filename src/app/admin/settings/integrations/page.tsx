"use client";

import { AppLayout } from '@/components/AppLayout';
import { RequireRole } from '@/components/RequireRole';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [usageSyncing, setUsageSyncing] = useState(false);
  const [lastUsage, setLastUsage] = useState<string | null>(null);

  async function triggerUsage(mock = true) {
    setUsageSyncing(true);
    try {
      const resp = await fetch(`/api/integrations/irrigation/usage?mock=${mock}`, { method: 'POST' });
      if (!resp.ok) throw new Error(await resp.text());
      setLastUsage(new Date().toLocaleString());
      toast({ title: `Usage sync complete` });
    } catch (e: any) {
      toast({ title: `Usage sync failed`, description: e.message, variant: 'destructive' });
    } finally {
      setUsageSyncing(false);
    }
  }

  return (
    <AppLayout>
      <RequireRole allowed={["admin", "manager", "super_admin", "super"]}>
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Integrations</h2>
        <Card>
          <CardHeader>
            <CardTitle>Irrigation Platform</CardTitle>
            <CardDescription>Manual usage ingestion from irrigation software (24h window). Daily automation coming soon.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Button disabled={usageSyncing} onClick={() => triggerUsage(true)}>
                {usageSyncing ? 'Syncing Usage...' : 'Sync Usage (Mock)'}
              </Button>
              <Button variant="secondary" disabled={usageSyncing} onClick={() => triggerUsage(false)}>
                {usageSyncing ? 'Syncing...' : 'Sync Usage (Live)'}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Status: {process.env.IRRIGATION_API_KEY ? 'Configured ✅' : 'Not Configured ⚠️'}</div>
              <div>Last Usage Sync: {lastUsage || '—'}</div>
            </div>
          </CardContent>
        </Card>
  </div>
  </RequireRole>
    </AppLayout>
  );
}

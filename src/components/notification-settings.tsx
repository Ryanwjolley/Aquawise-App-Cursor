
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Trash2, PlusCircle, Edit, WandSparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getNotificationRules, addNotificationRule, updateNotificationRule, deleteNotificationRule, NotificationRule, NotificationRuleData } from '@/firestoreService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';
import { generateNotificationMessage } from '@/ai/flows/generate-notification-message';

export function NotificationSettings() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<NotificationRule | null>(null);
  
  const [type, setType] = useState<'usage' | 'allocation'>('usage');
  const [threshold, setThreshold] = useState<number>(75);
  const [message, setMessage] = useState('');

  const { toast } = useToast();

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedRules = await getNotificationRules();
      setRules(fetchedRules);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to fetch rules', description: 'Could not load notification rules.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    if (isFormOpen && editingRule) {
      setType(editingRule.type);
      setThreshold(editingRule.threshold ?? 75);
      setMessage(editingRule.message);
    } else {
      setType('usage');
      setThreshold(75);
      setMessage('');
    }
  }, [isFormOpen, editingRule]);

  const handleGenerateMessage = async () => {
    setIsGenerating(true);
    try {
        const generatedMessage = await generateNotificationMessage({
            type,
            threshold: type === 'usage' ? threshold : undefined,
        });
        setMessage(generatedMessage);
    } catch (error) {
        toast({ variant: 'destructive', title: 'AI Assistant Error', description: 'Could not generate a message.'});
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSaveRule = async () => {
    if (type === 'usage' && (threshold <= 0 || threshold > 100)) {
        toast({ variant: 'destructive', title: 'Invalid Threshold', description: 'Usage threshold must be between 1 and 100.' });
        return;
    }
    if (!message.trim()) {
        toast({ variant: 'destructive', title: 'Message Required', description: 'The notification message cannot be empty.' });
        return;
    }

    const ruleData: Partial<NotificationRuleData> = {
      type,
      threshold: type === 'usage' ? threshold : null,
      message,
    };

    try {
      if (editingRule) {
        await updateNotificationRule(editingRule.id, ruleData);
        toast({ title: 'Rule Updated', description: 'The notification rule has been updated.' });
      } else {
        const newRule: NotificationRuleData = {
          ...ruleData,
          enabled: true,
          createdAt: new Date(),
        } as NotificationRuleData;
        await addNotificationRule(newRule);
        toast({ title: 'Rule Created', description: 'The new notification rule has been added.' });
      }
      fetchRules();
      setIsFormOpen(false);
      setEditingRule(null);
    } catch (error) {
        const action = editingRule ? 'Update' : 'Save';
        toast({ variant: 'destructive', title: `${action} Failed`, description: `Could not ${action.toLowerCase()} the rule.` });
    }
  };

  const handleToggleRule = async (rule: NotificationRule) => {
    try {
      await updateNotificationRule(rule.id, { enabled: !rule.enabled });
      toast({ title: 'Rule Updated', description: `Rule has been ${!rule.enabled ? 'enabled' : 'disabled'}.` });
      fetchRules();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the rule status.' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;
    try {
        await deleteNotificationRule(ruleToDelete.id);
        toast({ title: 'Rule Deleted', description: 'The notification rule has been removed.' });
        fetchRules();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the rule.' });
    } finally {
        setRuleToDelete(null);
    }
  };
  
  const handleOpenDialog = (rule: NotificationRule | null) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  }

  return (
    <div className="space-y-6">
        <Card className="rounded-xl shadow-md">
            <CardHeader className='flex-row items-center justify-between'>
                <div>
                    <CardTitle className="text-xl">Notification Rules</CardTitle>
                    <CardDescription>
                        Set up automated notifications for customers.
                    </CardDescription>
                </div>
                 <Button onClick={() => handleOpenDialog(null)}><PlusCircle className='mr-2 h-4 w-4' /> New Rule</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className='text-right'>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={`skel-${i}`}>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                                    <TableCell className='text-right'><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : rules.map((rule) => (
                            <TableRow key={rule.id}>
                                <TableCell className='font-medium capitalize'>
                                    {rule.type === 'usage' ? 'Usage Threshold' : 'Allocation Changed'}
                                </TableCell>
                                <TableCell>
                                    {rule.type === 'usage' ? `Triggers at ${rule.threshold}%` : 'Triggers on change'}
                                </TableCell>
                                <TableCell className='text-muted-foreground max-w-sm truncate'>
                                    {rule.message}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={rule.enabled}
                                        onCheckedChange={() => handleToggleRule(rule)}
                                    />
                                </TableCell>
                                <TableCell className='text-right'>
                                    <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setRuleToDelete(rule)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 { !loading && rules.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No notification rules created yet.</p>
                        <p className="text-sm">Click "New Rule" to get started.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) {
                setEditingRule(null);
            }
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingRule ? 'Edit Notification Rule' : 'Create New Notification Rule'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className='space-y-2'>
                        <Label htmlFor="type">Notification Type</Label>
                        <Select onValueChange={(v) => setType(v as 'usage' | 'allocation')} value={type}>
                            <SelectTrigger id='type'>
                                <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="usage">Usage Threshold</SelectItem>
                                <SelectItem value="allocation">Allocation Changed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {type === 'usage' && (
                        <div className='space-y-2'>
                            <Label htmlFor="threshold">Usage Threshold (%)</Label>
                            <Input
                                id="threshold"
                                type="number"
                                value={threshold}
                                onChange={(e) => setThreshold(Number(e.target.value))}
                                placeholder="e.g. 75"
                            />
                        </div>
                    )}
                    <div className='space-y-2'>
                        <div className="flex justify-between items-center">
                            <Label htmlFor="message">Message</Label>
                            <Button variant="ghost" size="sm" onClick={handleGenerateMessage} disabled={isGenerating}>
                                <WandSparkles className="mr-2 h-4 w-4" />
                                {isGenerating ? 'Generating...' : 'AI Assistant'}
                            </Button>
                        </div>
                        {isGenerating ? (
                            <Skeleton className="h-[100px] w-full" />
                        ) : (
                            <Textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="e.g. Heads up! You have used {usage_percent}% of your water allocation."
                                rows={4}
                            />
                        )}
                        <p className='text-xs text-muted-foreground'>
                            Use placeholders like `{'{{usage_percent}}'}`, `{'{{user_name}}'}`, `{'{{start_date}}'}`, or `{'{{end_date}}'}`.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveRule}>{editingRule ? 'Save Changes' : 'Create Rule'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!ruleToDelete} onOpenChange={(isOpen) => !isOpen && setRuleToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this notification rule.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

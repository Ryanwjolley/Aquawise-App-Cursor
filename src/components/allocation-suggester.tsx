'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { suggestAllocationChanges, SuggestAllocationChangesInput } from '@/ai/flows/suggest-allocation-changes';
import { Wand2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

type AllocationSuggesterProps = SuggestAllocationChangesInput & {
    onSuggestionAccept: (suggestion: number) => void;
};

export function AllocationSuggester(props: AllocationSuggesterProps) {
    const [suggestion, setSuggestion] = useState<number | null>(null);
    const [justification, setJustification] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const getSuggestion = async () => {
        setLoading(true);
        setError(null);
        setSuggestion(null);
        setJustification(null);

        try {
            const result = await suggestAllocationChanges({
                totalUsers: props.totalUsers,
                totalWeeklyAllocation: props.totalWeeklyAllocation,
                totalWaterConsumed: props.totalWaterConsumed,
                averageUsagePerUser: props.averageUsagePerUser,
                conservationGoal: 'Reduce consumption by 10%',
                currentGallonsPerShare: props.currentGallonsPerShare,
            });
            setSuggestion(result.suggestedGallonsPerShare);
            setJustification(result.justification);
        } catch (e) {
            setError('Failed to get AI suggestion.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" onClick={getSuggestion}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    AI Suggestion
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>AI Allocation Suggestion</DialogTitle>
                    <DialogDescription>
                        Based on current data and conservation goals, here's a suggested update.
                    </DialogDescription>
                </DialogHeader>
                {loading && (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                )}
                {error && <p className="text-destructive py-4">{error}</p>}
                {!loading && !error && suggestion !== null && (
                    <div className="my-4 p-4 bg-muted/50 rounded-lg border">
                        <p className="text-sm text-muted-foreground">Suggested Gallons per Share:</p>
                        <p className="text-4xl font-bold text-primary">{suggestion.toLocaleString()}</p>
                        <p className="mt-4 text-sm text-muted-foreground">Justification:</p>
                        <p className="text-sm">{justification}</p>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button
                        onClick={() => {
                            if (suggestion !== null) {
                                props.onSuggestionAccept(suggestion);
                                setIsOpen(false);
                            }
                        }}
                        disabled={loading || !suggestion}
                    >
                        Accept Suggestion
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

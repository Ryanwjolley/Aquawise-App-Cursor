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
import { predictAllocationChanges, PredictAllocationChangesInput } from '@/ai/flows/predict-allocations';
import { Bot } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

type AllocationPredictorProps = PredictAllocationChangesInput & {
    onPredictionAccept: (prediction: number) => void;
};

export function AllocationPredictor(props: AllocationPredictorProps) {
    const [prediction, setPrediction] = useState<number | null>(null);
    const [justification, setJustification] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const getPrediction = async () => {
        if (props.usageDataForPeriod.length === 0 || props.periodDurationInDays === 0) {
            setError('Not enough data for a prediction. Select a valid date range with usage data.');
            return;
        }

        setLoading(true);
        setError(null);
        setPrediction(null);
        setJustification(null);

        try {
            const result = await predictAllocationChanges({
                usageDataForPeriod: props.usageDataForPeriod,
                periodDurationInDays: props.periodDurationInDays,
                currentGallonsPerShare: props.currentGallonsPerShare,
            });
            setPrediction(result.predictedGallonsPerShare);
            setJustification(result.justification);
        } catch (e) {
            setError('Failed to get AI prediction.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" onClick={getPrediction}>
                    <Bot className="mr-2 h-4 w-4" />
                    Predict Allocations
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>AI Allocation Prediction</DialogTitle>
                    <DialogDescription>
                        Based on usage from the selected period, here's a predicted allocation for the next period.
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
                {!loading && !error && prediction !== null && (
                    <div className="my-4 p-4 bg-muted/50 rounded-lg border">
                        <p className="text-sm text-muted-foreground">Predicted Gallons per Share:</p>
                        <p className="text-4xl font-bold text-primary">{prediction.toLocaleString()}</p>
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
                            if (prediction !== null) {
                                props.onPredictionAccept(prediction);
                                setIsOpen(false);
                            }
                        }}
                        disabled={loading || !prediction}
                    >
                        Accept Prediction
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

'use client'

import { useState, useEffect } from 'react';
import { generateConservationTips } from '@/ai/flows/generate-conservation-tips';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ConservationTipsProps = {
    weeklyAllocation: number;
    waterUsed: number;
};

export default function ConservationTips({ weeklyAllocation, waterUsed }: ConservationTipsProps) {
    const [tips, setTips] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchTips() {
            if (weeklyAllocation <= 0) return;
            try {
                setLoading(true);
                setError(null);
                const usagePercentage = (waterUsed / weeklyAllocation) * 100;
                const result = await generateConservationTips({
                    weeklyAllocation,
                    waterUsed,
                    usagePercentage,
                });
                setTips(result.tips);
            } catch (e) {
                setError('Could not load conservation tips.');
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchTips();
    }, [weeklyAllocation, waterUsed]);

    const usagePercentage = weeklyAllocation > 0 ? Math.round((waterUsed / weeklyAllocation) * 100) : 0;
    
    let alertClasses = "bg-blue-100 border-l-4 border-blue-500 text-blue-800 [&>svg]:text-blue-500";
    let alertTitle = "On Track";
    let alertIcon = <Info className="h-4 w-4" />;
    
    if (usagePercentage > 100) {
        alertClasses = "bg-red-100 border-l-4 border-red-500 text-red-800 [&>svg]:text-red-500";
        alertTitle = 'Over Limit';
        alertIcon = <AlertTriangle className="h-4 w-4" />;
    } else if (usagePercentage > 70) {
        alertClasses = "bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 [&>svg]:text-yellow-500";
        alertTitle = 'Approaching Limit';
        alertIcon = <AlertTriangle className="h-4 w-4" />;
    }

    return (
        <Card className="rounded-xl shadow-md">
            <CardHeader>
                <CardTitle className="text-xl">Smart Alerts & Tips</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert className={alertClasses}>
                    {alertIcon}
                    <AlertTitle className="font-bold">{alertTitle}</AlertTitle>
                    <AlertDescription>
                        You have used {usagePercentage}% of your weekly water.
                    </AlertDescription>
                </Alert>
                
                <div className="mt-4 space-y-2">
                    <h3 className="font-semibold text-foreground/80">AI Conservation Tips:</h3>
                    {loading && (
                        <div className="space-y-2 pt-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    )}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {!loading && !error && tips.length > 0 && (
                        <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
                            {tips.map((tip, index) => <li key={index}>{tip}</li>)}
                        </ul>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

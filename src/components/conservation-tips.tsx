'use client'

import { useState } from 'react';
import { generateConservationTips } from '@/ai/flows/generate-conservation-tips';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Info, Wand2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from './ui/button';

type ConservationTipsProps = {
    weeklyAllocation: number;
    waterUsed: number;
};

export default function ConservationTips({ weeklyAllocation, waterUsed }: ConservationTipsProps) {
    const [tips, setTips] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchTips() {
        if (weeklyAllocation <= 0) {
            setError('Set a weekly allocation to get tips.');
            return;
        }
        try {
            setLoading(true);
            setError(null);
            setTips([]);
            const usagePercentage = (waterUsed / weeklyAllocation) * 100;
            const result = await generateConservationTips({
                weeklyAllocation,
                waterUsed,
                usagePercentage,
            });
            setTips(result.tips);
        } catch (e) {
            setError('Could not load conservation tips. You may have exceeded your API quota.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

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
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-foreground/80">AI Conservation Tips:</h3>
                      <Button variant="outline" size="sm" onClick={fetchTips} disabled={loading}>
                          <Wand2 className="mr-2 h-4 w-4" />
                          {loading ? 'Generating...' : 'Get Tips'}
                      </Button>
                    </div>

                    {loading && (
                        <div className="space-y-2 pt-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    )}
                    {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                    {!loading && !error && tips.length > 0 && (
                        <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground pt-2">
                            {tips.map((tip, index) => <li key={index}>{tip}</li>)}
                        </ul>
                    )}
                     {!loading && !error && tips.length === 0 && (
                         <p className="text-sm text-muted-foreground mt-2">Click "Get Tips" for personalized advice based on your usage.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

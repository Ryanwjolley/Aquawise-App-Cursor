
"use client";

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Bot, User, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { analyzeUsage } from "@/ai/flows/analyzeUsageFlow";

export default function AnalysisPage() {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [analysisResult, setAnalysisResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!query || !currentUser?.companyId) return;

    setIsLoading(true);
    setAnalysisResult("");
    try {
      const result = await analyzeUsage({
        companyId: currentUser.companyId,
        query: query,
      });
      setAnalysisResult(result.analysis);
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisResult("An error occurred while analyzing the data. Please check the console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Usage Analysis</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Ask about your team's water usage</CardTitle>
            <CardDescription>
              Use natural language to query usage and allocation data for your company. 
              The AI has access to all user information, usage entries, and allocation periods.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
                <Textarea
                    placeholder="e.g., 'Who used the most water last week?' or 'Compare July usage between Alice and Bob.'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="min-h-[100px]"
                />
                <Button onClick={handleAnalyze} disabled={isLoading || !query}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                    Analyze
                </Button>
            </div>
            {analysisResult && (
                 <div className="prose prose-sm max-w-full rounded-lg border bg-muted/30 p-4">
                    <pre className="whitespace-pre-wrap font-sans text-sm">{analysisResult}</pre>
                 </div>
            )}
             {isLoading && !analysisResult && (
                <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-4 min-h-[120px]">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

    
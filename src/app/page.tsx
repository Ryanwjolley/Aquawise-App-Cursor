
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to the AquaWise Rebuild</CardTitle>
          <CardDescription>
            We have successfully reset the project. We will now rebuild the application step-by-step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>The next step is to apply the global styling and theme for the application.</p>
        </CardContent>
      </Card>
    </div>
  );
}

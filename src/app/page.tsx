import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">AquaWise Rebuild</CardTitle>
          <CardDescription>
            The global styles and fonts have been applied.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>The next step is to create our mock data service to simulate a database.</p>
        </CardContent>
      </Card>
    </div>
  );
}

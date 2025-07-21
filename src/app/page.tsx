import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">AquaWise Rebuild</CardTitle>
          <CardDescription>
            The global styles and mock data service have been created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>The next step is to create our application context providers.</p>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function HomePage() {
  const { currentUser } = useAuth();

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">AquaWise Rebuild</CardTitle>
          <CardDescription>
            The application contexts have been created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            The next step is to build the application layout and sidebar.
          </p>
          {currentUser ? (
            <p className="mt-4 text-sm text-primary">
              Logged in as: <strong>{currentUser.name}</strong>
            </p>
          ) : (
            <p>Loading user...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

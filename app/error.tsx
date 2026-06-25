"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service (e.g., Sentry)
    console.error("Global error caught:", error);

    // In production, send to Sentry or similar service
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Example: Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full bg-card border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-card-foreground">
            Something went wrong!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              An unexpected error occurred. Our team has been notified.
            </p>
            {process.env.NODE_ENV === "development" && (
              <p className="text-xs text-destructive font-mono bg-destructive/10 p-2 rounded">
                {error.message}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={reset}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            >
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
            >
              Go Home
            </Button>
          </div>

          {error.digest && (
            <p className="text-xs text-center text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-12 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <AlertTriangle aria-hidden="true" className="size-8 text-destructive" />
          <CardTitle className="font-serif text-3xl">
            The media quest hit a snag
          </CardTitle>
          <CardDescription>
            Your assets are still in Cloudinary. Retry the server-rendered
            portfolio readback.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>Portfolio could not render</AlertTitle>
            <AlertDescription>
              Check the server terminal for the detailed error. No credentials
              are shown here.
            </AlertDescription>
          </Alert>
          <Button onClick={reset} className="w-fit">
            <RefreshCw data-icon="inline-start" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


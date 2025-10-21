
"use client";

import React, { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ReportsPage() {
  const { isAdmin, loading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, userLoading, router]);

  if (userLoading || !isAdmin) {
    return (
        <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reports</CardTitle>
        <CardDescription>System-wide reports will be displayed here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This page is under construction. Please check back later.</p>
      </CardContent>
    </Card>
  );
}

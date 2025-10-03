
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { collection, getDocs, query, where, or } from "firebase/firestore";
import { db } from "@/lib/firebase/client-config";
import { Dispute } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

const getStatusVariant = (status: Dispute['status']) => {
  switch (status) {
    case 'Open':
      return 'destructive';
    case 'Under Review':
      return 'warning';
    case 'Resolved':
      return 'success';
    default:
      return 'default';
  }
};

export default function DisputesPage() {
  const router = useRouter();
  const { user, role, isAdmin } = useUser();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetchDisputes = async () => {
      let disputesQuery;
      if (isAdmin) {
        disputesQuery = query(collection(db, "disputes"));
      } else {
        disputesQuery = query(
          collection(db, "disputes"), 
          or(
            where("requesterId", "==", user.id),
            where("parties.jobGiverId", "==", user.id),
            where("parties.installerId", "==", user.id)
          )
        );
      }

      if (disputesQuery) {
        const querySnapshot = await getDocs(disputesQuery);
        const fetchedDisputes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: toDate(doc.data().createdAt),
          resolvedAt: doc.data().resolvedAt ? toDate(doc.data().resolvedAt) : undefined,
        } as Dispute));
        setDisputes(fetchedDisputes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      }
      setLoading(false);
    };

    fetchDisputes();
  }, [user, role, isAdmin]);

  if (!user) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Dispute Center</CardTitle>
            <CardDescription>
            {isAdmin ? "Review and manage all disputes on the platform." : "A list of all disputes you are involved in."}
            </CardDescription>
        </div>
        {!isAdmin && (
            <Button asChild>
                <Link href="/dashboard/disputes/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Ticket
                </Link>
            </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket #</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Raised On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading disputes...
                </TableCell>
              </TableRow>
            ) : disputes.length > 0 ? (
              disputes.map((dispute) => (
                <TableRow key={dispute.id} onClick={() => router.push(`/dashboard/disputes/${dispute.id}`)} className="cursor-pointer">
                  <TableCell className="font-mono">#{dispute.id.slice(-6).toUpperCase()}</TableCell>
                  <TableCell className="font-medium">{dispute.title}</TableCell>
                  <TableCell>{dispute.category}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(dispute.status)}>
                      {dispute.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(dispute.createdAt, "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No disputes found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

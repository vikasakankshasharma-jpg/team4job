
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
import { useUser, useFirebase } from "@/hooks/use-user";
import { Dispute } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";

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
  const { user, isAdmin } = useUser();
  const { db } = useFirebase();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    async function fetchDisputes() {
        setLoading(true);
        const disputesRef = collection(db, "disputes");
        let allDisputes: Dispute[] = [];

        if (isAdmin) {
            const q = query(disputesRef);
            const querySnapshot = await getDocs(q);
            allDisputes = querySnapshot.docs.map(doc => doc.data() as Dispute);
        } else {
            // Perform three separate queries and merge the results
            const q1 = query(disputesRef, where('requesterId', '==', user.id));
            const q2 = query(disputesRef, where('parties.jobGiverId', '==', user.id));
            const q3 = query(disputesRef, where('parties.installerId', '==', user.id));

            const [snap1, snap2, snap3] = await Promise.all([
                getDocs(q1),
                getDocs(q2),
                getDocs(q3)
            ]);

            const disputesMap = new Map<string, Dispute>();
            snap1.forEach(doc => disputesMap.set(doc.id, doc.data() as Dispute));
            snap2.forEach(doc => disputesMap.set(doc.id, doc.data() as Dispute));
            snap3.forEach(doc => disputesMap.set(doc.id, doc.data() as Dispute));
            allDisputes = Array.from(disputesMap.values());
        }

        allDisputes.sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
        setDisputes(allDisputes);
        setLoading(false);
    }
    fetchDisputes();
  }, [user, isAdmin, db]);

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
                  <TableCell>{format(toDate(dispute.createdAt), "MMM d, yyyy")}</TableCell>
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

    
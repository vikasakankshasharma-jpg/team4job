
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirebase } from "@/hooks/use-user";
import { BlacklistEntry } from "@/lib/types";
import { toDate } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

const blacklistSchema = z.object({
  type: z.enum(["user", "pincode"]),
  value: z.string().min(1, "Value is required."),
  role: z.enum(["Any", "Installer", "Job Giver"]),
  reason: z.string().min(10, "Reason must be at least 10 characters long."),
});

function AddBlacklistForm({ onSave }: { onSave: () => void }) {
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof blacklistSchema>>({
    resolver: zodResolver(blacklistSchema),
    defaultValues: {
      type: "user",
      value: "",
      role: "Any",
      reason: "",
    },
  });

  async function onSubmit(values: z.infer<typeof blacklistSchema>) {
    setIsSubmitting(true);
    const id = `BL-${values.type.toUpperCase()}-${Date.now()}`;
    const newEntry: BlacklistEntry = {
      id,
      ...values,
      createdAt: new Date(),
    };

    try {
      await setDoc(doc(db, "blacklist", id), newEntry);
      toast({
        title: "Entry Added",
        description: `Successfully blacklisted ${values.type}: ${values.value}.`,
      });
      form.reset();
      onSave();
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to add blacklist entry.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add to Blacklist</CardTitle>
        <CardDescription>
          Add a user ID or a pincode to the blacklist to restrict their access
          or visibility.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="pincode">Pincode</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          form.watch("type") === "user"
                            ? "Enter User ID"
                            : "Enter 6-digit Pincode"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicable To Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Any">Any Role</SelectItem>
                        <SelectItem value="Installer">Installer</SelectItem>
                        <SelectItem value="Job Giver">Job Giver</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain why this entry is being added to the blacklist..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Entry
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function BlacklistPage() {
  const { user, isAdmin, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, userLoading, router]);

  const fetchBlacklist = React.useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const q = query(collection(db, "blacklist"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const list = querySnapshot.docs.map(
      (doc) => doc.data() as BlacklistEntry
    );
    setBlacklist(list);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    if (isAdmin) {
      fetchBlacklist();
    }
  }, [isAdmin, fetchBlacklist]);

  const handleRemove = async (id: string, value: string) => {
    if (
      !window.confirm(
        `Are you sure you want to remove "${value}" from the blacklist?`
      )
    )
      return;

    await deleteDoc(doc(db, "blacklist", id));
    toast({
      title: "Entry Removed",
      description: `"${value}" has been removed from the blacklist.`,
    });
    fetchBlacklist();
  };

  if (userLoading || !isAdmin) {
    return (
        <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="grid gap-6">
      <AddBlacklistForm onSave={fetchBlacklist} />
      <Card>
        <CardHeader>
          <CardTitle>Current Blacklist</CardTitle>
          <CardDescription>
            A list of all currently blacklisted users and pincodes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Applied to Role</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : blacklist.length > 0 ? (
                blacklist.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {entry.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{entry.value}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.role}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.reason}
                    </TableCell>
                    <TableCell>
                      {format(toDate(entry.createdAt), "PP")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(entry.id, entry.value)}
                        title="Remove from blacklist"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    The blacklist is currently empty.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

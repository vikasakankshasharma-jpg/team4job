
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, PlusCircle, UserCog, MoreHorizontal, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirebase } from "@/hooks/use-user";
import { User, Role } from "@/lib/types";
import { toDate } from "@/lib/utils";
import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  or
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useHelp } from "@/hooks/use-help";

const teamMemberSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Invalid email address."),
  role: z.enum(["Admin", "Support Team"]),
});

function CreateTeamMemberForm({ onSave }: { onSave: () => void }) {
  const { db } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<z.infer<typeof teamMemberSchema>>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "Support Team",
    },
  });

  async function onSubmit(values: z.infer<typeof teamMemberSchema>) {
    setIsSubmitting(true);
    const tempPassword = Math.random().toString(36).slice(-8);

    try {
        // This is a temporary auth instance for creating users.
        // In a real app, this should be done via a secure backend function.
        const auth = getAuth();
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, tempPassword);
        const firebaseUser = userCredential.user;

        const newUser: Omit<User, 'id'> = {
            name: values.name,
            email: values.email.toLowerCase(),
            mobile: '0000000000', // Placeholder
            roles: [values.role],
            status: 'active',
            memberSince: new Date(),
            avatarUrl: PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)].imageUrl,
            pincodes: { residential: '000000' },
            address: { house: '', street: '', cityPincode: '000000,' },
        };
        
        await setDoc(doc(db, "users", firebaseUser.uid), { ...newUser, id: firebaseUser.uid });

      toast({
        title: "Team Member Account Created",
        description: `An account for ${values.name} has been created. They will need to reset their password.`,
      });
      form.reset();
      onSave();
      setIsOpen(false);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Error Creating Team Member",
        description: e.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Team Member
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4">
        <DropdownMenuLabel className="p-0 mb-2 text-base">Create Team Member Account</DropdownMenuLabel>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., jane.doe@example.com" {...field} />
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
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Support Team">Support Team</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
            </div>
          </form>
        </Form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function TeamManagementPage() {
  const { user, isAdmin, loading: userLoading } = useUser();
  const { db } = useFirebase();
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { setHelp } = useHelp();
  
  React.useEffect(() => {
    setHelp({
        title: "Team Management",
        content: (
            <div className="space-y-4 text-sm">
                <p>This page is where you, as a primary admin, can manage your administrative team.</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><span className="font-semibold">Add Team Member:</span> Click the button to create a new account for a staff member. You can assign them the "Admin" or "Support Team" role.</li>
                    <li><span className="font-semibold">Roles:</span>
                        <ul className="list-disc space-y-1 pl-5 mt-1">
                             <li><span className="font-semibold">Admin:</span> Has full access to all platform features.</li>
                            <li><span className="font-semibold">Support Team:</span> Has limited access, focused primarily on managing disputes.</li>
                        </ul>
                    </li>
                     <li><span className="font-semibold">Manage Accounts:</span> You can remove a team member's account using the actions menu on each row.</li>
                </ul>
            </div>
        )
    })
  }, [setHelp]);

  const fetchTeamMembers = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const q = query(collection(db, "users"), or(
        where("roles", "array-contains", "Admin"),
        where("roles", "array-contains", "Support Team")
    ));
    const querySnapshot = await getDocs(q);
    const list = querySnapshot.docs.map((doc) => doc.data() as User);
    // Exclude the current admin from the list
    setTeamMembers(list.filter(s => s.id !== user?.id));
    setLoading(false);
  }, [db, user?.id]);

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    } else if (user && isAdmin) {
      fetchTeamMembers();
    }
  }, [isAdmin, userLoading, user, router, fetchTeamMembers]);

  const handleRemove = async (teamMember: User) => {
    if (
      !window.confirm(
        `Are you sure you want to remove ${teamMember.name}? This will permanently delete their account.`
      )
    ) return;
    
    // This is a placeholder for a secure backend function to delete a user.
    await deleteDoc(doc(db, "users", teamMember.id));
    
    toast({
      title: "Team Member Removed",
      description: `${teamMember.name} has been removed from the platform.`,
      variant: "destructive"
    });
    fetchTeamMembers();
  };

  if (userLoading || !isAdmin) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><UserCog /> Team Management</CardTitle>
          <CardDescription>
            Create and manage accounts for your administrative and support team.
          </CardDescription>
        </div>
        <CreateTeamMemberForm onSave={fetchTeamMembers} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : teamMembers.length > 0 ? (
              teamMembers.map((teamMember) => (
                <TableRow key={teamMember.id}>
                  <TableCell className="font-medium">{teamMember.name}</TableCell>
                  <TableCell>{teamMember.email}</TableCell>
                  <TableCell>
                     {teamMember.roles.map(r => {
                        if (r === 'Admin' || r === 'Support Team') {
                           return <Badge key={r} variant="secondary">{r}</Badge>
                        }
                        return null;
                     })}
                  </TableCell>
                  <TableCell>{format(toDate(teamMember.memberSince), "PP")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleRemove(teamMember)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Team Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No team members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

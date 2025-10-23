
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
import { PlusCircle, Edit, Trash2, Loader2, MoreHorizontal } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { SubscriptionPlan } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useHelp } from "@/hooks/use-help";
import { Textarea } from "@/components/ui/textarea";

const planSchema = z.object({
  id: z.string().min(3, "Plan ID must be at least 3 characters.").regex(/^[a-z0-9-]+$/, "ID can only contain lowercase letters, numbers, and hyphens."),
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  price: z.coerce.number().min(0, "Price must be a positive number."),
  role: z.enum(['Installer', 'Job Giver', 'Any']),
  features: z.string().min(1, "Please list at least one feature."),
  isArchived: z.boolean(),
});

function PlanForm({ plan, onSave }: { plan?: SubscriptionPlan, onSave: () => void }) {
  const { toast } = useToast();
  const { db } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: plan ? {
      ...plan,
      features: plan.features.join(', '),
    } : {
      id: "",
      name: "",
      description: "",
      price: 0,
      role: 'Any',
      features: "",
      isArchived: false,
    },
  });

  async function onSubmit(values: z.infer<typeof planSchema>) {
    setIsSubmitting(true);
    const planRef = doc(db, "subscriptionPlans", values.id);
    try {
      const planData = {
        ...values,
        features: values.features.split(',').map(f => f.trim()),
      };
      await setDoc(planRef, planData, { merge: true });
      toast({
        title: plan ? "Plan Updated" : "Plan Created",
        description: `Subscription plan "${values.name}" has been saved.`,
      });
      onSave();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save plan.", variant: "destructive" });
    }
    setIsSubmitting(false);
  }

  const triggerText = plan ? "Edit Plan" : "Create New Plan";
  const TriggerButton = plan
    ? <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem>
    : <Button><PlusCircle className="mr-2 h-4 w-4" />{triggerText}</Button>;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{triggerText}</DialogTitle>
          <DialogDescription>
            {plan ? "Edit the details of this subscription plan." : "Create a new subscription plan for users."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., pro-installer" {...field} disabled={!!plan} />
                  </FormControl>
                  <FormDescription>A unique ID for the plan. Cannot be changed later.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Pro Installer" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Input placeholder="e.g., Access to premium features" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (₹ per year)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Applicable To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Any">Any Role</SelectItem>
                      <SelectItem value="Installer">Installer Only</SelectItem>
                      <SelectItem value="Job Giver">Job Giver Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="features"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Features</FormLabel>
                  <FormControl><Textarea placeholder="Comma-separated list, e.g., Unlimited Bids, Lower Commission" {...field} /></FormControl>
                   <FormDescription>A comma-separated list of features for this plan.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="isArchived"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                    <FormLabel>Archived</FormLabel>
                    <FormDescription>Archived plans cannot be assigned to new users.</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
                )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Plan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SubscriptionPlansPage() {
  const { user, isAdmin, loading: userLoading } = useUser();
  const router = useRouter();
  const { db } = useFirebase();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { setHelp } = useHelp();

  React.useEffect(() => {
    setHelp({
        title: "Subscription Plan Management",
        content: (
            <div className="space-y-4 text-sm">
                <p>This page allows you, as an admin, to define the subscription tiers for your platform. These plans can later be integrated with a payment gateway like Cashfree Subscriptions.</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><span className="font-semibold">Create Plan:</span> Use the "Create New Plan" button to define a new plan. Give it a unique ID, name, price, and list its features.</li>
                    <li><span className="font-semibold">Applicable Role:</span> You can specify if a plan is for Installers, Job Givers, or any user.</li>
                    <li><span className="font-semibold">Archive a Plan:</span> Instead of deleting, you can "Archive" a plan. This keeps it for existing users but prevents new users from subscribing to it.</li>
                </ul>
            </div>
        )
    })
  }, [setHelp]);

  useEffect(() => {
    if (!userLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, userLoading, router]);

  const fetchPlans = React.useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, "subscriptionPlans"));
    const plansList = querySnapshot.docs.map(doc => doc.data() as SubscriptionPlan);
    setPlans(plansList);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    if (isAdmin) {
      fetchPlans();
    }
  }, [isAdmin, fetchPlans]);

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${plan.name}"? This is a destructive action.`)) return;

    await deleteDoc(doc(db, "subscriptionPlans", plan.id));
    toast({ title: "Plan Deleted", description: `Plan "${plan.name}" has been permanently deleted.`, variant: "destructive" });
    fetchPlans();
  }

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
          <CardTitle>Subscription Plans</CardTitle>
          <CardDescription>
            Manage the subscription plans available to your users.
          </CardDescription>
        </div>
        <PlanForm onSave={fetchPlans} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Price (Yearly)</TableHead>
              <TableHead>Applicable Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : plans.length > 0 ? (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">
                    {plan.name}
                    <p className="text-xs text-muted-foreground font-mono">{plan.id}</p>
                  </TableCell>
                  <TableCell>₹{plan.price.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={plan.role === 'Any' ? 'secondary' : 'outline'}>{plan.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isArchived ? 'destructive' : 'success'}>
                      {plan.isArchived ? 'Archived' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu for {plan.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <PlanForm plan={plan} onSave={fetchPlans} />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(plan)} className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No subscription plans found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

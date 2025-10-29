
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { PlusCircle, Loader2, MoreHorizontal, Grid, List } from "lucide-react";
import React, { useState } from "react";
import { useFirebase } from "@/hooks/use-user";
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
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
    if (!db) return;
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

export default function SubscriptionPlansSettings({ plans, onDataChange }: { plans: SubscriptionPlan[], onDataChange: () => void }) {
  const { db } = useFirebase();
  const { toast } = useToast();
  const [view, setView] = React.useState<'list' | 'grid'>('list');

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${plan.name}"? This is a destructive action.`)) return;
    if (!db) return;
    await deleteDoc(doc(db, "subscriptionPlans", plan.id));
    toast({ title: "Plan Deleted", description: `Plan "${plan.name}" has been permanently deleted.`, variant: "destructive" });
    onDataChange();
  }

  const PlanCard = ({ plan }: { plan: SubscriptionPlan }) => (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>ID: {plan.id}</CardDescription>
                </div>
                <Badge variant={plan.isArchived ? 'destructive' : 'success'}>
                    {plan.isArchived ? 'Archived' : 'Active'}
                </Badge>
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price (Yearly)</span>
                <span className="font-semibold">₹{plan.price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Applicable Role</span>
                <Badge variant={plan.role === 'Any' ? 'secondary' : 'outline'}>{plan.role}</Badge>
            </div>
            <div>
                <h4 className="text-sm font-semibold mb-2">Features</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {plan.features.map(f => <li key={f}>{f}</li>)}
                </ul>
            </div>
        </CardContent>
        <CardFooter>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full">
                        <MoreHorizontal className="mr-2 h-4 w-4" />
                        Actions
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Manage Plan</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <PlanForm plan={plan} onSave={onDataChange} />
                    <DropdownMenuItem onClick={() => handleDelete(plan)} className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </CardFooter>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Subscription Plans</CardTitle>
          <CardDescription>
            Manage the subscription plans available to your users.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md bg-secondary p-1">
                <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('list')}>
                    <List className="h-4 w-4" />
                </Button>
                <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('grid')}>
                    <Grid className="h-4 w-4" />
                </Button>
            </div>
            <PlanForm onSave={onDataChange} />
        </div>
      </CardHeader>
      <CardContent>
        {view === 'list' ? (
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
                {plans.length > 0 ? (
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
                            <PlanForm plan={plan} onSave={onDataChange} />
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
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {plans.length > 0 ? (
                  plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)
                ) : (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                        No subscription plans found.
                    </div>
                )}
            </div>
        )}
      </CardContent>
    </Card>
  );
}

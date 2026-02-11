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
import { useTranslations } from "next-intl";

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
  const t = useTranslations('admin.subscriptionPlans');
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
        title: plan ? t('toasts.updated') : t('toasts.created'),
        description: t('toasts.saved', { name: values.name }),
      });
      onSave();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: t('toasts.error'), description: t('toasts.failed'), variant: "destructive" });
    }
    setIsSubmitting(false);
  }

  const triggerText = plan ? t('form.editTitle') : t('form.createTitle');
  const TriggerButton = plan
    ? <DropdownMenuItem onSelect={(e) => e.preventDefault()}>{t('actions.edit')}</DropdownMenuItem>
    : <Button><PlusCircle className="mr-2 h-4 w-4" />{triggerText}</Button>;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{triggerText}</DialogTitle>
          <DialogDescription>
            {plan ? t('form.editDesc') : t('form.createDesc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.id')}</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., pro-installer-annual" {...field} disabled={!!plan} />
                  </FormControl>
                  <FormDescription>{t('form.idDesc')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.name')}</FormLabel>
                  <FormControl><Input placeholder="e.g., Pro Installer (Annual)" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.description')}</FormLabel>
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
                  <FormLabel>{t('form.price')}</FormLabel>
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
                  <FormLabel>{t('form.role')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Any">{t('form.roles.any')}</SelectItem>
                      <SelectItem value="Installer">{t('form.roles.installer')}</SelectItem>
                      <SelectItem value="Job Giver">{t('form.roles.jobGiver')}</SelectItem>
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
                  <FormLabel>{t('form.features')}</FormLabel>
                  <FormControl><Textarea placeholder="Comma-separated list, e.g., Unlimited Bids, Lower Commission" {...field} /></FormControl>
                  <FormDescription>{t('form.featuresDesc')}</FormDescription>
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
                    <FormLabel>{t('form.archived')}</FormLabel>
                    <FormDescription>{t('form.archivedDesc')}</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="ghost">{t('form.cancel')}</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('form.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SubscriptionPlansManager({ plans, onDataChange }: { plans: SubscriptionPlan[], onDataChange: () => void }) {
  const t = useTranslations('admin.subscriptionPlans');
  const { db } = useFirebase();
  const { toast } = useToast();
  const [view, setView] = React.useState<'list' | 'grid'>('list');

  const handleDelete = async (plan: SubscriptionPlan) => {
    if (!window.confirm(t('confirmDelete', { name: plan.name }))) return;
    if (!db) return;
    await deleteDoc(doc(db, "subscriptionPlans", plan.id));
    toast({ title: t('toasts.deleted'), description: t('toasts.deletedDesc', { name: plan.name }), variant: "destructive" });
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
            {plan.isArchived ? t('status.archived') : t('status.active')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('form.price')}</span>
          <span className="font-semibold">₹{plan.price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('table.role')}</span>
          <Badge variant={plan.role === 'Any' ? 'secondary' : 'outline'}>
            {plan.role === 'Any' && t('form.roles.any')}
            {plan.role === 'Installer' && t('form.roles.installer')}
            {plan.role === 'Job Giver' && t('form.roles.jobGiver')}
          </Badge>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">{t('form.features')}</h4>
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
              {t('table.actions')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('actions.manage')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <PlanForm plan={plan} onSave={onDataChange} />
            <DropdownMenuItem onClick={() => handleDelete(plan)} className="text-destructive">
              {t('actions.delete')}
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
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
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
                <TableHead>{t('table.name')}</TableHead>
                <TableHead>{t('table.price')}</TableHead>
                <TableHead>{t('table.role')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead><span className="sr-only">{t('table.actions')}</span></TableHead>
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
                      <Badge variant={plan.role === 'Any' ? 'secondary' : 'outline'}>
                        {plan.role === 'Any' && t('form.roles.any')}
                        {plan.role === 'Installer' && t('form.roles.installer')}
                        {plan.role === 'Job Giver' && t('form.roles.jobGiver')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.isArchived ? 'destructive' : 'success'}>
                        {plan.isArchived ? t('status.archived') : t('status.active')}
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
                          <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
                          <PlanForm plan={plan} onSave={onDataChange} />
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(plan)} className="text-destructive">
                            {t('actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {t('emptyCreate')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plans.length > 0 ? (
              plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)
            ) : (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                {t('empty')}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

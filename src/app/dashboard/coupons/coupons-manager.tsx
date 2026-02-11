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
import { PlusCircle, Edit, Trash2, Loader2, MoreHorizontal, List, Grid } from "lucide-react";
import React, { useState } from "react";
import { useFirebase } from "@/hooks/use-user";
import { Coupon } from "@/lib/types";
import { toDate } from "@/lib/utils";
import { format } from "date-fns";
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
import { doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useTranslations } from "next-intl";

function CouponForm({ coupon, onSave }: { coupon?: Coupon, onSave: () => void }) {
  const t = useTranslations('admin.coupons');
  const { toast } = useToast();
  const { db } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const couponSchema = z.object({
    code: z.string().min(3, "Code must be at least 3 characters.").toUpperCase(),
    description: z.string().min(10, "Description must be at least 10 characters."),
    planId: z.string().min(1, "Plan ID is required."),
    durationDays: z.coerce.number().min(1, "Duration must be at least 1 day."),
    applicableToRole: z.enum(['Installer', 'Job Giver', 'Any']),
    validFrom: z.date({ required_error: "Start date is required." }),
    validUntil: z.date({ required_error: "End date is required." }),
    isActive: z.boolean(),
  }).refine(data => data.validUntil > data.validFrom, {
    message: "End date must be after start date.",
    path: ["validUntil"],
  });

  const form = useForm<z.infer<typeof couponSchema>>({
    resolver: zodResolver(couponSchema),
    defaultValues: coupon ? {
      ...coupon,
      validFrom: toDate(coupon.validFrom),
      validUntil: toDate(coupon.validUntil)
    } : {
      code: "",
      description: "",
      planId: "pro-installer-annual",
      durationDays: 30,
      applicableToRole: 'Any',
      isActive: true,
      validFrom: new Date(),
      validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    },
  });

  async function onSubmit(values: z.infer<typeof couponSchema>) {
    setIsSubmitting(true);
    if (!db) return;
    const couponRef = doc(db, "coupons", values.code);
    try {
      await setDoc(couponRef, values, { merge: true });
      toast({
        title: coupon ? t('toasts.updated') : t('toasts.created'),
        description: t('toasts.saved', { code: values.code }),
      });
      onSave();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: t('toasts.error'), description: t('toasts.failed'), variant: "destructive" });
    }
    setIsSubmitting(false);
  }

  const triggerText = coupon ? t('form.editTitle') : t('form.createTitle');
  const TriggerButton = coupon
    ? <DropdownMenuItem onSelect={(e) => e.preventDefault()}>{t('actions.edit')}</DropdownMenuItem>
    : <Button><PlusCircle className="mr-2 h-4 w-4" />{triggerText}</Button>;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {TriggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{triggerText}</DialogTitle>
          <DialogDescription>
            {coupon ? t('form.editDesc') : t('form.createDesc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.code')}</FormLabel>
                  <FormControl>
                    <Input placeholder="WELCOME2024" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} disabled={!!coupon} />
                  </FormControl>
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
                  <FormControl>
                    <Input placeholder="e.g., 30-day Pro Installer Plan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.planId')}</FormLabel>
                    <FormControl>
                      <Input placeholder="pro-installer-annual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.duration')}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="applicableToRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.role')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                    </FormControl>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('form.validFrom')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"}>
                            {field.value ? format(field.value, "PPP") : <span>{t('form.pickDate')}</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('form.validUntil')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"}>
                            {field.value ? format(field.value, "PPP") : <span>{t('form.pickDate')}</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>{t('form.isActive')}</FormLabel>
                    <FormDescription>
                      {t('form.isActiveDesc')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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

export default function CouponsManager({ coupons, onDataChange }: { coupons: Coupon[], onDataChange: () => void }) {
  const t = useTranslations('admin.coupons');
  const { db } = useFirebase();
  const { toast } = useToast();
  const [view, setView] = React.useState<'list' | 'grid'>('list');

  const handleDelete = async (code: string) => {
    if (!window.confirm(t('confirmDelete', { code }))) return;
    if (!db) return;

    await deleteDoc(doc(db, "coupons", code));
    toast({ title: t('toasts.deleted'), description: t('toasts.deletedDesc', { code }), variant: "destructive" });
    onDataChange();
  }

  const handleToggleActive = async (coupon: Coupon) => {
    if (!db) return;
    const newStatus = !coupon.isActive;
    await updateDoc(doc(db, "coupons", coupon.code), { isActive: newStatus });
    toast({
      title: t('toasts.statusUpdated'),
      description: t('toasts.statusUpdatedDesc', { code: coupon.code, status: newStatus ? t('status.active') : "Inactive" }),
    });
    onDataChange();
  }

  const getCouponStatus = (coupon: Coupon): "Active" | "Scheduled" | "Expired" => {
    const now = new Date();
    const validFrom = toDate(coupon.validFrom);
    const validUntil = toDate(coupon.validUntil);
    if (coupon.isActive) {
      if (now >= validFrom && now <= validUntil) return "Active";
      else if (now < validFrom) return "Scheduled";
    }
    return "Expired";
  };

  const CouponCard = ({ coupon }: { coupon: Coupon }) => {
    const status = getCouponStatus(coupon);
    let statusLabel: string = status;
    if (status === 'Active') statusLabel = t('status.active');
    if (status === 'Scheduled') statusLabel = t('status.scheduled');
    if (status === 'Expired') statusLabel = t('status.expired');

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="font-mono">{coupon.code}</CardTitle>
            <Badge variant={status === 'Active' ? 'success' : status === 'Scheduled' ? 'info' : 'destructive'}>
              {statusLabel}
            </Badge>
          </div>
          <CardDescription>{coupon.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.duration')}</span>
            <span>{t('days', { count: coupon.durationDays })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.role')}</span>
            <Badge variant={coupon.applicableToRole === 'Any' ? 'secondary' : 'outline'}>
              {coupon.applicableToRole === 'Any' && t('form.roles.any')}
              {coupon.applicableToRole === 'Installer' && t('form.roles.installer')}
              {coupon.applicableToRole === 'Job Giver' && t('form.roles.jobGiver')}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.validity')}</span>
            <span>{format(toDate(coupon.validFrom), "PP")} - {format(toDate(coupon.validUntil), "PP")}</span>
          </div>
        </CardContent>
        <CardFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-haspopup="true" variant="outline" className="w-full">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                {t('table.actions')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
              <CouponForm coupon={coupon} onSave={onDataChange} />
              <DropdownMenuItem onClick={() => handleToggleActive(coupon)}>
                {coupon.isActive ? t('actions.deactivate') : t('actions.activate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(coupon.code)} className="text-destructive">
                {t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>
    )
  }

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
          <CouponForm onSave={onDataChange} />
        </div>
      </CardHeader>
      <CardContent>
        {view === 'list' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.code')}</TableHead>
                <TableHead>{t('table.description')}</TableHead>
                <TableHead>{t('table.role')}</TableHead>
                <TableHead>{t('table.duration')}</TableHead>
                <TableHead>{t('table.validity')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead><span className="sr-only">{t('table.actions')}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length > 0 ? (
                coupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  let statusLabel: string = status;
                  if (status === 'Active') statusLabel = t('status.active');
                  if (status === 'Scheduled') statusLabel = t('status.scheduled');
                  if (status === 'Expired') statusLabel = t('status.expired');

                  return (
                    <TableRow key={coupon.code}>
                      <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                      <TableCell>{coupon.description}</TableCell>
                      <TableCell>
                        <Badge variant={coupon.applicableToRole === 'Any' ? 'secondary' : 'outline'}>
                          {coupon.applicableToRole === 'Any' && t('form.roles.any')}
                          {coupon.applicableToRole === 'Installer' && t('form.roles.installer')}
                          {coupon.applicableToRole === 'Job Giver' && t('form.roles.jobGiver')}
                        </Badge>
                      </TableCell>
                      <TableCell>{t('days', { count: coupon.durationDays })}</TableCell>
                      <TableCell>{format(toDate(coupon.validFrom), "PP")} - {format(toDate(coupon.validUntil), "PP")}</TableCell>
                      <TableCell>
                        <Badge variant={status === 'Active' ? 'success' : status === 'Scheduled' ? 'info' : 'destructive'}>
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
                            <CouponForm coupon={coupon} onSave={onDataChange} />
                            <DropdownMenuItem onClick={() => handleToggleActive(coupon)}>
                              {coupon.isActive ? t('actions.deactivate') : t('actions.activate')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(coupon.code)} className="text-destructive">
                              {t('actions.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {t('emptyCreate')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {coupons.length > 0 ? (
              coupons.map((coupon) => <CouponCard key={coupon.code} coupon={coupon} />)
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

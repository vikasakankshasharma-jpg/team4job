

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
import { Label } from "@/components/ui/label";
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
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
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
import { useRouter } from "next/navigation";
import { useHelp } from "@/hooks/use-help";

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

function CouponForm({ coupon, onSave }: { coupon?: Coupon, onSave: () => void }) {
  const { toast } = useToast();
  const { db } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof couponSchema>>({
    resolver: zodResolver(couponSchema),
    defaultValues: coupon ? {
        ...coupon,
        validFrom: toDate(coupon.validFrom),
        validUntil: toDate(coupon.validUntil)
    } : {
      code: "",
      description: "",
      planId: "pro-installer",
      durationDays: 30,
      applicableToRole: 'Any',
      isActive: true,
    },
  });

  async function onSubmit(values: z.infer<typeof couponSchema>) {
    setIsSubmitting(true);
    const couponRef = doc(db, "coupons", values.code);
    try {
        await setDoc(couponRef, values, { merge: true });
        toast({
            title: coupon ? "Coupon Updated" : "Coupon Created",
            description: `Coupon code "${values.code}" has been saved.`,
        });
        onSave();
        setIsOpen(false);
    } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to save coupon.", variant: "destructive" });
    }
    setIsSubmitting(false);
  }
  
  const triggerText = coupon ? "Edit Coupon" : "Create New Coupon";
  const TriggerButton = coupon 
    ? <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Edit</DropdownMenuItem> 
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
            {coupon ? "Edit the details of this coupon." : "Create a new promotional coupon for users."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupon Code</FormLabel>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 30-day Pro Installer Plan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan ID</FormLabel>
                      <FormControl>
                        <Input placeholder="pro-installer" {...field} />
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
                      <FormLabel>Duration (Days)</FormLabel>
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
                  <FormLabel>Applicable To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                    </FormControl>
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
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="validFrom"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Valid From</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button variant={"outline"}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
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
                        <FormLabel>Valid Until</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button variant={"outline"}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
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
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                        Users can only redeem active coupons.
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
              <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Coupon
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function CouponsPage() {
  const { user, isAdmin, loading: userLoading } = useUser();
  const router = useRouter();
  const { db } = useFirebase();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { setHelp } = useHelp();

  React.useEffect(() => {
    setHelp({
        title: "Coupon Management",
        content: (
            <div className="space-y-4 text-sm">
                <p>This page allows you, as an admin, to create and manage promotional coupons for your users.</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><span className="font-semibold">Create Coupon:</span> Use the "Create New Coupon" button to define a new promotional code. You can set its value, duration, and which user roles can use it.</li>
                    <li><span className="font-semibold">Status:</span> A coupon's status can be "Active" (usable now), "Scheduled" (will be active in the future), or "Expired" (no longer valid).</li>
                    <li><span className="font-semibold">Actions Menu:</span> Use the actions menu (three dots) on each row to "Edit" a coupon's details, "Activate/Deactivate" it, or permanently "Delete" it.</li>
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

  const fetchCoupons = React.useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, "coupons"));
    const couponsList = querySnapshot.docs.map(doc => doc.data() as Coupon);
    setCoupons(couponsList.sort((a,b) => toDate(b.validFrom).getTime() - toDate(a.validFrom).getTime()));
    setLoading(false);
  }, [db]);

  useEffect(() => {
    if (isAdmin) {
      fetchCoupons();
    }
  }, [isAdmin, fetchCoupons]);

  const handleDelete = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${code}"? This cannot be undone.`)) return;
    
    await deleteDoc(doc(db, "coupons", code));
    toast({ title: "Coupon Deleted", description: `Coupon "${code}" has been permanently deleted.`});
    fetchCoupons();
  }

  const handleToggleActive = async (coupon: Coupon) => {
    const newStatus = !coupon.isActive;
    await updateDoc(doc(db, "coupons", coupon.code), { isActive: newStatus });
    toast({
        title: "Coupon Status Updated",
        description: `Coupon "${coupon.code}" is now ${newStatus ? 'active' : 'inactive'}.`,
    });
    fetchCoupons();
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
          <CardTitle>Coupon Management</CardTitle>
          <CardDescription>
            Create and manage promotional coupon codes for your users.
          </CardDescription>
        </div>
        <CouponForm onSave={fetchCoupons} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Validity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : coupons.length > 0 ? (
              coupons.map((coupon) => {
                const now = new Date();
                const validFrom = toDate(coupon.validFrom);
                const validUntil = toDate(coupon.validUntil);
                let status: "Active" | "Scheduled" | "Expired" = "Expired";
                if (coupon.isActive) {
                    if (now >= validFrom && now <= validUntil) status = "Active";
                    else if (now < validFrom) status = "Scheduled";
                }
                
                return (
                    <TableRow key={coupon.code}>
                        <TableCell className="font-mono font-semibold">{coupon.code}</TableCell>
                        <TableCell>{coupon.description}</TableCell>
                        <TableCell>
                            <Badge variant={coupon.applicableToRole === 'Any' ? 'secondary' : 'outline'}>
                                {coupon.applicableToRole}
                            </Badge>
                        </TableCell>
                        <TableCell>{coupon.durationDays} days</TableCell>
                        <TableCell>{format(validFrom, "PP")} - {format(validUntil, "PP")}</TableCell>
                        <TableCell>
                           <Badge variant={status === 'Active' ? 'success' : status === 'Scheduled' ? 'info' : 'destructive'}>
                                {status}
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
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <CouponForm coupon={coupon} onSave={fetchCoupons} />
                                <DropdownMenuItem onClick={() => handleToggleActive(coupon)}>
                                    {coupon.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(coupon.code)} className="text-destructive">
                                    Delete
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
                  No coupons found. Create your first one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

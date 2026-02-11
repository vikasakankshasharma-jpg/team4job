"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import { Loader2, Trash2, List, Grid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/hooks/use-user";
import { BlacklistEntry } from "@/lib/types";
import { toDate } from "@/lib/utils";
import React, { useState } from "react";
import { format } from "date-fns";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { useTranslations } from "next-intl";

const blacklistSchema = z.object({
  type: z.enum(["user", "pincode"]),
  value: z.string().min(1, "Value is required."),
  role: z.enum(["Any", "Installer", "Job Giver"]),
  reason: z.string().min(10, "Reason must be at least 10 characters long."),
});

function AddBlacklistForm({ onSave }: { onSave: () => void }) {
  const t = useTranslations('admin.blacklist');
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
    const newEntry: Omit<BlacklistEntry, 'createdAt'> = {
      id,
      ...values,
    };

    try {
      if (!db) throw new Error("Firestore not available");
      await setDoc(doc(db, "blacklist", id), { ...newEntry, createdAt: new Date() });
      toast({
        title: t('add.success'),
        description: t('add.successDesc', { type: values.type, value: values.value }),
      });
      form.reset();
      onSave();
    } catch (e) {
      console.error(e);
      toast({
        title: t('add.error'),
        description: t('add.failed'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('add.title')}</CardTitle>
        <CardDescription>
          {t('add.description')}
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
                    <FormLabel>{t('form.type')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('form.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">{t('form.types.user')}</SelectItem>
                        <SelectItem value="pincode">{t('form.types.pincode')}</SelectItem>
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
                    <FormLabel>{t('form.value')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          form.watch("type") === "user"
                            ? t('form.enterUserId')
                            : t('form.enterPincode')
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
                    <FormLabel>{t('form.role')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('form.selectRole')} />
                        </SelectTrigger>
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
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.reason')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('form.reasonPlaceholder')}
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
              {t('add.button')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function BlacklistManager({ blacklist, onDataChange }: { blacklist: BlacklistEntry[], onDataChange: () => void }) {
  const t = useTranslations('admin.blacklist');
  const { db } = useFirebase();
  const { toast } = useToast();
  const [view, setView] = React.useState<'list' | 'grid'>('list');

  const handleRemove = async (id: string, value: string) => {
    if (
      !window.confirm(
        t('actions.confirmRemove', { value })
      )
    )
      return;

    if (!db) return;
    await deleteDoc(doc(db, "blacklist", id));
    toast({
      title: t('actions.removed'),
      description: t('actions.removedDesc', { value }),
    });
    onDataChange();
  };


  return (
    <div className="grid gap-6">
      <AddBlacklistForm onSave={onDataChange} />
      <Card>
        <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              {t('description')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 rounded-md bg-secondary p-1">
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('list')}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setView('grid')}>
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {view === 'list' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.type')}</TableHead>
                  <TableHead>{t('table.value')}</TableHead>
                  <TableHead>{t('table.role')}</TableHead>
                  <TableHead>{t('table.reason')}</TableHead>
                  <TableHead>{t('table.dateAdded')}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t('table.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklist.length > 0 ? (
                  blacklist.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {entry.type === 'user' ? t('form.types.user') : t('form.types.pincode')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{entry.value}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entry.role === 'Any' && t('form.roles.any')}
                          {entry.role === 'Installer' && t('form.roles.installer')}
                          {entry.role === 'Job Giver' && t('form.roles.jobGiver')}
                        </Badge>
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
                          title={t('actions.removeTooltip')}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {blacklist.length > 0 ? (
                blacklist.map((entry) => (
                  <Card key={entry.id}>
                    <CardHeader>
                      <CardTitle className="font-mono text-base">{entry.value}</CardTitle>
                      <CardDescription>
                        <Badge variant="secondary" className="capitalize mr-2">
                          {entry.type === 'user' ? t('form.types.user') : t('form.types.pincode')}
                        </Badge>
                        <Badge variant="outline">
                          {entry.role === 'Any' && t('form.roles.any')}
                          {entry.role === 'Installer' && t('form.roles.installer')}
                          {entry.role === 'Job Giver' && t('form.roles.jobGiver')}
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p className="text-muted-foreground">{entry.reason}</p>
                      <p className="text-xs text-muted-foreground">{t('addedOn', { date: format(toDate(entry.createdAt), "PP") })}</p>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(entry.id, entry.value)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('actions.remove')}
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-10 text-muted-foreground">
                  {t('empty')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

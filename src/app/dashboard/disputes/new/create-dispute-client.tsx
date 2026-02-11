"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect } from "react";
import { useUser, useFirebase } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useHelp } from "@/hooks/use-help";
import { FileUpload } from "@/components/ui/file-upload";
import { useTranslations } from "next-intl";

const disputeSchema = z.object({
    category: z.enum(["Billing Inquiry", "Technical Support", "Skill Request", "General Question"]),
    title: z.string().min(10, { message: "Title must be at least 10 characters." }),
    reason: z.string().min(25, { message: "Description must be at least 25 characters." }),
    attachments: z.array(z.instanceof(File)).optional(),
});

export default function CreateDisputeClient() {
    const { toast } = useToast();
    const { user, role, isAdmin, loading: userLoading } = useUser();
    const { db, storage } = useFirebase();
    const router = useRouter();
    const { setHelp } = useHelp();
    const t = useTranslations('disputes');
    const tCommon = useTranslations('common');

    const disputeSchema = z.object({
        category: z.enum(["Billing Inquiry", "Technical Support", "Skill Request", "General Question"]),
        title: z.string().min(10, { message: t('validation.titleMinLength') }),
        reason: z.string().min(25, { message: t('validation.descriptionMinLength') }),
        attachments: z.array(z.instanceof(File)).optional(),
    });

    React.useEffect(() => {
        setHelp({
            title: t('createGuide.title'),
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t('createGuide.content')}</p>
                    <ul className="list-disc space-y-2 pl-5">
                        <li><span className="font-semibold">{t('createGuide.categoryLabel')}</span> {t('createGuide.categoryDesc')}</li>
                        <li><span className="font-semibold">{t('createGuide.subjectLabel')}</span> {t('createGuide.subjectDesc')}</li>
                        <li><span className="font-semibold">{t('createGuide.descriptionLabel')}</span> {t('createGuide.descriptionDesc')}</li>
                        <li><span className="font-semibold">{t('createGuide.attachmentsLabel')}</span> {t('createGuide.attachmentsDesc')}</li>
                    </ul>
                </div>
            )
        })
    }, [setHelp, t]);

    useEffect(() => {
        if (!userLoading && isAdmin) {
            router.push('/dashboard/disputes');
        }
    }, [isAdmin, userLoading, router]);

    const form = useForm<z.infer<typeof disputeSchema>>({
        resolver: zodResolver(disputeSchema),
        mode: "onChange",
        defaultValues: {
            title: "",
            reason: "",
            attachments: [],
        },
    });

    async function onSubmit(values: z.infer<typeof disputeSchema>) {
        if (!user || !db || !storage) {
            toast({ title: "Error", description: t('validation.authError'), variant: "destructive" });
            return;
        }

        const newDisputeId = `DISPUTE-${Date.now()}`;
        let attachmentUrls: { fileName: string, fileUrl: string, fileType: string }[] = [];

        if (values.attachments && values.attachments.length > 0) {
            const uploadPromises = values.attachments.map(async (file) => {
                const storageRef = ref(storage, `disputes/${newDisputeId}/${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);
                return { fileName: file.name, fileUrl: downloadURL, fileType: file.type };
            });
            attachmentUrls = await Promise.all(uploadPromises);
        }

        const disputeData = {
            id: newDisputeId,
            requesterId: user.id,
            category: values.category,
            title: values.title,
            reason: values.reason,
            status: 'Open' as const,
            messages: [{
                authorId: user.id,
                authorRole: role,
                content: values.reason,
                attachments: attachmentUrls,
                timestamp: new Date()
            }],
            createdAt: new Date(),
        };

        await setDoc(doc(db, "disputes", newDisputeId), disputeData);

        toast({
            title: t('ticketCreated'),
            description: t('ticketCreatedDesc'),
        });

        router.push(`/dashboard/disputes/${newDisputeId}`);
    }

    if (userLoading || isAdmin) {
        return (
            <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="mx-auto grid max-w-2xl flex-1 auto-rows-max gap-4">
            <h1 className="text-xl font-semibold tracking-tight">
                {t('createTicketPage')}
            </h1>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('ticketDetails')}</CardTitle>
                            <CardDescription>
                                {t('ticketDetailsDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('category')}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('categoryPlaceholder')} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Billing Inquiry">{t('categoryBillingInquiry')}</SelectItem>
                                                <SelectItem value="Technical Support">{t('categoryTechnicalSupport')}</SelectItem>
                                                <SelectItem value="Skill Request">{t('categorySkillRequest')}</SelectItem>
                                                <SelectItem value="General Question">{t('categoryGeneralQuestion')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('subject')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t('subjectPlaceholder')}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('description')}</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder={t('descriptionPlaceholder')}
                                                className="min-h-48"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="attachments"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('photoVideoProof')}</FormLabel>
                                        <FormControl>
                                            <FileUpload
                                                onFilesChange={(files) => field.onChange(files)}
                                                maxFiles={5}
                                            />
                                        </FormControl>
                                        <FormDescription>{t('uploadDescription')}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" type="button" onClick={() => router.back()}>
                            {tCommon('cancel')}
                        </Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('submitTicket')}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}

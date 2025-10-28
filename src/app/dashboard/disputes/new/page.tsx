
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

const disputeSchema = z.object({
  category: z.enum(["Billing Inquiry", "Technical Support", "Skill Request", "General Question"]),
  title: z.string().min(10, { message: "Title must be at least 10 characters." }),
  reason: z.string().min(25, { message: "Description must be at least 25 characters." }),
  attachments: z.array(z.instanceof(File)).optional(),
});

export default function CreateDisputePage() {
  const { toast } = useToast();
  const { user, role, isAdmin, loading: userLoading } = useUser();
  const { db, storage } = useFirebase();
  const router = useRouter();
  const { setHelp } = useHelp();

  React.useEffect(() => {
    setHelp({
        title: "Create Support Ticket",
        content: (
            <div className="space-y-4 text-sm">
                <p>Use this form to create a new support ticket for issues not related to a specific job.</p>
                <ul className="list-disc space-y-2 pl-5">
                    <li><span className="font-semibold">Category:</span> Choose the most relevant category for your issue.</li>
                    <li><span className="font-semibold">Subject:</span> Provide a short, clear summary of your issue.</li>
                    <li><span className="font-semibold">Description:</span> Describe your problem in detail.</li>
                    <li><span className="font-semibold">Attachments:</span> Upload any relevant photos or videos as proof.</li>
                </ul>
            </div>
        )
    })
  }, [setHelp]);

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
        toast({ title: "Error", description: "Authentication details are missing. Please log in again.", variant: "destructive" });
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
        title: "Support Ticket Created",
        description: "An admin will review your request shortly.",
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
        Create New Support Ticket
      </h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
              <CardDescription>
                Please provide as much detail as possible so we can assist you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category for your request" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {["Billing Inquiry", "Technical Support", "Skill Request", "General Question"].map(cat => (
                               <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                           ))}
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
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Question about platform commission"
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your issue or question in detail..."
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
                    <FormLabel>Photo/Video Proof</FormLabel>
                    <FormControl>
                       <FileUpload 
                          onFilesChange={(files) => field.onChange(files)} 
                          maxFiles={5}
                        />
                    </FormControl>
                    <FormDescription>Upload any relevant photos or videos as evidence (max 5 files).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Ticket
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

    
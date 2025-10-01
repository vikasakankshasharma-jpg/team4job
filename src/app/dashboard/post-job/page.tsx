
"use client";

import { useForm, useWatch } from "react-hook-form";
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
import { Zap, Loader2 } from "lucide-react";
import { generateJobDetails } from "@/ai/flows/generate-job-details";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, serverTimestamp } from "firebase/firestore";

const jobSchema = z.object({
  jobTitle: z
    .string()
    .min(10, { message: "Job title must be at least 10 characters." }),
  jobDescription: z
    .string()
    .min(50, { message: "Description must be at least 50 characters." }),
  skills: z.string().min(1, { message: "Please provide at least one skill." }),
  location: z.string().regex(/^\d{6}$/, { message: "Must be a 6-digit pincode." }),
  budgetMin: z.coerce.number().min(1, { message: "Minimum budget must be at least 1." }),
  budgetMax: z.coerce.number().min(1, { message: "Maximum budget must be at least 1." }),
  deadline: z.string().min(1, { message: "Please select a bidding deadline." }),
  jobStartDate: z.string().min(1, { message: "Please select a job start date." }),
}).refine(data => data.budgetMax > data.budgetMin, {
    message: "Maximum budget must be greater than minimum budget.",
    path: ["budgetMax"],
}).refine(data => new Date(data.jobStartDate) >= new Date(data.deadline), {
    message: "Job start date must be on or after the bidding deadline.",
    path: ["jobStartDate"],
});

export default function PostJobPage() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { user } = useUser();
  const router = useRouter();

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    mode: "onChange",
    defaultValues: {
      jobTitle: "",
      jobDescription: "",
      skills: "",
      location: "",
      budgetMin: 0,
      budgetMax: 0,
    },
  });

  const jobTitle = useWatch({ control: form.control, name: "jobTitle" });
  const jobTitleState = form.getFieldState("jobTitle");
  const isJobTitleValid = jobTitle && !jobTitleState.invalid;

  const handleGenerateDetails = async () => {
    if (!isJobTitleValid) {
      toast({
        title: "Invalid Job Title",
        description: "Please enter a job title (at least 10 characters) first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateJobDetails({ jobTitle });
      if (result) {
        form.setValue("jobDescription", result.jobDescription, { shouldValidate: true });
        form.setValue("skills", result.suggestedSkills.join(', '), { shouldValidate: true });
        form.setValue("budgetMin", result.budgetMin, { shouldValidate: true });
        form.setValue("budgetMax", result.budgetMax, { shouldValidate: true });

        toast({
          title: "AI Suggestions Added!",
          description: "Description, skills, and budget have been auto-filled.",
        });
      }
    } catch (error) {
      console.error("Error generating job details:", error);
      toast({
        title: "Generation Failed",
        description: "There was an error generating details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };


  async function onSubmit(values: z.infer<typeof jobSchema>) {
    if (!user) {
        toast({ title: "Error", description: "You must be logged in to post a job.", variant: "destructive" });
        return;
    }
    
    // Generate a 6-digit OTP
    const completionOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newJobId = `JOB-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newJob = {
      id: newJobId, // This is just for local consistency, Firestore generates its own ID
      title: values.jobTitle,
      description: values.jobDescription,
      jobGiver: doc(db, 'users', user.id),
      location: `${values.location}, India`,
      budget: { min: values.budgetMin, max: values.budgetMax },
      status: 'Open for Bidding' as const,
      deadline: new Date(values.deadline),
      jobStartDate: new Date(values.jobStartDate),
      postedAt: serverTimestamp(),
      bids: [],
      comments: [],
      completionOtp: completionOtp,
    };
    
    try {
        const jobsCollection = collection(db, "jobs");
        const docRef = await addDoc(jobsCollection, newJob);

        toast({
            title: "Job Posted Successfully!",
            description: "Your job is now live and open for bidding.",
        });
        form.reset();
        router.push(`/dashboard/jobs/${docRef.id}`);
    } catch (error) {
        console.error("Error posting job: ", error);
        toast({
            title: "Failed to post job",
            description: "An error occurred while saving your job. Please try again.",
            variant: "destructive"
        });
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Post a New Job
        </h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>
                Start with a clear title, then click the AI button to fill out the rest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Install 8 IP Cameras for an Office"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jobDescription"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Job Description</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateDetails}
                        disabled={isGenerating || !isJobTitleValid}
                      >
                        {isGenerating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="mr-2 h-4 w-4" />
                        )}
                        AI Generate
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the project requirements, scope, and any important details..."
                        className={cn("min-h-32", isGenerating && "opacity-50")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                     <div className="flex items-center justify-between">
                        <FormLabel>Required Skills</FormLabel>
                         {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                     </div>
                    <FormControl>
                      <Input
                        placeholder="e.g., IP Cameras, NVR Setup, Cabling"
                        className={cn(isGenerating && "opacity-50")}
                        {...field}
                      />
                    </FormControl>
                     <FormDescription>
                      Enter a comma-separated list of skills.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                 <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Location (Pincode)</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., 110001" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Bidding Deadline</FormLabel>
                        <FormControl>
                         <Input type="date" {...field} min={new Date().toISOString().split("T")[0]} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="jobStartDate"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Job Work Start Date</FormLabel>
                        <FormControl>
                         <Input type="date" {...field} min={form.getValues('deadline')} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="budgetMin"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Minimum Budget (₹)</FormLabel>                         {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10000" {...field} className={cn(isGenerating && "opacity-50")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="budgetMax"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Maximum Budget (₹)</FormLabel>
                        {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 20000" {...field} className={cn(isGenerating && "opacity-50")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center justify-end gap-2 pt-6">
            <Button variant="outline" type="button" onClick={() => form.reset()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isGenerating}>Post Job</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

    

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
import { Zap, Loader2, UserPlus } from "lucide-react";
import { generateJobDetails } from "@/ai/flows/generate-job-details";
import { useToast } from "@/hooks/use-toast";
import React from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { LocationInput } from "@/components/ui/location-input";
import { Separator } from "@/components/ui/separator";

const jobSchema = z.object({
  jobTitle: z
    .string()
    .min(10, { message: "Job title must be at least 10 characters." }),
  jobDescription: z
    .string()
    .min(50, { message: "Description must be at least 50 characters." }),
  skills: z.string().min(1, { message: "Please provide at least one skill." }),
  location: z.string().min(8, { message: "Please select a pincode and post office." }),
  fullAddress: z.string().min(10, { message: "Please enter a full address." }),
  budgetMin: z.coerce.number().min(1, { message: "Minimum budget must be at least 1." }),
  budgetMax: z.coerce.number().min(1, { message: "Maximum budget must be at least 1." }),
  deadline: z.string().min(1, { message: "Please select a bidding deadline." }),
  jobStartDate: z.string().min(1, { message: "Please select a job start date." }),
  directAwardInstallerId: z.string().optional(),
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
  const { user, role } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    if (role === 'Admin') {
      router.push('/dashboard');
    }
  }, [role, router]);

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    mode: "onChange",
    defaultValues: {
      jobTitle: "",
      jobDescription: "",
      skills: "",
      location: "",
      fullAddress: "",
      budgetMin: 0,
      budgetMax: 0,
      directAwardInstallerId: "",
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
    
    // In a real app, this would save to a database.
    // For this mock version, we just show a success message.
    const newJobId = `JOB-${Date.now()}`;
    const status = values.directAwardInstallerId ? "Awarded" : "Open for Bidding";
    console.log("New Job Submitted:", { id: newJobId, ...values, jobGiver: user.id, status });

    toast({
        title: "Job Posted Successfully! (Mock)",
        description: `Your job is now ${status === 'Awarded' ? 'awarded' : 'live and open for bidding'}.`,
    });
    form.reset();
    router.push(`/dashboard/posted-jobs`);
  }

  if (role === 'Admin') {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Redirecting...</p>
        </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl flex-1 auto-rows-max gap-4">
      <div className="flex items-center gap-4">
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          Post a New Job
        </h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>
                Fill in the details for your job posting. Use the AI generator for a quick start.
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
                 <LocationInput
                    name="location"
                    label="Location (Pincode)"
                    placeholder="e.g. 110001"
                    control={form.control}
                 />
                 <FormField
                    control={form.control}
                    name="fullAddress"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Full Address</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Enter the full street address for the job location..." {...field} />
                        </FormControl>
                        <FormDescription>This will only be visible to you and the awarded installer.</FormDescription>
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
                         <FormDescription>Not applicable if you are using Direct Award.</FormDescription>
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
           <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Direct Award (Optional)
                    </CardTitle>
                    <CardDescription>
                        Know a great installer? Skip the bidding process and award this job directly to them by entering their public Installer ID.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <FormField
                        control={form.control}
                        name="directAwardInstallerId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Installer's Public ID</FormLabel>
                            <FormControl>
                            <Input
                                placeholder="e.g., Installer-8421"
                                {...field}
                            />
                            </FormControl>
                             <FormDescription>
                                If you fill this in, the job will be private and only visible to this installer. Public bidding will be disabled.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
            </Card>
          <div className="flex items-center justify-end gap-2">
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

    
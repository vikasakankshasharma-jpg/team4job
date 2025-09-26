
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
  const [debouncedTitle, setDebouncedTitle] = React.useState("");

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
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

  React.useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedTitle(jobTitle);
    }, 1000); // 1-second debounce delay

    return () => {
        clearTimeout(handler);
    };
  }, [jobTitle]);

  React.useEffect(() => {
    if (debouncedTitle && debouncedTitle.length >= 10) {
      handleGenerateDetails();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle]);


  const handleGenerateDetails = async () => {
    setIsGenerating(true);
    try {
      const result = await generateJobDetails({ jobTitle: debouncedTitle });
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


  function onSubmit(values: z.infer<typeof jobSchema>) {
    console.log(values);
    toast({
        title: "Job Posted Successfully!",
        description: "Your job is now live and open for bidding.",
    });
    form.reset();
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
                Start with a clear title. Our AI will help you fill out the rest.
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
                       {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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
                        <FormLabel>Minimum Budget (₹)</FormLabel>
                         {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
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

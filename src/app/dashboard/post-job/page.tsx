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
import { generateJobDescription } from "@/ai/flows/generate-job-description";
import { useToast } from "@/hooks/use-toast";
import React from "react";

const jobSchema = z.object({
  jobTitle: z
    .string()
    .min(10, { message: "Job title must be at least 10 characters." }),
  jobDescription: z
    .string()
    .min(50, { message: "Description must be at least 50 characters." }),
  location: z.string().regex(/^\d{6}$/, { message: "Must be a 6-digit pincode." }),
  budgetMin: z.coerce.number().min(1, { message: "Minimum budget must be at least 1." }),
  budgetMax: z.coerce.number().min(1, { message: "Maximum budget must be at least 1." }),
  deadline: z.string().min(1, { message: "Please select a deadline." }),
}).refine(data => data.budgetMax > data.budgetMin, {
    message: "Maximum budget must be greater than minimum budget.",
    path: ["budgetMax"],
});

export default function PostJobPage() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);

  const form = useForm<z.infer<typeof jobSchema>>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      jobTitle: "",
      jobDescription: "",
      location: "",
      budgetMin: 0,
      budgetMax: 0,
    },
  });

  const jobTitle = useWatch({
    control: form.control,
    name: "jobTitle",
  });

  const handleGenerateDescription = async () => {
    if (!jobTitle) {
      toast({
        title: "Job Title Required",
        description: "Please enter a job title before generating a description.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateJobDescription({ jobTitle });
      if (result.jobDescription) {
        form.setValue("jobDescription", result.jobDescription, { shouldValidate: true });
        toast({
          title: "Description Generated!",
          description: "The AI-generated description has been added.",
        });
      }
    } catch (error) {
      console.error("Error generating job description:", error);
      toast({
        title: "Generation Failed",
        description: "There was an error generating the description. Please try again.",
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
                Fill in the details below to attract the best installers for
                your project.
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
                        onClick={handleGenerateDescription}
                        disabled={isGenerating || !jobTitle}
                      >
                        {isGenerating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="mr-2 h-4 w-4" />
                        )}
                        Generate with AI
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the project requirements, scope, and any important details..."
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
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
                         <Input type="date" {...field} />
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
                      <FormLabel>Minimum Budget (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10000" {...field} />
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
                      <FormLabel>Maximum Budget (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 20000" {...field} />
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
            <Button type="submit">Post Job</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

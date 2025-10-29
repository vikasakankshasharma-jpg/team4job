
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { useUser, useFirebase } from "@/hooks/use-user";
import { Loader2, UserPlus } from "lucide-react";
import React from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ShieldCheck } from "lucide-react";


const teamMemberSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(["Admin", "Support Team"]),
});

export function TeamManagementCard({ onTeamMemberAdded }: { onTeamMemberAdded: () => void }) {
  const { toast } = useToast();
  const { db, auth } = useFirebase();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof teamMemberSchema>>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "Support Team",
    },
  });

  // THIS FUNCTION IS NO LONGER USED AND IS A SECURITY RISK.
  // TEAM MEMBERS SHOULD BE ADDED VIA FIREBASE CONSOLE.
  async function onSubmit(values: z.infer<typeof teamMemberSchema>) {
    // This client-side user creation is insecure and is disabled.
    // The UI now directs admins to use the Firebase Console.
    toast({
        title: "Action Disabled",
        description: "For security, new team members must be added directly in the Firebase Console.",
        variant: "destructive",
    });
    return;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserPlus /> Add Team Member</CardTitle>
         <CardDescription>
            For security, new team members must be created directly in the Firebase Console.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>How to Add a Team Member</AlertTitle>
            <AlertDescription>
                <ol className="list-decimal list-inside space-y-2 mt-2">
                    <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Firebase Console</a> for this project.</li>
                    <li>Navigate to the **Authentication** section.</li>
                    <li>Click **Add user** and create a new account with their email and a temporary password.</li>
                    <li>Navigate to the **Firestore Database** section.</li>
                    <li>In the `users` collection, find the new user's document (by their UID) and add the appropriate role (`Admin` or `Support Team`) to their `roles` array.</li>
                </ol>
            </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

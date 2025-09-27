
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { users } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import type { User } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).refine(email => {
    return !users.some(user => user.email === email);
  }, {
    message: "This email is already in use.",
  }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["Job Giver", "Installer"]),
  pincode: z.string().optional(),
  aadhar: z.string().optional(),
}).refine(data => {
    // If role is Installer, pincode must be a 6-digit string
    if (data.role === 'Installer') {
        return data.pincode && /^\d{6}$/.test(data.pincode);
    }
    return true;
}, {
    message: "Installer must provide a 6-digit pincode.",
    path: ["pincode"],
});

export function SignUpForm() {
  const router = useRouter();
  const { login } = useUser();
  const [role, setRole] = useState<"Job Giver" | "Installer" | "">("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: undefined,
      pincode: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Simulate signup
    const newUserId = `user-${users.length + 1}`;
    const newAnonymousId = `${values.role === 'Installer' ? 'Installer' : 'JobGiver'}-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];
    
    const newUser: User = {
      id: newUserId,
      name: values.name,
      email: values.email,
      anonymousId: newAnonymousId,
      pincode: values.pincode || '',
      roles: [values.role],
      memberSince: new Date(),
      avatarUrl: randomAvatar.imageUrl,
      realAvatarUrl: `https://picsum.photos/seed/${values.name.split(' ')[0]}/100/100`,
    };

    if (values.role === 'Installer') {
      newUser.installerProfile = {
        tier: 'Bronze',
        points: 0,
        skills: [],
        rating: 0,
        reviews: 0,
        verified: !!values.aadhar,
        reputationHistory: [],
      };
    }

    users.push(newUser);
    login(newUserId);
    router.push("/dashboard");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I am a...</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setRole(value as any);
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Job Giver">Job Giver</SelectItem>
                    <SelectItem value="Installer">Installer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           {role === 'Installer' && (
             <FormField
              control={form.control}
              name="pincode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pincode</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 110001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
           )}
        </div>

        {role === "Installer" && (
          <FormField
            control={form.control}
            name="aadhar"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Aadhar Verification (Optional)
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter 12-digit Aadhar number" {...field} />
                </FormControl>
                <FormDescription>
                  Verifying your Aadhar increases trust and job opportunities. This is a simulated field.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full">
          Create Account
        </Button>
      </form>
    </Form>
  );
}

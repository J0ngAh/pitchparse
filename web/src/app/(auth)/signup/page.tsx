"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signup } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  org_name: z.string().min(1, "Organization name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      const result = await signup(data.email, data.password, data.name, data.org_name);
      if ("requires_confirmation" in result) {
        setConfirmationEmail(result.email);
        return;
      }
      setAuth(result);
      toast.success("Account created!");
      router.push("/dashboard");
    } catch {
      toast.error("Signup failed. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  if (confirmationEmail) {
    return (
      <Card className="border-border bg-card/80 backdrop-blur-xl rounded-2xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold">Check your email</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{confirmationEmail}</span>. Click the link
            to activate your account, then come back to sign in.
          </p>
          <Link
            href="/login"
            className="mt-2 text-sm text-primary hover:text-primary/80 font-medium"
          >
            Go to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card/80 backdrop-blur-xl rounded-2xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-5 p-8 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" placeholder="Jane Smith" {...register("name")} />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_name">Organization</Label>
              <Input id="org_name" placeholder="Acme Corp" {...register("org_name")} />
              {errors.org_name && <p className="text-xs text-red-400">{errors.org_name.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 px-8 pb-8">
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create account
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

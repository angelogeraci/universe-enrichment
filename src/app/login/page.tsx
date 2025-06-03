"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState("");

  const onSubmit = async (data: any) => {
    setError("");
    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
    });
    if (res?.error) {
      setError("Email or password invalid");
      toast.error("Email ou mot de passe invalide");
    } else {
      toast.success("Connexion réussie !");
      router.push("/");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 dark:bg-neutral-950">
      <Card className="w-full max-w-sm border border-neutral-200 dark:border-neutral-800 shadow-none bg-white dark:bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 text-center">Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email", { required: true })} />
              {errors.email && <span className="text-xs text-red-500">Email is required</span>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password", { required: true })} />
              {errors.password && <span className="text-xs text-red-500">Password is required</span>}
            </div>
            {error && <div className="text-sm text-red-600 text-center">{error}</div>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
} 
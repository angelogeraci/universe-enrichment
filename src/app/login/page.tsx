"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from '@/hooks/useToast'

interface UserWithRole {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
}

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState("");
  const { success, error: showError } = useToast()

  const onSubmit = async (data: any) => {
    setError("");
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });
      
      if (res?.error) {
        setError("Email or password invalid");
        showError("Email ou mot de passe invalide", { duration: 5000 });
      } else {
        success("Connexion réussie ! Redirection en cours...", { duration: 3000 });
        
        let tries = 0;
        let session: { user?: UserWithRole } | null = null;
        while (tries < 10) {
          session = await getSession();
          if (session?.user?.role) break;
          await new Promise(r => setTimeout(r, 150));
          tries++;
        }
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError("Une erreur inattendue s'est produite");
      showError("Une erreur inattendue s'est produite lors de la connexion", { duration: 5000 });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email", { required: "Email requis" })}
                className="mt-1"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                {...register("password", { required: "Mot de passe requis" })}
                className="mt-1"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message as string}</p>
              )}
            </div>
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 
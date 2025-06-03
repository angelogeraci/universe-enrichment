"use client";
import { signOut } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function SignOutPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 dark:bg-neutral-950">
      <Card className="w-full max-w-sm border border-neutral-200 dark:border-neutral-800 shadow-none bg-white dark:bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 text-center">
            Déconnexion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6">
            <span className="text-base text-neutral-700 dark:text-neutral-300 text-center">
              Voulez-vous vraiment vous déconnecter&nbsp;?
            </span>
            <Button className="w-full" onClick={handleSignOut}>
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
} 
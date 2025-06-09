"use client"
import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from 'next/navigation'

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  isPublic: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

export default function CreateCategoryListDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isPublic: false },
  })
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erreur lors de la création")
      }
      const result = await res.json()
      setOpen(false)
      reset()
      onCreated?.()
      if (result.slug) {
        router.push(`/categories/${result.slug}/edit`)
      }
    } catch (e: any) {
      setError(e.message || "Erreur inconnue")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>New list</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new category list</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input placeholder="List name" {...register("name")} />
            {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name.message}</div>}
          </div>
          <div className="flex items-center gap-2">
            <Switch id="isPublic" checked={watch("isPublic")} {...register("isPublic")} />
            <label htmlFor="isPublic">Make this list public</label>
          </div>
          {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
} 
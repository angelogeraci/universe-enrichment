"use client"

import React, { useRef } from "react"
import CategoriesList from "./CategoriesList"
import CreateCategoryListDialog from "./CreateCategoryListDialog"

export default function CategoriesPage() {
  const listRef = useRef<{ reload: () => void }>(null)
  return (
    <div className="w-full px-32 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My category lists</h1>
        <CreateCategoryListDialog onCreated={() => listRef.current?.reload()} />
      </div>
      <CategoriesList ref={listRef} />
    </div>
  )
} 
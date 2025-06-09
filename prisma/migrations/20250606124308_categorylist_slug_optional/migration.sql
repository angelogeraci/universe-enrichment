/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `CategoryList` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CategoryList" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CategoryList_slug_key" ON "CategoryList"("slug");

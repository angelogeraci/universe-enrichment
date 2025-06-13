-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "currentCategoryIndex" INTEGER DEFAULT 0,
ADD COLUMN     "pausedAt" TIMESTAMP(3);

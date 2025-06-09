/*
  Warnings:

  - Made the column `slug` on table `CategoryList` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CategoryList" ALTER COLUMN "slug" SET NOT NULL;

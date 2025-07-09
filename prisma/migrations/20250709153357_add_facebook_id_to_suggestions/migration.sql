-- AlterTable
ALTER TABLE "SuggestionFacebook" ADD COLUMN     "facebookId" TEXT;

-- CreateTable
CREATE TABLE "InterestCheck" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BE',
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "enrichmentStatus" TEXT NOT NULL DEFAULT 'pending',
    "currentInterestIndex" INTEGER DEFAULT 0,
    "pausedAt" TIMESTAMP(3),

    CONSTRAINT "InterestCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "interestCheckId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "selectedSuggestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestSuggestion" (
    "id" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "facebookId" TEXT,
    "audience" INTEGER NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "isBestMatch" BOOLEAN NOT NULL DEFAULT false,
    "isSelectedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterestSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterestCheck_slug_key" ON "InterestCheck"("slug");

-- AddForeignKey
ALTER TABLE "InterestCheck" ADD CONSTRAINT "InterestCheck_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_interestCheckId_fkey" FOREIGN KEY ("interestCheckId") REFERENCES "InterestCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestSuggestion" ADD CONSTRAINT "InterestSuggestion_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

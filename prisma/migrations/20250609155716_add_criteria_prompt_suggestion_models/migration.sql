-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Critere" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categoryPath" TEXT[],
    "country" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "selectedSuggestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Critere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestionFacebook" (
    "id" TEXT NOT NULL,
    "critereId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "audience" INTEGER NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "isBestMatch" BOOLEAN NOT NULL DEFAULT false,
    "isSelectedByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestionFacebook_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Critere" ADD CONSTRAINT "Critere_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionFacebook" ADD CONSTRAINT "SuggestionFacebook_critereId_fkey" FOREIGN KEY ("critereId") REFERENCES "Critere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

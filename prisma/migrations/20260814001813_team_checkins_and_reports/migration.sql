-- CreateTable
CREATE TABLE "CheckIn" (
    "id" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamUpdate" (
    "id" SERIAL NOT NULL,
    "checkInId" INTEGER NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInReminder" (
    "id" SERIAL NOT NULL,
    "checkInId" INTEGER NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReportLog" (
    "id" SERIAL NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_threadId_key" ON "CheckIn"("threadId");

-- CreateIndex
CREATE INDEX "CheckIn_createdAt_idx" ON "CheckIn"("createdAt");

-- CreateIndex
CREATE INDEX "TeamUpdate_checkInId_idx" ON "TeamUpdate"("checkInId");

-- CreateIndex
CREATE INDEX "TeamUpdate_discordUserId_idx" ON "TeamUpdate"("discordUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInReminder_checkInId_discordUserId_key" ON "CheckInReminder"("checkInId", "discordUserId");

-- AddForeignKey
ALTER TABLE "TeamUpdate" ADD CONSTRAINT "TeamUpdate_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInReminder" ADD CONSTRAINT "CheckInReminder_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

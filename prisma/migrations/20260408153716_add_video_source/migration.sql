-- CreateTable
CREATE TABLE "VideoSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aid" BIGINT NOT NULL,
    "lastRunAt" DATETIME NOT NULL,
    "deadAt" DATETIME,
    "upCanSee" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Capture" (
    "cid" BIGINT NOT NULL PRIMARY KEY,
    "pub" DATETIME,
    "segs" TEXT NOT NULL,
    "upLatest" DATETIME,
    "upMid" BIGINT,
    "videoSourceId" TEXT,
    CONSTRAINT "Capture_videoSourceId_fkey" FOREIGN KEY ("videoSourceId") REFERENCES "VideoSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Capture" ("cid", "pub", "segs", "upLatest", "upMid") SELECT "cid", "pub", "segs", "upLatest", "upMid" FROM "Capture";
DROP TABLE "Capture";
ALTER TABLE "new_Capture" RENAME TO "Capture";
CREATE TABLE "new_Config" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 0,
    "reqIntervalSec" INTEGER NOT NULL DEFAULT 10,
    "reqBatch" INTEGER NOT NULL DEFAULT 20,
    "rtIntervalSec" INTEGER NOT NULL DEFAULT 7200,
    "rtBatch" INTEGER NOT NULL DEFAULT 10,
    "hisIntervalSec" INTEGER NOT NULL DEFAULT 1800,
    "hisBatch" INTEGER NOT NULL DEFAULT 5,
    "spIntervalSec" INTEGER NOT NULL DEFAULT 86400,
    "spBatch" INTEGER NOT NULL DEFAULT 5,
    "upIntervalSec" INTEGER NOT NULL DEFAULT 7200,
    "upBatch" INTEGER NOT NULL DEFAULT 5,
    "upPool" INTEGER NOT NULL DEFAULT 500,
    "acIntervalSec" INTEGER NOT NULL DEFAULT 86400
);
INSERT INTO "new_Config" ("hisBatch", "hisIntervalSec", "id", "reqBatch", "reqIntervalSec", "rtBatch", "rtIntervalSec", "spBatch", "spIntervalSec", "upBatch", "upIntervalSec", "upPool") SELECT "hisBatch", "hisIntervalSec", "id", "reqBatch", "reqIntervalSec", "rtBatch", "rtIntervalSec", "spBatch", "spIntervalSec", "upBatch", "upIntervalSec", "upPool" FROM "Config";
DROP TABLE "Config";
ALTER TABLE "new_Config" RENAME TO "Config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "VideoSource_aid_key" ON "VideoSource"("aid");

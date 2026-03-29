-- CreateTable
CREATE TABLE "User" (
    "mid" BIGINT NOT NULL PRIMARY KEY,
    "uname" TEXT NOT NULL,
    "vip" BOOLEAN NOT NULL,
    "bauth_cookies" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Config" (
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
    "upPool" INTEGER NOT NULL DEFAULT 500
);

-- CreateTable
CREATE TABLE "Runtime" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 0,
    "lastUserMid" BIGINT
);

-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ctime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "msg" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Capture" (
    "cid" BIGINT NOT NULL PRIMARY KEY,
    "pub" DATETIME,
    "segs" TEXT NOT NULL,
    "upLatest" DATETIME,
    "upMid" BIGINT
);

-- CreateTable
CREATE TABLE "HisDate" (
    "cid" BIGINT NOT NULL,
    "date" DATETIME NOT NULL,
    "cached" TEXT NOT NULL,

    PRIMARY KEY ("cid", "date"),
    CONSTRAINT "HisDate_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Capture" ("cid") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FetchTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cid" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISABLED',
    "lastRunAt" DATETIME NOT NULL,
    "queueId" INTEGER,
    CONSTRAINT "FetchTask_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Capture" ("cid") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Clip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cid" BIGINT NOT NULL,
    "start" REAL NOT NULL,
    "end" REAL NOT NULL,
    "epOffset" REAL NOT NULL DEFAULT 0,
    "danmaku" BLOB,
    "danmakuUp" BLOB,
    "episodeId" TEXT,
    CONSTRAINT "Clip_cid_fkey" FOREIGN KEY ("cid") REFERENCES "Capture" ("cid") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Clip_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sn" INTEGER,
    "title" TEXT,
    "bgmtv" INTEGER,
    "tmdb" TEXT,
    "seasonId" TEXT,
    CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "bgmtv" INTEGER,
    "tmdb" TEXT
);

-- CreateIndex
CREATE INDEX "FetchTask_cid_type_status_idx" ON "FetchTask"("cid", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FetchTask_cid_type_key" ON "FetchTask"("cid", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Clip_cid_start_key" ON "Clip"("cid", "start");

-- CreateIndex
CREATE UNIQUE INDEX "Clip_cid_end_key" ON "Clip"("cid", "end");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_seasonId_sn_key" ON "Episode"("seasonId", "sn");


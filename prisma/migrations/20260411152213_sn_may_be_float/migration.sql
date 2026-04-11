/*
  Warnings:

  - You are about to alter the column `sn` on the `Episode` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sn" REAL,
    "title" TEXT,
    "bgmtv" INTEGER,
    "tmdb" TEXT,
    "seasonId" TEXT,
    CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("bgmtv", "id", "seasonId", "sn", "title", "tmdb") SELECT "bgmtv", "id", "seasonId", "sn", "title", "tmdb" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE UNIQUE INDEX "Episode_seasonId_sn_key" ON "Episode"("seasonId", "sn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

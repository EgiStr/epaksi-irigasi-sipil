-- CreateTable
CREATE TABLE "daerah_irigasi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "desa" TEXT NOT NULL,
    "luasLahan" REAL NOT NULL,
    "jenisIrigasi" TEXT NOT NULL,
    "kondisi" TEXT NOT NULL,
    "tahunBangun" INTEGER,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

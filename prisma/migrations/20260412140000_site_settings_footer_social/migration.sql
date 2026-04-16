-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "footerTelegramUrl" TEXT,
    "footerVkUrl" TEXT,
    "footerWhatsappUrl" TEXT,
    "footerMaxUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SiteSettings" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);

-- Sprint PD-1: Paywall Detection
-- Adds isPaywalled / paywallReason / paywallDetectedAt to IngestedArticle.
-- Adds isPaywalled / paywallReason to CurrentEvent (denormalized at publish time).

ALTER TABLE "IngestedArticle"
  ADD COLUMN "isPaywalled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "paywallReason" TEXT,
  ADD COLUMN "paywallDetectedAt" TIMESTAMP(3);

CREATE INDEX "IngestedArticle_isPaywalled_idx" ON "IngestedArticle"("isPaywalled");

ALTER TABLE "CurrentEvent"
  ADD COLUMN "isPaywalled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "paywallReason" TEXT;

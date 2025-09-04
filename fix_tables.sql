-- Drop existing tables if they exist with wrong names
DROP TABLE IF EXISTS "public"."User" CASCADE;
DROP TABLE IF EXISTS "public"."Admirer" CASCADE;
DROP TABLE IF EXISTS "public"."Hint" CASCADE;
DROP TABLE IF EXISTS "public"."Interaction" CASCADE;

-- Create tables with correct names (lowercase)
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."admirers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRevealed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admirers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."hints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admirerId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "isRevealed" BOOLEAN NOT NULL DEFAULT false,
    "revealedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hints_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."interactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hintId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."replies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "messageId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "replies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "public"."users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_cpf_key" ON "public"."users"("cpf");
CREATE INDEX IF NOT EXISTS "rate_limits_action_idx" ON "public"."rate_limits"("action");
CREATE INDEX IF NOT EXISTS "rate_limits_expiresAt_idx" ON "public"."rate_limits"("expiresAt");
CREATE UNIQUE INDEX IF NOT EXISTS "rate_limits_identifier_action_key" ON "public"."rate_limits"("identifier", "action");

-- Add foreign keys
ALTER TABLE "public"."admirers" DROP CONSTRAINT IF EXISTS "admirers_userId_fkey";
ALTER TABLE "public"."admirers" ADD CONSTRAINT "admirers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."hints" DROP CONSTRAINT IF EXISTS "hints_admirerId_fkey";
ALTER TABLE "public"."hints" ADD CONSTRAINT "hints_admirerId_fkey" FOREIGN KEY ("admirerId") REFERENCES "public"."admirers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."interactions" DROP CONSTRAINT IF EXISTS "interactions_hintId_fkey";
ALTER TABLE "public"."interactions" ADD CONSTRAINT "interactions_hintId_fkey" FOREIGN KEY ("hintId") REFERENCES "public"."hints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."replies" DROP CONSTRAINT IF EXISTS "replies_messageId_fkey";
ALTER TABLE "public"."replies" ADD CONSTRAINT "replies_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Adicionar colunas faltantes na tabela users
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "birthdate" DATE,
ADD COLUMN IF NOT EXISTS "whatsapp" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMPTZ,
DROP COLUMN IF EXISTS "isActive";

-- Atualizar tipos de dados para corresponder ao schema
ALTER TABLE "public"."users" 
ALTER COLUMN "email" TYPE VARCHAR(255),
ALTER COLUMN "password" TYPE VARCHAR(255),
ALTER COLUMN "name" TYPE VARCHAR(100),
ALTER COLUMN "cpf" TYPE VARCHAR(14),
ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ;

-- Adicionar coluna isAdmin se não existir
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN DEFAULT false;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "public"."users"("email");
CREATE INDEX IF NOT EXISTS "users_cpf_idx" ON "public"."users"("cpf");
CREATE INDEX IF NOT EXISTS "users_createdAt_idx" ON "public"."users"("createdAt");

-- Atualizar estrutura da tabela admirers
ALTER TABLE "public"."admirers" 
DROP COLUMN IF EXISTS "name",
DROP COLUMN IF EXISTS "description",
DROP COLUMN IF EXISTS "isRevealed",
DROP COLUMN IF EXISTS "updatedAt";

-- Atualizar estrutura da tabela hints
ALTER TABLE "public"."hints" 
ADD COLUMN IF NOT EXISTS "type" VARCHAR(50) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS "views" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "interactions" INTEGER DEFAULT 0,
DROP COLUMN IF EXISTS "isRevealed",
DROP COLUMN IF EXISTS "revealedAt",
DROP COLUMN IF EXISTS "updatedAt";

-- Atualizar estrutura da tabela interactions
ALTER TABLE "public"."interactions" 
ADD COLUMN IF NOT EXISTS "content" TEXT,
ADD COLUMN IF NOT EXISTS "answer" TEXT,
ADD COLUMN IF NOT EXISTS "answeredAt" TIMESTAMPTZ,
DROP COLUMN IF EXISTS "type",
DROP COLUMN IF EXISTS "data";

-- Atualizar estrutura da tabela messages
ALTER TABLE "public"."messages" 
ADD COLUMN IF NOT EXISTS "senderId" UUID,
ADD COLUMN IF NOT EXISTS "recipientId" UUID,
ADD COLUMN IF NOT EXISTS "recipientUsername" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "recipientEmail" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "recipientPhone" VARCHAR(20),
ADD COLUMN IF NOT EXISTS "contactMethod" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "views" INTEGER DEFAULT 0,
DROP COLUMN IF EXISTS "type",
DROP COLUMN IF EXISTS "metadata",
DROP COLUMN IF EXISTS "updatedAt";

-- Criar índices adicionais
CREATE INDEX IF NOT EXISTS "admirers_userId_idx" ON "public"."admirers"("userId");
CREATE INDEX IF NOT EXISTS "admirers_createdAt_idx" ON "public"."admirers"("createdAt");
CREATE INDEX IF NOT EXISTS "hints_admirerId_idx" ON "public"."hints"("admirerId");
CREATE INDEX IF NOT EXISTS "hints_type_idx" ON "public"."hints"("type");
CREATE INDEX IF NOT EXISTS "hints_createdAt_idx" ON "public"."hints"("createdAt");
CREATE INDEX IF NOT EXISTS "interactions_hintId_idx" ON "public"."interactions"("hintId");
CREATE INDEX IF NOT EXISTS "interactions_createdAt_idx" ON "public"."interactions"("createdAt");
CREATE INDEX IF NOT EXISTS "interactions_answeredAt_idx" ON "public"."interactions"("answeredAt");
CREATE INDEX IF NOT EXISTS "messages_senderId_idx" ON "public"."messages"("senderId");
CREATE INDEX IF NOT EXISTS "messages_recipientId_idx" ON "public"."messages"("recipientId");
CREATE INDEX IF NOT EXISTS "messages_recipientEmail_idx" ON "public"."messages"("recipientEmail");
CREATE INDEX IF NOT EXISTS "messages_createdAt_idx" ON "public"."messages"("createdAt");
CREATE INDEX IF NOT EXISTS "messages_isRead_idx" ON "public"."messages"("isRead");
CREATE INDEX IF NOT EXISTS "replies_messageId_idx" ON "public"."replies"("messageId");

-- Adicionar chaves estrangeiras se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admirers_userId_fkey') THEN
        ALTER TABLE "public"."admirers" ADD CONSTRAINT "admirers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hints_admirerId_fkey') THEN
        ALTER TABLE "public"."hints" ADD CONSTRAINT "hints_admirerId_fkey" FOREIGN KEY ("admirerId") REFERENCES "public"."admirers"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'interactions_hintId_fkey') THEN
        ALTER TABLE "public"."interactions" ADD CONSTRAINT "interactions_hintId_fkey" FOREIGN KEY ("hintId") REFERENCES "public"."hints"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'replies_messageId_fkey') THEN
        ALTER TABLE "public"."replies" ADD CONSTRAINT "replies_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."messages"("id") ON DELETE CASCADE;
    END IF;
END $$;
-- Enigma Crush Database Schema for Supabase
-- Migration: 001_initial_schema
-- Created: 2024-01-20

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "birthdate" DATE NOT NULL,
    "cpf" VARCHAR(14) UNIQUE NOT NULL,
    "whatsapp" VARCHAR(20),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "lastLogin" TIMESTAMPTZ,
    "isAdmin" BOOLEAN DEFAULT FALSE
);

-- Admirers table
CREATE TABLE IF NOT EXISTS "admirers" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Hints table
CREATE TABLE IF NOT EXISTS "hints" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "content" TEXT NOT NULL,
    "type" VARCHAR(50) DEFAULT 'text',
    "views" INTEGER DEFAULT 0,
    "interactions" INTEGER DEFAULT 0,
    "admirerId" UUID NOT NULL REFERENCES "admirers"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions table
CREATE TABLE IF NOT EXISTS "interactions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "content" TEXT NOT NULL,
    "answer" TEXT,
    "hintId" UUID NOT NULL REFERENCES "hints"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "answeredAt" TIMESTAMPTZ
);

-- Messages table
CREATE TABLE IF NOT EXISTS "messages" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "senderId" UUID NOT NULL,
    "recipientId" UUID,
    "recipientUsername" VARCHAR(100),
    "recipientEmail" VARCHAR(255),
    "recipientPhone" VARCHAR(20),
    "contactMethod" VARCHAR(50) NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" VARCHAR(500),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "isRead" BOOLEAN DEFAULT FALSE,
    "views" INTEGER DEFAULT 0
);

-- Replies table
CREATE TABLE IF NOT EXISTS "replies" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "messageId" UUID NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "fromRecipient" BOOLEAN DEFAULT FALSE
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "details" TEXT NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions table
CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "sessionToken" VARCHAR(255) UNIQUE NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "lastActivity" TIMESTAMPTZ DEFAULT NOW(),
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS "rate_limits" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "identifier" VARCHAR(255) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "attempts" INTEGER DEFAULT 1,
    "windowStart" TIMESTAMPTZ DEFAULT NOW(),
    "expiresAt" TIMESTAMPTZ NOT NULL,
    UNIQUE("identifier", "action")
);

-- Create indexes for better performance

-- Users indexes
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_cpf" ON "users"("cpf");
CREATE INDEX IF NOT EXISTS "idx_users_created_at" ON "users"("createdAt");

-- Admirers indexes
CREATE INDEX IF NOT EXISTS "idx_admirers_user_id" ON "admirers"("userId");
CREATE INDEX IF NOT EXISTS "idx_admirers_created_at" ON "admirers"("createdAt");

-- Hints indexes
CREATE INDEX IF NOT EXISTS "idx_hints_admirer_id" ON "hints"("admirerId");
CREATE INDEX IF NOT EXISTS "idx_hints_type" ON "hints"("type");
CREATE INDEX IF NOT EXISTS "idx_hints_created_at" ON "hints"("createdAt");

-- Interactions indexes
CREATE INDEX IF NOT EXISTS "idx_interactions_hint_id" ON "interactions"("hintId");
CREATE INDEX IF NOT EXISTS "idx_interactions_created_at" ON "interactions"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_interactions_answered_at" ON "interactions"("answeredAt");

-- Messages indexes
CREATE INDEX IF NOT EXISTS "idx_messages_sender_id" ON "messages"("senderId");
CREATE INDEX IF NOT EXISTS "idx_messages_recipient_id" ON "messages"("recipientId");
CREATE INDEX IF NOT EXISTS "idx_messages_recipient_email" ON "messages"("recipientEmail");
CREATE INDEX IF NOT EXISTS "idx_messages_created_at" ON "messages"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_messages_is_read" ON "messages"("isRead");

-- Replies indexes
CREATE INDEX IF NOT EXISTS "idx_replies_message_id" ON "replies"("messageId");
CREATE INDEX IF NOT EXISTS "idx_replies_created_at" ON "replies"("createdAt");

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_ip_address" ON "audit_logs"("ipAddress");

-- User sessions indexes
CREATE INDEX IF NOT EXISTS "idx_user_sessions_user_id" ON "user_sessions"("userId");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_session_token" ON "user_sessions"("sessionToken");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_expires_at" ON "user_sessions"("expiresAt");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_is_active" ON "user_sessions"("isActive");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_last_activity" ON "user_sessions"("lastActivity");

-- Rate limits indexes
CREATE INDEX IF NOT EXISTS "idx_rate_limits_identifier" ON "rate_limits"("identifier");
CREATE INDEX IF NOT EXISTS "idx_rate_limits_action" ON "rate_limits"("action");
CREATE INDEX IF NOT EXISTS "idx_rate_limits_expires_at" ON "rate_limits"("expiresAt");

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admirers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hints" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "replies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users policies
CREATE POLICY "Users can view own profile" ON "users"
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON "users"
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Admirers policies
CREATE POLICY "Users can view own admirers" ON "admirers"
    FOR SELECT USING (auth.uid()::text = "userId"::text);

CREATE POLICY "Users can create admirers" ON "admirers"
    FOR INSERT WITH CHECK (auth.uid()::text = "userId"::text);

-- Hints policies
CREATE POLICY "Users can view hints from their admirers" ON "hints"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "admirers" a 
            WHERE a.id = "admirerId" 
            AND a."userId"::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can create hints for their admirers" ON "hints"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "admirers" a 
            WHERE a.id = "admirerId" 
            AND a."userId"::text = auth.uid()::text
        )
    );

-- Messages policies
CREATE POLICY "Users can view own messages" ON "messages"
    FOR SELECT USING (auth.uid()::text = "senderId"::text);

CREATE POLICY "Users can create messages" ON "messages"
    FOR INSERT WITH CHECK (auth.uid()::text = "senderId"::text);

-- Create functions for common operations

-- Function to get user by email
CREATE OR REPLACE FUNCTION get_user_by_email(user_email TEXT)
RETURNS TABLE(
    id UUID,
    email VARCHAR(255),
    name VARCHAR(100),
    "createdAt" TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.name, u."createdAt"
    FROM "users" u
    WHERE u.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create audit log
CREATE OR REPLACE FUNCTION create_audit_log(
    user_id UUID,
    action_name VARCHAR(100),
    action_details TEXT,
    ip_addr VARCHAR(45) DEFAULT NULL,
    user_agent_str TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO "audit_logs" ("userId", "action", "details", "ipAddress", "userAgent")
    VALUES (user_id, action_name, action_details, ip_addr, user_agent_str)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM "user_sessions"
    WHERE "expiresAt" < NOW() OR "isActive" = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired rate limits
CREATE OR REPLACE FUNCTION clean_expired_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM "rate_limits"
    WHERE "expiresAt" < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.name,
    u.email,
    u."createdAt",
    COUNT(DISTINCT a.id) as admirers_count,
    COUNT(DISTINCT h.id) as hints_count,
    COUNT(DISTINCT m.id) as messages_sent,
    u."lastLogin"
FROM "users" u
LEFT JOIN "admirers" a ON u.id = a."userId"
LEFT JOIN "hints" h ON a.id = h."admirerId"
LEFT JOIN "messages" m ON u.id = m."senderId"
GROUP BY u.id, u.name, u.email, u."createdAt", u."lastLogin";

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Insert initial admin user (optional)
-- INSERT INTO "users" ("email", "password", "name", "birthdate", "cpf", "isAdmin")
-- VALUES (
--     'admin@enigmacrush.com',
--     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9S2', -- password: admin123
--     'Administrador',
--     '1990-01-01',
--     '00000000000',
--     TRUE
-- );

-- Create cleanup job (run daily)
-- This would typically be set up as a cron job or scheduled function
COMMENT ON FUNCTION clean_expired_sessions() IS 'Run daily to clean expired user sessions';
COMMENT ON FUNCTION clean_expired_rate_limits() IS 'Run hourly to clean expired rate limit entries';

-- Migration completed
SELECT 'Enigma Crush database schema created successfully!' as status;
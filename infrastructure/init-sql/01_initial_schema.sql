-- Initial database setup for Ethiopian Car Lottery Platform
-- This runs on first database initialization

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
        CREATE TYPE role_enum AS ENUM (
            'SUPER_ADMIN',
            'LOTTERY_MANAGER',
            'FINANCE_OFFICER',
            'KYC_OFFICER',
            'DRAW_OFFICER',
            'AUDITOR',
            'CUSTOMER_SUPPORT',
            'CONTENT_MANAGER'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'drawstate_enum') THEN
        CREATE TYPE drawstate_enum AS ENUM (
            'DRAFT',
            'SCHEDULED',
            'LOCKED',
            'DRAWING',
            'COMPLETED',
            'VERIFIED',
            'PUBLISHED',
            'CANCELLED'
        );
    END IF;

    -- Add more enums as needed...
END
$$;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE ethio_lottery TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;
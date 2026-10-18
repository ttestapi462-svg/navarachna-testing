-- ==============================================================================
-- Navarachna Designer Studio: Comprehensive DB Migration & Audit Schema Patch
-- Target: public.tbl_users & public.tbl_user_tokens
-- ==============================================================================

-- 1. Ensure table tbl_users exists
CREATE TABLE IF NOT EXISTS public.tbl_users
(
    id bigserial NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(500) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100),
    email character varying(200),
    phone_number character varying(20),
    is_active boolean NOT NULL DEFAULT true,
    is_locked boolean NOT NULL DEFAULT false,
    CONSTRAINT tbl_users_pkey PRIMARY KEY (id),
    CONSTRAINT tbl_users_username_key UNIQUE (username),
    CONSTRAINT tbl_users_email_key UNIQUE (email)
);

-- 2. Safely add missing Audit columns if they do not exist
ALTER TABLE public.tbl_users 
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
    ADD COLUMN IF NOT EXISTS created_by bigint,
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS updated_by bigint;

-- Convert existing timestamp without time zone to timestamp with time zone if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tbl_users' 
          AND column_name = 'created_at' 
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE public.tbl_users ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tbl_users' 
          AND column_name = 'updated_at' 
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE public.tbl_users ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'tbl_users' 
          AND column_name = 'last_login_at' 
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE public.tbl_users ALTER COLUMN last_login_at TYPE timestamp with time zone USING last_login_at AT TIME ZONE 'UTC';
    END IF;
END $$;

-- 3. Safely add Single Active Session & Security columns if they do not exist
ALTER TABLE public.tbl_users 
    ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lockout_until timestamp with time zone,
    ADD COLUMN IF NOT EXISTS active_session_id uuid,
    ADD COLUMN IF NOT EXISTS active_device_name character varying(150),
    ADD COLUMN IF NOT EXISTS session_started_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;

-- 4. Foreign Key Constraints for Audit fields (Self-referencing tbl_users)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_tbl_users_created_by' AND table_name = 'tbl_users'
    ) THEN
        ALTER TABLE public.tbl_users 
            ADD CONSTRAINT fk_tbl_users_created_by 
            FOREIGN KEY (created_by) REFERENCES public.tbl_users(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_tbl_users_updated_by' AND table_name = 'tbl_users'
    ) THEN
        ALTER TABLE public.tbl_users 
            ADD CONSTRAINT fk_tbl_users_updated_by 
            FOREIGN KEY (updated_by) REFERENCES public.tbl_users(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 5. Audit Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tbl_users_created_by ON public.tbl_users (created_by);
CREATE INDEX IF NOT EXISTS idx_tbl_users_updated_by ON public.tbl_users (updated_by);
CREATE INDEX IF NOT EXISTS idx_tbl_users_session_lookup ON public.tbl_users (id, active_session_id);

-- 6. User Tokens Table (For Refresh & Single Session Rotation)
CREATE TABLE IF NOT EXISTS public.tbl_user_tokens
(
    id bigserial NOT NULL,
    user_id bigint NOT NULL,
    session_id uuid NOT NULL,
    refresh_token character varying(500) NOT NULL,
    device_name character varying(150),
    ip_address character varying(50),
    is_revoked boolean NOT NULL DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT clock_timestamp(),
    revoked_at timestamp with time zone,
    revocation_reason character varying(100),
    CONSTRAINT tbl_user_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT tbl_user_tokens_refresh_key UNIQUE (refresh_token),
    CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id)
        REFERENCES public.tbl_users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tbl_user_tokens_user_session ON public.tbl_user_tokens (user_id, session_id);

-- 7. PostgreSQL Automated Trigger for updated_at
CREATE OR REPLACE FUNCTION public.fn_tbl_users_auto_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tbl_users_auto_update_timestamp ON public.tbl_users;
CREATE TRIGGER trg_tbl_users_auto_update_timestamp
    BEFORE UPDATE ON public.tbl_users
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_tbl_users_auto_update_timestamp();

-- 8. Seed Default Studio Admin User
INSERT INTO public.tbl_users (
    id, username, email, password_hash, first_name, last_name, phone_number,
    is_active, is_locked, created_at, created_by, updated_at, updated_by
)
VALUES (
    1, 'admin', 'admin@navarachna.com', 'Admin@1234', 'Studio', 'Admin', '+919876543210',
    true, false, clock_timestamp(), NULL, NULL, NULL
)
ON CONFLICT (username) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    password_hash = EXCLUDED.password_hash,
    is_active = true,
    is_locked = false;

-- Reset sequence to prevent ID conflict
SELECT setval(pg_get_serial_sequence('public.tbl_users', 'id'), COALESCE(MAX(id), 1)) FROM public.tbl_users;

-- 9. Enforce Single Active Session & Purge Older Records in tbl_user_tokens
-- tbl_user_tokens must never maintain older, revoked, superseded, or expired records
DELETE FROM public.tbl_user_tokens 
WHERE is_revoked = true 
   OR expires_at < clock_timestamp()
   OR id NOT IN (
       SELECT MAX(id) FROM public.tbl_user_tokens GROUP BY user_id
   );


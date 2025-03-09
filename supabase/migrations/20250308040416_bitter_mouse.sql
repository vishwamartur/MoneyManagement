/*
  # Add audit logging system

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `table_name` (text)
      - `record_id` (uuid)
      - `action` (text)
      - `old_data` (jsonb)
      - `new_data` (jsonb)
      - `created_at` (timestamp)
      - `ip_address` (text)

  2. Security
    - Enable RLS on audit_logs table
    - Add policy for authenticated users to read their own audit logs
*/

-- Create audit_logs table if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    action text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz DEFAULT now(),
    ip_address text
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$ BEGIN
  CREATE POLICY "Users can read own audit logs"
    ON audit_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS log_audit_event() CASCADE;

-- Create audit logging function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get current user ID from auth.uid()
  current_user_id := auth.uid();
  
  -- If no user ID is available, use a system user ID or NULL
  IF current_user_id IS NULL THEN
    current_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  INSERT INTO audit_logs (
    user_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  )
  VALUES (
    current_user_id,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    TG_OP,
    CASE
      WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE'
      THEN to_jsonb(OLD)
      ELSE NULL
    END,
    CASE
      WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE'
      THEN to_jsonb(NEW)
      ELSE NULL
    END
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
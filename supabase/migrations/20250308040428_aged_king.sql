/*
  # Add activity logging system

  1. New Tables
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `activity_type` (text)
      - `description` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamp)
      - `ip_address` (text)

  2. Security
    - Enable RLS on activity_logs table
    - Add policy for authenticated users to read their own activity logs
*/

-- Create activity_logs table if it doesn't exist
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    activity_type text NOT NULL,
    description text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    ip_address text
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$ BEGIN
  CREATE POLICY "Users can read own activity logs"
    ON activity_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS inventory_audit_trigger ON inventory_items;
DROP TRIGGER IF EXISTS transactions_audit_trigger ON transactions;
DROP TRIGGER IF EXISTS bills_audit_trigger ON bills;

-- Create triggers for main tables
DO $$ BEGIN
  CREATE TRIGGER inventory_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_event();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER transactions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_event();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER bills_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_event();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
/*
  # Add GST support for billing

  1. Updates
    - Add GST fields to bills table
    - Add GST calculation function
    - Update bill_items table with tax fields

  2. Changes
    - Add CGST and SGST fields
    - Add GST registration numbers
    - Add place of supply
*/

-- Add GST fields to bills table if they don't exist
DO $$ BEGIN
  ALTER TABLE bills
    ADD COLUMN IF NOT EXISTS gstin text,
    ADD COLUMN IF NOT EXISTS place_of_supply text DEFAULT 'Karnataka',
    ADD COLUMN IF NOT EXISTS cgst_rate decimal DEFAULT 9.0,
    ADD COLUMN IF NOT EXISTS sgst_rate decimal DEFAULT 9.0,
    ADD COLUMN IF NOT EXISTS cgst_amount decimal DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS sgst_amount decimal DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS total_with_gst decimal DEFAULT 0.0;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Add GST fields to bill_items table if they don't exist
DO $$ BEGIN
  ALTER TABLE bill_items
    ADD COLUMN IF NOT EXISTS cgst_amount decimal DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS sgst_amount decimal DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS taxable_amount decimal DEFAULT 0.0;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create or replace function to calculate GST
CREATE OR REPLACE FUNCTION calculate_gst()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate item level GST
  NEW.taxable_amount := NEW.quantity * NEW.unit_price;
  NEW.cgst_amount := (NEW.taxable_amount * 0.09);
  NEW.sgst_amount := (NEW.taxable_amount * 0.09);
  NEW.total := NEW.taxable_amount + NEW.cgst_amount + NEW.sgst_amount;

  -- Update bill totals
  WITH bill_totals AS (
    SELECT 
      SUM(taxable_amount) as total_taxable,
      SUM(cgst_amount) as total_cgst,
      SUM(sgst_amount) as total_sgst
    FROM bill_items
    WHERE bill_id = NEW.bill_id
  )
  UPDATE bills
  SET 
    total_amount = (SELECT total_taxable FROM bill_totals),
    cgst_amount = (SELECT total_cgst FROM bill_totals),
    sgst_amount = (SELECT total_sgst FROM bill_totals),
    total_with_gst = (
      SELECT (total_taxable + total_cgst + total_sgst)
      FROM bill_totals
    )
  WHERE id = NEW.bill_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
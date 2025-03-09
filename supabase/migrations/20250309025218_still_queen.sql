/*
  # Fix GST triggers and calculations

  1. Updates
    - Fix trigger function to handle NULL values
    - Add proper error handling
    - Ensure atomic updates
*/

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS calculate_gst_trigger ON bill_items;

-- Update the GST calculation function with better error handling
CREATE OR REPLACE FUNCTION calculate_gst()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate inputs
  IF NEW.quantity IS NULL OR NEW.unit_price IS NULL THEN
    RAISE EXCEPTION 'Quantity and unit price cannot be null';
  END IF;

  -- Calculate item level GST with proper rounding
  NEW.taxable_amount := ROUND((NEW.quantity * NEW.unit_price)::numeric, 2);
  NEW.cgst_amount := ROUND((NEW.taxable_amount * 0.09)::numeric, 2);
  NEW.sgst_amount := ROUND((NEW.taxable_amount * 0.09)::numeric, 2);
  NEW.total := ROUND((NEW.taxable_amount + NEW.cgst_amount + NEW.sgst_amount)::numeric, 2);

  -- Update bill totals
  UPDATE bills
  SET 
    total_amount = (
      SELECT ROUND(SUM(taxable_amount)::numeric, 2)
      FROM bill_items
      WHERE bill_id = NEW.bill_id
    ),
    cgst_amount = (
      SELECT ROUND(SUM(cgst_amount)::numeric, 2)
      FROM bill_items
      WHERE bill_id = NEW.bill_id
    ),
    sgst_amount = (
      SELECT ROUND(SUM(sgst_amount)::numeric, 2)
      FROM bill_items
      WHERE bill_id = NEW.bill_id
    ),
    total_with_gst = (
      SELECT ROUND(SUM(total)::numeric, 2)
      FROM bill_items
      WHERE bill_id = NEW.bill_id
    )
  WHERE id = NEW.bill_id;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error in calculate_gst: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER calculate_gst_trigger
AFTER INSERT OR UPDATE ON bill_items
FOR EACH ROW
EXECUTE FUNCTION calculate_gst();
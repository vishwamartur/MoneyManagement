/*
  # Add billing and stock movement tables

  1. New Tables
    - `bills`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `bill_number` (text)
      - `customer_name` (text)
      - `bill_date` (timestamp)
      - `total_amount` (decimal)
      - `payment_status` (text)
      - `notes` (text)
      - `created_at` (timestamp)
    
    - `bill_items`
      - `id` (uuid, primary key)
      - `bill_id` (uuid, references bills)
      - `item_id` (uuid, references inventory_items)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `total` (decimal)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bill_number text NOT NULL,
  customer_name text NOT NULL,
  bill_date timestamptz DEFAULT now(),
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create bill_items table
CREATE TABLE IF NOT EXISTS bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES bills(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES inventory_items(id) ON DELETE RESTRICT NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL,
  total decimal(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Enable RLS
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;

-- Policies for bills
CREATE POLICY "Users can view their own bills"
  ON bills
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bills"
  ON bills
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bills"
  ON bills
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for bill_items
CREATE POLICY "Users can view their own bill items"
  ON bill_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bills 
    WHERE bills.id = bill_items.bill_id 
    AND bills.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own bill items"
  ON bill_items
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM bills 
    WHERE bills.id = bill_items.bill_id 
    AND bills.user_id = auth.uid()
  ));

-- Function to generate bill number
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS trigger AS $$
BEGIN
  NEW.bill_number := 'BILL-' || to_char(NEW.created_at, 'YYYYMMDD') || '-' || 
                     LPAD(COALESCE(
                       (SELECT COUNT(*) + 1 FROM bills 
                        WHERE DATE_TRUNC('day', created_at) = DATE_TRUNC('day', NEW.created_at))::text,
                       '1'
                     ), 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for bill number generation
CREATE TRIGGER set_bill_number
  BEFORE INSERT ON bills
  FOR EACH ROW
  EXECUTE FUNCTION generate_bill_number();

-- Function to update bill total
CREATE OR REPLACE FUNCTION update_bill_total()
RETURNS trigger AS $$
BEGIN
  UPDATE bills
  SET total_amount = (
    SELECT COALESCE(SUM(total), 0)
    FROM bill_items
    WHERE bill_id = NEW.bill_id
  )
  WHERE id = NEW.bill_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for bill total update
CREATE TRIGGER update_bill_total_after_item_change
  AFTER INSERT OR UPDATE OR DELETE ON bill_items
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_total();
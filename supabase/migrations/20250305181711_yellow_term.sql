/*
  # Add inventory management tables

  1. New Tables
    - `inventory_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `description` (text)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `category` (text)
      - `reorder_point` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `inventory_transactions`
      - `id` (uuid, primary key)
      - `item_id` (uuid, references inventory_items)
      - `user_id` (uuid, references auth.users)
      - `type` (text: 'in' or 'out')
      - `quantity` (integer)
      - `notes` (text)
      - `transaction_date` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own inventory
*/

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 0,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  category text NOT NULL,
  reorder_point integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('in', 'out')),
  quantity integer NOT NULL,
  notes text,
  transaction_date timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for inventory_items
CREATE POLICY "Users can view their own inventory items"
  ON inventory_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory items"
  ON inventory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory items"
  ON inventory_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory items"
  ON inventory_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for inventory_transactions
CREATE POLICY "Users can view their own inventory transactions"
  ON inventory_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory transactions"
  ON inventory_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to update inventory quantity
CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'in' THEN
    UPDATE inventory_items
    SET quantity = quantity + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  ELSE
    UPDATE inventory_items
    SET quantity = quantity - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory updates
CREATE TRIGGER update_inventory_after_transaction
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_quantity();
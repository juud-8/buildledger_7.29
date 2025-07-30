-- Create counters tables for invoices and quotes
CREATE TABLE IF NOT EXISTS invoice_counters (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_counters (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION next_invoice_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_counter INTEGER;
  v_number TEXT;
BEGIN
  -- Get current year
  v_year := EXTRACT(YEAR FROM NOW());
  
  -- Insert or update counter for this user and year
  INSERT INTO invoice_counters (user_id, current_year, counter)
  VALUES (p_user_id, v_year, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    current_year = CASE 
      WHEN invoice_counters.current_year != v_year THEN v_year
      ELSE invoice_counters.current_year
    END,
    counter = CASE 
      WHEN invoice_counters.current_year != v_year THEN 1
      ELSE invoice_counters.counter + 1
    END,
    updated_at = NOW()
  RETURNING counter INTO v_counter;
  
  -- Format as YYYY-00001
  v_number := v_year || '-' || LPAD(v_counter::TEXT, 5, '0');
  
  RETURN v_number;
END;
$$;

-- Function to get next quote number
CREATE OR REPLACE FUNCTION next_quote_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_counter INTEGER;
  v_number TEXT;
BEGIN
  -- Get current year
  v_year := EXTRACT(YEAR FROM NOW());
  
  -- Insert or update counter for this user and year
  INSERT INTO quote_counters (user_id, current_year, counter)
  VALUES (p_user_id, v_year, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    current_year = CASE 
      WHEN quote_counters.current_year != v_year THEN v_year
      ELSE quote_counters.current_year
    END,
    counter = CASE 
      WHEN quote_counters.current_year != v_year THEN 1
      ELSE quote_counters.counter + 1
    END,
    updated_at = NOW()
  RETURNING counter INTO v_counter;
  
  -- Format as YYYY-00001
  v_number := v_year || '-' || LPAD(v_counter::TEXT, 5, '0');
  
  RETURN v_number;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON invoice_counters TO authenticated;
GRANT ALL ON quote_counters TO authenticated;
GRANT EXECUTE ON FUNCTION next_invoice_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION next_quote_number(UUID) TO authenticated;
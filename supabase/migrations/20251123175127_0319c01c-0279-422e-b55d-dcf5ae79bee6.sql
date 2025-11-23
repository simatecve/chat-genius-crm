-- Actualizar tabla contacts con nuevos campos
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS origin TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Migrar datos existentes: dividir name en first_name y last_name si es necesario
UPDATE contacts 
SET first_name = SPLIT_PART(name, ' ', 1),
    last_name = CASE 
      WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
      THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
      ELSE NULL 
    END
WHERE first_name IS NULL;

-- Actualizar columna name para que sea computed o actualizar trigger
CREATE OR REPLACE FUNCTION update_contact_full_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name = TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contact_full_name_trigger ON contacts;
CREATE TRIGGER contact_full_name_trigger
  BEFORE INSERT OR UPDATE OF first_name, last_name ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_full_name();
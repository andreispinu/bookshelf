-- Add email_confirmed to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_confirmed boolean DEFAULT false;

-- Update on_auth_user_created trigger function to set email_confirmed from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, first_name, trial_ends_at, email_confirmed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    NOW() + INTERVAL '14 days',
    (NEW.email_confirmed_at IS NOT NULL)
  );
  RETURN NEW;
END;
$$;

-- Function to sync email_confirmed from auth.users to profiles
CREATE OR REPLACE FUNCTION public.sync_email_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS DISTINCT FROM OLD.email_confirmed_at THEN
    UPDATE public.profiles
    SET email_confirmed = (NEW.email_confirmed_at IS NOT NULL)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users to sync email_confirmed
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_email_confirmed();

-- Backfill existing rows
UPDATE public.profiles p
SET email_confirmed = (u.email_confirmed_at IS NOT NULL)
FROM auth.users u
WHERE p.id = u.id;

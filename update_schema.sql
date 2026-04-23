-- 1. Aggiungi i nuovi campi alla tabella missions
ALTER TABLE public.missions ADD COLUMN "orderNumber" text;
ALTER TABLE public.missions ADD COLUMN "crewIds" uuid[] DEFAULT '{}';

-- 2. Crea la tabella profiles per gestire i volontari (sincronizzata con auth.users)
CREATE TABLE public.profiles (
    "id" uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    "email" text NOT NULL,
    "displayName" text,
    "role" text DEFAULT 'operator'
);

-- Abilita le policy per la tabella profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all authenticated users on profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable write access for all authenticated users on profiles" ON public.profiles FOR ALL TO authenticated USING (true);

-- 3. Crea il trigger per popolare automaticamente i profili quando crei un utente su Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, "displayName")
  VALUES (new.id, new.email, new.raw_user_meta_data->>'displayName');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Inserisci i profili degli utenti già esistenti (se ne avevi già creati)
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

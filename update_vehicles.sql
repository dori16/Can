-- Add vehicleId to missions for multi-vehicle support
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS "vehicleId" text REFERENCES public.vehicles("id");

-- Backfill existing missions with the default vehicle
UPDATE public.missions SET "vehicleId" = 'main-vehicle' WHERE "vehicleId" IS NULL;

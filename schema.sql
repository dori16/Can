-- Create vehicles table
CREATE TABLE public.vehicles (
    "id" text PRIMARY KEY,
    "model" text NOT NULL,
    "plate" text NOT NULL,
    "currentKm" numeric NOT NULL
);

-- Create missions table
CREATE TABLE public.missions (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "date" text NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text,
    "assignedBy" text NOT NULL,
    "status" text NOT NULL DEFAULT 'active',
    "notes" text,
    "weather" text,
    "temperature" numeric,
    "kmStart" numeric NOT NULL,
    "kmEnd" numeric,
    "fuelLiters" numeric,
    "fuelCost" numeric,
    "assignedTasks" text NOT NULL,
    "missionReport" text,
    "events" text,
    "createdAt" timestamptz DEFAULT now(),
    "updatedAt" timestamptz DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- Allow full access for authenticated users
CREATE POLICY "Enable all access for authenticated users on vehicles" ON public.vehicles FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users on missions" ON public.missions FOR ALL TO authenticated USING (true);

-- Insert the default vehicle
INSERT INTO public.vehicles ("id", "model", "plate", "currentKm")
VALUES ('main-vehicle', 'Fiat Ducato', 'ZA 123 BC', 12450)
ON CONFLICT ("id") DO NOTHING;

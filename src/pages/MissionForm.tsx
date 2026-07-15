import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarIcon, Clock, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MissionService, VehicleService } from '@/services/missionService';
import { UserService } from '@/services/userService';
import { supabase } from '@/lib/supabase';
import { Mission, Profile, Vehicle } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatProfileName, isMissionCreatedOnBehalfOfCoordinator, resolveProfileName, resolveVehicleLabel } from '@/lib/coordinator';

const missionSchema = z.object({
  date: z.string().min(1, 'La data è obbligatoria'),
  startTime: z.string().min(1, "L'ora di inizio è obbligatoria"),
  kmStart: z.number().min(0, 'I KM devono essere positivi'),
  assignedTasks: z.string().min(5, 'Inserire almeno una descrizione dei compiti'),
  notes: z.string().optional(),
});

type MissionFormValues = z.infer<typeof missionSchema>;

export const MissionForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialKm, setInitialKm] = useState(0);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [crew, setCrew] = useState<string[]>(['', '', '', '']);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<MissionFormValues>({
    resolver: zodResolver(missionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      startTime: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    }
  });

  useEffect(() => {
    const init = async () => {
      await VehicleService.initializeVehicle();
      const [vehicleList, p, { data: { session } }] = await Promise.all([
        VehicleService.getAllVehicles(),
        UserService.getProfiles(),
        supabase.auth.getSession(),
      ]);
      setVehicles(vehicleList);
      setProfiles(p);
      setCurrentUserId(session?.user?.id ?? null);

      const defaultVehicle = vehicleList.find(v => v.id === 'main-vehicle') ?? vehicleList[0];
      if (defaultVehicle) {
        setSelectedVehicleId(defaultVehicle.id);
        setInitialKm(defaultVehicle.currentKm);
        setValue('kmStart', defaultVehicle.currentKm);
      }
    };
    init();
  }, [setValue]);

  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setInitialKm(vehicle.currentKm);
      setValue('kmStart', vehicle.currentKm);
    }
  };

  const onSubmit = async (data: MissionFormValues) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const assignedBy = session?.user?.id || 'Admin';
      const finalCrewIds = crew.filter(id => id !== '' && id !== 'none');

      const missionId = await MissionService.createMission({
        ...data,
        assignedBy,
        crewIds: finalCrewIds,
        vehicleId: selectedVehicleId || undefined,
      });
      toast.success('Missione creata e inviata!');
      navigate(`/dashboard`);
    } catch (error) {
      console.error(error);
      toast.error('Errore durante la creazione della missione.');
    } finally {
      setLoading(false);
    }
  };

  const createdOnBehalfOfCoordinator = currentUserId
    ? isMissionCreatedOnBehalfOfCoordinator(profiles, currentUserId)
    : false;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-display-md">Nuova Missione</h1>
          {createdOnBehalfOfCoordinator && (
            <p className="text-body-md text-ink-mute mt-1">Per conto del coordinatore</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Base</CardTitle>
            <CardDescription>Inserisci i dettagli iniziali della missione operativa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-ink-secondary font-normal">Data</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
                  <Input id="date" type="date" {...register('date')} className="pl-10" />
                </div>
                {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-ink-secondary font-normal">Ora Inizio</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
                  <Input id="startTime" type="time" {...register('startTime')} className="pl-10" />
                </div>
                {errors.startTime && <p className="text-xs text-red-500">{errors.startTime.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-ink-secondary font-normal">Veicolo</Label>
              <Select value={selectedVehicleId || 'none'} onValueChange={handleVehicleChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona veicolo...">
                    {selectedVehicleId && selectedVehicleId !== 'none'
                      ? resolveVehicleLabel(vehicles, selectedVehicleId)
                      : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.model} — {v.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kmStart" className="text-ink-secondary font-normal">KM Inizio Missione (Lettura Tachimetro)</Label>
              <Input
                id="kmStart"
                type="number"
                {...register('kmStart', { valueAsNumber: true })}
                className="tabular-nums text-lg"
              />
              {errors.kmStart && <p className="text-xs text-destructive">{errors.kmStart.message}</p>}
              <p className="text-micro-cap text-ink-mute">Ultimo dato registrato: {initialKm} km</p>
            </div>

            <div className="pt-4 border-t border-hairline">
              <Label className="text-ink-secondary font-normal mb-3 block">Equipaggio (OdS)</Label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: "Autista", index: 0 },
                  { label: "Operatore 1", index: 1 },
                  { label: "Operatore 2", index: 2 },
                  { label: "Operatore 3", index: 3 }
                ].map((role) => (
                  <div key={role.index} className="space-y-2">
                    <Label className="text-micro-cap text-ink-mute">{role.label}</Label>
                    <Select value={crew[role.index] || "none"} onValueChange={(val) => {
                      const newCrew = [...crew];
                      newCrew[role.index] = val;
                      setCrew(newCrew);
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona...">
                          {crew[role.index] && crew[role.index] !== 'none'
                            ? resolveProfileName(profiles, crew[role.index])
                            : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessuno</SelectItem>
                        {profiles.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {formatProfileName(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compiti Assegnati</CardTitle>
            <CardDescription>Descrivi l'ordine di servizio per gli operatori.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assignedTasks" className="text-ink-secondary font-normal">Resoconto Compiti da Svolgere</Label>
              <Textarea
                id="assignedTasks"
                placeholder="Es: Trasporto paziente A da Loc A a Loc B..."
                className="min-h-[120px] resize-none rounded-md border-hairline-input"
                {...register('assignedTasks')}
              />
              {errors.assignedTasks && <p className="text-xs text-red-500">{errors.assignedTasks.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-ink-secondary font-normal">Note aggiuntive (opzionale)</Label>
              <Textarea
                id="notes"
                placeholder="Eventuali dettagli logistici o contatti..."
                className="resize-none rounded-md border-hairline-input"
                {...register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={() => navigate('/dashboard')} disabled={loading}>
            Annulla
          </Button>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Crea e Invia Missione
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Truck,
  ClipboardCheck,
  CloudSun,
  Save,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Loader2,
  ArrowLeft,
  Users,
  LogOut,
  Shield,
  Pencil,
  Calendar as CalendarIcon,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { MissionService, VehicleService } from '@/services/missionService';
import { UserService } from '@/services/userService';
import { generateMissionPDF } from '@/services/pdfService';
import { Mission, Profile, UserRole, Vehicle } from '@/types';
import {
  formatProfileName,
  getMissionCoordinatorLabel,
  canEditOdSHeader,
  canEditMissionReport,
  resolveProfileName,
  resolveVehicleLabel,
} from '@/lib/coordinator';
import { supabase } from '@/lib/supabase';

const reportSchema = z.object({
  kmEnd: z.number().min(1, 'Inserire i KM finali'),
  missionReport: z.string().min(10, 'Il resoconto deve essere più dettagliato'),
  events: z.string().optional(),
  temperature: z.number().optional().nullable(),
  weather: z.string().optional(),
  endTime: z.string().min(1, "L'ora di fine è obbligatoria"),
});

type ReportFormValues = z.infer<typeof reportSchema>;

interface MissionEditorProps {
  userRole: UserRole;
}

export const MissionEditor: React.FC<MissionEditorProps> = ({ userRole }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingOdS, setSavingOdS] = useState(false);
  const [editingOdS, setEditingOdS] = useState(false);

  const [odsDate, setOdsDate] = useState('');
  const [odsStartTime, setOdsStartTime] = useState('');
  const [odsKmStart, setOdsKmStart] = useState(0);
  const [odsAssignedTasks, setOdsAssignedTasks] = useState('');
  const [odsNotes, setOdsNotes] = useState('');
  const [odsVehicleId, setOdsVehicleId] = useState('');
  const [odsCrew, setOdsCrew] = useState<string[]>(['', '', '', '']);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
  });

  const canEditHeader = canEditOdSHeader(userRole);
  const canEditReport = mission && currentUserId
    ? canEditMissionReport(userRole, mission, currentUserId)
    : false;

  useEffect(() => {
    const fetchMission = async () => {
      if (!id) return;
      try {
        const [{ data: { session } }, data, p, v] = await Promise.all([
          supabase.auth.getSession(),
          MissionService.getMission(id),
          UserService.getProfiles(),
          VehicleService.getAllVehicles(),
        ]);
        setCurrentUserId(session?.user?.id ?? null);
        setProfiles(p);
        setVehicles(v);
        if (data) {
          setMission(data);
          reset({
            kmEnd: data.kmEnd || data.kmStart + 10,
            endTime: data.endTime || new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            missionReport: data.missionReport || '',
            events: data.events || '',
            temperature: data.temperature,
            weather: data.weather || '',
          });
          setOdsDate(data.date);
          setOdsStartTime(data.startTime);
          setOdsKmStart(data.kmStart);
          setOdsAssignedTasks(data.assignedTasks);
          setOdsNotes(data.notes || '');
          setOdsVehicleId(data.vehicleId || v[0]?.id || '');
          const crewSlots = ['', '', '', ''];
          data.crewIds?.forEach((cid, i) => {
            if (i < 4) crewSlots[i] = cid;
          });
          setOdsCrew(crewSlots);
        }
      } catch (error) {
        console.error(error);
        toast.error('Errore nel caricamento della missione');
      } finally {
        setLoading(false);
      }
    };
    fetchMission();
  }, [id, reset]);

  const selectedVehicle = vehicles.find(v => v.id === (mission?.vehicleId || odsVehicleId));

  const onSaveReport = async (values: ReportFormValues) => {
    if (!id || !mission || !canEditReport) return;
    setSaving(true);
    try {
      if (values.kmEnd < mission.kmStart) {
        toast.error('I KM finali non possono essere inferiori a quelli iniziali');
        setSaving(false);
        return;
      }

      await MissionService.updateMission(id, {
        ...values,
        status: mission.status,
      });

      if (values.kmEnd) {
        const vehicleId = mission.vehicleId || 'main-vehicle';
        await VehicleService.updateKm(vehicleId, values.kmEnd);
      }

      setMission(prev => prev ? { ...prev, ...values } : prev);
      toast.success(mission.status === 'completed' ? 'OdS chiuso aggiornato!' : 'Report aggiornato!');
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const onSaveDraft = async (values: ReportFormValues) => {
    if (!id || !canEditReport) return;
    setSaving(true);
    try {
      await MissionService.updateMission(id, { ...values, status: 'active' });
      toast.success('Bozza salvata!');
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const onCompleteMission = async (values: ReportFormValues) => {
    if (!id || !mission || !canEditReport) return;
    setSaving(true);
    try {
      if (values.kmEnd < mission.kmStart) {
        toast.error('I KM finali non possono essere inferiori a quelli iniziali');
        setSaving(false);
        return;
      }

      await MissionService.updateMission(id, { ...values, status: 'completed' });
      const vehicleId = mission.vehicleId || 'main-vehicle';
      await VehicleService.updateKm(vehicleId, values.kmEnd);
      toast.success('Missione completata!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Errore durante il completamento');
    } finally {
      setSaving(false);
    }
  };

  const onSaveOdS = async () => {
    if (!id || !canEditHeader) return;
    if (odsAssignedTasks.trim().length < 5) {
      toast.error('Inserire una descrizione dei compiti');
      return;
    }

    setSavingOdS(true);
    try {
      const finalCrewIds = odsCrew.filter(cid => cid !== '' && cid !== 'none');
      await MissionService.updateMission(id, {
        date: odsDate,
        startTime: odsStartTime,
        kmStart: odsKmStart,
        assignedTasks: odsAssignedTasks,
        notes: odsNotes || undefined,
        vehicleId: odsVehicleId || undefined,
        crewIds: finalCrewIds,
      });
      setMission(prev => prev ? {
        ...prev,
        date: odsDate,
        startTime: odsStartTime,
        kmStart: odsKmStart,
        assignedTasks: odsAssignedTasks,
        notes: odsNotes,
        vehicleId: odsVehicleId,
        crewIds: finalCrewIds,
      } : prev);
      setEditingOdS(false);
      toast.success('OdS aggiornato!');
    } catch (error) {
      toast.error('Errore durante il salvataggio OdS');
    } finally {
      setSavingOdS(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!mission) return;
    try {
      const crewNames = mission.crewIds?.map(cid => {
        const p = profiles.find(pr => pr.id === cid);
        return p ? formatProfileName(p) : 'Sconosciuto';
      }).join(', ') || 'Nessun equipaggio assegnato';

      const coordinatorName = getMissionCoordinatorLabel(profiles);
      const vehicleLabel = selectedVehicle
        ? `${selectedVehicle.model} (${selectedVehicle.plate})`
        : undefined;

      await generateMissionPDF({ ...mission, ...watch() as ReportFormValues }, crewNames, coordinatorName, vehicleLabel);
      toast.success('PDF generato!');
    } catch (error) {
      toast.error('Errore nella generazione del PDF');
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
  if (!mission) return <div className="text-center p-20">Missione non trovata.</div>;

  const isCompleted = mission.status === 'completed';
  const reportFieldsDisabled = !canEditReport;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="soft" className={isCompleted ? "" : ""}>
                {isCompleted ? 'Completata' : 'In Corso'}
              </Badge>
              <span className="text-caption text-ink-mute">OdS {mission.orderNumber || `#${id?.slice(0, 8)}`}</span>
            </div>
            <h1 className="text-display-md mt-2">Dettagli Ordine di Servizio</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {canEditHeader && (
            <Button
              variant={editingOdS ? 'default' : 'outline'}
              onClick={() => setEditingOdS(!editingOdS)}
              className="rounded-xl"
            >
              <Pencil className="w-4 h-4 mr-2" />
              {editingOdS ? 'Chiudi modifica' : isCompleted ? 'Modifica OdS chiuso' : 'Modifica OdS'}
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPDF} className="rounded-xl">
            <FileDown className="w-4 h-4 mr-2" />
            Report PDF
          </Button>
        </div>
      </div>

      {editingOdS && canEditHeader ? (
        <Card className="border-primary/20">
          <CardHeader className="bg-primary-subdued/30 border-b border-hairline">
            <CardTitle className="text-primary-deep">Modifica Ordine di Servizio</CardTitle>
            <CardDescription>
              {isCompleted
                ? 'Questa missione è chiusa: puoi comunque aggiornare tutti i dati dell\'OdS.'
                : 'Aggiorna i dati iniziali della missione. Disponibile per admin e coordinatori.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="odsDate">Data</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
                  <Input id="odsDate" type="date" value={odsDate} onChange={(e) => setOdsDate(e.target.value)} className="pl-10 h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="odsStartTime">Ora Inizio</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
                  <Input id="odsStartTime" type="time" value={odsStartTime} onChange={(e) => setOdsStartTime(e.target.value)} className="pl-10 h-11" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Veicolo</Label>
              <Select value={odsVehicleId || 'none'} onValueChange={setOdsVehicleId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleziona veicolo...">
                    {odsVehicleId && odsVehicleId !== 'none'
                      ? resolveVehicleLabel(vehicles, odsVehicleId)
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
              <Label htmlFor="odsKmStart">KM Inizio</Label>
              <Input id="odsKmStart" type="number" value={odsKmStart} onChange={(e) => setOdsKmStart(Number(e.target.value))} className="h-11 font-mono" />
            </div>

            <div className="space-y-2">
              <Label>Equipaggio</Label>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'Autista', index: 0 },
                  { label: 'Operatore 1', index: 1 },
                  { label: 'Operatore 2', index: 2 },
                  { label: 'Operatore 3', index: 3 },
                ].map((role) => (
                  <div key={role.index} className="space-y-2">
                    <Label className="text-micro-cap text-ink-mute">{role.label}</Label>
                    <Select
                      value={odsCrew[role.index] || 'none'}
                      onValueChange={(val) => {
                        const newCrew = [...odsCrew];
                        newCrew[role.index] = val;
                        setOdsCrew(newCrew);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona...">
                          {odsCrew[role.index] && odsCrew[role.index] !== 'none'
                            ? resolveProfileName(profiles, odsCrew[role.index])
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

            <div className="space-y-2">
              <Label htmlFor="odsAssignedTasks">Compiti Assegnati</Label>
              <Textarea
                id="odsAssignedTasks"
                value={odsAssignedTasks}
                onChange={(e) => setOdsAssignedTasks(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="odsNotes">Note (opzionale)</Label>
              <Textarea
                id="odsNotes"
                value={odsNotes}
                onChange={(e) => setOdsNotes(e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={onSaveOdS} disabled={savingOdS}>
                {savingOdS ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salva OdS
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="card-cream-band border-l-4 border-l-primary">
          <div>
            <p className="text-micro-cap text-primary mb-2">Compiti Operativi Assegnati</p>
            <p className="text-heading-sm leading-relaxed text-ink">
              {mission.assignedTasks}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-micro-cap text-ink-mute">
              {selectedVehicle && (
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  {selectedVehicle.model} — {selectedVehicle.plate}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                KM Inizio: {mission.kmStart}
              </div>
              <div className="flex items-center gap-1.5">
                <LogOut className="w-3.5 h-3.5 rotate-180" />
                Inizio: {mission.startTime}
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Coord: {getMissionCoordinatorLabel(profiles)}
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Eq: {mission.crewIds?.map(cid => {
                  const p = profiles.find(pr => pr.id === cid);
                  return p ? formatProfileName(p) : 'Sconosciuto';
                }).join(', ') || 'Nessuno'}
              </div>
            </div>
          </div>
        </div>
      )}

      {!canEditReport && !canEditHeader && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          Non hai i permessi per modificare questa missione. Puoi solo scaricare il report PDF.
        </div>
      )}

      <form className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="sleek-card overflow-hidden">
            <CardHeader className="bg-canvas-soft border-b border-hairline py-4">
              <CardTitle className="text-micro-cap text-ink-mute flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Utilizzo Veicolo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label htmlFor="kmEnd" className="text-ink-secondary font-normal">KM Rientro (Lettura Tachimetro)</Label>
                <Input
                  id="kmEnd"
                  type="number"
                  {...register('kmEnd', { valueAsNumber: true })}
                  className="tabular-nums text-lg"
                  disabled={reportFieldsDisabled}
                />
                {errors.kmEnd && <p className="text-[10px] text-red-500">{errors.kmEnd.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-ink-secondary font-normal">Ora Fine Servizio</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...register('endTime')}
                  disabled={reportFieldsDisabled}
                />
                {errors.endTime && <p className="text-[10px] text-red-500">{errors.endTime.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-canvas-soft border-b border-hairline">
              <CardTitle className="text-heading-sm flex items-center gap-2 text-primary">
                <ClipboardCheck className="w-5 h-5" />
                Relazione Operativa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="missionReport" className="text-ink-secondary font-normal">Resoconto Intervento</Label>
                <Textarea
                  id="missionReport"
                  placeholder="Descrivi cronologicamente le attività svolte..."
                  className="min-h-[250px] resize-none bg-canvas-soft/50 focus:bg-canvas"
                  {...register('missionReport')}
                  disabled={reportFieldsDisabled}
                />
                {errors.missionReport && <p className="text-[10px] text-destructive">{errors.missionReport.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="events" className="text-ink-secondary font-normal">Note e Osservazioni</Label>
                <Textarea
                  id="events"
                  placeholder="Segnala problemi al veicolo o criticità riscontrate..."
                  className="resize-none h-24 italic text-ink-mute"
                  {...register('events')}
                  disabled={reportFieldsDisabled}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader className="bg-canvas-soft border-b border-hairline">
              <CardTitle className="text-heading-sm flex items-center gap-2 text-primary-soft">
                <CloudSun className="w-5 h-5" />
                Condizioni Ambientali
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperatura (°C)</Label>
                <Input id="temperature" type="number" {...register('temperature', { valueAsNumber: true })} className="tabular-nums" disabled={reportFieldsDisabled} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weather">Meteo</Label>
                <Input id="weather" placeholder="Sereno, Variabile, Nebbia..." {...register('weather')} disabled={reportFieldsDisabled} />
              </div>
            </CardContent>
          </Card>

          {canEditReport && !isCompleted && (
            <div className="space-y-3 sticky top-24 pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-full font-normal border-hairline hover:bg-canvas-soft transition-all"
                onClick={handleSubmit(onSaveDraft)}
                disabled={saving}
              >
                {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salva Bozza
              </Button>
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={handleSubmit(onCompleteMission)}
                disabled={saving}
              >
                {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Chiudi Missione
              </Button>
              {Object.keys(errors).length > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                  <AlertCircle className="w-3 h-3" />
                  Campi obbligatori mancanti
                </div>
              )}
            </div>
          )}

          {canEditReport && isCompleted && (
            <div className="space-y-3 sticky top-24 pt-4">
              <p className="text-caption text-ink-mute text-center">
                OdS chiuso — puoi salvare le modifiche senza riaprirlo
              </p>
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={handleSubmit(onSaveReport)}
                disabled={saving}
              >
                {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salva modifiche
              </Button>
              {Object.keys(errors).length > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                  <AlertCircle className="w-3 h-3" />
                  Campi obbligatori mancanti
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

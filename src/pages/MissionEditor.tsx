import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { MissionService, VehicleService } from '@/services/missionService';
import { UserService } from '@/services/userService';
import { generateMissionPDF } from '@/services/pdfService';
import { Mission, Profile } from '@/types';
import { Link } from 'react-router-dom';
import { formatProfileName, getMissionCoordinatorLabel } from '@/lib/coordinator';

const reportSchema = z.object({
  kmEnd: z.number().min(1, 'Inserire i KM finali'),
  missionReport: z.string().min(10, 'Il resoconto deve essere più dettagliato'),
  events: z.string().optional(),
  temperature: z.number().optional().nullable(),
  weather: z.string().optional(),
  endTime: z.string().min(1, "L'ora di fine è obbligatoria"),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export const MissionEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
  });

  useEffect(() => {
    const fetchMission = async () => {
      if (!id) return;
      try {
        const [data, p] = await Promise.all([
          MissionService.getMission(id),
          UserService.getProfiles()
        ]);
        if (data) {
          setMission(data);
          setProfiles(p);
          reset({
            kmEnd: data.kmEnd || data.kmStart + 10,
            endTime: data.endTime || new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            missionReport: data.missionReport || '',
            events: data.events || '',
            temperature: data.temperature,
            weather: data.weather || '',
          });
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

  const onSaveDraft = async (values: ReportFormValues) => {
    if (!id) return;
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
    if (!id || !mission) return;
    setSaving(true);
    try {
      // Validate KM
      if (values.kmEnd < mission.kmStart) {
        toast.error('I KM finali non possono essere inferiori a quelli iniziali');
        setSaving(false);
        return;
      }

      await MissionService.updateMission(id, { ...values, status: 'completed' });
      await VehicleService.updateKm(values.kmEnd);
      toast.success('Missione completata!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Errore durante il completamento');
    } finally {
      setSaving(false);
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

      await generateMissionPDF({ ...mission, ...watch() as any }, crewNames, coordinatorName);
      toast.success('PDF generato!');
    } catch (error) {
      toast.error('Errore nella generazione del PDF');
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;
  if (!mission) return <div className="text-center p-20">Missione non trovata.</div>;

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
              <Badge variant="outline" className={mission.status === 'completed' ? "bg-green-50 text-green-700 underline border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                {mission.status === 'completed' ? 'Completata' : 'In Corso'}
              </Badge>
              <span className="text-sm text-slate-500 font-medium">OdS {mission.orderNumber || `#${id?.slice(0, 8)}`}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-2">Dettagli Ordine di Servizio</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF} className="rounded-xl">
            <FileDown className="w-4 h-4 mr-2" />
            Report PDF
          </Button>
        </div>
      </div>

      <div className="bg-brand-form-section rounded-lg p-6 border-l-4 border-brand-blue shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-bold text-brand-blue uppercase mb-2">Compiti Operativi Assegnati</p>
          <p className="text-lg font-semibold leading-relaxed text-slate-800">
            {mission.assignedTasks}
          </p>
          <div className="mt-4 flex items-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-wider">
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

      <form className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="sleek-card overflow-hidden">
            <CardHeader className="bg-brand-bg border-b border-brand-border py-4">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-blue" />
                Utilizzo Veicolo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 grid grid-cols-2 gap-x-8 gap-y-6">
               <div className="space-y-2">
                <Label htmlFor="kmEnd" className="font-bold text-slate-700">KM Rientro (Lettura Tachimetro)</Label>
                <Input 
                  id="kmEnd" 
                  type="number" 
                  {...register('kmEnd', { valueAsNumber: true })} 
                  className="font-mono text-lg h-11 border-slate-200"
                  disabled={mission.status === 'completed'}
                />
                {errors.kmEnd && <p className="text-[10px] text-red-500">{errors.kmEnd.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime" className="font-bold text-slate-700">Ora Fine Servizio</Label>
                <Input 
                  id="endTime" 
                  type="time" 
                  {...register('endTime')} 
                  className="h-11 border-slate-200"
                  disabled={mission.status === 'completed'}
                />
                {errors.endTime && <p className="text-[10px] text-red-500">{errors.endTime.message}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-green-600" />
                Relazione Operativa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="missionReport" className="font-bold text-slate-700">Resoconto Intervento</Label>
                <Textarea 
                  id="missionReport" 
                  placeholder="Descrivi cronologicamente le attività svolte..." 
                  className="min-h-[250px] resize-none rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white transition-colors"
                  {...register('missionReport')}
                  disabled={mission.status === 'completed'}
                />
                {errors.missionReport && <p className="text-[10px] text-red-500">{errors.missionReport.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="events" className="font-bold text-slate-700">Note e Osservazioni</Label>
                <Textarea 
                  id="events" 
                  placeholder="Segnala problemi al veicolo o criticità riscontrate..." 
                  className="resize-none h-24 rounded-xl border-slate-200 italic text-slate-600"
                  {...register('events')}
                  disabled={mission.status === 'completed'}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">


          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-sky-600">
                <CloudSun className="w-5 h-5" />
                Condizioni Ambientali
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperatura (°C)</Label>
                <Input id="temperature" type="number" {...register('temperature', { valueAsNumber: true })} className="border-slate-200" disabled={mission.status === 'completed'} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weather">Meteo</Label>
                <Input id="weather" placeholder="Sereno, Variabile, Nebbia..." {...register('weather')} className="border-slate-200" disabled={mission.status === 'completed'} />
              </div>
            </CardContent>
          </Card>

          {mission.status !== 'completed' && (
            <div className="space-y-3 sticky top-24 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 rounded-xl font-bold border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all"
                onClick={handleSubmit(onSaveDraft)}
                disabled={saving}
              >
                {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salva Bozza
              </Button>
              <Button 
                type="button" 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 font-bold transition-all hover:scale-105"
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
        </div>
      </form>
    </div>
  );
};


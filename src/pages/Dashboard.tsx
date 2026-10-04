import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, FileDown, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MissionService, VehicleService } from '@/services/missionService';
import { UserService } from '@/services/userService';
import {
  filterMissionsByMonth,
  generateMonthlyActivityReportPDF,
  generateMonthlyMissionsPDF,
  printMonthlyActivityReportPDF,
  printMonthlyMissionsPDF,
} from '@/services/pdfService';
import { Mission, Profile, Vehicle } from '@/types';
import { isAdminRole } from '@/lib/coordinator';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MONTH_OPTIONS = [
  { value: 1, label: 'Gennaio' },
  { value: 2, label: 'Febbraio' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Aprile' },
  { value: 5, label: 'Maggio' },
  { value: 6, label: 'Giugno' },
  { value: 7, label: 'Luglio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Settembre' },
  { value: 10, label: 'Ottobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Dicembre' },
];

export const Dashboard: React.FC<{ userRole?: string }> = ({ userRole }) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [printOpen, setPrintOpen] = useState(false);
  const [exportKind, setExportKind] = useState<'ods' | 'report'>('ods');
  const [exporting, setExporting] = useState(false);

  const now = new Date();
  const [printYear, setPrintYear] = useState(now.getFullYear());
  const [printMonth, setPrintMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await VehicleService.initializeVehicle();
        const [missionsData, vehiclesData, profilesData] = await Promise.all([
          MissionService.getAllMissions(),
          VehicleService.getAllVehicles(),
          UserService.getProfiles(),
        ]);
        setMissions(missionsData);
        setVehicles(vehiclesData);
        setProfiles(profilesData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const yearOptions = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    missions.forEach(m => {
      const y = Number(m.date?.slice(0, 4));
      if (!Number.isNaN(y) && y > 2000) years.add(y);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [missions]);

  const monthMissionCount = useMemo(
    () => filterMissionsByMonth(missions, printYear, printMonth).length,
    [missions, printYear, printMonth]
  );

  const handleDownloadMonth = async () => {
    setExporting(true);
    try {
      const count = await generateMonthlyMissionsPDF(
        missions,
        printYear,
        printMonth,
        profiles,
        vehicles
      );
      toast.success(`PDF scaricato: ${count} OdS`);
      setPrintOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Errore nella generazione del PDF';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const handlePrintMonth = async () => {
    setExporting(true);
    try {
      const count = await printMonthlyMissionsPDF(
        missions,
        printYear,
        printMonth,
        profiles,
        vehicles
      );
      toast.success(`Apertura stampa: ${count} OdS`);
      setPrintOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Errore nella stampa del PDF';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadReport = async () => {
    setExporting(true);
    try {
      const count = await generateMonthlyActivityReportPDF(missions, printYear, printMonth);
      toast.success(`Report scaricato: ${count} turni`);
      setPrintOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Errore nella generazione del report';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const handlePrintReport = async () => {
    setExporting(true);
    try {
      const count = await printMonthlyActivityReportPDF(missions, printYear, printMonth);
      toast.success(`Apertura stampa report: ${count} turni`);
      setPrintOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Errore nella stampa del report';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const openExport = (kind: 'ods' | 'report') => {
    setExportKind(kind);
    setPrintOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-display-lg">Gestione Missioni</h2>
          <p className="text-body-md text-ink-mute mt-1">
            {vehicles.length === 1
              ? `Veicolo: ${vehicles[0].model} — ${vehicles[0].plate}`
              : `${vehicles.length} veicoli registrati`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {isAdminRole(userRole ?? '') && (
            <Button variant="outline" onClick={() => openExport('report')}>
              <FileDown className="w-4 h-4 mr-2" />
              Report mensile
            </Button>
          )}
          {isAdminRole(userRole ?? '') && (
            <Button variant="outline" onClick={() => openExport('ods')}>
              <FileDown className="w-4 h-4 mr-2" />
              Stampa OdS mensili
            </Button>
          )}
          {isAdminRole(userRole ?? '') && (
            <Link to="/vehicle">
              <Button variant="outline">Gestisci Veicoli</Button>
            </Link>
          )}
          {isAdminRole(userRole ?? '') && (
            <Link to="/missions/new">
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Nuova Missione
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="sleek-card p-6">
          <p className="text-micro-cap text-ink-mute mb-2">Veicoli Attivi</p>
          <p className="text-display-md tabular-nums">{vehicles.length}</p>
          {vehicles.length > 0 && (
            <p className="text-caption mt-2 truncate">
              {vehicles.map(v => v.plate).join(', ')}
            </p>
          )}
        </Card>

        <Card className="sleek-card p-6">
          <p className="text-micro-cap text-ink-mute mb-2">Missioni Totali</p>
          <p className="text-display-md tabular-nums text-primary">{missions.length}</p>
        </Card>
      </div>

      <div className="sleek-card overflow-hidden">
        <div className="p-6 border-b border-hairline flex justify-between items-center bg-canvas-soft">
          <h3 className="text-micro-cap text-ink">Ultime Missioni</h3>
        </div>

        {missions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-canvas-soft w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-ink-mute/40" />
            </div>
            <h3 className="text-heading-md">Nessuna missione trovata</h3>
            <p className="text-body-md text-ink-mute max-w-sm mx-auto mt-2">
              Inizia creando la tua prima missione operativa.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-canvas-soft border-b border-hairline text-micro-cap text-ink-mute">
                <tr>
                  <th className="p-4">OdS</th>
                  <th className="p-4">Data</th>
                  <th className="p-4 text-center">Stato</th>
                  <th className="p-4 text-center">Km Percorsi</th>
                  <th className="p-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {missions.map((mission) => (
                  <tr key={mission.id} className="hover:bg-canvas-soft/80 transition-colors">
                    <td className="p-4 font-normal text-ink tabular-nums">
                      {mission.orderNumber || '--'}
                    </td>
                    <td className="p-4 text-ink-secondary">
                      {format(new Date(mission.date), 'dd MMM yyyy', { locale: it })}
                    </td>
                    <td className="p-4 text-center">
                      <span className={cn(
                        "sleek-badge",
                        mission.status === 'completed' ? "pill-tag-soft" :
                        mission.status === 'active' ? "bg-primary-subdued text-primary-deep" : "bg-muted text-ink-mute"
                      )}>
                        {mission.status === 'completed' ? 'Completata' :
                         mission.status === 'active' ? 'In Corso' : 'Bozza'}
                      </span>
                    </td>
                    <td className="p-4 text-center tabular-nums text-ink-secondary">
                      {mission.kmEnd ? `${mission.kmEnd - mission.kmStart} km` : '--'}
                    </td>
                    <td className="p-4 text-right">
                      <Link to={`/missions/${mission.id}`} className="text-primary font-normal text-sm hover:underline">
                        {mission.status === 'completed'
                          ? (isAdminRole(userRole ?? '') ? 'Modifica' : 'Report PDF')
                          : 'Gestisci'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {exportKind === 'report' ? 'Report mensile' : 'Stampa OdS mensili'}
            </DialogTitle>
            <DialogDescription>
              {exportKind === 'report'
                ? 'PDF con logo, mese di riferimento e tabella di data, turno e attività svolte.'
                : 'Genera un unico PDF con tutti gli Ordini di Servizio del mese selezionato.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>Mese</Label>
              <Select
                value={String(printMonth)}
                onValueChange={(val) => setPrintMonth(Number(val))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {MONTH_OPTIONS.find(m => m.value === printMonth)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map(m => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anno</Label>
              <Select
                value={String(printYear)}
                onValueChange={(val) => setPrintYear(Number(val))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{String(printYear)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-caption">
            {monthMissionCount === 0
              ? 'Nessun OdS in questo mese.'
              : exportKind === 'report'
                ? `${monthMissionCount} turni da includere nel report.`
                : `${monthMissionCount} OdS da includere nel PDF.`}
          </p>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setPrintOpen(false)} disabled={exporting}>
              Annulla
            </Button>
            <Button
              variant="outline"
              onClick={exportKind === 'report' ? handleDownloadReport : handleDownloadMonth}
              disabled={exporting || monthMissionCount === 0}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              Scarica PDF
            </Button>
            <Button
              onClick={exportKind === 'report' ? handlePrintReport : handlePrintMonth}
              disabled={exporting || monthMissionCount === 0}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
              )}
              Stampa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

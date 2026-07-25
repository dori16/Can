import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { MissionService, VehicleService } from '@/services/missionService';
import { Mission, Vehicle } from '@/types';
import { isAdminRole } from '@/lib/coordinator';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Dashboard: React.FC<{ userRole?: string }> = ({ userRole }) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await VehicleService.initializeVehicle();
        const [missionsData, vehiclesData] = await Promise.all([
          MissionService.getAllMissions(),
          VehicleService.getAllVehicles()
        ]);
        setMissions(missionsData);
        setVehicles(vehiclesData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
        <div className="flex gap-3">
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
    </div>
  );
};

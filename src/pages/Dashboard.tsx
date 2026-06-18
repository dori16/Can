import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { MissionCard } from '@/components/MissionCard';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, TrendingUp, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await VehicleService.initializeVehicle();
        const [missionsData, vehicleData] = await Promise.all([
          MissionService.getAllMissions(),
          VehicleService.getVehicle()
        ]);
        setMissions(missionsData);
        setVehicle(vehicleData);
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Gestione Missioni</h2>
          <p className="text-slate-500 font-medium">Veicolo: {vehicle?.model} - {vehicle?.plate}</p>
        </div>
        {isAdminRole(userRole ?? '') && (
          <Link to="/missions/new">
            <Button className="bg-brand-blue hover:bg-blue-700 text-white px-6 py-6 rounded-lg font-bold shadow-lg flex items-center space-x-2 transition-all hover:scale-[1.02]">
              <Plus className="w-5 h-5 mr-2" />
              <span>NUOVA MISSIONE</span>
            </Button>
          </Link>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="sleek-card p-6">
          <p className="text-sm text-slate-500 font-medium mb-1 uppercase tracking-wider">Km Attuali Veicolo</p>
          <p className="text-3xl font-bold text-slate-900">{vehicle?.currentKm?.toLocaleString() || '--'} km</p>
        </Card>
        
        <Card className="sleek-card p-6">
          <p className="text-sm text-slate-500 font-medium mb-1 uppercase tracking-wider">Missioni Totali</p>
          <p className="text-3xl font-bold text-brand-blue">{missions.length}</p>
        </Card>

        <Card className="sleek-card p-6">
          <p className="text-sm text-slate-500 font-medium mb-1 uppercase tracking-wider">Alert Veicolo</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
            <p className="text-lg font-bold text-amber-600">Controllo Pressione</p>
          </div>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-900 uppercase tracking-tight">Ultime Missioni</h3>
        </div>
        
        {missions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nessuna missione trovata</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2">Inizia creando la tua prima missione operativa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f8fafc] border-b-2 border-brand-border text-[11px] uppercase text-slate-500 font-bold tracking-widest">
                <tr>
                  <th className="p-4">OdS</th>
                  <th className="p-4">Data</th>
                  <th className="p-4 text-center">Stato</th>
                  <th className="p-4 text-center">Km Percorsi</th>
                  <th className="p-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 italic">
                {missions.map((mission) => (
                  <tr key={mission.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 font-bold text-slate-900">
                      {mission.orderNumber || '--'}
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      {format(new Date(mission.date), 'dd MMM yyyy', { locale: it })}
                    </td>
                    <td className="p-4 text-center">
                      <span className={cn(
                        "sleek-badge whitespace-nowrap",
                        mission.status === 'completed' ? "bg-blue-100 text-blue-700" :
                        mission.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {mission.status === 'completed' ? 'Completata' : 
                         mission.status === 'active' ? 'In Corso' : 'Bozza'}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono font-medium text-slate-600">
                      {mission.kmEnd ? `${mission.kmEnd - mission.kmStart} km` : '--'}
                    </td>
                    <td className="p-4 text-right">
                      <Link to={`/missions/${mission.id}`} className="text-brand-blue font-bold text-sm hover:underline">
                        {mission.status === 'completed' ? 'Report PDF' : 'Gestisci'}
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

import React from 'react';
import { Mission } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Truck, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MissionCardProps {
  mission: Mission;
}

const statusColors = {
  draft: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200',
  active: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
  completed: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
};

const statusLabels = {
  draft: 'Bozza',
  active: 'In Corso',
  completed: 'Completata',
};

export const MissionCard: React.FC<MissionCardProps> = ({ mission }) => {
  return (
    <Link to={`/missions/${mission.id}`} className="block group">
      <Card className="sleek-card hover:shadow-md transition-shadow duration-200 overflow-hidden relative">
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          mission.status === 'completed' ? "bg-brand-blue" :
          mission.status === 'active' ? "bg-green-500" : "bg-slate-300"
        )} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Ordine di servizio #{mission.id.slice(0, 8)}
              </p>
              <CardTitle className="text-base font-bold text-slate-900 group-hover:text-brand-blue transition-colors leading-tight">
                {mission.assignedTasks.split('\n')[0]}
              </CardTitle>
            </div>
            <span className={cn(
              "sleek-badge whitespace-nowrap",
              mission.status === 'completed' ? "bg-blue-50 text-blue-700" :
              mission.status === 'active' ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-500"
            )}>
              {statusLabels[mission.status]}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-tighter">
              <Calendar className="w-3.5 h-3.5 text-slate-300" />
              <span>{format(new Date(mission.date), 'dd MMM yyyy', { locale: it })}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-tighter">
              <Clock className="w-3.5 h-3.5 text-slate-300" />
              <span>{mission.startTime} {mission.endTime ? `- ${mission.endTime}` : ''}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Pencil, Plus, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { VehicleService } from '@/services/missionService';
import { Vehicle } from '@/types';

interface VehicleFormValues {
  model: string;
  plate: string;
  currentKm: number;
}

export const VehicleManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<VehicleFormValues>({ model: '', plate: '', currentKm: 0 });

  const loadVehicles = async () => {
    try {
      await VehicleService.initializeVehicle();
      const data = await VehicleService.getAllVehicles();
      setVehicles(data);
    } catch (error) {
      console.error(error);
      toast.error('Errore nel caricamento dei veicoli');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const openCreateDialog = () => {
    setEditingVehicle(null);
    setForm({ model: '', plate: '', currentKm: 0 });
    setDialogOpen(true);
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      model: vehicle.model,
      plate: vehicle.plate,
      currentKm: vehicle.currentKm,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.model.trim() || !form.plate.trim()) {
      toast.error('Modello e targa sono obbligatori');
      return;
    }

    setSaving(true);
    try {
      if (editingVehicle) {
        await VehicleService.updateVehicle(editingVehicle.id, {
          model: form.model.trim(),
          plate: form.plate.trim().toUpperCase(),
          currentKm: form.currentKm,
        });
        toast.success('Veicolo aggiornato');
      } else {
        await VehicleService.createVehicle(
          form.model.trim(),
          form.plate.trim().toUpperCase(),
          form.currentKm
        );
        toast.success('Veicolo aggiunto');
      }
      setDialogOpen(false);
      await loadVehicles();
    } catch (error) {
      console.error(error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-display-lg">Gestione Veicoli</h2>
            <p className="text-body-md text-ink-mute">Aggiungi e modifica le macchine operative</p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Aggiungi Veicolo
        </Button>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="w-12 h-12 text-ink-mute/30 mx-auto mb-4" />
            <h3 className="text-heading-md">Nessun veicolo registrato</h3>
            <p className="text-body-md text-ink-mute mt-2">Aggiungi il primo veicolo per iniziare.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="sleek-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-subdued p-2.5 rounded-md">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{vehicle.model}</CardTitle>
                      <CardDescription className="tabular-nums font-normal text-ink-secondary mt-0.5">
                        {vehicle.plate}
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(vehicle)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-micro-cap text-ink-mute">Km attuali</p>
                <p className="text-display-md tabular-nums">{vehicle.currentKm.toLocaleString()} km</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? 'Modifica Veicolo' : 'Nuovo Veicolo'}</DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? 'Aggiorna i dati del veicolo selezionato.'
                : 'Inserisci modello, targa e chilometraggio iniziale.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model">Modello</Label>
              <Input
                id="model"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="Es: Fiat Ducato"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plate">Targa</Label>
              <Input
                id="plate"
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: e.target.value })}
                placeholder="Es: ZA 123 BC"
                className="h-11 font-mono uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentKm">Chilometraggio attuale</Label>
              <Input
                id="currentKm"
                type="number"
                min={0}
                value={form.currentKm}
                onChange={(e) => setForm({ ...form, currentKm: Number(e.target.value) })}
                className="h-11 font-mono"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
                Annulla
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingVehicle ? 'Salva' : 'Aggiungi'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

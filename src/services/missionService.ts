import { supabase } from '@/lib/supabase';
import { Mission, Vehicle } from '@/types';

export const MissionService = {
  async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}/${month}/`;

    const startOfMonth = new Date(year, now.getMonth(), 1).toISOString();
    
    const { data, error } = await supabase
      .from('missions')
      .select('orderNumber')
      .gte('createdAt', startOfMonth);

    if (error) {
      console.error("Error generating order number", error);
      return `${prefix}1`; // Fallback
    }

    let maxNum = 0;
    if (data) {
      data.forEach(m => {
        if (m.orderNumber && m.orderNumber.startsWith(prefix)) {
          const numPart = parseInt(m.orderNumber.split('/')[2], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });
    }

    return `${prefix}${maxNum + 1}`;
  },

  async createMission(missionData: Partial<Mission>) {
    const orderNumber = await this.generateOrderNumber();
    const { data, error } = await supabase
      .from('missions')
      .insert([
        {
          ...missionData,
          orderNumber,
          status: 'active',
        }
      ])
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  },

  async updateMission(missionId: string, updates: Partial<Mission>) {
    const { error } = await supabase
      .from('missions')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', missionId);

    if (error) throw error;
  },

  async getMission(missionId: string): Promise<Mission | null> {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // PostgREST not found
      throw error;
    }
    return data as Mission;
  },

  async getAllMissions() {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data as Mission[];
  },

  async getActiveMissions() {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('status', 'active')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data as Mission[];
  }
};

export const VehicleService = {
  async getAllVehicles(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('model');

    if (error) throw error;
    return (data ?? []) as Vehicle[];
  },

  async getVehicle(id?: string): Promise<Vehicle | null> {
    if (id) {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as Vehicle;
    }

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', 'main-vehicle')
      .maybeSingle();

    if (error) throw error;
    if (data) return data as Vehicle;

    const { data: first, error: firstError } = await supabase
      .from('vehicles')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (firstError) throw firstError;
    return first as Vehicle | null;
  },

  async createVehicle(model: string, plate: string, currentKm: number): Promise<string> {
    const id = `veh-${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await supabase
      .from('vehicles')
      .insert([{ id, model, plate, currentKm }]);

    if (error) throw error;
    return id;
  },

  async updateVehicle(id: string, updates: Partial<Pick<Vehicle, 'model' | 'plate' | 'currentKm'>>) {
    const { error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteVehicle(id: string) {
    if (id === 'main-vehicle') {
      throw new Error('Cannot delete the default vehicle');
    }
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateKm(vehicleId: string, km: number) {
    const { error } = await supabase
      .from('vehicles')
      .update({ currentKm: km })
      .eq('id', vehicleId);

    if (error) throw error;
  },

  async initializeVehicle() {
    const vehicle = await this.getVehicle('main-vehicle');
    if (!vehicle) {
      const { error } = await supabase
        .from('vehicles')
        .insert([
          {
            id: 'main-vehicle',
            model: 'Fiat Ducato',
            plate: 'ZA 123 BC',
            currentKm: 12450
          }
        ]);
      if (error) {
        console.error("Error initializing vehicle", error);
      }
    }
  }
};

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
  async getVehicle(): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', 'main-vehicle')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as Vehicle;
  },

  async updateKm(km: number) {
    const { error } = await supabase
      .from('vehicles')
      .update({ currentKm: km })
      .eq('id', 'main-vehicle');

    if (error) throw error;
  },

  async initializeVehicle() {
    const vehicle = await this.getVehicle();
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

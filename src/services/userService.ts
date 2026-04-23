import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

export const UserService = {
  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('lastName', { ascending: true });

    if (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }
    
    return data as Profile[];
  }
};

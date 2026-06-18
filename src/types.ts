export type MissionStatus = 'draft' | 'active' | 'completed';

export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  currentKm: number;
}

export interface Profile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

export interface Mission {
  id: string;
  orderNumber?: string; // Auto-generated YYYY/MM/n+1
  date: string; // ISO format
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  assignedBy: string; // Admin userId or name
  crewIds?: string[]; // Array of volunteer profile IDs
  status: MissionStatus;
  notes?: string;
  weather?: string;
  temperature?: number;
  
  // Vehicle Data
  kmStart: number;
  kmEnd?: number;
  

  // Tasks
  assignedTasks: string;
  missionReport?: string;
  events?: string; // Problems or observations
  
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'editor' | 'coordinator';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
}

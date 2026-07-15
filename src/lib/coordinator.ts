import { Mission, Profile, Vehicle } from '@/types';

export function formatProfileName(profile: Profile): string {
  if (profile.firstName && profile.lastName) {
    return `${profile.lastName} ${profile.firstName}`.trim();
  }
  return profile.email.split('@')[0];
}

export function getCoordinatorProfile(profiles: Profile[]): Profile | undefined {
  return profiles.find(p => p.role === 'coordinator');
}

export function isCoordinatorProfile(profile: Profile): boolean {
  return profile.role === 'coordinator';
}

export function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'coordinator';
}

export function getMissionCoordinatorLabel(profiles: Profile[]): string {
  const coordinator = getCoordinatorProfile(profiles);
  if (coordinator) {
    return formatProfileName(coordinator);
  }

  return 'N/A';
}

export function isMissionCreatedOnBehalfOfCoordinator(profiles: Profile[], assignedBy: string): boolean {
  const coordinator = getCoordinatorProfile(profiles);
  if (!coordinator) return false;

  return assignedBy !== coordinator.id && assignedBy !== coordinator.email;
}

export function canManageVehicles(role: string): boolean {
  return isAdminRole(role);
}

export function canEditOdSHeader(role: string): boolean {
  return isAdminRole(role);
}

export function canEditMissionReport(role: string, mission: Mission, userId: string): boolean {
  if (isAdminRole(role)) return true;
  if (mission.status === 'completed') return false;
  return mission.crewIds?.includes(userId) ?? false;
}

export function resolveProfileName(profiles: Profile[], id: string): string {
  const profile = profiles.find(p => p.id === id);
  return profile ? formatProfileName(profile) : id;
}

export function formatVehicleLabel(vehicle: Vehicle): string {
  return `${vehicle.model} — ${vehicle.plate}`;
}

export function resolveVehicleLabel(vehicles: Vehicle[], id: string): string {
  const vehicle = vehicles.find(v => v.id === id);
  return vehicle ? formatVehicleLabel(vehicle) : id;
}

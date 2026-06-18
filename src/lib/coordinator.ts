import { Profile } from '@/types';

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

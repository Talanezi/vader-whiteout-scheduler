export const PRODUCTION_ROLE_MAP = {
  Production: [
    'Executive Producer',
    'Producer',
    'Co-Producer',
    '1st Assistant Director',
    '2nd Assistant Director',
    'Associate Producer',
    'Production Accountant',
  ],
  Creative: [
    'Director',
    'Storyboard Artist',
    'Director of Photography',
    '1st Assistant Camera',
    '2nd Assistant Camera',
    'Camera Operator',
    'Gaffer',
    'Key Grip',
    'Screenwriter',
    'Assistant Writer',
    'Casting Director',
    'Production Designer',
    'Art Director',
    'Set Dresser',
    'Property Master',
    'Assistant Props',
    'Costume Designer',
    'Lead Hair & Makeup Artist',
    'Key Makeup Artist',
    'Fight Choreographer',
    'Assistant Fight Choreographer',
    'Composer',
    'Actor',
  ],
  Cast: [
    'Darth Vader',
    'Anakin Skywalker',
    'Ada',
    'Torin',
    'Luke Skywalker',
    'Padmé Amidala',
    'Serenity Priestess',
    'Joy Priestess',
    'Anger Priestess',
    'Sadness Priestess',
    'Confusion Priestess',
  ],
  'Post-Production': [
    'Editor',
    'Assistant Editor',
    'Colorist',
    'Sound Designer',
    'ADR Supervisor',
    'VFX Supervisor',
  ],
  Marketing: [
    'Marketing Director',
    'Visual Lead',
    'Digital Lead',
    'BTS / Process Lead',
  ],
  'Production Support': [
    'Production Assistant',
  ],
} as const;

export type ProductionDepartment = keyof typeof PRODUCTION_ROLE_MAP;

export const PRODUCTION_DEPARTMENTS = Object.keys(
  PRODUCTION_ROLE_MAP,
) as ProductionDepartment[];

export function rolesForDepartment(department: ProductionDepartment | ''): string[] {
  if (!department) return [];
  return [...PRODUCTION_ROLE_MAP[department]];
}

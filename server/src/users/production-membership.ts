import { PRODUCTION_ROLE_MAP } from './production-roles';

export type VerifiedProductionMembership = {
  verified: true;
  userID: number;
  email: string;
  department: string;
  role: string;
  verifiedAt: string;
};
export type MembershipIdentity = {
  ID: number;
  Email: string;
  Department?: string;
  Role?: string;
};
export const membershipKey = (id: number) => `production-team:v1:${id}`;
export function validTeamAssignment(department: string, role: string): boolean {
  return Object.entries(PRODUCTION_ROLE_MAP).some(
    ([d, roles]) =>
      d === department && (roles as readonly string[]).includes(role),
  );
}
// Only trusted database operators can write these server-managed records.
// Signup/profile fields and email verification alone never create membership.
export function verifiedMembership(
  raw: string | null,
  user: MembershipIdentity,
): VerifiedProductionMembership | null {
  try {
    const record = JSON.parse(raw || 'null');
    if (
      !record ||
      record.version !== 1 ||
      record.status !== 'verified' ||
      !Number.isSafeInteger(user.ID) ||
      record.userID !== user.ID ||
      record.email !== user.Email.toLowerCase() ||
      record.department !== user.Department ||
      record.role !== user.Role ||
      !validTeamAssignment(record.department, record.role) ||
      typeof record.verifiedAt !== 'string' ||
      !Number.isFinite(Date.parse(record.verifiedAt)) ||
      typeof record.verifiedBy !== 'string' ||
      !record.verifiedBy.trim() ||
      typeof record.evidence !== 'string' ||
      !record.evidence.trim()
    )
      return null;
    return {
      verified: true,
      userID: user.ID,
      email: record.email,
      department: record.department,
      role: record.role,
      verifiedAt: record.verifiedAt,
    };
  } catch {
    return null;
  }
}

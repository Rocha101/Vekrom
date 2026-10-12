/** Permissões por bitmask (bigint). Soma de flags por membro via roles. */

export const PERMISSIONS = {
  VIEW_CHANNEL: 1n << 0n,
  SEND_MESSAGES: 1n << 1n,
  MANAGE_MESSAGES: 1n << 2n,
  MANAGE_CHANNELS: 1n << 3n,
  MANAGE_SERVER: 1n << 4n,
  MANAGE_ROLES: 1n << 5n,
  KICK_MEMBERS: 1n << 6n,
  BAN_MEMBERS: 1n << 7n,
  ADMINISTRATOR: 1n << 8n,
} as const;

export type PermissionName = keyof typeof PERMISSIONS;

export function combine(...perms: bigint[]): bigint {
  return perms.reduce((acc, p) => acc | p, 0n);
}

export function hasPermission(userPerms: bigint | string | number, required: bigint): boolean {
  const u = BigInt(userPerms);
  if ((u & PERMISSIONS.ADMINISTRATOR) === PERMISSIONS.ADMINISTRATOR) return true;
  return (u & required) === required;
}

export function hasAll(userPerms: bigint | string | number, required: bigint[]): boolean {
  return required.every((r) => hasPermission(userPerms, r));
}

export function hasAny(userPerms: bigint | string | number, required: bigint[]): boolean {
  return required.some((r) => hasPermission(userPerms, r));
}

export function serializePerms(perms: bigint): string {
  return perms.toString();
}

export function parsePerms(raw: string | number | bigint): bigint {
  try {
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

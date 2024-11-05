import Hashids from "hashids";

const cache: { [group: string]: Hashids } = {};

const TENANT_HASH_GROUP = "tenant";


export function fromHashid(value: string, group: string = "aimingle"): number {
    return getHasher(group).decode(value)[0] as number;
}
export function toHashid(value: number, group: string = "aimingle"): string {
    return getHasher(group).encode(value);
}
export function toTenantIdHash(id: number): string {
    return toHashid(id, TENANT_HASH_GROUP);
}

export function fromTenantIdHash(hash: string | undefined): number | undefined {
  if (!hash) return;

  try {
    return fromHashid(hash, TENANT_HASH_GROUP);
  } catch (err) {
    return;
  }
}


function getHasher(group: string): Hashids {
  if (!cache[group]) {
    cache[group] = new Hashids(group, 8);
  }
  return cache[group];
}

import { SIZE_BANDS, type SizeBandId } from "@config/size-bands";

export function sizeBandFor(followers: number): SizeBandId {
  const band = SIZE_BANDS.find((b) => followers >= b.min && followers < b.max);
  return (band ?? SIZE_BANDS[SIZE_BANDS.length - 1]).id;
}

export function sizeBandLabel(id: SizeBandId): string {
  return SIZE_BANDS.find((b) => b.id === id)?.label ?? id;
}

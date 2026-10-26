export function strlen(input: string | Uint8Array | null | undefined): number {
  return input?.length ?? 0;
}

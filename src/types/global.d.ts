// src/types/global.d.ts
// Module augmentations only — do NOT shadow real exports with `: any`,
// or every typo and missing field becomes invisible.

declare module "@/lib/constants" {
  export const OWNER_EMAIL: string;
}

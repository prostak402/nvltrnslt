import type { CompatibilityStatus } from "@/lib/types";

export interface CompatibilityResponse {
  games: Array<{
    id: number;
    name: string;
    renpyVersion: string;
    status: CompatibilityStatus;
    comment: string;
  }>;
  limitations: Array<{
    title: string;
    description: string;
  }>;
}

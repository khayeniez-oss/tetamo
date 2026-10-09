export type Phase1Attributes = Record<string, string | number | boolean | null | undefined>;
export type Phase1Stage = {
  phase(name: string, values?: Phase1Attributes): void;
  end(values?: Phase1Attributes): void;
  error(error: unknown): void;
};
export function phase1Stage(name: string, values?: Phase1Attributes, receivedAt?: number): Phase1Stage;
export function phase1Mark(name: string, values?: Phase1Attributes): void;
export function phase1Next<T>(stage: Phase1Stage, phase: string, value: T): T;
export function phase1Request<T>(stage: Phase1Stage, value: T): T;
export function phase1Response(stage: Phase1Stage, response: unknown): void;
export function phase1Result<T>(stage: Phase1Stage, value: T, branch: number): T;
export function phase1OpenAIOptions(): { fetch?: typeof globalThis.fetch };
export function phase1CallId(): string | null;
export function phase1Run<T>(ids: Phase1Attributes, operation: () => T): T;
export function phase1Headers(): Record<string, string>;
export function phase1RouteIds(request: { headers: Headers }): Phase1Attributes;
export function phase1Runtime(): Phase1Attributes;
export function phase1Flush(): void;

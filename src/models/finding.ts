export type Severity = 'error' | 'warning' | 'info';

export interface Finding {
  id: string;
  severity: Severity;
  message: string;
  file?: string;
  line?: number;
}

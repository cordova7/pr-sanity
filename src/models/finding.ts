export type Severity = 'info' | 'warning' | 'error';

export interface Finding {
  severity: Severity;
  title: string;
  explanation: string;
  file?: string;
}

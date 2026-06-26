import type { HealthFinding } from '../health-analyzer.interface.js';
import snapshot from './eshoponweb-snapshot.json' with { type: 'json' };

export interface DemoSnapshot {
  repoName: string;
  timestamp: string;
  findings: HealthFinding[];
}

const EXPECTED_TENSION_TYPES = [
  'result-pattern-inconsistency',
  'validation-strategy-inconsistency',
  'persistence-bypass',
  'cqrs-bypass',
] as const;

function isHealthFinding(value: unknown): value is HealthFinding {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const finding = value as Record<string, unknown>;

  return (
    typeof finding.module === 'string' &&
    typeof finding.tensionType === 'string' &&
    (finding.severity === 'critical' || finding.severity === 'warning') &&
    typeof finding.title === 'string' &&
    typeof finding.detail === 'string'
  );
}

function validateDemoSnapshot(data: unknown): DemoSnapshot {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Demo snapshot must be an object');
  }

  const record = data as Record<string, unknown>;

  if (typeof record.repoName !== 'string' || record.repoName.length === 0) {
    throw new Error('Demo snapshot missing repoName');
  }

  if (typeof record.timestamp !== 'string' || record.timestamp.length === 0) {
    throw new Error('Demo snapshot missing timestamp');
  }

  if (!Array.isArray(record.findings)) {
    throw new Error('Demo snapshot missing findings array');
  }

  const findings = record.findings;

  if (findings.length !== EXPECTED_TENSION_TYPES.length) {
    throw new Error(
      `Demo snapshot must contain exactly ${EXPECTED_TENSION_TYPES.length} findings`,
    );
  }

  for (const finding of findings) {
    if (!isHealthFinding(finding)) {
      throw new Error('Demo snapshot contains invalid finding');
    }
  }

  const tensionTypes = new Set(findings.map((finding) => finding.tensionType));

  for (const expectedType of EXPECTED_TENSION_TYPES) {
    if (!tensionTypes.has(expectedType)) {
      throw new Error(`Demo snapshot missing tension type: ${expectedType}`);
    }
  }

  return {
    repoName: record.repoName,
    timestamp: record.timestamp,
    findings,
  };
}

export function loadDemoSnapshot(): DemoSnapshot {
  return validateDemoSnapshot(snapshot);
}

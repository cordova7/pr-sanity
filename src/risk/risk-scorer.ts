import type { Finding } from '../models/finding.js';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface RiskRule {
  id: string;
  label: string;
  points: number;
  matches: (finding: Finding) => boolean;
}

export interface RiskBreakdownEntry {
  ruleId: string;
  label: string;
  points: number;
  count: number;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  breakdown: RiskBreakdownEntry[];
}

const RISK_RULES: RiskRule[] = [
  {
    id: 'missing-authorize',
    label: 'Missing Authorize',
    points: 25,
    matches: (finding) => finding.title === 'New endpoint missing [Authorize]',
  },
  {
    id: 'missing-migration',
    label: 'Missing Migration',
    points: 20,
    matches: (finding) => finding.title === 'Entity changes without migration',
  },
  {
    id: 'no-tests',
    label: 'No Tests',
    points: 15,
    matches: (finding) => finding.title === 'Business logic changed without tests',
  },
  {
    id: 'public-api-change',
    label: 'Public API Change',
    points: 10,
    matches: (finding) => finding.title.startsWith('Public '),
  },
];

function resolveRiskLevel(score: number): RiskLevel {
  if (score <= 33) {
    return 'Low';
  }

  if (score <= 66) {
    return 'Medium';
  }

  return 'High';
}

function findMatchingRule(finding: Finding): RiskRule | undefined {
  return RISK_RULES.find((rule) => rule.matches(finding));
}

const DISPLAY_LABEL_OVERRIDES: Record<string, string> = {
  'New endpoint missing [Authorize]': 'Missing Authorize',
  'Entity changes without migration': 'Entity Changed',
  'Business logic changed without tests': 'No Tests Modified',
};

export function getFindingDisplayLabel(finding: Finding): string {
  const override = DISPLAY_LABEL_OVERRIDES[finding.title];
  if (override) {
    return override;
  }

  const rule = findMatchingRule(finding);
  if (rule) {
    return rule.label;
  }

  return finding.title;
}

export function calculateRisk(findings: Finding[]): RiskAssessment {
  const breakdownMap = new Map<string, RiskBreakdownEntry>();

  for (const rule of RISK_RULES) {
    breakdownMap.set(rule.id, {
      ruleId: rule.id,
      label: rule.label,
      points: rule.points,
      count: 0,
    });
  }

  let total = 0;

  for (const finding of findings) {
    const rule = findMatchingRule(finding);
    if (!rule) {
      continue;
    }

    total += rule.points;
    const entry = breakdownMap.get(rule.id);
    if (entry) {
      entry.count += 1;
    }
  }

  const score = Math.min(total, 100);

  return {
    score,
    level: resolveRiskLevel(score),
    breakdown: Array.from(breakdownMap.values()).filter((entry) => entry.count > 0),
  };
}

export function formatRiskLevel(level: RiskLevel): string {
  return level;
}

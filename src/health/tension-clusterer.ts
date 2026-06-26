import type { HealthFinding } from './health-analyzer.interface.js';

export interface ModuleTensionSummary {
  module: string;
  tensionCount: number;
  criticalCount: number;
  tensions: { type: string; severity: string; title: string }[];
}

function splitModules(moduleField: string): string[] {
  return moduleField
    .split(',')
    .map((moduleName) => moduleName.trim())
    .filter((moduleName) => moduleName.length > 0);
}

export function clusterByModule(findings: HealthFinding[]): ModuleTensionSummary[] {
  const moduleMap = new Map<string, ModuleTensionSummary>();

  for (const finding of findings) {
    const modules = splitModules(finding.module);

    for (const moduleName of modules) {
      let summary = moduleMap.get(moduleName);

      if (summary === undefined) {
        summary = {
          module: moduleName,
          tensionCount: 0,
          criticalCount: 0,
          tensions: [],
        };
        moduleMap.set(moduleName, summary);
      }

      summary.tensionCount += 1;

      if (finding.severity === 'critical') {
        summary.criticalCount += 1;
      }

      summary.tensions.push({
        type: finding.tensionType,
        severity: finding.severity,
        title: finding.title,
      });
    }
  }

  return [...moduleMap.values()].sort((a, b) => {
    if (b.criticalCount !== a.criticalCount) {
      return b.criticalCount - a.criticalCount;
    }

    if (b.tensionCount !== a.tensionCount) {
      return b.tensionCount - a.tensionCount;
    }

    return a.module.localeCompare(b.module);
  });
}

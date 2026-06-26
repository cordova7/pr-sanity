import type { GitContext } from '../models/git-context.js';
import type { Finding } from '../models/finding.js';
import type { Analyzer } from './types.js';

const PUBLIC_CLASS = /public\s+(?:partial\s+)?class\s+(\w+)/;
const PUBLIC_INTERFACE = /public\s+interface\s+(\w+)/;
const PUBLIC_METHOD = /public\s+(?:static\s+)?(?:async\s+)?\S+\s+(\w+)\s*\(/;

export type PublicApiKind = 'class' | 'interface' | 'method';
export type PublicApiChangeType = 'added' | 'modified';

export interface PublicApiChange {
  kind: PublicApiKind;
  name: string;
  changeType: PublicApiChangeType;
}

interface PublicApiDeclaration {
  kind: PublicApiKind;
  name: string;
}

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function getFileName(file: string): string {
  const segments = normalizePath(file).split('/').filter(Boolean);
  return segments[segments.length - 1] ?? file;
}

export function isCSharpFile(file: string): boolean {
  return getFileName(file).toLowerCase().endsWith('.cs');
}

function extractFileDiff(diff: string, filePath: string): string | null {
  const normalizedTarget = normalizePath(filePath);
  const sections = diff.split(/\n(?=diff --git )/);

  for (const section of sections) {
    const headerMatch = section.match(/^diff --git a\/(.+?) b\/(.+?)$/m);
    if (headerMatch && normalizePath(headerMatch[2]) === normalizedTarget) {
      return section;
    }
  }

  return null;
}

function stripDiffPrefix(line: string): string {
  if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ')) {
    return line.slice(1);
  }

  return line;
}

function declarationKey(declaration: PublicApiDeclaration): string {
  return `${declaration.kind}:${declaration.name}`;
}

export function parsePublicApiDeclaration(line: string): PublicApiDeclaration | null {
  const trimmed = line.trim();

  const classMatch = PUBLIC_CLASS.exec(trimmed);
  if (classMatch) {
    return { kind: 'class', name: classMatch[1] };
  }

  const interfaceMatch = PUBLIC_INTERFACE.exec(trimmed);
  if (interfaceMatch) {
    return { kind: 'interface', name: interfaceMatch[1] };
  }

  const methodMatch = PUBLIC_METHOD.exec(trimmed);
  if (methodMatch) {
    return { kind: 'method', name: methodMatch[1] };
  }

  return null;
}

function collectHunkDeclarations(hunkLines: string[]): {
  removed: PublicApiDeclaration[];
  added: PublicApiDeclaration[];
} {
  const removed: PublicApiDeclaration[] = [];
  const added: PublicApiDeclaration[] = [];

  for (const line of hunkLines) {
    if (
      line.startsWith('@@') ||
      line.startsWith('+++') ||
      line.startsWith('---') ||
      line.startsWith('\\')
    ) {
      continue;
    }

    const content = stripDiffPrefix(line);
    const declaration = parsePublicApiDeclaration(content);
    if (!declaration) {
      continue;
    }

    if (line.startsWith('-')) {
      removed.push(declaration);
    } else if (line.startsWith('+')) {
      added.push(declaration);
    }
  }

  return { removed, added };
}

function classifyChanges(
  removed: PublicApiDeclaration[],
  added: PublicApiDeclaration[],
): PublicApiChange[] {
  const changes: PublicApiChange[] = [];
  const removedKeys = new Set(removed.map(declarationKey));

  for (const declaration of added) {
    const key = declarationKey(declaration);
    changes.push({
      kind: declaration.kind,
      name: declaration.name,
      changeType: removedKeys.has(key) ? 'modified' : 'added',
    });
  }

  return changes;
}

export function findPublicApiChanges(diff: string, filePath: string): PublicApiChange[] {
  const fileDiff = extractFileDiff(diff, filePath);
  if (fileDiff === null) {
    return [];
  }

  const changes: PublicApiChange[] = [];
  const hunks = fileDiff.split(/^@@/m);

  for (const hunk of hunks) {
    if (!hunk.trim()) {
      continue;
    }

    const hunkLines = hunk.split('\n');
    const { removed, added } = collectHunkDeclarations(hunkLines);
    changes.push(...classifyChanges(removed, added));
  }

  return changes;
}

function formatTitle(change: PublicApiChange): string {
  const kindLabel =
    change.kind === 'class' ? 'class' : change.kind === 'interface' ? 'interface' : 'method';
  const changeLabel = change.changeType === 'added' ? 'added' : 'modified';
  return `Public ${kindLabel} ${changeLabel}`;
}

function formatExplanation(change: PublicApiChange): string {
  const kindLabel =
    change.kind === 'class' ? 'class' : change.kind === 'interface' ? 'interface' : 'method';
  const changeLabel = change.changeType === 'added' ? 'added' : 'modified';
  return `Public ${kindLabel} \`${change.name}\` was ${changeLabel} in this diff.`;
}

export const publicApiAnalyzer: Analyzer = {
  async run(context: GitContext): Promise<Finding[]> {
    if (!context.diff) {
      return [];
    }

    const findings: Finding[] = [];

    for (const file of context.changedFiles.filter(isCSharpFile)) {
      const changes = findPublicApiChanges(context.diff, file);

      for (const change of changes) {
        findings.push({
          severity: 'info',
          title: formatTitle(change),
          explanation: formatExplanation(change),
          file,
        });
      }
    }

    return findings;
  },
};

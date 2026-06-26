import { simpleGit } from 'simple-git';
import type { GitContext } from '../models/git-context.js';
import type { Finding } from '../models/finding.js';
import { createGitService } from '../git/simple-git.service.js';
import type { Analyzer } from './types.js';

const CONTROLLER_FILE = /Controller\.cs$/i;
const HTTP_ATTRIBUTE = /\[Http(Get|Post|Put|Delete)(\([^)]*\))?\]/i;
const METHOD_SIGNATURE = /(?:public|private|protected|internal)\s+(?:async\s+)?\S+\s+(\w+)\s*\(/;
const CONTROLLER_AUTHORIZE = /\[Authorize[^\]]*\][\s\S]*?class\s+\w+Controller\b/;
const AUTHORIZE_ATTRIBUTE = /\[Authorize/i;
const ALLOW_ANONYMOUS_ATTRIBUTE = /\[AllowAnonymous/i;

export interface UnprotectedEndpoint {
  httpVerb: string;
  methodName?: string;
}

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function getFileName(file: string): string {
  const segments = normalizePath(file).split('/').filter(Boolean);
  return segments[segments.length - 1] ?? file;
}

export function isControllerFile(file: string): boolean {
  return getFileName(file).toLowerCase().endsWith('.cs') && CONTROLLER_FILE.test(getFileName(file));
}

export function hasControllerLevelAuthorize(source: string): boolean {
  return CONTROLLER_AUTHORIZE.test(source);
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

function parseAttributeBlock(
  hunkLines: string[],
  startIndex: number,
): { block: string; methodName?: string } {
  const blockLines: string[] = [];
  let methodName: string | undefined;

  for (let index = startIndex; index < hunkLines.length; index += 1) {
    const line = hunkLines[index];
    if (line.startsWith('@@')) {
      break;
    }

    if (line.startsWith('-')) {
      continue;
    }

    if (line.startsWith('+') || line.startsWith(' ')) {
      const content = stripDiffPrefix(line);
      blockLines.push(content);

      const methodMatch = METHOD_SIGNATURE.exec(content);
      if (methodMatch) {
        methodName = methodMatch[1];
        break;
      }
    }

    if (line.startsWith('\\')) {
      break;
    }
  }

  return { block: blockLines.join('\n'), methodName };
}

function isProtectedEndpoint(block: string): boolean {
  return AUTHORIZE_ATTRIBUTE.test(block) || ALLOW_ANONYMOUS_ATTRIBUTE.test(block);
}

export function findUnprotectedNewEndpoints(diff: string, filePath: string): UnprotectedEndpoint[] {
  const fileDiff = extractFileDiff(diff, filePath);
  if (fileDiff === null) {
    return [];
  }

  const endpoints: UnprotectedEndpoint[] = [];
  const hunks = fileDiff.split(/^@@/m);

  for (const hunk of hunks) {
    if (!hunk.trim()) {
      continue;
    }

    const hunkLines = hunk.split('\n');

    for (let index = 0; index < hunkLines.length; index += 1) {
      const line = hunkLines[index];
      if (!line.startsWith('+') || line.startsWith('+++')) {
        continue;
      }

      const content = stripDiffPrefix(line);
      const httpMatch = HTTP_ATTRIBUTE.exec(content);
      if (!httpMatch) {
        continue;
      }

      const { block, methodName } = parseAttributeBlock(hunkLines, index);
      if (isProtectedEndpoint(block)) {
        continue;
      }

      endpoints.push({
        httpVerb: httpMatch[1],
        methodName,
      });
    }
  }

  return endpoints;
}

function formatExplanation(endpoint: UnprotectedEndpoint): string {
  const verb = endpoint.httpVerb.toUpperCase();
  if (endpoint.methodName) {
    return `New ${verb} action \`${endpoint.methodName}\` was added without [Authorize] on the action or controller.`;
  }

  return `New ${verb} endpoint was added without [Authorize] on the action or controller.`;
}

async function gitShowFile(root: string, filePath: string, headRef: string): Promise<string> {
  const git = simpleGit(root);
  const normalized = normalizePath(filePath);
  return git.show([`${headRef}:${normalized}`]);
}

export const missingAuthorizeAnalyzer: Analyzer = {
  async run(context: GitContext): Promise<Finding[]> {
    if (!context.diff) {
      return [];
    }

    const git = createGitService();
    const { root } = await git.assertRepository();
    const findings: Finding[] = [];

    for (const file of context.changedFiles.filter(isControllerFile)) {
      let source: string;
      try {
        source = await gitShowFile(root, file, context.headRef);
      } catch {
        continue;
      }

      if (hasControllerLevelAuthorize(source)) {
        continue;
      }

      const endpoints = findUnprotectedNewEndpoints(context.diff, file);
      for (const endpoint of endpoints) {
        findings.push({
          severity: 'warning',
          title: 'New endpoint missing [Authorize]',
          explanation: formatExplanation(endpoint),
          file,
        });
      }
    }

    return findings;
  },
};

import type { BaselineDiff } from './baseline.js';
import { calculateHealthScore } from './baseline.js';
import type { HealthFinding } from './health-analyzer.interface.js';
import {
  PASSING_PLACEHOLDERS,
  parseDetailSegments,
  tensionShortLabel,
  TENSION_SUBTITLES,
} from './health-reporter.js';
import type { ModuleTensionSummary } from './tension-clusterer.js';

const COLORS = {
  bg: '#0d1117',
  text: '#c9d1d9',
  muted: '#8b949e',
  border: '#30363d',
  critical: '#f85149',
  warning: '#d29922',
  passing: '#3fb950',
  new: '#39c5cf',
  scoreGreen: '#3fb950',
  scoreYellow: '#d29922',
  scoreRed: '#f85149',
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function scoreColor(score: number): string {
  if (score > 80) {
    return COLORS.scoreGreen;
  }

  if (score >= 60) {
    return COLORS.scoreYellow;
  }

  return COLORS.scoreRed;
}

function severityColor(severity: string): string {
  if (severity === 'critical') {
    return COLORS.critical;
  }

  if (severity === 'warning') {
    return COLORS.warning;
  }

  return COLORS.passing;
}

function severityIcon(severity: string): string {
  if (severity === 'critical') {
    return '●';
  }

  if (severity === 'warning') {
    return '◐';
  }

  return '✓';
}

function formatBaselineDeltaHtml(diff: BaselineDiff): string {
  if (diff.scoreDelta === 0) {
    return `<span class="muted">no change since last scan</span>`;
  }

  if (diff.scoreDelta < 0) {
    return `<span style="color:${COLORS.critical}">↓${Math.abs(diff.scoreDelta)} since last scan</span>`;
  }

  return `<span style="color:${COLORS.passing}">↑${diff.scoreDelta} since last scan</span>`;
}

function formatSeverityBadgeHtml(severity: HealthFinding['severity'], isNew: boolean): string {
  const label = severity === 'critical' ? 'CRITICAL' : 'WARNING';
  const color = severityColor(severity);
  const newBadge = isNew ? `<span class="badge new">NEW</span>` : '';

  return `<span class="badge" style="color:${color};border-color:${color}">${label}</span>${newBadge}`;
}

function formatFindingSubtitle(finding: HealthFinding): string {
  const parsedSegments = parseDetailSegments(finding.detail);

  if (parsedSegments !== null) {
    return `${parsedSegments.length} competing approaches detected`;
  }

  return TENSION_SUBTITLES[finding.tensionType] ?? finding.detail;
}

function renderTensionBadges(cluster: ModuleTensionSummary): string {
  return cluster.tensions
    .map((tension) => {
      const color = severityColor(tension.severity);
      const icon = severityIcon(tension.severity);
      const label = escapeHtml(tensionShortLabel(tension.type));
      return `<span class="badge" style="color:${color};border-color:${color}">${icon} ${label}</span>`;
    })
    .join(' ');
}

function renderBaselineDiffPanel(diff: BaselineDiff): string {
  const newItems =
    diff.newTensions.length > 0
      ? diff.newTensions
          .map(
            (finding) =>
              `<li>${formatSeverityBadgeHtml(finding.severity, true)} ${escapeHtml(finding.title)}</li>`,
          )
          .join('')
      : '<li class="muted">None</li>';

  const resolvedItems =
    diff.resolvedTensions.length > 0
      ? diff.resolvedTensions
          .map(
            (finding) =>
              `<li>${formatSeverityBadgeHtml(finding.severity, false)} ${escapeHtml(finding.title)}</li>`,
          )
          .join('')
      : '<li class="muted">None</li>';

  return `
    <section class="section">
      <h2>Baseline Comparison</h2>
      <p>Score delta: ${formatBaselineDeltaHtml(diff)}</p>
      ${
        diff.worseningModules.length > 0
          ? `<p class="muted">Worsening modules: ${escapeHtml(diff.worseningModules.join(', '))}</p>`
          : ''
      }
      <div class="baseline-grid">
        <div>
          <h3>New tensions</h3>
          <ul>${newItems}</ul>
        </div>
        <div>
          <h3>Resolved tensions</h3>
          <ul>${resolvedItems}</ul>
        </div>
      </div>
    </section>`;
}

function renderModuleTable(clusters: ModuleTensionSummary[]): string {
  if (clusters.length === 0) {
    return '';
  }

  const rows = clusters
    .map(
      (cluster) => `
        <tr>
          <td>${escapeHtml(cluster.module)}</td>
          <td>${cluster.tensionCount}</td>
          <td>${renderTensionBadges(cluster)}</td>
        </tr>`,
    )
    .join('');

  return `
    <section class="section">
      <h2>Module Drift</h2>
      <table>
        <thead>
          <tr>
            <th>Module</th>
            <th>Tensions</th>
            <th>Types</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function renderFindingDetails(finding: HealthFinding, isNew: boolean): string {
  const parsedSegments = parseDetailSegments(finding.detail);
  let body = `<p class="subtitle">${escapeHtml(formatFindingSubtitle(finding))}</p>`;

  if (parsedSegments !== null) {
    body += '<ul class="detail-list">';
    for (const segment of parsedSegments) {
      const suffix = segment.dominant ? '(dominant)' : '← non-dominant';
      body += `<li><code>${escapeHtml(segment.label)}</code> ${segment.percentage}% <span class="muted">${suffix}</span></li>`;
    }
    body += '</ul>';
  } else {
    body += `<p>${escapeHtml(finding.detail)}</p>`;
  }

  body += `<p><strong>Modules:</strong> ${escapeHtml(finding.module)}</p>`;

  if (finding.affectedFiles !== undefined && finding.affectedFiles.length > 0) {
    body += '<p class="muted">Affected files:</p><ul class="file-list">';
    for (const file of finding.affectedFiles) {
      body += `<li><code>${escapeHtml(file)}</code></li>`;
    }
    body += '</ul>';
  }

  const icon = severityIcon(finding.severity);
  const color = severityColor(finding.severity);

  return `
    <details class="tension">
      <summary>
        <span style="color:${color}">${icon}</span>
        ${escapeHtml(finding.title)}
        ${formatSeverityBadgeHtml(finding.severity, isNew)}
      </summary>
      <div class="tension-body">${body}</div>
    </details>`;
}

function renderTensionsSection(findings: HealthFinding[], diff: BaselineDiff | null): string {
  if (findings.length === 0) {
    return `<p class="passing-message">No architectural tensions detected</p>`;
  }

  const newTensionTypes = new Set(diff?.newTensions.map((finding) => finding.tensionType) ?? []);
  const sortedFindings = [...findings].sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }

    return a.title.localeCompare(b.title);
  });

  const items = sortedFindings
    .map((finding) => renderFindingDetails(finding, newTensionTypes.has(finding.tensionType)))
    .join('');

  return `
    <section class="section">
      <h2>Tensions</h2>
      ${items}
    </section>`;
}

function renderPassingSection(): string {
  const items = PASSING_PLACEHOLDERS.map(
    (label) => `<li><span style="color:${COLORS.passing}">✓</span> ${escapeHtml(label)}</li>`,
  ).join('');

  return `
    <section class="section">
      <h2>Passing</h2>
      <ul class="passing-list">${items}</ul>
    </section>`;
}

export function buildHealthHtml(
  findings: HealthFinding[],
  clusters: ModuleTensionSummary[],
  baseline: BaselineDiff | null,
  repoName: string,
): string {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const score = calculateHealthScore(findings);
  const scoreStyle = scoreColor(score);
  const deltaHtml = baseline !== null ? ` <span class="delta">${formatBaselineDeltaHtml(baseline)}</span>` : '';

  const summaryLine =
    findings.length === 0
      ? ''
      : `<p>${findings.length} tension${findings.length === 1 ? '' : 's'} detected across ${clusters.length} module${clusters.length === 1 ? '' : 's'}</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Architecture Drift Report · ${escapeHtml(repoName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2rem;
      background: ${COLORS.bg};
      color: ${COLORS.text};
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      line-height: 1.5;
    }
    h1, h2, h3 { margin: 0 0 0.75rem; font-weight: 600; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.1rem; color: ${COLORS.text}; }
    h3 { font-size: 0.95rem; color: ${COLORS.muted}; }
    p { margin: 0 0 0.75rem; }
    .header, .section, .footer { margin-bottom: 2rem; }
    .timestamp, .muted { color: ${COLORS.muted}; }
    .score { font-size: 1.25rem; font-weight: 700; }
    .delta { font-weight: 400; font-size: 1rem; }
    .passing-message { color: ${COLORS.passing}; }
    .section { border-top: 1px solid ${COLORS.border}; padding-top: 1.5rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 1px solid ${COLORS.border}; vertical-align: top; }
    th { color: ${COLORS.muted}; font-weight: 600; }
    .badge {
      display: inline-block;
      margin-right: 0.35rem;
      padding: 0.1rem 0.45rem;
      border: 1px solid ${COLORS.border};
      border-radius: 999px;
      font-size: 0.75rem;
      white-space: nowrap;
    }
    .badge.new { color: ${COLORS.new}; border-color: ${COLORS.new}; }
    .tension {
      border: 1px solid ${COLORS.border};
      border-radius: 6px;
      margin-bottom: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
    }
    summary {
      cursor: pointer;
      padding: 0.85rem 1rem;
      list-style: none;
    }
    summary::-webkit-details-marker { display: none; }
    .tension-body { padding: 0 1rem 1rem; border-top: 1px solid ${COLORS.border}; }
    .subtitle { color: ${COLORS.muted}; }
    .detail-list, .file-list, .passing-list, ul { margin: 0.5rem 0 0; padding-left: 1.25rem; }
    code { color: ${COLORS.text}; }
    .baseline-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .footer { border-top: 1px solid ${COLORS.border}; padding-top: 1rem; color: ${COLORS.muted}; font-size: 0.85rem; }
    @media (max-width: 768px) {
      body { padding: 1rem; }
      .baseline-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="header">
    <h1>Architecture Drift Report · ${escapeHtml(repoName)}</h1>
    <p class="timestamp">${escapeHtml(timestamp)}</p>
    ${summaryLine}
    <p class="score">Health Score: <span style="color:${scoreStyle}">${score}/100</span>${deltaHtml}</p>
  </header>
  ${baseline !== null ? renderBaselineDiffPanel(baseline) : ''}
  ${renderModuleTable(clusters)}
  ${renderTensionsSection(findings, baseline)}
  ${renderPassingSection()}
  <footer class="footer">Generated by pr-sanity</footer>
</body>
</html>`;
}

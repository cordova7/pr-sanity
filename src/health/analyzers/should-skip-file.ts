function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function getFileName(filePath: string): string {
  const normalized = normalizePath(filePath);
  const segments = normalized.split('/');
  return segments[segments.length - 1] ?? filePath;
}

function hasSkipPathSegment(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return (
    normalized.includes('/Migrations/') ||
    normalized.includes('/obj/') ||
    normalized.includes('/bin/')
  );
}

const CQRS_PATH_SKIP =
  /\/(?:Workers?|HostedServices?|Background|Hosted)\//i;
const CQRS_FILENAME_SKIP = /Background|Worker|Hosted/i;
const DTO_PATH_SKIP = /\/(?:Dtos?|DTOs?|ViewModels?|ViewModel)\//i;
const DTO_FILENAME_SKIP = /(?:Dto|DTO|ViewModel)\.cs$/;

export function isResultPatternLayer(layer: string): boolean {
  return layer === 'Application' || layer === 'API';
}

export function getSkipFileReason(filePath: string, _layer: string): string | null {
  if (hasSkipPathSegment(filePath)) {
    return 'Migrations/obj/bin path';
  }

  const fileName = getFileName(filePath);

  if (fileName.endsWith('.Designer.cs')) {
    return 'Designer.cs';
  }

  if (fileName.includes('Snapshot')) {
    return 'Snapshot file';
  }

  if (fileName.endsWith('.g.cs')) {
    return '.g.cs generated';
  }

  return null;
}

export function getSkipResultPatternReason(filePath: string, layer: string): string | null {
  if (!isResultPatternLayer(layer)) {
    return null;
  }

  const sharedReason = getSkipFileReason(filePath, layer);

  if (sharedReason !== null) {
    return sharedReason;
  }

  const normalized = normalizePath(filePath);

  if (DTO_PATH_SKIP.test(normalized)) {
    return 'DTO/ViewModel path';
  }

  const fileName = getFileName(filePath);

  if (DTO_FILENAME_SKIP.test(fileName)) {
    return 'DTO/ViewModel filename';
  }

  return null;
}

export function getSkipCqrsFileReason(filePath: string): string | null {
  if (hasSkipPathSegment(filePath)) {
    return 'Migrations/obj/bin path';
  }

  const normalized = normalizePath(filePath);

  if (CQRS_PATH_SKIP.test(normalized)) {
    return 'background/worker path';
  }

  const fileName = getFileName(filePath);

  if (CQRS_FILENAME_SKIP.test(fileName)) {
    return 'Background/Worker/Hosted filename';
  }

  return null;
}

export function getSkipCqrsContentReason(content: string): string | null {
  if (/:\s*BackgroundService\b/.test(content) || /:\s*IHostedService\b/.test(content)) {
    return 'BackgroundService/IHostedService';
  }

  return null;
}

export function shouldSkipFile(filePath: string, layer: string): boolean {
  return getSkipFileReason(filePath, layer) !== null;
}

export function shouldSkipCqrsFile(filePath: string): boolean {
  return getSkipCqrsFileReason(filePath) !== null;
}

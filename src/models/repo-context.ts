import { inferModuleAtDepth } from '../repo/module-inference.js';

export type RepoLayer = 'Application' | 'Domain' | 'Infrastructure' | 'API' | 'Tests' | 'Unknown';

export interface RepoFile {
  path: string;
  module: string;
  layer: RepoLayer;
}

export interface RepoScanMeta {
  totalDiscovered: number;
  truncated: boolean;
}

export interface HealthRunState {
  verbose: boolean;
  readFailures: string[];
  debug(message: string): void;
}

export interface RepoContext {
  rootPath: string;
  files: RepoFile[];
  scanMeta?: RepoScanMeta;
  healthRun?: HealthRunState;
}

const TEST_PROJECT = /\.(Tests|UnitTests|IntegrationTests)$/i;
const TEST_SEGMENT = /^(Tests|UnitTests|IntegrationTests)$/i;
const INFRASTRUCTURE_PROJECT = /\.Infrastructure$/i;
const INFRASTRUCTURE_SEGMENT = /^Infrastructure$/i;
const DOMAIN_PROJECT = /\.Domain$/i;
const DOMAIN_SEGMENT = /^Domain$/i;
const APPLICATION_PROJECT = /\.(Application|Services)$/i;
const APPLICATION_SEGMENT = /^(Application|Services)$/i;
const API_SEGMENT = /^(Controllers|Api|API|Endpoints)$/i;
const APPLICATION_CORE_SEGMENT = /^ApplicationCore$/i;
const PUBLIC_API_SEGMENT = /^PublicApi$/i;
const WEB_SEGMENT = /^Web$/i;
const BLAZOR_ADMIN_SEGMENT = /^BlazorAdmin$/i;
const BLAZOR_SHARED_SEGMENT = /^BlazorShared$/i;

const WEB_API_CHILDREN = new Set(['Controllers', 'Pages', 'ViewModels', 'Areas', 'Views']);
const WEB_APPLICATION_CHILDREN = new Set([
  'Services',
  'Features',
  'Configuration',
  'Extensions',
  'Interfaces',
  'HealthChecks',
]);

const APPLICATION_CORE_DOMAIN_CHILDREN = new Set([
  'Entities',
  'Interfaces',
  'Specifications',
  'Exceptions',
  'Constants',
  'Extensions',
]);

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function getPathSegments(file: string): string[] {
  return normalizePath(file).split('/').filter(Boolean);
}

function segmentMatchesTest(segment: string): boolean {
  return TEST_SEGMENT.test(segment) || TEST_PROJECT.test(segment);
}

function segmentMatchesInfrastructure(segment: string): boolean {
  return INFRASTRUCTURE_SEGMENT.test(segment) || INFRASTRUCTURE_PROJECT.test(segment);
}

function segmentMatchesDomain(segment: string): boolean {
  return DOMAIN_SEGMENT.test(segment) || DOMAIN_PROJECT.test(segment);
}

function segmentMatchesApplication(segment: string): boolean {
  return APPLICATION_SEGMENT.test(segment) || APPLICATION_PROJECT.test(segment);
}

function segmentMatchesApi(segment: string): boolean {
  return API_SEGMENT.test(segment);
}

function inferApplicationCoreLayer(segments: string[]): RepoLayer | null {
  const index = segments.findIndex((segment) => APPLICATION_CORE_SEGMENT.test(segment));

  if (index < 0) {
    return null;
  }

  const child = segments[index + 1];

  if (child === 'Services') {
    return 'Application';
  }

  if (child !== undefined && APPLICATION_CORE_DOMAIN_CHILDREN.has(child)) {
    return 'Domain';
  }

  return 'Domain';
}

function inferPublicApiLayer(segments: string[]): RepoLayer | null {
  if (!segments.some((segment) => PUBLIC_API_SEGMENT.test(segment))) {
    return null;
  }

  if (segments.some((segment) => segment.endsWith('Endpoints') || segmentMatchesApi(segment))) {
    return 'API';
  }

  return 'Application';
}

function inferWebLayer(segments: string[]): RepoLayer | null {
  const index = segments.findIndex((segment) => WEB_SEGMENT.test(segment));

  if (index < 0) {
    return null;
  }

  const child = segments[index + 1];

  if (child !== undefined && WEB_API_CHILDREN.has(child)) {
    return 'API';
  }

  if (child !== undefined && WEB_APPLICATION_CHILDREN.has(child)) {
    return 'Application';
  }

  if (child === undefined || /\.(cshtml\.cs|cs)$/i.test(child)) {
    return 'Application';
  }

  return 'Unknown';
}

function inferBlazorSharedLayer(segments: string[]): RepoLayer | null {
  const index = segments.findIndex((segment) => BLAZOR_SHARED_SEGMENT.test(segment));

  if (index < 0) {
    return null;
  }

  const child = segments[index + 1];

  if (child === 'Models' || child === 'Attributes') {
    return 'API';
  }

  if (child === 'Interfaces' || child === 'Authorization') {
    return 'Domain';
  }

  if (child === undefined || /\.(cshtml\.cs|cs)$/i.test(child)) {
    return 'Domain';
  }

  return 'Unknown';
}

function inferBlazorAdminLayer(segments: string[]): RepoLayer | null {
  if (!segments.some((segment) => BLAZOR_ADMIN_SEGMENT.test(segment))) {
    return null;
  }

  if (segments.some(segmentMatchesApplication)) {
    return 'Application';
  }

  return 'API';
}

export function inferModule(relativePath: string): string {
  return inferModuleAtDepth(relativePath, 1);
}

export function inferLayer(relativePath: string): RepoLayer {
  const segments = getPathSegments(relativePath);

  if (segments.some(segmentMatchesTest)) {
    return 'Tests';
  }

  if (segments.some(segmentMatchesInfrastructure)) {
    return 'Infrastructure';
  }

  const applicationCoreLayer = inferApplicationCoreLayer(segments);

  if (applicationCoreLayer !== null) {
    return applicationCoreLayer;
  }

  const publicApiLayer = inferPublicApiLayer(segments);

  if (publicApiLayer !== null) {
    return publicApiLayer;
  }

  const webLayer = inferWebLayer(segments);

  if (webLayer !== null) {
    return webLayer;
  }

  const blazorAdminLayer = inferBlazorAdminLayer(segments);

  if (blazorAdminLayer !== null) {
    return blazorAdminLayer;
  }

  const blazorSharedLayer = inferBlazorSharedLayer(segments);

  if (blazorSharedLayer !== null) {
    return blazorSharedLayer;
  }

  if (segments.some(segmentMatchesDomain)) {
    return 'Domain';
  }

  if (segments.some(segmentMatchesApplication)) {
    return 'Application';
  }

  if (segments.some(segmentMatchesApi)) {
    return 'API';
  }

  return 'Unknown';
}

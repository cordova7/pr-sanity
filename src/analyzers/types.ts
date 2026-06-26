import type { GitContext } from '../models/git-context.js';
import type { Finding } from '../models/finding.js';

export interface Analyzer {
  run(context: GitContext): Promise<Finding[]>;
}

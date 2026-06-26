#!/usr/bin/env node
/**
 * Generates a borderline persistence-bypass fixture: exactly 49% of Application
 * files access DbContext directly (51 clean, 49 bypass out of 100).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(__dirname, 'borderline');
const applicationDir = path.join(fixtureRoot, 'src', 'Orders', 'Application', 'Services');

const BYPASS_COUNT = 49;
const CLEAN_COUNT = 51;
const TOTAL = BYPASS_COUNT + CLEAN_COUNT;

function bypassService(index) {
  return `// Adversarial borderline: persistence bypass file ${index}
using Microsoft.EntityFrameworkCore;

namespace Orders.Application.Services;

public class BypassService${index}
{
    private readonly OrderDbContext _context;

    public BypassService${index}(OrderDbContext context)
    {
        _context = context;
    }

    public void Touch() => _context.SaveChanges();
}
`;
}

function cleanService(index) {
  return `// Adversarial borderline: clean Application service ${index}
namespace Orders.Application.Services;

public class CleanService${index}
{
    public string Name { get; set; } = "service-${index}";
}
`;
}

fs.rmSync(fixtureRoot, { recursive: true, force: true });
fs.mkdirSync(applicationDir, { recursive: true });

for (let index = 1; index <= BYPASS_COUNT; index += 1) {
  fs.writeFileSync(path.join(applicationDir, `BypassService${index}.cs`), bypassService(index), 'utf8');
}

for (let index = 1; index <= CLEAN_COUNT; index += 1) {
  fs.writeFileSync(path.join(applicationDir, `CleanService${index}.cs`), cleanService(index), 'utf8');
}

console.log(
  `Generated borderline fixture: ${BYPASS_COUNT}/${TOTAL} bypass (${Math.round((BYPASS_COUNT / TOTAL) * 100)}%) at ${fixtureRoot}`,
);

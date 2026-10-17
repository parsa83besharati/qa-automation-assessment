import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const RESULTS_DIR = path.join(ROOT, 'allure-results');
const REPORTS_DIR = path.join(ROOT, 'allure-reports');
const LATEST_POINTER = path.join(REPORTS_DIR, 'latest.txt');
const REPORT_PREFIX = 'report-';
const MAX_REPORTS = 50;

const reportNumber = (name: string): number => Number(name.slice(REPORT_PREFIX.length));

function listReports(): string[] {
  if (!fs.existsSync(REPORTS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(REPORTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^report-\d+$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => reportNumber(a) - reportNumber(b));
}

function ensureResults(): void {
  const hasResults = fs.existsSync(RESULTS_DIR) && fs.readdirSync(RESULTS_DIR).length > 0;
  if (!hasResults) {
    console.error(
      'allure-results is missing or empty — run the tests first (e.g. npm run test:api).',
    );
    process.exit(1);
  }
}

function inheritPreviousHistory(newestReport: string | undefined): void {
  if (!newestReport) {
    return;
  }
  const historyDir = path.join(REPORTS_DIR, newestReport, 'history');
  if (!fs.existsSync(historyDir)) {
    return;
  }
  const target = path.join(RESULTS_DIR, 'history');
  fs.cpSync(historyDir, target, { recursive: true, force: true });
  console.info(`history chained from ${newestReport}/history`);
}

function runAllure(args: string[]): number {
  const bin =
    process.platform === 'win32'
      ? path.join(ROOT, 'node_modules', '.bin', 'allure.cmd')
      : path.join(ROOT, 'node_modules', '.bin', 'allure');
  if (!fs.existsSync(bin)) {
    console.error('allure CLI not found — run npm install first.');
    return 1;
  }
  const quote = (value: string): string =>
    /[\s"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
  const command = [bin, ...args].map(quote).join(' ');
  const result = spawnSync(command, { cwd: ROOT, stdio: 'inherit', shell: true });
  return result.status ?? 1;
}

function rotate(): void {
  const reports = listReports();
  while (reports.length > MAX_REPORTS) {
    const oldest = reports.shift();
    if (!oldest) {
      break;
    }
    fs.rmSync(path.join(REPORTS_DIR, oldest), { recursive: true, force: true });
    console.info(`rotation: removed oldest report ${oldest} (keeping newest ${MAX_REPORTS})`);
  }
}

function clearResults(): void {
  for (const entry of fs.readdirSync(RESULTS_DIR)) {
    fs.rmSync(path.join(RESULTS_DIR, entry), { recursive: true, force: true });
  }
}

function generate(): void {
  ensureResults();
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const existing = listReports();
  const newest = existing.at(-1);
  inheritPreviousHistory(newest);

  const nextIndex = existing.length > 0 ? reportNumber(existing[existing.length - 1]) + 1 : 1;
  const reportName = `${REPORT_PREFIX}${String(nextIndex).padStart(4, '0')}`;
  const reportDir = path.join(REPORTS_DIR, reportName);

  const exitCode = runAllure(['generate', RESULTS_DIR, '-o', reportDir]);
  if (exitCode !== 0) {
    console.error('allure generate failed — results kept for a retry.');
    process.exit(exitCode);
  }

  rotate();
  fs.writeFileSync(LATEST_POINTER, reportName, 'utf8');
  clearResults();

  const kept = listReports().length;
  console.info(`report generated: allure-reports/${reportName} (${kept}/${MAX_REPORTS} kept)`);
  console.info('preview it with: npm run allure:open');
}

function openLatest(): void {
  const reports = listReports();
  const newest = reports.at(-1);
  if (!newest) {
    console.error('no allure report found — generate one first (npm run allure:report).');
    process.exit(1);
  }
  console.info(`serving allure-reports/${newest} — press Ctrl+C to stop`);
  const exitCode = runAllure(['open', path.join(REPORTS_DIR, newest)]);
  process.exit(exitCode);
}

const command = process.argv[2] ?? 'generate';
if (command === 'generate') {
  generate();
} else if (command === 'open') {
  openLatest();
} else {
  console.error(`unknown command "${command}" — expected "generate" or "open"`);
  process.exit(1);
}

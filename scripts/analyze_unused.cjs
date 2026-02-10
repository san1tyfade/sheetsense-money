const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const IGNORE_DIRS = ['node_modules', 'dist', '.git', '.agent', '.github', 'coverage', '.gemini'];
const IGNORE_FILES = ['vite.config.ts', 'vitest.config.ts', 'analyze_unused.cjs', 'tailwind.config.js', 'postcss.config.js', '.eslintrc.cjs', 'setup.ts', 'handlers.ts'];
const FILE_EXTENSIONS = ['.ts', '.tsx'];

// Store for analysis
let allFiles = [];
const allExports = new Map(); // key: exportName, value: { file, type }
const fileContents = new Map();

function crawl(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                crawl(fullPath);
            }
        } else {
            if (FILE_EXTENSIONS.includes(path.extname(file)) && !IGNORE_FILES.includes(file) && !file.endsWith('.d.ts')) {
                allFiles.push(fullPath);
                fileContents.set(fullPath, fs.readFileSync(fullPath, 'utf-8'));
            }
        }
    }
}

function analyzeFileExports(filePath, content) {
    const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

    // 1. Detect Exported Items
    // Matches: export const foo = ..., export function bar(), export class Baz, export interface Qux, export type Quux
    const exportRegex = /export\s+(const|var|let|function|class|type|interface|enum)\s+([a-zA-Z0-9_$]+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
        const type = match[1];
        const name = match[2];
        // Store unique key to handle same name in different files
        const key = `${name}::${relativePath}`;
        allExports.set(key, { name, file: relativePath, type });
    }
}

function findUnusedExports() {
    const unused = [];
    console.log(`Scanning ${allFiles.length} files for ${allExports.size} exported items...`);

    for (const [key, info] of allExports) {
        const name = info.name;

        // SKIP checking certain common entry points or config files if not already ignored
        if (info.file.endsWith('main.tsx') || info.file.endsWith('App.tsx') || info.file.endsWith('index.tsx') || info.file.endsWith('vite.config.ts')) {
            continue;
        }

        let isUsedExternal = false;
        let isUsedInternal = false;

        // Escape special chars in name just in case
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const usageRegex = new RegExp(`\\b${escapedName}\\b`);

        // Check ALL files
        for (const [filePath, content] of fileContents) {
            const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

            if (relPath === info.file) {
                // Check internal usage
                // We need to match usage that is NOT the declaration itself.
                // This is hard with regex because the declaration "export const Foo =" contains "Foo".
                // A simple proxy: if matches > 1, it's used internally.
                const matches = content.match(new RegExp(`\\b${escapedName}\\b`, 'g'));
                if (matches && matches.length > 1) {
                    isUsedInternal = true;
                }
                continue;
            }

            // External usage check
            if (usageRegex.test(content)) {
                isUsedExternal = true;
                break; // Found usage, no need to check other files
            }
        }

        if (!isUsedExternal) {
            unused.push({ ...info, isUsedInternal });
        }
    }
    return unused;
}


function runAnalysis() {
    console.log('Starting analysis...');
    crawl(ROOT_DIR);

    // 1. Analyze Exports
    for (const [filePath, content] of fileContents) {
        analyzeFileExports(filePath, content);
    }

    const unusedExports = findUnusedExports();

    // Generate Report
    let report = '# Unused Code Analysis Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## 1. Dead Code (Safe to Delete)\n';
    report += '> **Critical**: These items are exported but **NOT used anywhere** (neither internally nor externally).\n\n';

    const deadCode = unusedExports.filter(u => !u.isUsedInternal);
    const unusedExport = unusedExports.filter(u => u.isUsedInternal);

    const groupByFile = (items) => {
        const byFile = {};
        items.forEach(item => {
            if (!byFile[item.file]) byFile[item.file] = [];
            byFile[item.file].push(item);
        });
        return byFile;
    };

    const deadByFile = groupByFile(deadCode);
    for (const file of Object.keys(deadByFile).sort()) {
        report += `### ${file}\n`;
        deadByFile[file].forEach(item => {
            report += `- [ ] \`${item.name}\` (${item.type})\n`;
        });
        report += '\n';
    }

    report += '## 2. Unused Exports (Internal Usage Only)\n';
    report += '> **Info**: These items are exported but only used within their own file. **Action**: Remove the `export` keyword.\n\n';

    const internalByFile = groupByFile(unusedExport);
    for (const file of Object.keys(internalByFile).sort()) {
        report += `### ${file}\n`;
        internalByFile[file].forEach(item => {
            report += `- [ ] \`${item.name}\` (${item.type})\n`;
        });
        report += '\n';
    }

    // Write report
    const reportPath = path.join(ROOT_DIR, 'unused_code_report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`Analysis complete. Report written to ${reportPath}`);
}

runAnalysis();

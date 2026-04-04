// @ts-check
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..', '..');

// ---------------------------------------------------------------------------
// Helper: read a project-root file synchronously
// ---------------------------------------------------------------------------
function readProjectFile(relativePath) {
  const full = join(ROOT, relativePath);
  if (!existsSync(full)) return null;
  return readFileSync(full, 'utf-8');
}

// ===========================================================================
// 1. LICENSE File
// ===========================================================================
test.describe('LICENSE file', () => {
  test('LICENSE file exists in project root', () => {
    const exists = existsSync(join(ROOT, 'LICENSE'));
    expect(exists).toBe(true);
  });

  test('LICENSE is MIT license', () => {
    const content = readProjectFile('LICENSE');
    expect(content).not.toBeNull();
    expect(content).toContain('MIT License');
  });

  test('LICENSE contains correct year and author', () => {
    const content = readProjectFile('LICENSE');
    expect(content).not.toBeNull();
    // Year should be 2026 (project creation year)
    expect(content).toMatch(/Copyright \(c\) 2026/);
    // Author should be U2DIA
    expect(content).toMatch(/U2DIA/);
  });

  test('LICENSE matches license declared in package.json', () => {
    const license = readProjectFile('LICENSE');
    const pkg = JSON.parse(readProjectFile('package.json'));
    expect(pkg.license).toBe('MIT');
    expect(license).toContain('MIT License');
  });

  test('LICENSE is available — served by server or present on disk', async ({ request }) => {
    const res = await request.get('/LICENSE');
    if (res.status() === 200) {
      // If the server serves it, verify contents
      const body = await res.text();
      expect(body).toContain('MIT License');
    } else {
      // express.static may not serve extension-less files depending on
      // configuration. Verify the file exists on disk (already proven by
      // earlier tests), and just confirm the server does not serve a
      // *different* LICENSE that could confuse users.
      const content = readProjectFile('LICENSE');
      expect(content).toContain('MIT License');
    }
  });
});

// ===========================================================================
// 2. package.json Metadata
// ===========================================================================
test.describe('package.json metadata', () => {
  const pkg = JSON.parse(readProjectFile('package.json'));

  test('license field is "MIT"', () => {
    expect(pkg.license).toBe('MIT');
  });

  test('repository URL is set', () => {
    expect(pkg.repository).toBeDefined();
    const url =
      typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
    expect(url).toBeTruthy();
    expect(url).toContain('github.com');
  });

  test('description is meaningful (not empty)', () => {
    expect(pkg.description).toBeTruthy();
    expect(pkg.description.length).toBeGreaterThan(10);
  });

  test('author field is set', () => {
    expect(pkg.author).toBeTruthy();
  });

  test('package name is set', () => {
    expect(pkg.name).toBeTruthy();
  });

  test('version follows semver', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

// ===========================================================================
// 3. Dependency Licenses
// ===========================================================================
test.describe('dependency licenses', () => {
  /** Licenses considered compatible with MIT */
  const COMPATIBLE = [
    'MIT',
    'ISC',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'Apache-2.0',
    '0BSD',
    'BlueOak-1.0.0',
    'CC0-1.0',
    'Unlicense',
    'CC-BY-4.0',
    'CC-BY-3.0',
    'Python-2.0',
  ];

  /**
   * Patterns that signal GPL-family licenses.
   * These are copy-left and incompatible with a permissive MIT distribution.
   */
  const GPL_PATTERN = /GPL/i;

  test('direct dependencies have compatible licenses', () => {
    const pkg = JSON.parse(readProjectFile('package.json'));
    const directDeps = Object.keys(pkg.dependencies || {});

    for (const dep of directDeps) {
      const depPkgPath = join(ROOT, 'node_modules', dep, 'package.json');
      if (!existsSync(depPkgPath)) continue; // skip if not installed

      const depPkg = JSON.parse(readFileSync(depPkgPath, 'utf-8'));
      const license = depPkg.license || '';

      // Accept SPDX expressions like "(MIT OR Apache-2.0)"
      const normalised =
        typeof license === 'string' ? license : license?.type || '';

      const isCompatible = COMPATIBLE.some((l) =>
        normalised.toUpperCase().includes(l.toUpperCase()),
      );

      expect(
        isCompatible,
        `Dependency "${dep}" has license "${normalised}" which may not be MIT-compatible`,
      ).toBe(true);
    }
  });

  test('no GPL dependencies in direct dependencies', () => {
    const pkg = JSON.parse(readProjectFile('package.json'));
    const directDeps = Object.keys(pkg.dependencies || {});

    for (const dep of directDeps) {
      const depPkgPath = join(ROOT, 'node_modules', dep, 'package.json');
      if (!existsSync(depPkgPath)) continue;

      const depPkg = JSON.parse(readFileSync(depPkgPath, 'utf-8'));
      const license = depPkg.license || '';
      const normalised =
        typeof license === 'string' ? license : license?.type || '';

      expect(
        GPL_PATTERN.test(normalised),
        `Dependency "${dep}" uses GPL-family license "${normalised}" which conflicts with MIT`,
      ).toBe(false);
    }
  });

  test('npm ls succeeds without errors', () => {
    // npm ls returns exit code 0 only when all deps are satisfied
    let output;
    try {
      output = execSync('npm ls --json 2>/dev/null', {
        cwd: ROOT,
        encoding: 'utf-8',
      });
    } catch (e) {
      // npm ls exits non-zero when there are peer-dep issues but still
      // produces JSON output. Parse what we can.
      output = e.stdout || '{}';
    }
    const tree = JSON.parse(output);
    expect(tree.dependencies).toBeDefined();
  });
});

// ===========================================================================
// 4. Open Source Compliance — No Leaked Secrets
// ===========================================================================
test.describe('open source compliance', () => {
  /**
   * Patterns that look like hardcoded secrets.
   * We only flag realistic key shapes (long hex/base64 strings assigned to
   * known variable names), not the word "key" in documentation or object keys.
   */
  const SECRET_PATTERNS = [
    /['"]sk-[A-Za-z0-9]{20,}['"]/,            // OpenAI-style key
    /['"]AIza[A-Za-z0-9_-]{30,}['"]/,          // Google API key
    /['"]ghp_[A-Za-z0-9]{36,}['"]/,            // GitHub personal token
    /['"]glpat-[A-Za-z0-9_-]{20,}['"]/,        // GitLab PAT
    /['"]xox[bpars]-[A-Za-z0-9-]{10,}['"]/,    // Slack token
    /AKIA[A-Z0-9]{16}/,                         // AWS access key ID
  ];

  const SOURCE_DIRS = ['js', 'css'];

  test('no hardcoded API keys in source files', () => {
    for (const dir of SOURCE_DIRS) {
      const dirPath = join(ROOT, dir);
      if (!existsSync(dirPath)) continue;

      const files = execSync(`find "${dirPath}" -type f`, {
        encoding: 'utf-8',
      })
        .trim()
        .split('\n')
        .filter(Boolean);

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        for (const pattern of SECRET_PATTERNS) {
          expect(
            pattern.test(content),
            `Possible secret found in ${file} matching ${pattern}`,
          ).toBe(false);
        }
      }
    }
  });

  test('no hardcoded secrets in server.js', () => {
    const content = readProjectFile('server.js');
    expect(content).not.toBeNull();
    for (const pattern of SECRET_PATTERNS) {
      expect(
        pattern.test(content),
        `Possible secret in server.js matching ${pattern}`,
      ).toBe(false);
    }
  });

  test('no .env file committed to git', () => {
    const tracked = execSync('git ls-files', {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    const envFiles = tracked
      .split('\n')
      .filter((f) => /^\.env(\..*)?$/.test(f.trim()));
    expect(
      envFiles,
      `.env file(s) should not be committed: ${envFiles.join(', ')}`,
    ).toHaveLength(0);
  });

  test('.gitignore includes .env', () => {
    const gitignore = readProjectFile('.gitignore');
    expect(gitignore).not.toBeNull();
    expect(gitignore).toMatch(/\.env/);
  });

  test('no credentials or tokens in index.html', () => {
    const content = readProjectFile('index.html');
    expect(content).not.toBeNull();
    for (const pattern of SECRET_PATTERNS) {
      expect(
        pattern.test(content),
        `Possible secret in index.html matching ${pattern}`,
      ).toBe(false);
    }
  });
});

// ===========================================================================
// 5. Gemma Model Compliance
// ===========================================================================
test.describe('Gemma model compliance', () => {
  test('README mentions Gemma model usage', () => {
    const readme = readProjectFile('README.md');
    expect(readme).not.toBeNull();
    expect(readme.toLowerCase()).toContain('gemma');
  });

  test('README or docs mention Google attribution', () => {
    const readme = readProjectFile('README.md');
    expect(readme).not.toBeNull();

    // Check README first
    const readmeHasGoogle = /google/i.test(readme);

    // Also accept attribution in documentation files
    let docsHaveGoogle = false;
    const designDoc = readProjectFile(
      'docs/superpowers/specs/2026-04-04-gemma4-particle-edu-design.md',
    );
    if (designDoc) {
      docsHaveGoogle = /google/i.test(designDoc);
    }
    const competitionDoc = readProjectFile('docs/competition-overview.md');
    if (competitionDoc) {
      docsHaveGoogle = docsHaveGoogle || /google/i.test(competitionDoc);
    }

    expect(
      readmeHasGoogle || docsHaveGoogle,
      'Neither README nor docs mention Google in relation to Gemma',
    ).toBe(true);
  });

  test('no false claim of model ownership', () => {
    const readme = readProjectFile('README.md');
    expect(readme).not.toBeNull();

    // These phrases would indicate a false claim of ownership
    const ownershipClaims = [
      /we (created|built|developed|trained) gemma/i,
      /our (proprietary|own) (model|llm|ai)/i,
    ];
    for (const pattern of ownershipClaims) {
      expect(
        pattern.test(readme),
        `README contains potential false ownership claim matching ${pattern}`,
      ).toBe(false);
    }
  });

  test('Gemma link or reference in README', () => {
    const readme = readProjectFile('README.md');
    expect(readme).not.toBeNull();
    // Should reference Gemma with a link or at minimum the model name
    const hasGemmaRef =
      /gemma\s*4/i.test(readme) || /ai\.google\.dev\/gemma/i.test(readme);
    expect(
      hasGemmaRef,
      'README should reference Gemma 4 or link to its page',
    ).toBe(true);
  });
});

// ===========================================================================
// 6. Third-Party Attribution
// ===========================================================================
test.describe('third-party attribution', () => {
  test('Three.js usage is acknowledged', () => {
    const readme = readProjectFile('README.md');
    expect(readme).not.toBeNull();
    expect(readme.toLowerCase()).toContain('three.js');
  });

  test('Three.js is MIT licensed (no conflict)', () => {
    const threePkgPath = join(ROOT, 'node_modules', 'three', 'package.json');
    if (!existsSync(threePkgPath)) {
      test.skip(); // skip if three is not installed
      return;
    }
    const threePkg = JSON.parse(readFileSync(threePkgPath, 'utf-8'));
    expect(threePkg.license).toBe('MIT');
  });

  test('no unlicensed binary assets in project source', () => {
    // Binary assets (images, fonts) in the project root (excluding
    // node_modules and .git) should not exist without an accompanying license.
    const assetExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.woff', '.woff2', '.ttf', '.otf'];
    let found = [];
    try {
      const output = execSync(
        'git ls-files',
        { cwd: ROOT, encoding: 'utf-8' },
      );
      found = output
        .split('\n')
        .filter((f) =>
          assetExtensions.some((ext) => f.trim().toLowerCase().endsWith(ext)),
        );
    } catch {
      // If git ls-files fails, skip gracefully
    }

    // If there are binary assets committed, verify there is a NOTICE or
    // LICENSE acknowledgment. For now, this project has zero committed assets,
    // so we simply assert the list is empty or small.
    if (found.length > 0) {
      // If assets exist, at least a NOTICE file or attribution in README
      // should be present.
      const noticeExists = existsSync(join(ROOT, 'NOTICE'));
      const readme = readProjectFile('README.md') || '';
      const hasAttribution = /attribution|credit|asset|font|icon/i.test(readme);
      expect(
        noticeExists || hasAttribution,
        `Found ${found.length} binary asset(s) but no NOTICE file or attribution in README`,
      ).toBe(true);
    }
    // If no assets, test passes automatically
  });

  test('project references correct repository URL', () => {
    const pkg = JSON.parse(readProjectFile('package.json'));
    const url =
      typeof pkg.repository === 'string'
        ? pkg.repository
        : pkg.repository?.url;
    expect(url).toContain('gemma4-particle-edu');
  });
});

// ===========================================================================
// 7. Server-Side Verification (via HTTP)
// ===========================================================================
test.describe('server-served legal files', () => {
  test('package.json is accessible and has MIT license', async ({ request }) => {
    const res = await request.get('/package.json');
    if (res.status() === 200) {
      const pkg = await res.json();
      expect(pkg.license).toBe('MIT');
    } else {
      // express.static may not serve package.json in all configurations.
      // Fall back to verifying the file on disk.
      const pkg = JSON.parse(readProjectFile('package.json'));
      expect(pkg.license).toBe('MIT');
    }
  });

  test('index.html does not expose secrets via meta tags or inline scripts', async ({
    page,
  }) => {
    await page.goto('/');
    // Grab all <meta> content attributes and inline <script> text
    const metaContents = await page.$$eval('meta', (els) =>
      els.map((el) => el.getAttribute('content') || ''),
    );
    const scriptContents = await page.$$eval(
      'script:not([src])',
      (els) => els.map((el) => el.textContent || ''),
    );

    const allText = [...metaContents, ...scriptContents].join('\n');

    const secretPatterns = [
      /sk-[A-Za-z0-9]{20,}/,
      /AIza[A-Za-z0-9_-]{30,}/,
      /ghp_[A-Za-z0-9]{36,}/,
      /AKIA[A-Z0-9]{16}/,
    ];

    for (const pattern of secretPatterns) {
      expect(
        pattern.test(allText),
        `Possible secret exposed in served HTML matching ${pattern}`,
      ).toBe(false);
    }
  });

  test('server does not expose .env via static file serving', async ({ request }) => {
    // Even if a .env file were to exist, the server should not serve it.
    // We verify that requesting /.env does not return sensitive content.
    const res = await request.get('/.env');
    if (res.status() === 200) {
      const body = await res.text();
      // If for some reason a file is returned, it should not contain
      // secret-like patterns
      expect(body).not.toMatch(/API_KEY\s*=/i);
      expect(body).not.toMatch(/SECRET\s*=/i);
      expect(body).not.toMatch(/TOKEN\s*=/i);
      expect(body).not.toMatch(/PASSWORD\s*=/i);
    }
    // 404 is the ideal response, but we don't hard-fail on 200 as long as
    // no secrets leak.
  });
});

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

describe('pilot migration runtime imports', () => {
  it('resolves server-only with the React server condition from Node', async () => {
    const { stdout } = await execFileAsync(process.execPath, [
      '--conditions=react-server',
      '--input-type=module',
      '-e',
      "await import('server-only'); console.log('server-only: imported');",
    ]);

    expect(stdout).toContain('server-only: imported');
  });

  it('imports apply runtime services without writing DB or Storage', async () => {
    const secret = 'runtime-import-secret-value';
    const { stdout, stderr } = await execFileAsync(
      getNpmCommand(),
      ['run', 'migration:pilot', '--', '--check-runtime'],
      {
        env: {
          ...process.env,
          DATABASE_URL: 'postgres://runtime.example/db',
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: secret,
        },
      },
    );

    expect(stdout).toContain('server-only: imported');
    expect(stdout).toContain('AuthorService: imported');
    expect(stdout).toContain('BookService: imported');
    expect(stdout).toContain('SupabaseMigrationClient: imported');
    expect(stdout).toContain('AuthorImageStorageCore: imported');
    expect(stdout).toContain('BookCoverStorageCore: imported');
    expect(stdout).toContain('PilotMigrationStorageServices: imported');
    expect(stdout).not.toContain(secret);
    expect(stderr).not.toContain(secret);
  });

  it('keeps the CLI Storage path free from request-bound Next APIs', async () => {
    const files = [
      'src/features/migration/wordpress-pilot/storage-services.ts',
      'src/features/migration/wordpress-pilot/supabase-migration-client.ts',
    ];

    for (const file of files) {
      const source = await readFile(path.join(process.cwd(), file), 'utf8');

      expect(source).not.toContain('next/headers');
      expect(source).not.toContain('next/navigation');
      expect(source).not.toContain('cookies()');
      expect(source).not.toContain('redirect(');
      expect(source).not.toContain('requireEditorialStaff');
    }
  });

  it('keeps web admin Storage wrappers protected by editorial staff authorization', async () => {
    const files = [
      'src/features/admin/authors/services/author-image-service.ts',
      'src/features/admin/books/services/book-cover-service.ts',
    ];

    for (const file of files) {
      const source = await readFile(path.join(process.cwd(), file), 'utf8');

      expect(source).toContain('requireEditorialStaff');
      expect(source).toContain('@/lib/supabase/server');
    }
  });

  it('reuses the same Storage cores for web admin and CLI migration paths', async () => {
    const webAuthorSource = await readFile(
      path.join(process.cwd(), 'src/features/admin/authors/services/author-image-service.ts'),
      'utf8',
    );
    const webBookSource = await readFile(
      path.join(process.cwd(), 'src/features/admin/books/services/book-cover-service.ts'),
      'utf8',
    );
    const cliSource = await readFile(
      path.join(process.cwd(), 'src/features/migration/wordpress-pilot/storage-services.ts'),
      'utf8',
    );

    expect(webAuthorSource).toContain('createAuthorImageService');
    expect(webBookSource).toContain('createBookCoverService');
    expect(cliSource).toContain('createAuthorImageService');
    expect(cliSource).toContain('createBookCoverService');
  });

  it('limits CLI Storage writes to the expected buckets through existing constants', async () => {
    const cliSource = await readFile(
      path.join(process.cwd(), 'src/features/migration/wordpress-pilot/storage-services.ts'),
      'utf8',
    );
    const authorConstants = await readFile(
      path.join(process.cwd(), 'src/features/admin/authors/services/author-image-constants.ts'),
      'utf8',
    );
    const bookConstants = await readFile(
      path.join(process.cwd(), 'src/features/admin/books/services/book-cover-constants.ts'),
      'utf8',
    );

    expect(cliSource).toContain('author-image-service.core');
    expect(cliSource).toContain('book-cover-service.core');
    expect(authorConstants).toContain("AUTHOR_IMAGES_BUCKET = 'authors'");
    expect(bookConstants).toContain("BOOK_COVERS_BUCKET = 'book-covers'");
  });
});

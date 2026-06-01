import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Minimal stubs so the service can be instantiated without Angular DI ──────

vi.mock('../supabase.client', () => ({ supabase: {} }));

// Stub inject() so the service constructor runs without a DI context
vi.mock('@angular/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@angular/core')>();
  return {
    ...actual,
    inject: vi.fn().mockReturnValue({}),
  };
});

import { ProjectService } from './project.service';

// ─── Helpers to build fake Files with specific byte content ──────────────────

function makeFile(bytes: number[], mimeType: string, name = 'test.img', sizeMB = 1): File {
  const arr = new Uint8Array(bytes);
  const blob = new Blob([arr], { type: mimeType });
  Object.defineProperty(blob, 'size', { value: sizeMB * 1024 * 1024 });
  return new File([blob], name, { type: mimeType });
}

function jpegFile(name = 'photo.jpg'): File {
  return makeFile([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0], 'image/jpeg', name);
}
function pngFile(name = 'image.png'): File {
  return makeFile([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0, 0, 0, 0, 0], 'image/png', name);
}
function gifFile(name = 'anim.gif'): File {
  return makeFile([0x47, 0x49, 0x46, 0x38, 0, 0, 0, 0, 0, 0, 0, 0], 'image/gif', name);
}
function webpFile(name = 'img.webp'): File {
  // RIFF header + WEBP signature at bytes 8-11
  return makeFile([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], 'image/webp', name);
}
function fakeJpegFile(): File {
  // Declares image/jpeg but bytes are wrong (e.g. a PNG disguised as JPEG)
  return makeFile([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0, 0, 0, 0, 0], 'image/jpeg', 'fake.jpg');
}
function oversizedFile(): File {
  return makeFile([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0], 'image/jpeg', 'big.jpg', 11);
}
function wrongTypeFile(): File {
  return makeFile([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0], 'image/bmp', 'img.bmp');
}
function pdfDisguisedAsJpeg(): File {
  // PDF magic bytes but declared as JPEG
  return makeFile([0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0, 0, 0, 0, 0], 'image/jpeg', 'malicious.jpg');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProjectService.validateImageFile', () => {
  let service: ProjectService;
  let validate: (f: File) => Promise<boolean>;

  beforeEach(() => {
    service = new (ProjectService as any)();
    validate = (f: File) => (service as any).validateImageFile(f);
  });

  // ── Valid files ────────────────────────────────────────────────────────────
  it('accepts a valid JPEG by magic bytes', async () => {
    expect(await validate(jpegFile())).toBe(true);
  });

  it('accepts a valid PNG by magic bytes', async () => {
    expect(await validate(pngFile())).toBe(true);
  });

  it('accepts a valid GIF by magic bytes', async () => {
    expect(await validate(gifFile())).toBe(true);
  });

  it('accepts a valid WEBP by magic bytes', async () => {
    expect(await validate(webpFile())).toBe(true);
  });

  // ── Invalid MIME type ──────────────────────────────────────────────────────
  it('rejects a BMP file (not in allowed types)', async () => {
    expect(await validate(wrongTypeFile())).toBe(false);
  });

  // ── Oversized file ─────────────────────────────────────────────────────────
  it('rejects a file larger than 10 MB', async () => {
    expect(await validate(oversizedFile())).toBe(false);
  });

  // ── Magic byte mismatch attacks ────────────────────────────────────────────
  it('accepts a PNG file even when declared as JPEG (magic bytes win over MIME)', async () => {
    // validateImageFile checks actual bytes — a real PNG image is safe regardless of MIME label
    expect(await validate(fakeJpegFile())).toBe(true);
  });

  it('rejects a PDF disguised as JPEG (polyglot attack)', async () => {
    expect(await validate(pdfDisguisedAsJpeg())).toBe(false);
  });
});

// ─── sanitizeFileName ─────────────────────────────────────────────────────────

describe('ProjectService.sanitizeFileName', () => {
  let sanitize: (name: string) => string;

  beforeEach(() => {
    const service = new (ProjectService as any)();
    sanitize = (n: string) => (service as any).sanitizeFileName(n);
  });

  it('allows safe characters unchanged', () => {
    expect(sanitize('photo-2024.jpg')).toBe('photo-2024.jpg');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitize('my photo.jpg')).toBe('my_photo.jpg');
  });

  it('replaces path traversal sequences (..) and all non-safe chars', () => {
    // Each char in '../../../etc/passwd' that is not [a-zA-Z0-9._-] becomes '_'
    // '.' followed by '.' is also replaced by the '..' rule, but since individual
    // chars including '/' and '.' are already replaced first, the result is all underscores
    const result = sanitize('../../../etc/passwd');
    expect(result).not.toContain('..');
    expect(result).not.toContain('/');
    expect(result).toMatch(/^[a-zA-Z0-9._\-]+$/);
  });

  it('replaces slashes', () => {
    expect(sanitize('folder/file.jpg')).toBe('folder_file.jpg');
  });

  it('truncates names longer than 80 characters', () => {
    const long = 'a'.repeat(100) + '.jpg';
    expect(sanitize(long).length).toBeLessThanOrEqual(80);
  });

  it('replaces null bytes and special chars', () => {
    expect(sanitize('file\x00name.jpg')).toBe('file_name.jpg');
  });
});

// ─── Rate limiting in addComment ─────────────────────────────────────────────

describe('ProjectService addComment rate limiting', () => {
  it('throws if called twice within 5 seconds', async () => {
    const service = new (ProjectService as any)();
    // Inject a fake auth that returns a userId
    (service as any).auth = { currentUser: () => ({ id: 'user-1' }) };
    // Inject a fake supabase that succeeds on insert
    (service as any).supabase = undefined; // not used directly, we stub the import

    // Manually set lastCommentAt to now (simulating a recent comment)
    (service as any).lastCommentAt = Date.now();

    await expect(
      (service as any).addComment('proj-1', 'hello')
    ).rejects.toThrow('Espera 5 segundos antes de comentar de nuevo');
  });

  it('does not throw if 5 seconds have passed', async () => {
    const service = new (ProjectService as any)();
    (service as any).auth = { currentUser: () => ({ id: 'user-1' }) };
    // Set lastCommentAt to 6 seconds ago
    (service as any).lastCommentAt = Date.now() - 6000;

    // Stub supabase.from().insert() to return no error
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock });
    // Patch the module-level supabase used by the service
    const supabaseModule = await import('../supabase.client');
    (supabaseModule as any).supabase = { from: fromMock };

    await expect(
      (service as any).addComment('proj-1', 'hello')
    ).resolves.toBeUndefined();
  });
});

// ─── reportProject deduplication ─────────────────────────────────────────────

describe('ProjectService reportProject deduplication', () => {
  it('throws if the same project is reported twice', async () => {
    const service = new (ProjectService as any)();
    (service as any).auth = { currentUser: () => ({ id: 'user-1' }) };
    (service as any).reportedProjects = new Set(['proj-already-reported']);

    await expect(
      (service as any).reportProject('proj-already-reported', 'spam')
    ).rejects.toThrow('Ya reportaste este proyecto');
  });
});

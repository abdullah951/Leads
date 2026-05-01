// ── POST /api/settings/avatar ─────────────────────────────────────────────────
// Accepts a multipart/form-data upload with a single "avatar" file field.
// Saves the file to /public/avatars/{userId}.{ext}, updates user.avatarUrl.
// Old avatar file is deleted before the new one is written.
// Response: { avatarUrl: string }
// ─────────────────────────────────────────────────────────────────────────────

import { unlink, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { userSchema } from '@/models/Schema';
import { requireAuth } from '@/utils/ApiAuth';

// Accepted MIME types for profile photos
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
// 5 MB max upload size
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  // Authenticate
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Parse multipart form — Next.js App Router supports this natively
  const form = await req.formData();
  const file = form.get('avatar');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate type and size
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP or GIF files are allowed' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 413 });
  }

  // Determine file extension from MIME type
  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png':  '.png',
    'image/webp': '.webp',
    'image/gif':  '.gif',
  };
  const ext = extMap[file.type] ?? extname(file.name) ?? '.jpg';

  // Ensure the avatars directory exists
  const avatarsDir = join(process.cwd(), 'public', 'avatars');
  await mkdir(avatarsDir, { recursive: true });

  // Delete the previous avatar file if one exists (any extension)
  const [existing] = await db
    .select({ avatarUrl: userSchema.avatarUrl })
    .from(userSchema)
    .where(eq(userSchema.id, userId))
    .limit(1);

  if (existing?.avatarUrl) {
    // avatarUrl is stored as "/avatars/123.jpg" — resolve to absolute path
    const oldPath = join(process.cwd(), 'public', existing.avatarUrl);
    if (existsSync(oldPath)) {
      await unlink(oldPath).catch(() => {}); // best-effort delete
    }
  }

  // Write new file as {userId}{ext} — one file per user, overwrites on re-upload
  const filename = `${userId}${ext}`;
  const filePath = join(avatarsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // Public URL path — served by Next.js static file serving
  const avatarUrl = `/avatars/${filename}`;

  // Update user row
  await db
    .update(userSchema)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(userSchema.id, userId));

  return NextResponse.json({ avatarUrl });
}

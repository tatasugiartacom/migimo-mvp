import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import sharp from 'sharp';
import { processAvatar, AvatarUploadError } from './avatar-upload.mjs';

test('avatar upload normalizes a photo and removes embedded metadata', async () => {
  const source = await sharp({ create: { width: 480, height: 640, channels: 3, background: '#547132' } })
    .jpeg().withExif({ IFD0: { Copyright: 'private' } }).toBuffer();
  const avatar = await processAvatar(source, 'image/jpeg');
  const result = await sharp(avatar).metadata();
  assert.equal(result.format, 'webp');
  assert.equal(result.width, 320);
  assert.equal(result.height, 320);
  assert.equal(result.exif, undefined);
  await assert.rejects(processAvatar(source, 'image/png'), AvatarUploadError);
  await assert.rejects(processAvatar(Buffer.from('<svg/>'), 'image/svg+xml'), AvatarUploadError);
});

import sharp from 'sharp';

export class AvatarUploadError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

const maxRequestBytes = 2 * 1024 * 1024;
const maxImageBytes = 1024 * 1024;
const allowedTypes = new Map([['image/jpeg', 'jpeg'], ['image/png', 'png'], ['image/webp', 'webp']]);

export async function readAvatarUpload(req) {
  if (!req.headers['content-type']?.startsWith('multipart/form-data;')) throw new AvatarUploadError('Pilih foto JPG, PNG, atau WebP.');
  if (Number(req.headers['content-length']) > maxRequestBytes) throw new AvatarUploadError('Foto terlalu besar. Maksimal 1 MB.', 413);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxRequestBytes) throw new AvatarUploadError('Foto terlalu besar. Maksimal 1 MB.', 413);
    chunks.push(chunk);
  }
  let form;
  try {
    form = await new Request('http://localhost/upload', {
      method: 'POST', headers: { 'content-type': req.headers['content-type'] }, body: Buffer.concat(chunks)
    }).formData();
  } catch { throw new AvatarUploadError('Foto tidak dapat dibaca. Coba unggah lagi.'); }
  const file = form.get('photo');
  if (!file || typeof file.arrayBuffer !== 'function') throw new AvatarUploadError('Pilih foto terlebih dahulu.');
  if (!allowedTypes.has(file.type)) throw new AvatarUploadError('Gunakan foto JPG, PNG, atau WebP.');
  if (!file.size || file.size > maxImageBytes) throw new AvatarUploadError('Foto harus berukuran maksimal 1 MB.', 413);
  return processAvatar(Buffer.from(await file.arrayBuffer()), file.type);
}

export async function processAvatar(input, declaredType) {
  if (!allowedTypes.has(declaredType) || !input.length || input.length > maxImageBytes) throw new AvatarUploadError('Gunakan foto JPG, PNG, atau WebP berukuran maksimal 1 MB.');
  try {
    const image = sharp(input, { limitInputPixels: 16_000_000 });
    const metadata = await image.metadata();
    if (metadata.format !== allowedTypes.get(declaredType) || (metadata.pages ?? 1) !== 1) throw new AvatarUploadError('Format foto tidak sesuai.');
    // Conversion drops EXIF, including any embedded location data.
    return await image.autoOrient().resize(320, 320, { fit: 'cover', position: 'centre' }).webp({ quality: 80 }).toBuffer();
  } catch (error) {
    if (error instanceof AvatarUploadError) throw error;
    throw new AvatarUploadError('Foto tidak dapat diproses. Coba file lain.');
  }
}

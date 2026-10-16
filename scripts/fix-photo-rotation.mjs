// Phone/camera photos taken in portrait are often saved sideways with an EXIF "rotate me" tag.
// Cloudflare's image service ignores that tag, so those photos show up sideways and squashed.
// This bakes the rotation into the pixels (in place) for every photo under src/content.
// Usage: npm run fix-photos
import sharp from "sharp";
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "src/content";
let fixed = 0;

for (const entry of await readdir(ROOT, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.jpe?g$/i.test(entry.name)) continue;
    const file = join(entry.parentPath, entry.name);

    const { orientation } = await sharp(file).metadata();
    if (!orientation || orientation === 1) continue;

    // rotate() with no angle applies the EXIF orientation and resets the tag
    const data = await sharp(file).rotate().keepMetadata().jpeg({ quality: 95 }).toBuffer();
    await writeFile(file, data);
    console.log(`rotated ${file}`);
    fixed++;
}

console.log(fixed ? `Fixed ${fixed} photo(s).` : "All photos are already upright.");

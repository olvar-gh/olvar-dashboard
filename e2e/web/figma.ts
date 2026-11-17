import fs from 'node:fs';
import path from 'node:path';

import type { Page } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export type Rect = { x: number; y: number; width: number; height: number };

const FIGMA_DIR = path.resolve(__dirname, '../../design/figma');

/**
 * Compares the first screenful with a 1× Figma export (design/figma/<name>.png). Masked regions
 * (CSS px) are painted over in both images, so deferred Figma elements do not count. Returns the
 * share of differing pixels in `clip` and writes the capture and the diff next to the test output.
 */
export async function figmaDiff(
  page: Page,
  name: string,
  outDir: string,
  options: { masks?: Rect[]; clip?: Rect } = {}
) {
  const viewport = page.viewportSize()!;
  const shot = PNG.sync.read(
    await page.screenshot({ clip: { x: 0, y: 0, ...viewport }, scale: 'css', animations: 'disabled' })
  );
  const ref = PNG.sync.read(fs.readFileSync(path.join(FIGMA_DIR, `${name}.png`)));
  if (ref.width < viewport.width || ref.height < viewport.height || shot.width !== viewport.width) {
    throw new Error(`size mismatch: capture ${shot.width}x${shot.height}, Figma ${ref.width}x${ref.height}`);
  }
  const clip = options.clip ?? { x: 0, y: 0, ...viewport };
  const crop = (src: PNG) => {
    const out = new PNG({ width: clip.width, height: clip.height });
    PNG.bitblt(src, out, clip.x, clip.y, clip.width, clip.height, 0, 0);
    for (const m of options.masks ?? []) {
      for (let y = Math.max(0, m.y - clip.y); y < Math.min(clip.height, m.y - clip.y + m.height); y++) {
        for (let x = Math.max(0, m.x - clip.x); x < Math.min(clip.width, m.x - clip.x + m.width); x++) {
          const i = (y * clip.width + x) * 4;
          out.data[i] = 255;
          out.data[i + 1] = 0;
          out.data[i + 2] = 255;
          out.data[i + 3] = 255;
        }
      }
    }
    return out;
  };
  const a = crop(shot);
  const b = crop(ref);
  const diff = new PNG({ width: clip.width, height: clip.height });
  const changed = pixelmatch(a.data, b.data, diff.data, clip.width, clip.height, { threshold: 0.15 });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${name}-capture.png`), PNG.sync.write(a));
  fs.writeFileSync(path.join(outDir, `${name}-diff.png`), PNG.sync.write(diff));
  return changed / (clip.width * clip.height);
}

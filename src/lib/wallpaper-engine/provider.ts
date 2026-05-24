import fs from 'fs';
import path from 'path';

export interface WallpaperItem {
  id: string;
  url: string;
  sourcePath: string;
}

export class LocalWallpaperProvider {
  private baseDir: string;

  constructor(baseDir: string = process.env.WALLPAPER_DIR || '/app/wallpapers') {
    this.baseDir = baseDir;
  }

  async getWallpapers(): Promise<WallpaperItem[]> {
    if (!fs.existsSync(this.baseDir)) {
      return [];
    }

    const files = fs.readdirSync(this.baseDir);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    return files
      .filter(file => validExtensions.includes(path.extname(file).toLowerCase()))
      .map(file => ({
        id: file,
        // Assuming we serve them statically via a Next.js API route or public folder mapping
        url: `/api/wallpapers/${encodeURIComponent(file)}`,
        sourcePath: path.join(this.baseDir, file)
      }));
  }
}

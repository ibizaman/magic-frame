import exifr from 'exifr';
import fs from 'fs';

export interface WallpaperMetadata {
  latitude?: number;
  longitude?: number;
  dateTaken?: Date;
  cameraModel?: string;
}

export async function extractEXIF(filePath: string): Promise<WallpaperMetadata> {
  try {
    const buffer = fs.readFileSync(filePath);
    return extractEXIFFromBuffer(buffer);
  } catch(err) {
    console.error("[Wallpaper Engine] Error extracting EXIF from file:", err);
    return {};
  }
}

export async function extractEXIFFromBuffer(buffer: Buffer | Uint8Array): Promise<WallpaperMetadata> {
  try {
    
    // Parse the image buffer using exifr
    const output = await exifr.parse(buffer, {
       gps: true,
       exif: true,
       tiff: true,
    });

    if (!output) return {};

    return {
      latitude: output.latitude,
      longitude: output.longitude,
      dateTaken: output.DateTimeOriginal || output.CreateDate,
      cameraModel: output.Model,
    };
  } catch(err) {
    console.error("[Wallpaper Engine] Error extracting EXIF from buffer:", err);
    return {};
  }
}

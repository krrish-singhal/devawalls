import mongoose, { Schema, Document } from 'mongoose';

export interface IWallpaper extends Document {
  id: string;
  category: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  createdAt: Date;
}

const WallpaperSchema = new Schema({
  id: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  imageUrl: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  title: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Wallpaper = mongoose.model<IWallpaper>('Wallpaper', WallpaperSchema);

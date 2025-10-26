import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export type ImageBucket = 'profile-photos' | 'room-photos';

export interface UploadImageOptions {
  userId: string;
  imageUri: string;
  bucket: ImageBucket;
  fileName?: string;
}

export interface UploadImageResult {
  url: string;
  path: string;
}

/**
 * Uploads an image to Supabase Storage
 * @param options Upload options including userId, imageUri, and bucket
 * @returns Public URL of the uploaded image
 */
export async function uploadImage({
  userId,
  imageUri,
  bucket,
  fileName,
}: UploadImageOptions): Promise<UploadImageResult> {
  try {
    // Generate a unique file name if not provided
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const finalFileName = fileName || `${timestamp}_${randomStr}.${fileExt}`;

    // Create the file path: userId/filename
    const filePath = `${userId}/${finalFileName}`;

    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64);

    // Determine content type
    const contentType = getContentType(fileExt);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: publicUrl,
      path: data.path,
    };
  } catch (error: any) {
    console.error('Error uploading image:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
}

/**
 * Uploads multiple images to Supabase Storage
 * @param options Upload options for multiple images
 * @returns Array of public URLs
 */
export async function uploadMultipleImages({
  userId,
  imageUris,
  bucket,
}: {
  userId: string;
  imageUris: string[];
  bucket: ImageBucket;
}): Promise<UploadImageResult[]> {
  const uploadPromises = imageUris.map((imageUri) =>
    uploadImage({ userId, imageUri, bucket })
  );

  return Promise.all(uploadPromises);
}

/**
 * Deletes an image from Supabase Storage
 * @param bucket The storage bucket
 * @param path The file path to delete
 */
export async function deleteImage(bucket: ImageBucket, path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error deleting image:', error);
    throw new Error(error.message || 'Failed to delete image');
  }
}

/**
 * Deletes multiple images from Supabase Storage
 * @param bucket The storage bucket
 * @param paths Array of file paths to delete
 */
export async function deleteMultipleImages(
  bucket: ImageBucket,
  paths: string[]
): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      throw new Error(`Failed to delete images: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error deleting images:', error);
    throw new Error(error.message || 'Failed to delete images');
  }
}

/**
 * Gets the public URL for a storage file
 * @param bucket The storage bucket
 * @param path The file path
 * @returns Public URL
 */
export function getPublicUrl(bucket: ImageBucket, path: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrl;
}

/**
 * Helper function to determine content type from file extension
 */
function getContentType(fileExt: string): string {
  const contentTypeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  return contentTypeMap[fileExt] || 'image/jpeg';
}

/**
 * Picks an image from the device and returns the URI
 * Requires expo-image-picker to be installed
 */
export async function pickImage(): Promise<string | null> {
  try {
    // Dynamic import to avoid issues if expo-image-picker is not installed
    const ImagePicker = await import('expo-image-picker');

    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for profile photos
      quality: 0.8, // Compress to reduce file size
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error: any) {
    console.error('Error picking image:', error);
    throw new Error(error.message || 'Failed to pick image');
  }
}

/**
 * Picks multiple images from the device
 */
export async function pickMultipleImages(options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}): Promise<string[]> {
  try {
    const ImagePicker = await import('expo-image-picker');

    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    // Pick images
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: options?.allowsEditing ?? false,
      aspect: options?.aspect,
      quality: options?.quality ?? 0.8,
    });

    if (result.canceled) {
      return [];
    }

    return result.assets.map(asset => asset.uri);
  } catch (error: any) {
    console.error('Error picking images:', error);
    throw new Error(error.message || 'Failed to pick images');
  }
}

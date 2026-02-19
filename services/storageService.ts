import { supabase } from '../lib/supabaseClient';

export const storageService = {
  /**
   * Uploads a processed image blob to the 'scans' bucket in Supabase Storage.
   * Returns the public URL if successful, or null if operation fails.
   */
  uploadLesionImage: async (imageBlob: Blob, userId: string): Promise<string | null> => {
    try {
      // Create a unique file path: user_email/timestamp.jpg
      // Sanitize userId (email) to be safe for folder names
      const safeUserId = userId.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = Date.now();
      const fileName = `${safeUserId}/${timestamp}.jpg`;

      // Upload to 'scans' bucket
      const { data, error } = await supabase.storage
        .from('scans')
        .upload(fileName, imageBlob, {
          cacheControl: '3600',
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.warn('Supabase Storage Upload Warning:', error.message);
        // We return null so the app can fallback to base64 storage gracefully
        return null;
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('scans')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (e) {
      console.error('Storage Service Unexpected Error:', e);
      return null;
    }
  }
};
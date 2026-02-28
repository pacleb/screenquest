import api from './api';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

export const uploadService = {
  uploadProof: async (uri: string): Promise<UploadResult> => {
    const formData = new FormData();

    // React Native file upload format
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri,
      name: filename,
      type,
    } as any);

    const response = await api.post<UploadResult>('/uploads/proof', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  },
};

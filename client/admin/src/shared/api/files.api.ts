import { http } from '@/shared/api/http';

async function uploadFile(path: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post<{ url: string } & Record<string, unknown>>(path, formData);
  return String(data.url ?? data.Url ?? '');
}

export async function uploadImage(file: File): Promise<string> {
  return uploadFile('/files/upload', file);
}

export async function uploadBrandingLogo(file: File): Promise<string> {
  return uploadFile('/files/upload-branding-logo', file);
}

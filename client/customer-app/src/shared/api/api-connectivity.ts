import axios from 'axios';

/** Lỗi do API/port 5290 chưa sẵn sàng — layout banner đã xử lý, trang không cần banner trùng. */
export function isApiConnectivityError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true;
  const status = error.response.status;
  return status === 502 || status === 503 || status === 504;
}

export function isApiConnectivityMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  return (
    /không kết nối được api/i.test(message) ||
    /cannot reach the api/i.test(message) ||
    /api đang lỗi hoặc chưa chạy/i.test(message) ||
    /api error or not running/i.test(message) ||
    /api port 5290/i.test(message) ||
    /ECONNREFUSED/i.test(message)
  );
}

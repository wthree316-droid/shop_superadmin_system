import client from './client';

/**
 * ฟังก์ชันสำหรับ Login 
 * @param formData ข้อมูล username และ password ในรูปแบบ URLSearchParams
 */
export const loginApi = async (formData: URLSearchParams) => {
  // เรียกผ่าน client ที่ตั้งค่า baseURL ไว้แล้ว (/api/v1)
  // ดังนั้นใส่แค่ path ต่อท้ายคือ /auth/login
  const response = await client.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
};

/**
 * ฟังก์ชันสำหรับดึงข้อมูลตัวเอง (Me)
 */
export const fetchMeApi = async () => {
  const response = await client.get('/users/me');
  return response.data;
};
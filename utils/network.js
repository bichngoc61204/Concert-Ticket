/**
 * Hàm lấy địa chỉ IP công khai của thiết bị
 * @returns {Promise<string>} Địa chỉ IP hoặc '127.0.0.1' nếu không lấy được
 */
export const getDeviceIpAddress = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || '127.0.0.1';
  } catch (error) {
    console.error('Lỗi khi lấy địa chỉ IP:', error);
    return '127.0.0.1';
  }
};

/**
 * Hàm kiểm tra kết nối mạng
 * @returns {Promise<boolean>} Trả về true nếu có kết nối mạng
 */
export const checkInternetConnection = async () => {
  try {
    const response = await fetch('https://www.google.com', { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Lỗi kiểm tra kết nối mạng:', error);
    return false;
  }
};
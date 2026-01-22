import qs from 'qs';
import CryptoJS from 'crypto-js';

const vnp_TmnCode = '2XU3FN8V';
const vnp_HashSecret = 'LDQYJEB89YYRQGLSHNDQFCTJ4BMPSWJ3';
const vnp_Url = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

// 🔥 THAY THÔNG TIN NÀY BẰNG SỐ TÀI KHOẢN BẠN
const acqId = '970436'; // vietcombank ví dụ
const accountNo = '0123456789'; // số tài khoản thật của bạn
const accountName = 'NGUYEN VAN A';

function formatDateVNPay(date) {
  const yyyy = date.getFullYear().toString();
  const MM = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const HH = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const ss = date.getSeconds().toString().padStart(2, '0');
  return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
}

export const createVNPayQRCodeUrl = (
  amount,
  orderId,
  orderInfo,
  ipAddr,
  returnUrl
) => {

  const date = new Date();
  const createDate = formatDateVNPay(date);
  const expireDateObj = new Date(date.getTime() + 15 * 60000);
  const expireDate = formatDateVNPay(expireDateObj);

  // ⛔ Bỏ dấu tiếng Việt để tránh lỗi VNPay
  const cleanOrderInfo = orderInfo.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode,
    vnp_Amount: Math.round(amount),
    vnp_CreateDate: createDate,
    vnp_CurrCode: 'VND',
    vnp_IpAddr: ipAddr,
    vnp_Locale: 'vn',
    vnp_OrderInfo: cleanOrderInfo,
    vnp_OrderType: 'other',
    vnp_ReturnUrl: returnUrl,
    vnp_TxnRef: orderId,
    vnp_ExpireDate: expireDate
  };

  const sortedParams = Object.keys(vnp_Params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = vnp_Params[key];
      return acc;
    }, {});

  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = CryptoJS.HmacSHA512(signData, vnp_HashSecret);
  const signed = hmac.toString(CryptoJS.enc.Hex).toUpperCase();

  const fullParams = {
    ...sortedParams,
    vnp_SecureHash: signed
  };

  const paymentUrl = `${vnp_Url}?${qs.stringify(fullParams, {
    encode: false
  })}`;

  // ✅ QR CODE CHÍNH XÁC — DÙNG ĐÚNG ENDPOINT CỦA VIETQR
  const qrCodeUrl = 
    `https://img.vietqr.io/image/${acqId}-${accountNo}-qr_only.png?amount=${Math.round(
      amount / 100
    )}&addInfo=${encodeURIComponent(cleanOrderInfo)}&accountName=${encodeURIComponent(
      accountName
    )}`;

  return { paymentUrl, qrCodeUrl };
};

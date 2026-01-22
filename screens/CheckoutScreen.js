import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { createVNPayQRCodeUrl } from '../services/vnpayService';
import { getDeviceIpAddress } from '../utils/network';
import { useAuthStore } from '../store/authStore'

export default function CheckoutScreen({ route, navigation }) {
  const user = useAuthStore((s) => s.user);

  const { 
    eventId, 
    sectionId, 
    eventTitle, 
    sectionName, 
    price, 
    quantity
  } = route.params;

  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('vnpay_qr');

  const handleCheckout = async () => {
    if (selectedPayment === 'vnpay_qr') {
      await handleVNPayQRPayment();
    } else {
      Alert.alert('Thông báo', 'Vui lòng chọn phương thức thanh toán');
    }
  };

const handleVNPayQRPayment = async () => {
  try {
    setLoading(true);

    if (!user) {
      Alert.alert('Bạn cần đăng nhập để tiếp tục');
      useAuthStore.getState().logout();
      return;
    }

    const ipAddr = await getDeviceIpAddress();
    const orderId = `ORDER-${Date.now()}`;
    const orderInfo = `Thanh toán vé ${eventTitle}`;
    const returnUrl = 'yourapp://vnpay-return';

    // Tạo URL QR
    const { paymentUrl, qrCodeUrl } = createVNPayQRCodeUrl(
      price * quantity * 100,
      orderId,
      orderInfo,
      ipAddr,
      returnUrl
    );

    // Tạo order có qrCodeUrl
    const orderData = {
      userId: user.uid,
      eventId,
      sectionId,
      eventTitle,
      sectionName,
      quantity,
      unitPrice: price,
      totalPrice: price * quantity,
      status: 'pending_payment',
      orderId,
      paymentMethod: 'vnpay_qr',
      qrCodeUrl, // << 🔥 THÊM VÔ ĐÂY
      createdAt: serverTimestamp(),
    };

    // LƯU order + QR code vào Firestore
    const docRef = await addDoc(collection(db, 'orders'), orderData);

    // Chuyển sang màn QR
    navigation.navigate('QRCodePayment', {
      orderId: docRef.id,
      orderData,
      qrCodeUrl,
    });

  } catch (error) {
    console.log(error);
    Alert.alert('Lỗi', 'Không tạo được đơn hàng');
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin sự kiện</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Sự kiện:</Text>
            <Text style={styles.value}>{eventTitle}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Khu vực:</Text>
            <Text style={styles.value}>{sectionName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi tiết đơn hàng</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Đơn giá:</Text>
            <Text style={styles.value}>{price.toLocaleString()} VNĐ</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Số lượng:</Text>
            <Text style={styles.value}>{quantity}</Text>
          </View>
          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalValue}>{(price * quantity).toLocaleString()} VNĐ</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          
          <TouchableOpacity 
            style={[
              styles.paymentMethod,
              selectedPayment === 'vnpay_qr' && styles.selectedPaymentMethod
            ]}
            onPress={() => setSelectedPayment('vnpay_qr')}
          >
            <View style={styles.paymentMethodContent}>
              <View style={styles.paymentLeft}>
                <View style={styles.paymentIcon}>
                  <Image 
                    source={require('../assets/favicon.png')} 
                    style={styles.paymentLogo} 
                  />
                </View>
                <Text style={styles.paymentText}>Thanh toán qua VNPay QR</Text>
              </View>
              {selectedPayment === 'vnpay_qr' && (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalLabel}>Tổng thanh toán</Text>
          <Text style={styles.totalPrice}>{(price * quantity).toLocaleString()} VNĐ</Text>
        </View>
        <TouchableOpacity 
          style={[styles.checkoutButton, loading && styles.disabledButton]}
          onPress={handleCheckout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.checkoutButtonText}>Xác nhận thanh toán</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  paymentMethod: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  selectedPaymentMethod: {
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    width: 40,
    height: 24,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  paymentText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  totalPrice: {
    fontSize: 18,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  checkoutButton: {
    backgroundColor: '#1976D2',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#90CAF9',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { runTransaction } from "firebase/firestore";


const QRCodePaymentScreen = ({ route, navigation }) => {
  const { orderId, orderData, qrCodeUrl } = route.params;
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, success, failed

  // Theo dõi thay đổi trạng thái đơn hàng
  useEffect(() => {
    if (!orderId) return;

    const orderRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(orderRef, (doc) => {
      const order = doc.data();
      if (order.status === 'completed') {
        setPaymentStatus('success');
        Alert.alert('Thành công', 'Thanh toán đã được xác nhận!');
      } else if (order.status === 'failed') {
        setPaymentStatus('failed');
        Alert.alert('Lỗi', 'Thanh toán không thành công. Vui lòng thử lại.');
      }
    });

    return () => unsubscribe();
  }, [orderId]);

  // Tự động chuyển về màn hình chính sau 5 giây nếu thanh toán thành công
  useEffect(() => {
    if (paymentStatus === 'success') {
      const timer = setTimeout(() => {
        navigation.navigate('Home');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quét mã thanh toán</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.qrContainer}>
          <Text style={styles.amountText}>
            {orderData.totalPrice.toLocaleString()} VNĐ
          </Text>
          
          {paymentStatus === 'success' ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
              <Text style={styles.successText}>Thanh toán thành công!</Text>
              <Text style={styles.redirectText}>Tự động chuyển về trang chủ sau 5 giây...</Text>
            </View>
          ) : (
            <>
              <View style={styles.qrCodeContainer}>
                <Image
                  source={{ uri: qrCodeUrl }}
                  style={styles.qrCode}
                  resizeMode="contain"
                  onLoadEnd={() => setLoading(false)}
                />
                {loading && (
                  <ActivityIndicator 
                    size="large" 
                    color="#4CAF50" 
                    style={styles.loadingIndicator}
                  />
                )}
              </View>
              <Text style={styles.instructionText}>
                Mở ứng dụng ngân hàng và quét mã để thanh toán
              </Text>
            </>
          )}
        </View>

        <View style={[
          styles.noteContainer,
          paymentStatus === 'failed' && styles.noteErrorContainer
        ]}>
          <Ionicons 
            name="information-circle" 
            size={20} 
            color={paymentStatus === 'failed' ? '#F44336' : '#1976D2'} 
          />
          <Text style={[
            styles.noteText,
            paymentStatus === 'failed' && styles.noteError
          ]}>
            {paymentStatus === 'success' 
              ? 'Cảm ơn bạn đã thanh toán!'
              : paymentStatus === 'failed'
                ? 'Thanh toán không thành công. Vui lòng thử lại.'
                : 'Vui lòng thanh toán trong vòng 15 phút để hoàn tất giao dịch'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
  style={[
    styles.doneButton,
    paymentStatus === 'success' && styles.successButton,
    paymentStatus === 'failed' && styles.errorButton
  ]}
  onPress={async () => {
  if (paymentStatus === 'success') {
    navigation.navigate('Home');
    return;
  }
  if (paymentStatus === 'failed') {
    navigation.goBack();
    return;
  }

  try {
    await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) throw new Error("Order không tồn tại");

      const order = orderSnap.data();
      const sectionRef = doc(db, "sections", order.sectionId);
      const sectionSnap = await transaction.get(sectionRef);

      if (!sectionSnap.exists()) throw new Error("Không tìm thấy section");

      const section = sectionSnap.data();
      const available = Number(section.availableSlots);
      const qty = Number(order.quantity);

      if (available < qty) {
        throw new Error("Không đủ vé để trừ");
      }

      // Trừ vé
      transaction.update(sectionRef, {
        availableSlots: available - qty
      });

      // Chuyển trạng thái order
      transaction.update(orderRef, {
        status: "waiting_verify"
      });
    });

    Alert.alert("Đã xác nhận", "Chúng tôi sẽ kiểm tra thanh toán của bạn.");
    navigation.navigate("Home");

  } catch (err) {
    Alert.alert("Lỗi", err.message || "Không thể cập nhật trạng thái.");
    console.log("Transaction error:", err);
  }
}}
>
  <Text style={styles.doneButtonText}>
    {paymentStatus === 'success'
      ? 'Về trang chủ'
      : paymentStatus === 'failed'
        ? 'Thử lại'
        : 'Tôi đã chuyển khoản'  // 🔥 Nút mới
    }
  </Text>
</TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E91E63',
    marginBottom: 10,
  },
  qrCodeContainer: {
    width: 250,
    height: 250,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  qrCode: {
    width: '100%',
    height: '100%',
  },
  loadingIndicator: {
    position: 'absolute',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  noteErrorContainer: {
    backgroundColor: '#FFEBEE',
  },
  noteText: {
    marginLeft: 8,
    color: '#1976D2',
    fontSize: 13,
    flex: 1,
  },
  noteError: {
    color: '#F44336',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  doneButton: {
    backgroundColor: '#1976D2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  errorButton: {
    backgroundColor: '#F44336',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 15,
    marginBottom: 10,
  },
  redirectText: {
    color: '#666',
    fontSize: 14,
  },
});

export default QRCodePaymentScreen;
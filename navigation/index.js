// navigation/index.js
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useCityStore } from '../store/useCityStore';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CitySelectScreen from '../screens/CitySelectScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import QRCodePaymentScreen from '../screens/QRCodePaymentScreen';
// 1. Import màn hình AIChatScreen mới
import AIChatScreen from '../screens/AIChatScreen'; 

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const selectedCity = useCityStore((s) => s.selectedCity);

  return (
    <Stack.Navigator>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Đăng ký' }} />
        </>
      ) : !selectedCity ? (
        <Stack.Screen name="CitySelect" component={CitySelectScreen} options={{ title: 'Chọn thành phố' }} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Tìm kiếm' }} />
          <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ headerShown: false }} />
          
          {/* 2. Thêm màn hình AIChat vào đây */}
          <Stack.Screen 
            name="AIChat" 
            component={AIChatScreen} 
            options={{ 
              headerShown: false, // Ẩn header mặc định vì mình đã làm header tùy chỉnh trong màn hình chat
              animation: 'slide_from_bottom' // Hiệu ứng mở từ dưới lên cho giống trợ lý ảo
            }} 
          />
        </>
      )}

      <Stack.Screen 
        name="Checkout" 
        component={CheckoutScreen} 
        options={{ 
          title: 'Thanh toán',
          headerShown: true
        }} 
      />
      
      <Stack.Screen 
        name="QRCodePayment" 
        component={QRCodePaymentScreen} 
        options={{ 
          title: 'Thanh toán QR Code',
          headerShown: true
        }} 
      />
    </Stack.Navigator>
  );
}

export default RootNavigator;
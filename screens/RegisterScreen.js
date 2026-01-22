import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { doc, setDoc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function RegisterScreen({ navigation }) {
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);

  const schema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirmPassword: z.string().min(6, 'Xác nhận mật khẩu tối thiểu 6 ký tự'),
  }).refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu không khớp',
  });

  const { register, setValue, handleSubmit, formState: { errors, isValid } } = useForm({
    mode: 'onChange',
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data) => {
    if (loading) return;
    setLoading(true);
    
    try {
      // Tạo ID ngẫu nhiên cho user
      const userId = Date.now().toString();
      const userRef = doc(db, 'users', userId);
      
      // Kiểm tra xem email đã tồn tại chưa
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', data.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error('EMAIL_EXISTS');
      }
      
      // Tạo user mới trong collection users
      await setDoc(userRef, {
        name: data.email.split('@')[0],
        email: data.email,
        password: data.password, // Lưu ý: Trong thực tế nên mã hóa mật khẩu
        phone: '',
        avatar: '',
        createdAt: Timestamp.now(),
      });
      
      Alert.alert('Thành công', 'Đăng ký tài khoản thành công!', [
        {
          text: 'Đăng nhập ngay',
          onPress: () => navigation.navigate('Login')
        }
      ]);
      
    } catch (error) {
      console.error('Lỗi đăng ký:', error);
      let errorMessage = 'Đã có lỗi xảy ra khi đăng ký. Vui lòng thử lại.';
      
      if (error.message === 'EMAIL_EXISTS') {
        errorMessage = 'Email đã được sử dụng. Vui lòng chọn email khác.';
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng ký</Text>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, errors.email && styles.inputError]}
          onChangeText={(t) => setValue('email', t, { shouldValidate: true })}
          {...register('email')}
        />
        {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Mật khẩu</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            placeholder="••••••••"
            secureTextEntry={!showPw}
            style={[styles.input, styles.inputWithIcon, errors.password && styles.inputError]}
            onChangeText={(t) => setValue('password', t, { shouldValidate: true })}
            {...register('password')}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(!showPw)}>
            <Ionicons name={showPw ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
      </View>

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Xác nhận mật khẩu</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            placeholder="••••••••"
            secureTextEntry={!showPw2}
            style={[styles.input, styles.inputWithIcon, errors.confirmPassword && styles.inputError]}
            onChangeText={(t) => setValue('confirmPassword', t, { shouldValidate: true })}
            {...register('confirmPassword')}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw2(!showPw2)}>
            <Ionicons name={showPw2 ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword.message}</Text>}
      </View>

      <TouchableOpacity
        style={[styles.button, styles.buttonDark, (!isValid || loading) && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={!isValid || loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  inputWithIcon: {
    paddingRight: 44,
    marginBottom: 0,
  },
  inputError: {
    borderColor: '#F87171',
  },
  fieldWrap: {
    width: '100%',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  passwordWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: '100%',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  buttonDark: {
    backgroundColor: '#000',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  link: {
    color: '#2563EB',
  },
  error: {
    color: '#DC2626',
    marginTop: 6,
    fontSize: 12,
  },
});

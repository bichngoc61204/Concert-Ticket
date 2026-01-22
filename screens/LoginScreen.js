// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen({ navigation }) {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const schema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  });

  const { register, setValue, handleSubmit, formState: { errors, isValid } } = useForm({
    mode: 'onChange',
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

const onSubmit = async (data) => {
  if (loading) return;
  setLoading(true);
  
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', data.email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('USER_NOT_FOUND');
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    if (userData.password !== data.password) {
      throw new Error('WRONG_PASSWORD');
    }
        
    login({
      ...userData,
      uid: userDoc.id
    });
    
    
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    let errorMessage = 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
    
    if (error.message === 'USER_NOT_FOUND') {
      errorMessage = 'Không tìm thấy tài khoản với email này.';
    } else if (error.message === 'WRONG_PASSWORD') {
      errorMessage = 'Mật khẩu không chính xác.';
    }
    
    Alert.alert('Lỗi', errorMessage);
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng nhập</Text>

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

      <TouchableOpacity
        style={[styles.button, styles.buttonDark, (!isValid || loading) && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={!isValid || loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Chưa có tài khoản? Đăng ký</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldWrap: {
    marginBottom: 15,
  },
  label: {
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 6,
    fontSize: 16,
  },
  inputError: {
    borderColor: 'red',
  },
  error: {
    color: 'red',
    marginTop: 5,
    fontSize: 12,
  },
  passwordWrap: {
    position: 'relative',
  },
  inputWithIcon: {
    paddingRight: 40,
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: 12,
  },
  button: {
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDark: {
    backgroundColor: '#000',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  link: {
    marginTop: 15,
    color: '#1a73e8',
    textAlign: 'center',
  },
});
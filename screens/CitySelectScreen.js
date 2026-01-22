import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useCityStore } from '../store/useCityStore';
import { getCities } from '../services/firestoreService';

export default function CitySelectScreen() {
  const [q, setQ] = useState('');
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const setCity = useCityStore((s) => s.setCity);
  const data = useMemo(
    () =>
      cities.filter(
        (c) => c.name?.toLowerCase().includes(q.toLowerCase())
      ),
    [q, cities]
  );

  useEffect(() => {
    let mounted = true;
    const fetchCities = async () => {
      try {
        setLoading(true);
        const res = await getCities();
        if (!mounted) return;
        if (res.success) {
          setCities(res.data ?? []);
          setError(null);
        } else {
          setError('Không thể tải danh sách thành phố');
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách thành phố:', err);
        setError('Không thể tải danh sách thành phố');
      } finally {
        mounted && setLoading(false);
      }
    };

    fetchCities();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chọn thành phố</Text>
      <TextInput
        placeholder="Tìm kiếm thành phố..."
        value={q}
        onChangeText={setQ}
        style={styles.input}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setCity(item)}>
            <Text style={styles.itemText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  itemText: {
    fontSize: 16,
  },
  error: {
    color: '#DC2626',
    marginBottom: 12,
  },
});

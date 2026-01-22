import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useCityStore } from '../store/useCityStore';
import { getEventsByCity } from '../services/firestoreService';

export default function SearchScreen({ navigation }) {
  const [q, setQ] = useState('');
  const city = useCityStore((s) => s.selectedCity);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchEvents = async () => {
      if (!city?.id) {
        setEvents([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await getEventsByCity(city.id);
        if (!active) return;
        if (res.success) {
          setEvents(res.data ?? []);
        } else {
          setEvents([]);
          setError('Không thể tải sự kiện');
        }
      } catch (err) {
        if (!active) return;
        console.error('Lỗi khi tải sự kiện:', err);
        setEvents([]);
        setError('Không thể tải sự kiện');
      } finally {
        active && setLoading(false);
      }
    };

    fetchEvents();
    return () => {
      active = false;
    };
  }, [city?.id]);

  const data = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return events;

    return events.filter((e) => {
      const title = e.title?.toLowerCase() ?? '';
      const venue = e.venue?.toLowerCase() ?? '';
      return title.includes(keyword) || venue.includes(keyword);
    });
  }, [q, events]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tìm kiếm</Text>
      <TextInput
        placeholder={`Tìm theo tên/địa điểm ở ${city?.name ?? 'thành phố của bạn'}`}
        value={q}
        onChangeText={setQ}
        style={styles.input}
      />
      {loading ? (
        <ActivityIndicator size="small" color="#000" style={{ marginTop: 24 }} />
      ) : data.length === 0 ? (
        <Text style={styles.emptyText}>{error ?? 'Không tìm thấy sự kiện phù hợp'}</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('EventDetail', { id: item.id })}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSub}>
                {item.date?.toDate ? new Date(item.date.toDate()).toLocaleDateString('vi-VN') : item.date}{' '}
                · {item.venue}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
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
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemSub: {
    color: '#4B5563',
    marginTop: 2,
  },
  emptyText: {
    marginTop: 24,
    textAlign: 'center',
    color: '#6B7280',
  },
});

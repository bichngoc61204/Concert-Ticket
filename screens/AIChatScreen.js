import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, FlatList, TouchableOpacity, 
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCityStore } from '../store/useCityStore';
import { getEventsByCity, getSectionsByEvent } from '../services/firestoreService';
import { sendMessageToGemini } from '../services/gemini';

export default function AIChatScreen({ navigation }) {
  const city = useCityStore((s) => s.selectedCity);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [eventsContext, setEventsContext] = useState([]);
  const [messages, setMessages] = useState([]);
  const flatListRef = useRef(null);

  useEffect(() => {
    const fetchFullData = async () => {
      setMessages([{
        id: 'welcome',
        text: `Dạ em chào Anh/Chị! Em đã sẵn sàng hỗ trợ thông tin sự kiện và vé tại ${city?.name}. Anh/Chị muốn kiểm tra show nào ạ?`,
        sender: 'ai',
      }]);

      if (city?.id) {
        try {
          const res = await getEventsByCity(city.id);
          if (res.success) {
            // LẤY TOÀN BỘ CÁC TRƯỜNG THEO TYPE CỦA BẠN
            const fullData = await Promise.all(res.data.map(async (event) => {
              const secRes = await getSectionsByEvent(event.id);
              
              return {
                // Event fields
                id: event.id,
                title: event.title,
                venue: event.venue,
                date: event.date,
                time: event.time,
                description: event.description,
                artists: event.artists || [],
                availableTickets: event.availableTickets,
                // Section fields (Lồng vào trong event)
                sections: secRes.success ? secRes.data.map(s => ({
                  name: s.name,
                  price: s.price,
                  availableSlots: s.availableSlots,
                  totalSlots: s.totalSlots
                })) : []
              };
            }));
            setEventsContext(fullData);
          }
        } catch (err) {
          console.error("Data Fetch Error:", err);
        }
      }
    };
    fetchFullData();
  }, [city]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), text: userText, sender: 'user' }]);
    setInputText('');
    setLoading(true);

    try {
      const response = await sendMessageToGemini(userText, {
        cityName: city?.name,
        events: eventsContext // Đây là mảng chứa đầy đủ Event + Sections bên trong
      });

      setMessages(prev => [...prev, { id: Date.now().toString(), text: response, sender: 'ai' }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: 'err', text: "Lỗi kết nối API.", sender: 'ai', isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.msgWrap, item.sender === 'user' ? styles.userRow : styles.aiRow]}>
      <View style={[styles.bubble, item.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.msgText, item.sender === 'user' ? styles.userText : styles.aiText]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Quản lý Sự kiện AI</Text>
          <Text style={styles.headerSub}>Hệ thống dữ liệu trực tuyến</Text>
        </View>
        <TouchableOpacity onPress={() => setMessages([messages[0]])}>
          <Ionicons name="refresh" size={22} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        {loading && (
            <View style={styles.loadingArea}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={styles.loadingText}>Đang truy xuất kho dữ liệu...</Text>
            </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Hỏi về khu vé, số lượng còn lại..."
            value={inputText}
            onChangeText={setInputText}
            style={styles.input}
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
            <Ionicons name="paper-plane" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEE'
  },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 11, color: '#10B981' },
  msgWrap: { marginBottom: 15, flexDirection: 'row' },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 15 },
  userBubble: { backgroundColor: '#6366f1' },
  aiBubble: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  userText: { color: '#fff' },
  aiText: { color: '#1F2937', fontSize: 15, lineHeight: 22 },
  inputContainer: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 15, height: 40, marginRight: 10 },
  sendBtn: { backgroundColor: '#6366f1', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  loadingArea: { flexDirection: 'row', marginLeft: 20, marginBottom: 10 },
  loadingText: { fontSize: 12, color: '#6B7280', marginLeft: 8 }
});
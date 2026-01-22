import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getEventById, getSectionsByEvent } from '../services/firestoreService';
import { auth } from '../firebase';
import { useAuthStore } from '../store/authStore';


export default function EventDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const [event, setEvent] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState(null);
  const [quantity, setQuantity] = useState(1);
const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        // Lấy thông tin sự kiện
        const eventResult = await getEventById(id);
        if (eventResult.success) {
          setEvent(eventResult.data);
          
          // Lấy danh sách sections của sự kiện
          const sectionsResult = await getSectionsByEvent(id);
          if (sectionsResult.success) {
            setSections(sectionsResult.data);
          }
        } else {
          Alert.alert('Lỗi', 'Không tìm thấy thông tin sự kiện');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
        Alert.alert('Lỗi', 'Đã có lỗi xảy ra khi tải dữ liệu');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id]);

// In EventDetailScreen.js
const handleBookTicket = async () => {
 if (!user) {
  Alert.alert('Thông báo', 'Bạn cần đăng nhập để tiếp tục');

  // Đặt lại trạng thái => Navigator tự về Login
  useAuthStore.getState().logout();

  return;
}

  if (!selectedSection) {
    Alert.alert('Thông báo', 'Vui lòng chọn loại vé');
    return;
  }

  if (selectedSection.availableSlots < quantity) {
    Alert.alert('Thông báo', 'Số lượng vé không đủ');
    return;
  }

  navigation.navigate('Checkout', {
    eventId: event.id,
    sectionId: selectedSection.id,
    eventTitle: event.title,
    sectionName: selectedSection.name,
    price: selectedSection.price,
    quantity,
    maxQuantity: selectedSection.availableSlots
  });
};

  const renderSectionItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.sectionItem, 
        selectedSection?.id === item.id && styles.selectedSectionItem
      ]}
      onPress={() => setSelectedSection(item)}
    >
      <View style={styles.sectionInfo}>
        <Text style={styles.sectionName}>{item.name}</Text>
        <Text style={styles.sectionPrice}>{item.price.toLocaleString()} VNĐ</Text>
        <Text style={styles.availableSlots}>Còn lại: {item.availableSlots} vé</Text>
      </View>
      <Ionicons 
        name={selectedSection?.id === item.id ? "radio-button-on" : "radio-button-off"} 
        size={24} 
        color={selectedSection?.id === item.id ? "#4CAF50" : "#757575"} 
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        <Text>Không tìm thấy sự kiện</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header với ảnh sự kiện */}
      <View style={styles.headerWrap}>
        <Image
          source={{ uri: event.bannerUrl }}
          style={styles.headerImage}
          contentFit="cover"
          transition={200}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.7)"]}
          style={styles.headerOverlay}
        />
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <View style={styles.eventMeta}>
            <Ionicons name="calendar" size={16} color="white" />
            <Text style={styles.metaText}>
              {new Date(event.date).toLocaleDateString('vi-VN')} • {event.time}
            </Text>
          </View>
          <View style={styles.eventMeta}>
            <Ionicons name="location" size={16} color="white" />
            <Text style={styles.metaText}>{event.venue}</Text>
          </View>
        </View>
      </View>

      {/* Nội dung chính */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Mô tả sự kiện</Text>
        <Text style={styles.description}>{event.description}</Text>
        
        <Text style={styles.sectionTitle}>Nghệ sĩ</Text>
        <View style={styles.artistsContainer}>
          {event.artists?.map((artist, index) => (
            <View key={index} style={styles.artistTag}>
              <Text style={styles.artistText}>{artist}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Chọn loại vé</Text>
        <FlatList
          data={sections}
          renderItem={renderSectionItem}
          keyExtractor={item => item.id}
          scrollEnabled={false}
        />

        {selectedSection && (
          <View style={styles.quantitySelector}>
            <Text style={styles.quantityLabel}>Số lượng:</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={quantity <= 1 ? "#BDBDBD" : "#000"} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}
                disabled={quantity >= selectedSection.availableSlots}
              >
                <Ionicons name="add" size={20} color={quantity >= selectedSection.availableSlots ? "#BDBDBD" : "#000"} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Thanh điều hướng dưới cùng */}
      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalLabel}>Tổng tiền</Text>
          <Text style={styles.totalPrice}>
            {selectedSection ? (selectedSection.price * quantity).toLocaleString() : '0'} VNĐ
          </Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.bookButton,
            !selectedSection && styles.bookButtonDisabled
          ]}
          onPress={handleBookTicket}
          disabled={!selectedSection}
        >
          <Text style={styles.bookButtonText}>Đặt vé ngay</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerWrap: {
    height: 300,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 2,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  metaText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  artistsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  artistTag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 8,
  },
  artistText: {
    color: '#1976D2',
    fontSize: 12,
  },
  sectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedSectionItem: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  sectionPrice: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  availableSlots: {
    fontSize: 12,
    color: '#757575',
  },
  quantitySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    width: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  priceContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: '#757575',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    marginLeft: 15,
  },
  bookButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  bookButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
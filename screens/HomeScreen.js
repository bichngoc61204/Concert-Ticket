import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, TextInput, Animated, ActivityIndicator, Modal, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCityStore } from '../store/useCityStore';
import { useAuthStore } from '../store/authStore';
import { getCities, getEventsByCity, getUserOrders, getEventById } from '../services/firestoreService';

export default function HomeScreen({ navigation }) {
  const city = useCityStore((s) => s.selectedCity);
  const setCity = useCityStore((s) => s.setCity);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [eventsData, setEventsData] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [cityOptions, setCityOptions] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);
  const [showTickets, setShowTickets] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState(null);
  const data = eventsData;
  const [activeIndex, setActiveIndex] = useState(0); // index within real data
  const hero = data[activeIndex] || data[0];
  const CARD_WIDTH = 140;
  const SPACING = 14;
  const ITEM_SIZE = CARD_WIDTH + SPACING;
  const { width: W, height: H } = Dimensions.get('window');
  const SCREEN_WIDTH = W;
  const SIDE_INSET = Math.max(0, (SCREEN_WIDTH - CARD_WIDTH) / 2);
  const BOTTOM_OVERLAY = 220;
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const PANEL_HEIGHT = 260;
  const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.82, 320);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  // Inline/bottom-sheet detail removed; navigation to EventDetail is used
  // Build looped dataset: [tail, ...data, head]
  useEffect(() => {
    let active = true;

    if (!city?.id) {
      setEventsData([]);
      setEventsLoading(false);
      return;
    }

    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        setEventsError(null);
        const res = await getEventsByCity(city.id);
        if (!active) {
          return;
        }
        if (res.success) {
          setEventsData(res.data ?? []);
        } else {
          setEventsData([]);
          setEventsError('Không thể tải danh sách sự kiện');
        }
      } catch (error) {
        if (!active) return;
        console.error('Lỗi khi tải sự kiện:', error);
        setEventsData([]);
        setEventsError('Không thể tải danh sách sự kiện');
      } finally {
        active && setEventsLoading(false);
      }
    };

    fetchEvents();
    return () => {
      active = false;
    };
  }, [city?.id]);

  useEffect(() => {
    let active = true;
    const fetchCities = async () => {
      try {
        setCitiesLoading(true);
        const res = await getCities();
        if (!active) return;
        if (res.success) {
          setCityOptions(res.data ?? []);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách thành phố:', error);
      } finally {
        active && setCitiesLoading(false);
      }
    };

    fetchCities();
    return () => {
      active = false;
    };
  }, []);

  const looped = useMemo(() => {
    if (data.length <= 1) return data;
    return [data[data.length - 1], ...data, data[0]];
  }, [data]);

  // Initial offset to first real item
  useEffect(() => {
    if (listRef.current && data.length > 1) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: ITEM_SIZE, animated: false });
      });
    }
  }, [ITEM_SIZE, data.length]);

  const indexFromOffset = (x) => {
    const idxF = Math.round(x / ITEM_SIZE); // index within looped list
    if (data.length <= 1) return 0;
    // map to real data index (0..data.length-1), where looped[0] is tail, looped[1] is data[0]
    const real = (idxF - 1 + data.length) % data.length;
    return real;
  };

  const onScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const real = indexFromOffset(x);
    if (real !== activeIndex) setActiveIndex(real);
  };
  const onScrollAnimated = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true, listener: onScroll }
  );

  const onMomentumEnd = (e) => {
    if (data.length <= 1) return;
    const x = e.nativeEvent.contentOffset.x;
    const idxF = Math.round(x / ITEM_SIZE); // position in looped list
    const lastIndex = looped.length - 1; // equals data.length + 1
    // If snapped to clone at head/tail, jump to corresponding real item without animation
    if (idxF === 0) {
      // jumped to tail clone -> jump to last real
      listRef.current?.scrollToOffset({ offset: data.length * ITEM_SIZE, animated: false });
    } else if (idxF === lastIndex) {
      // jumped to head clone -> jump to first real (index 1)
      listRef.current?.scrollToOffset({ offset: ITEM_SIZE, animated: false });
    }
  };

  const fetchTickets = async () => {
    if (!user?.uid) return;
    try {
      setTicketsLoading(true);
      setTicketsError(null);
      const res = await getUserOrders(user.uid);
      if (!res.success) {
        setTickets([]);
        setTicketsError('Không thể tải vé');
        return;
      }
      const orders = res.data ?? [];

      // Enrich each order with event info (title, image, venue, date/time) when possible
      const enhanced = await Promise.all(
        orders.map(async (o) => {
          const out = { ...o };
          if (o.eventId) {
            try {
              const ev = await getEventById(o.eventId);
              if (ev.success && ev.data) {
                let dateStr = ev.data.date;
                let timeStr = ev.data.time;
                try {
                  if (ev.data.date && typeof ev.data.date.toDate === 'function') {
                    const d = ev.data.date.toDate();
                    dateStr = d.toLocaleDateString();
                    if (!timeStr) timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  } else if (ev.data.date && typeof ev.data.date === 'string') {
                    const d = new Date(ev.data.date);
                    if (!isNaN(d)) {
                      dateStr = d.toLocaleDateString();
                      if (!timeStr) timeStr = ev.data.time ?? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }
                  }
                } catch (e) {
                  // ignore formatting errors
                }

                out.eventTitle = out.eventTitle ?? ev.data.title;
                out.eventImage = out.eventImage ?? ev.data.imageUrl ?? ev.data.bannerUrl;
                out.eventVenue = ev.data.venue ?? out.eventVenue;
                out.eventDate = dateStr ?? out.eventDate;
                out.eventTime = timeStr ?? out.eventTime;
              }
            } catch (e) {
              // ignore per-item enrich error
            }
          }
          return out;
        })
      );

      const timeOf = (it) => {
        if (!it) return 0;
        if (it.createdAt && typeof it.createdAt.toDate === 'function') return it.createdAt.toDate().getTime();
        if (it.createdAt) {
          const d = new Date(it.createdAt);
          if (!isNaN(d)) return d.getTime();
        }
        return 0;
      };

      enhanced.sort((a, b) => timeOf(b) - timeOf(a));
      setTickets(enhanced);
    } catch (err) {
      console.error('Lỗi khi tải vé:', err);
      setTickets([]);
      setTicketsError('Không thể tải vé');
    } finally {
      setTicketsLoading(false);
    }
  };

  // Fade animation for hero when activeIndex changes
  const heroFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    heroFade.setValue(0);
    Animated.timing(heroFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [activeIndex]);

  return (
    <View style={styles.container}>
      {hero && (
        <View style={styles.heroWrap} pointerEvents="box-none">
          <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, opacity: heroFade }}>
            <Image source={{ uri: hero.imageUrl ?? hero.bannerUrl }} style={styles.heroImage} contentFit="cover" />
            <LinearGradient
              colors={[
                'rgba(0,0,0,0.0)',
                'rgba(0,0,0,0.75)',
                'rgba(0,0,0,0.85)',
                'rgba(0,0,0,1)'
              ]}
              locations={[0, 0.4, 0.7, 1]}
              style={styles.heroOverlay}
            />
          </Animated.View>

          <View style={styles.topBar} pointerEvents="auto">
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                setDrawerOpen(true);
                Animated.parallel([
                  Animated.timing(drawerX, { toValue: 0, duration: 260, useNativeDriver: true }),
                  Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
                ]).start();
              }}
            >
              <Ionicons name='menu' size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchWrap}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Search')}
            >
              <Ionicons name="search" size={16} color="#9CA3AF" />
              <TextInput
                placeholder={`Tìm ở ${city?.name ?? 'thành phố'}...`}
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                editable={false}
                pointerEvents="none"
              />
            </TouchableOpacity>
            <TouchableOpacity
    style={styles.iconBtn} 
    onPress={() => navigation.navigate('AIChat')} // Thay 'AIChat' bằng tên màn hình của bạn
  >
    <Ionicons name="sparkles" size={20} color="#FFD700" /> 
  </TouchableOpacity>
          </View>

          <View style={[styles.heroTextWrap, { bottom: PANEL_HEIGHT + 24 }]}>
            <Text style={styles.heroKicker}>SỰ KIỆN NỔI BẬT</Text>
            <Text style={styles.heroTitle}>{hero.title}</Text>
            <View style={styles.badgesRow}>
              <View style={[styles.badge, styles.badgeDark]}>
                <Text style={styles.badgeText}>POPULAR</Text>
              </View>
              <View style={[styles.badge, styles.badgePill]}>
                <Text style={styles.badgeText}>15+</Text>
              </View>
              <View style={[styles.badge, styles.badgeRating]}>
                <Text style={styles.badgeText}>8.7/10</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.buyBtn}
              onPress={() => navigation.navigate('EventDetail', { id: hero.id })}
            >
              <Text style={styles.buyBtnText}>Mua vé</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.panelWrap}>
        <View style={styles.panel} />
        <View style={styles.panelContent}>
          <>
            <Text style={styles.sectionTitle}>Đề xuất cho bạn</Text>
            {eventsLoading ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginTop: 24 }} />
            ) : data.length === 0 ? (
              <Text style={styles.emptyStateText}>{eventsError ?? 'Chưa có sự kiện cho thành phố này'}</Text>
            ) : (
              <Animated.FlatList
                data={looped}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
                contentContainerStyle={{ paddingHorizontal: SIDE_INSET }}
                snapToInterval={ITEM_SIZE}
                snapToAlignment="start"
                decelerationRate="fast"
                onScroll={onScrollAnimated}
                onMomentumScrollEnd={onMomentumEnd}
                disableIntervalMomentum
                scrollEventThrottle={16}
                ref={listRef}
                renderItem={({ item, index }) => {
                  if (!item) return null;
                  const inputRange = [
                    (index - 1) * ITEM_SIZE,
                    index * ITEM_SIZE,
                    (index + 1) * ITEM_SIZE,
                  ];
                  const scale = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.88, 1, 0.88],
                    extrapolate: 'clamp',
                  });
                  const dimOpacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.45, 0, 0.45],
                    extrapolate: 'clamp',
                  });
                  return (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        const idx = data.findIndex((d) => d.id === item.id);
                        if (idx !== activeIndex) {
                          // target offset in looped list is (idx + 1) * ITEM_SIZE
                          listRef.current?.scrollToOffset({ offset: (idx + 1) * ITEM_SIZE, animated: true });
                        } else {
                          navigation.navigate('EventDetail', { id: item.id });
                        }
                      }}
                    >
                      <Animated.View style={[styles.cardPoster, { transform: [{ scale }] }]}> 
                        <Image source={{ uri: item.imageUrl ?? item.bannerUrl }} style={styles.cardImage} contentFit="cover" />
                        <Animated.View style={[styles.cardDim, { opacity: dimOpacity }]} />
                      </Animated.View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </>
        </View>
      </View>
      {drawerOpen && (
        <View style={styles.drawerWrap} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={1}
            style={styles.backdropTouch}
            onPress={() => {
              Animated.parallel([
                Animated.timing(drawerX, { toValue: -DRAWER_WIDTH, duration: 240, useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
              ]).start(({ finished }) => {
                if (finished) setDrawerOpen(false);
              });
            }}
          >
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
          </TouchableOpacity>
          <Animated.View style={[styles.drawer, { width: DRAWER_WIDTH, transform: [{ translateX: drawerX }] }]}> 
            <LinearGradient
              colors={[ '#111111', '#0B0B0B' ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.drawerHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerTitle}>Cá nhân</Text>
                <View style={styles.currentCityPill}>
                  <Ionicons name="location" size={14} color="#10B981" />
                  <Text style={styles.currentCityText}>{city?.name ?? 'Chưa chọn'}</Text>
                </View>
              </View>
            </View>
            {/* Profile section removed as requested */}
            <View style={styles.drawerSectionHeader}>
              <Text style={styles.drawerSectionTitle}>Thành phố</Text>
            </View>
            {citiesLoading ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginVertical: 16 }} />
            ) : (
              cityOptions.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.cityItem}
                  onPress={() => {
                    if (c.id !== city?.id) setCity(c);
                    Animated.parallel([
                      Animated.timing(drawerX, { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
                      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
                    ]).start(({ finished }) => {
                      if (finished) setDrawerOpen(false);
                    });
                  }}
                >
                  <View style={styles.rowLeft}>
                    <Ionicons name="location-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.cityItemText}>{c.name}</Text>
                  </View>
                  {c.id === city?.id ? (
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={16} color="#4B5563" />
                  )}
                </TouchableOpacity>
              ))
            )}
            {!citiesLoading && cityOptions.length === 0 && (
              <Text style={styles.emptyCityText}>Chưa có thành phố khả dụng</Text>
            )}
            <View style={styles.drawerDivider} />
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: 'rgba(99,102,241,0.12)', marginBottom: 8 }]}
              onPress={() => {
                Animated.parallel([
                  Animated.timing(drawerX, { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
                  Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
                ]).start(({ finished }) => {
                  if (finished) {
                    setDrawerOpen(false);
                    setShowTickets(true);
                    fetchTickets();
                  }
                });
              }}
            >
              <Ionicons name="receipt-outline" size={18} color="#A5B4FC" />
              <Text style={[styles.logoutText, { color: '#C7D2FE' }]}>Vé của tôi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                Animated.parallel([
                  Animated.timing(drawerX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
                  Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                ]).start(({ finished }) => {
                  if (finished) {
                    setDrawerOpen(false);
                    logout();
                  }
                });
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#FCA5A5" />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
      <Modal visible={showTickets} transparent animationType="slide" onRequestClose={() => setShowTickets(false)}>
        <View style={styles.ticketModalWrap} pointerEvents="box-none">
          <Pressable style={styles.ticketBackdrop} onPress={() => setShowTickets(false)} />
          <View style={styles.ticketModal}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketTitleHeader}>Vé của tôi</Text>
              <Pressable onPress={() => setShowTickets(false)} style={styles.ticketClose}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </Pressable>
            </View>
            {ticketsLoading ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginTop: 24 }} />
            ) : tickets.length === 0 ? (
              <Text style={styles.emptyStateText}>{ticketsError ?? 'Bạn chưa có vé nào'}</Text>
            ) : (
              <FlatList
                data={tickets}
                keyExtractor={(it) => it.id}
                style={styles.ticketList}
                contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
                renderItem={({ item }) => {
                  const status = (item.status || 'pending_payment').toLowerCase();
                  const statusColor = status === 'completed' ? '#10B981' : status === 'waiting_verify' ? '#3B82F6' : status === 'pending_payment' ? '#F59E0B' : '#F59E0B';
                  const qty = item.quantity ?? item.qty ?? 1;
                  // format createdAt
                  let createdStr = '';
                  if (item.createdAt && typeof item.createdAt.toDate === 'function') {
                    createdStr = new Date(item.createdAt.toDate()).toLocaleString();
                  } else if (item.createdAt) {
                    try {
                      const d = new Date(item.createdAt);
                      if (!isNaN(d)) createdStr = d.toLocaleString();
                    } catch (e) {
                      createdStr = String(item.createdAt);
                    }
                  }

                  let qrUrl = '';
                  if (status === 'completed') {
                    const baseUrl = 'https://xm5xvh.csb.app/qr';
                    const url = new URL(baseUrl);
                    url.searchParams.set('orderId', item.id);
                    url.searchParams.set('eventName', item.eventTitle ?? 'Sự kiện');
                    url.searchParams.set('sectionName', item.sectionName ?? item.sectionId ?? 'Khu vé');
                    url.searchParams.set('username', user.email ?? 'Unknown');
                    url.searchParams.set('orderDate', createdStr);
                    url.searchParams.set('quantity', qty.toString());
                    url.searchParams.set('price', item.price ?? item.totalPrice ?? 'N/A');
                    qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url.toString())}`;
                  }

                  return (
                    <View style={styles.ticketItem}>
                      {item.eventImage ? (
                        <Image source={{ uri: item.eventImage }} style={styles.ticketThumb} contentFit="cover" />
                      ) : null}
                      <View style={{ flex: 1, marginLeft: item.eventImage ? 12 : 0 }}>
                        <View style={styles.ticketTitleRow}>
                          <Text style={styles.ticketItemTitle}>{item.eventTitle ?? item.eventName ?? `Đơn ${item.id}`}</Text>
                          <View style={[styles.ticketStatusInline, { backgroundColor: statusColor }] }>
                            <Text style={styles.ticketStatusTextInline}>{status.toUpperCase()}</Text>
                          </View>
                        </View>
                        {(item.eventVenue || item.eventDate || item.eventTime) && (
                          <Text style={styles.ticketItemSub}>{`${item.eventVenue ?? ''}${item.eventVenue && (item.eventDate || item.eventTime) ? ' • ' : ''}${item.eventDate ?? ''}${item.eventDate && item.eventTime ? ' • ' : ''}${item.eventTime ?? ''}`}</Text>
                        )}
                        <Text style={styles.ticketItemSub}>{`Khu: ${item.sectionName ?? item.sectionId ?? '—'} • Số vé: ${qty}`}</Text>
                        {createdStr ? <Text style={styles.ticketItemSub}>{`Ngày đặt: ${createdStr}`}</Text> : null}
                        {status === 'completed' && qrUrl ? (
                          <View style={{ alignItems: 'center', marginTop: 12, padding: 12, backgroundColor: '#1F2937', borderRadius: 12, borderWidth: 1, borderColor: '#3B82F6' }}>
                            <Image source={{ uri: qrUrl }} style={{ width: 135, height: 135, borderRadius: 8 }} contentFit="contain" />
                            <Text style={{ color: '#E5E7EB', fontSize: 12, marginTop: 6, fontWeight: '600' }}>Quét mã QR</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  heroWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: '#111827',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(6px)',
  },
  searchWrap: {
    flex: 1,
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: {
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  heroTextWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
  },
  heroKicker: {
    color: '#FDE68A',
    fontWeight: '700',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeDark: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgePill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeRating: {
    backgroundColor: '#F59E0B',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  buyBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#EF4444',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buyBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
  listWrap: {
    marginTop: 18,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  panelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
    zIndex: 1,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
    backgroundColor: 'transparent',
    opacity: 0.92,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  panelContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  listWrapAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    zIndex: 1,
  },
  cardPoster: {
    width: 140,
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawerWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  backdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  tierName: {
    color: '#E5E7EB',
    fontWeight: '700',
    fontSize: 15,
  },
  tierPrice: {
    color: '#9CA3AF',
    marginTop: 4,
  },
  tierBuy: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tierBuyText: {
    color: '#fff',
    fontWeight: '700',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#0D0D0D',
    paddingTop: 56,
    paddingHorizontal: 16,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  drawerHeader: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentCityPill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  currentCityText: {
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  drawerItem: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerItemText: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '600',
  },
  drawerSectionHeader: {
    marginTop: 12,
    marginBottom: 8,
  },
  drawerSectionTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cityItem: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityItemActive: {},
  cityItemText: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyStateText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyCityText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 8,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 12,
  },
  logoutBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#FCA5A5',
    fontSize: 15,
    fontWeight: '700',
  },
  ticketModalWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 40,
  },
  ticketBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  ticketModal: {
    backgroundColor: '#0B0B0B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ticketTitleHeader: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  ticketClose: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)'
  },
  ticketList: {
    marginTop: 6,
  },
  ticketThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  ticketTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ticketStatusInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  ticketStatusTextInline: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)'
  },
  ticketItemTitle: {
    color: '#E5E7EB',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  ticketItemSub: {
    color: '#9CA3AF',
    fontSize: 13,
  },
  showQrBtn: {
    marginTop: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  showQrBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});

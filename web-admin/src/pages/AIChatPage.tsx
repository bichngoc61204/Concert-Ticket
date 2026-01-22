import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PaperPlaneTilt, Robot, User } from '@phosphor-icons/react';
import { sendMessageToGemini } from '../lib/gemini';
import styled, { keyframes } from 'styled-components';

// Styled Components
const bounce = keyframes`
  0%, 100% { 
    transform: translateY(0); 
    opacity: 0.4;
  }
  50% { 
    transform: translateY(-4px); 
    opacity: 1;
  }
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 0;

  span {
    width: 8px;
    height: 8px;
    background: #94a3b8;
    border-radius: 50%;
    display: inline-block;
    opacity: 0.4;

    &:nth-child(1) {
      animation: ${bounce} 1s infinite ease-in-out;
    }

    &:nth-child(2) {
      animation: ${bounce} 1s 0.2s infinite ease-in-out;
    }

    &:nth-child(3) {
      animation: ${bounce} 1s 0.4s infinite ease-in-out;
    }
  }
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: ${props => props.$isUser ? '12px 12px 0 12px' : '0 12px 12px 12px'};
  background: ${props => 
    props.$isUser 
      ? 'rgba(99, 102, 241, 0.9)' 
      : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$isUser ? 'white' : '#e2e8f0'};
  border: ${props => 
    props.$isUser 
      ? 'none' 
      : '1px solid rgba(255, 255, 255, 0.1)'};
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  line-height: 1.5;
  white-space: pre-wrap;
`;

const MessageTime = styled.div`
  font-size: 11px;
  opacity: 0.7;
  text-align: right;
  margin-top: 4px;
`;

const ChatContainer = styled.div`
  height: calc(100vh - 300px);
  min-height: 400px;
  overflow-y: auto;
  padding: 16px 8px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InputContainer = styled.div`
  position: relative;
  margin-top: auto;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 12px 48px 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: #e2e8f0;
  outline: none;
  transition: all 0.2s;
  font-size: 14px;

  &:focus {
    border-color: rgba(99, 102, 241, 0.5);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button<{ $active: boolean }>`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: ${props => props.$active ? '#6366f1' : '#64748b'};
  cursor: ${props => props.$active ? 'pointer' : 'not-allowed'};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.2s;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const WelcomeMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  text-align: center;
  padding: 24px;
`;

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const AIChatPage = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lấy dữ liệu ngữ cảnh
  const { data: eventsData } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const querySnapshot = await getDocs(collection(db, 'events'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  const contextData = {
    events: eventsData || [],
    orders: ordersData || [],
    totalEvents: eventsData?.length || 0,
    totalOrders: ordersData?.length || 0,
  };

  const addMessage = (text: string, isUser: boolean = false) => {
    const newMessage = {
      id: Date.now(),
      text,
      isUser,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    addMessage(userMessage, true);
    setIsLoading(true);

    try {
      const response = await sendMessageToGemini(userMessage, contextData);
      addMessage(response, false);
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
      addMessage('Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.', false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      addMessage("Xin chào! Tôi là trợ lý ảo của hệ thống quản lý vé sự kiện. Tôi có thể giúp gì cho bạn hôm nay?", false);
    }
  }, []);

  return (
    <div className="card">
      <Header>
        <Avatar>
          <Robot size={24} color="#6366f1" weight="fill" />
        </Avatar>
        <div>
          <h3 style={{ margin: 0 }}>chatbot</h3>
          <p style={{ margin: 0, fontSize: 14, color: '#94a3b8' }}>
            {isLoading ? 'Đang nhập...' : 'Trực tuyến'}
          </p>
        </div>
      </Header>

      <ChatContainer>
        {messages.length === 0 ? (
          <WelcomeMessage>
            <Robot size={48} style={{ marginBottom: 16, opacity: 0.8 }} />
            <h3 style={{ color: '#e2e8f0', marginBottom: 8 }}>Xin chào!</h3>
            <p style={{ maxWidth: 400, lineHeight: 1.5 }}>
              Tôi có thể giúp bạn tìm hiểu thông tin về sự kiện, đơn hàng và hơn thế nữa.
            </p>
          </WelcomeMessage>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              <MessageBubble $isUser={message.isUser}>
                <div>{message.text}</div>
                <MessageTime>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </MessageTime>
              </MessageBubble>
            </div>
          ))
        )}
        {isLoading && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 8,
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '0 12px 12px 12px',
            width: 'fit-content'
          }}>
            <TypingIndicator>
              <span></span>
              <span></span>
              <span></span>
            </TypingIndicator>
          </div>
        )}
        <div ref={messagesEndRef} />
      </ChatContainer>

      <form 
        onSubmit={handleSendMessage}
        style={{
          position: 'relative'
        }}
      >
        <InputContainer>
          <StyledInput
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nhập câu hỏi của bạn..."
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <SendButton 
            type="submit"
            disabled={!input.trim() || isLoading}
            $active={!!input.trim()}
          >
            <PaperPlaneTilt size={20} weight="fill" />
          </SendButton>
        </InputContainer>
      </form>
    </div>
  );
};

export default AIChatPage;
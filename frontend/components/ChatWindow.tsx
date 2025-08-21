import React, { useState, useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import backend from '~backend/client';
import type { User } from '../App';
import type { ChatUser } from './ChatInterface';

export interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  wordCount: number;
  extraTime: number;
  isRead: boolean;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  timeToRead?: number;
}

interface ChatWindowProps {
  currentUser: User;
  otherUser: ChatUser;
  realtimeStream: any;
  onMessagesUpdate: () => void;
}

export function ChatWindow({ currentUser, otherUser, realtimeStream, onMessagesUpdate }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [otherUser.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!realtimeStream) return;

    const handleRealtimeMessage = async (message: any) => {
      if (message.type === "message" && 
          ((message.userId === otherUser.id && message.recipientId === currentUser.id) ||
           (message.userId === currentUser.id && message.recipientId === otherUser.id))) {
        await loadMessages();
        // Update parent component's user list
        onMessagesUpdate();
      } else if (message.type === "message_read") {
        // Update the specific message that was read for both sender and recipient
        setMessages(prev => prev.map(msg => {
          if (msg.id === message.messageId) {
            return {
              ...msg,
              isRead: true,
              readAt: new Date(),
              expiresAt: new Date(message.expiresAt),
              timeToRead: message.timeToRead,
            };
          }
          return msg;
        }));
      }
    };

    // Listen for real-time updates
    (async () => {
      try {
        for await (const message of realtimeStream) {
          await handleRealtimeMessage(message);
        }
      } catch (err) {
        console.error('Realtime stream error:', err);
      }
    })();
  }, [realtimeStream, otherUser.id, currentUser.id, onMessagesUpdate]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await backend.messages.list({
        token: currentUser.token,
        otherUserId: otherUser.id,
      });
      
      const messagesWithDates = response.messages.map(msg => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
        readAt: msg.readAt ? new Date(msg.readAt) : undefined,
        expiresAt: msg.expiresAt ? new Date(msg.expiresAt) : undefined,
      }));

      setMessages(messagesWithDates);

      // Auto-mark unread messages as read
      const unreadMessages = messagesWithDates.filter(
        msg => msg.recipientId === currentUser.id && !msg.isRead
      );

      if (unreadMessages.length > 0) {
        for (const message of unreadMessages) {
          try {
            const markReadResponse = await backend.messages.markRead({
              token: currentUser.token,
              messageId: message.id,
            });

            // Update the message with expiration info
            setMessages(prev => prev.map(msg => 
              msg.id === message.id 
                ? {
                    ...msg,
                    isRead: true,
                    readAt: new Date(),
                    expiresAt: markReadResponse.expiresAt,
                    timeToRead: markReadResponse.timeToRead,
                  }
                : msg
            ));

            // Broadcast read status to both sender and recipient
            if (realtimeStream) {
              await realtimeStream.send({
                type: "message_read",
                messageId: message.id,
                senderId: message.senderId,
                recipientId: message.recipientId,
                expiresAt: markReadResponse.expiresAt,
                timeToRead: markReadResponse.timeToRead,
                timestamp: new Date(),
              });
            }
          } catch (err) {
            console.error('Failed to mark message as read:', err);
          }
        }

        // Update unread counts in parent component
        onMessagesUpdate();
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string, extraTime: number = 0) => {
    try {
      const response = await backend.messages.send({
        token: currentUser.token,
        recipientId: otherUser.id,
        content,
        extraTime,
      });

      // Broadcast to realtime
      if (realtimeStream) {
        await realtimeStream.send({
          type: "message",
          userId: currentUser.id,
          username: currentUser.username,
          recipientId: otherUser.id,
          messageId: response.id,
          content: response.content,
          wordCount: response.wordCount,
          timestamp: new Date(),
        });
      }

      await loadMessages();
      // Update parent component's user list
      onMessagesUpdate();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleMessageExpired = (messageId: number) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    onMessagesUpdate();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {otherUser.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                otherUser.isOnline ? "bg-green-500" : "bg-gray-400"
              )}
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {otherUser.username}
            </h2>
            <p className="text-sm text-gray-500">
              {otherUser.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={currentUser.id}
            onMessageExpired={handleMessageExpired}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}

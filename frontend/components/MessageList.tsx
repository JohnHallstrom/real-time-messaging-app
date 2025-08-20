import React, { useEffect, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message } from './ChatWindow';

interface MessageListProps {
  messages: Message[];
  currentUserId: number;
  onMessageExpired: (messageId: number) => void;
}

export function MessageList({ messages, currentUserId, onMessageExpired }: MessageListProps) {
  const [timers, setTimers] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    messages.forEach(message => {
      if (message.expiresAt && message.isRead) {
        const interval = setInterval(() => {
          const now = new Date().getTime();
          const expiresAt = message.expiresAt!.getTime();
          const timeLeft = Math.max(0, Math.ceil((expiresAt - now) / 1000));
          
          setTimers(prev => new Map(prev.set(message.id, timeLeft)));
          
          if (timeLeft <= 0) {
            clearInterval(interval);
            // Trigger message expiration with a small delay to show 0 seconds
            setTimeout(() => {
              onMessageExpired(message.id);
            }, 100);
          }
        }, 1000);
        
        intervals.push(interval);
      }
    });

    return () => {
      intervals.forEach(clearInterval);
    };
  }, [messages, onMessageExpired]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">No messages yet</p>
          <p className="text-sm">Send a message to start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.senderId === currentUserId}
          timeLeft={timers.get(message.id)}
        />
      ))}
    </div>
  );
}

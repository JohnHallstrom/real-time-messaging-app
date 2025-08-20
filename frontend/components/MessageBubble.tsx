import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from './ChatWindow';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  timeLeft?: number;
  onMarkAsRead: (messageId: number) => void;
}

export function MessageBubble({ message, isOwn, timeLeft, onMarkAsRead }: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canMarkAsRead = !isOwn && !message.isRead;
  const showTimer = message.isRead && message.expiresAt && timeLeft !== undefined;

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-xs lg:max-w-md", isOwn ? "order-1" : "order-2")}>
        <div
          className={cn(
            "px-4 py-2 rounded-lg",
            isOwn
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-900 border border-gray-200"
          )}
        >
          <p className="text-sm">{message.content}</p>
          
          <div className="flex items-center justify-between mt-2 text-xs opacity-75">
            <span>{formatTime(message.createdAt)}</span>
            
            {showTimer && (
              <div className="flex items-center space-x-1 text-red-500">
                <Clock className="h-3 w-3" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            )}
            
            {message.isRead && !isOwn && (
              <span className="text-green-500">Read</span>
            )}
          </div>
        </div>
        
        {canMarkAsRead && (
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkAsRead(message.id)}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Mark as read
            </Button>
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-1">
          {message.wordCount} word{message.wordCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

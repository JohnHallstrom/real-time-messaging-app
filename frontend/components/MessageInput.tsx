import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Plus } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string, extraTime?: number) => void;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [extraTime, setExtraTime] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onSendMessage(message.trim(), extraTime);
      setMessage('');
      setExtraTime(0);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const addExtraTime = () => {
    setExtraTime(prev => prev + 5);
  };

  const wordCount = message.trim().split(/\s+/).filter(word => word.length > 0).length;
  const baseTime = Math.max(5, Math.ceil(wordCount / 5) * 5);
  const totalTime = baseTime + extraTime;

  return (
    <div className="p-4 bg-white border-t border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex space-x-2">
          <div className="flex-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-32 resize-none"
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!message.trim() || isLoading}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {message.trim() && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Recipient will have {totalTime}s to read this message
              {extraTime > 0 && ` (${baseTime}s + ${extraTime}s extra)`}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addExtraTime}
              className="h-6 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              +5s
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

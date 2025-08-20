import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ChatUser } from './ChatInterface';

interface UserListProps {
  users: ChatUser[];
  selectedUser: ChatUser | null;
  onSelectUser: (user: ChatUser) => void;
}

export function UserList({ users, selectedUser, onSelectUser }: UserListProps) {
  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {users.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No other users found
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user)}
              className={cn(
                "w-full p-4 text-left hover:bg-gray-50 transition-colors relative",
                selectedUser?.id === user.id && "bg-blue-50 border-r-2 border-blue-500"
              )}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                      user.isOnline ? "bg-green-500" : "bg-gray-400"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.username}
                    </p>
                    {user.unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-2 h-5 min-w-[20px] text-xs flex items-center justify-center"
                      >
                        {user.unreadCount > 99 ? '99+' : user.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {user.isOnline ? 'Online' : formatLastSeen(user.lastSeen)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

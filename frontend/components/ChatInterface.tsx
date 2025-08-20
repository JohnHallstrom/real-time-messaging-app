import React, { useState, useEffect } from 'react';
import { UserList } from './UserList';
import { ChatWindow } from './ChatWindow';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import backend from '~backend/client';
import type { User } from '../App';

export interface ChatUser {
  id: number;
  username: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
}

export function ChatInterface({ user, onLogout }: ChatInterfaceProps) {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [realtimeStream, setRealtimeStream] = useState<any>(null);

  useEffect(() => {
    loadUsers();
    connectToRealtime();

    return () => {
      if (realtimeStream) {
        realtimeStream.close();
      }
    };
  }, []);

  const loadUsers = async () => {
    try {
      const response = await backend.users.list({ token: user.token });
      setUsers(response.users.map(u => ({
        ...u,
        lastSeen: new Date(u.lastSeen),
      })));
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const connectToRealtime = async () => {
    try {
      const stream = await backend.realtime.chat();
      setRealtimeStream(stream);

      // Send user status
      await stream.send({
        type: "user_status",
        userId: user.id,
        username: user.username,
        timestamp: new Date(),
      });

      // Listen for real-time updates
      (async () => {
        try {
          for await (const message of stream) {
            if (message.type === "user_status" && message.userId !== user.id) {
              setUsers(prev => prev.map(u => 
                u.id === message.userId 
                  ? { ...u, isOnline: message.isOnline || false }
                  : u
              ));
            }
          }
        } catch (err) {
          console.error('Realtime stream error:', err);
        }
      })();
    } catch (err) {
      console.error('Failed to connect to realtime:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await backend.auth.logout({ token: user.token });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      if (realtimeStream) {
        realtimeStream.close();
      }
      onLogout();
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-600">@{user.username}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <UserList
          users={users}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <ChatWindow
            currentUser={user}
            otherUser={selectedUser}
            realtimeStream={realtimeStream}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <h2 className="text-xl font-medium mb-2">Welcome to Messages</h2>
              <p>Select a user from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

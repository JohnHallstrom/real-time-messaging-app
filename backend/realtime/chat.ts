import { api, StreamInOut } from "encore.dev/api";

export interface ChatMessage {
  type: "message" | "user_status" | "message_read";
  userId?: number;
  username?: string;
  recipientId?: number;
  messageId?: number;
  content?: string;
  wordCount?: number;
  isOnline?: boolean;
  expiresAt?: Date;
  timeToRead?: number;
  timestamp: Date;
}

const connectedStreams = new Map<number, StreamInOut<ChatMessage, ChatMessage>>();

// Real-time chat stream for live updates.
export const chat = api.streamInOut<ChatMessage, ChatMessage>(
  { expose: true, path: "/realtime/chat" },
  async (stream) => {
    let userId: number | null = null;

    try {
      for await (const message of stream) {
        if (message.type === "user_status" && message.userId) {
          userId = message.userId;
          connectedStreams.set(userId, stream);
          
          // Broadcast user online status to all connected clients
          broadcastToAll({
            type: "user_status",
            userId: message.userId,
            username: message.username,
            isOnline: true,
            timestamp: new Date(),
          });
        } else if (message.type === "message" && message.recipientId) {
          // Broadcast new message to recipient
          const recipientStream = connectedStreams.get(message.recipientId);
          if (recipientStream) {
            try {
              await recipientStream.send(message);
            } catch (err) {
              connectedStreams.delete(message.recipientId);
            }
          }
        } else if (message.type === "message_read") {
          // Broadcast read status to all connected clients involved in the conversation
          broadcastToAll(message);
        }
      }
    } finally {
      if (userId) {
        connectedStreams.delete(userId);
        
        // Broadcast user offline status
        broadcastToAll({
          type: "user_status",
          userId,
          isOnline: false,
          timestamp: new Date(),
        });
      }
    }
  }
);

function broadcastToAll(message: ChatMessage) {
  for (const [userId, stream] of connectedStreams) {
    try {
      stream.send(message);
    } catch (err) {
      connectedStreams.delete(userId);
    }
  }
}

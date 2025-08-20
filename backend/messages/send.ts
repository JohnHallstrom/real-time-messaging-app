import { api, APIError } from "encore.dev/api";
import { messagesDB } from "./db";

export interface SendMessageRequest {
  token: string;
  recipientId: number;
  content: string;
  extraTime?: number;
}

export interface SendMessageResponse {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  wordCount: number;
  createdAt: Date;
}

// Sends a message to another user.
export const send = api<SendMessageRequest, SendMessageResponse>(
  { expose: true, method: "POST", path: "/messages/send" },
  async (req) => {
    const senderId = getUserIdFromToken(req.token);
    if (!senderId) {
      throw APIError.unauthenticated("invalid token");
    }

    if (!req.content.trim()) {
      throw APIError.invalidArgument("message content cannot be empty");
    }

    // Calculate word count
    const wordCount = req.content.trim().split(/\s+/).length;

    const message = await messagesDB.queryRow<{
      id: number;
      sender_id: number;
      recipient_id: number;
      content: string;
      word_count: number;
      created_at: Date;
    }>`
      INSERT INTO messages (sender_id, recipient_id, content, word_count)
      VALUES (${senderId}, ${req.recipientId}, ${req.content}, ${wordCount})
      RETURNING id, sender_id, recipient_id, content, word_count, created_at
    `;

    if (!message) {
      throw APIError.internal("failed to send message");
    }

    return {
      id: message.id,
      senderId: message.sender_id,
      recipientId: message.recipient_id,
      content: message.content,
      wordCount: message.word_count,
      createdAt: message.created_at,
    };
  }
);

function getUserIdFromToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [userId] = decoded.split(':');
    return parseInt(userId, 10);
  } catch {
    return null;
  }
}

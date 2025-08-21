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
  extraTime: number;
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
    const extraTime = req.extraTime || 0;

    const message = await messagesDB.queryRow<{
      id: number;
      sender_id: number;
      recipient_id: number;
      content: string;
      word_count: number;
      extra_time: number;
      created_at: Date;
    }>`
      INSERT INTO messages (sender_id, recipient_id, content, word_count, extra_time)
      VALUES (${senderId}, ${req.recipientId}, ${req.content}, ${wordCount}, ${extraTime})
      RETURNING id, sender_id, recipient_id, content, word_count, extra_time, created_at
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
      extraTime: message.extra_time,
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

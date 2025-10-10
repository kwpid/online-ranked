import { z } from "zod";

// User Schema - Main user profile stored in Firestore
export const userSchema = z.object({
  id: z.string(), // Firebase UID
  email: z.string().email(),
  username: z.string().min(3).max(20), // Unique username (from email or custom)
  displayName: z.string().min(1).max(30),
  photoURL: z.string().url().nullable(),
  lastUsernameChange: z.number().nullable(), // Timestamp of last username change
  title: z.string().nullable(), // Coming soon
  banner: z.string().nullable(), // Coming soon
  status: z.enum(['online', 'away', 'busy', 'offline']).default('online'),
  currentActivity: z.string().nullable(), // e.g., "In Menu", "In Game"
  isAdmin: z.boolean().default(false), // Admin status
  createdAt: z.number(),
});

export type User = z.infer<typeof userSchema>;

export const insertUserSchema = userSchema.omit({ 
  id: true,
  lastUsernameChange: true,
  title: true,
  banner: true,
  currentActivity: true,
  isAdmin: true,
  createdAt: true 
}).extend({
  lastUsernameChange: z.number().nullable().optional(),
  title: z.string().nullable().optional(),
  banner: z.string().nullable().optional(),
  currentActivity: z.string().nullable().optional(),
  isAdmin: z.boolean().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Friend Request Schema
export const friendRequestSchema = z.object({
  id: z.string(),
  fromUserId: z.string(),
  toUserId: z.string(),
  status: z.enum(['pending', 'accepted', 'declined']).default('pending'),
  createdAt: z.number(),
});

export type FriendRequest = z.infer<typeof friendRequestSchema>;

export const insertFriendRequestSchema = friendRequestSchema.omit({ 
  id: true, 
  createdAt: true,
  status: true 
});

export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;

// Friendship Schema (bidirectional after acceptance)
export const friendshipSchema = z.object({
  id: z.string(),
  userId: z.string(),
  friendId: z.string(),
  createdAt: z.number(),
});

export type Friendship = z.infer<typeof friendshipSchema>;

// Party Schema
export const partySchema = z.object({
  id: z.string(),
  leaderId: z.string(),
  memberIds: z.array(z.string()),
  createdAt: z.number(),
});

export type Party = z.infer<typeof partySchema>;

export const insertPartySchema = partySchema.omit({ 
  id: true, 
  createdAt: true 
});

export type InsertParty = z.infer<typeof insertPartySchema>;

// Notification Schema
export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(), // Who receives the notification
  type: z.enum(['friend_request', 'party_invite', 'party_kick', 'friend_accepted']),
  fromUserId: z.string().nullable(), // Who sent it
  fromUserDisplayName: z.string().nullable(),
  fromUserPhotoURL: z.string().nullable(),
  partyId: z.string().nullable(), // For party invites
  message: z.string(),
  read: z.boolean().default(false),
  createdAt: z.number(),
});

export type Notification = z.infer<typeof notificationSchema>;

export const insertNotificationSchema = notificationSchema.omit({ 
  id: true, 
  createdAt: true,
  read: true 
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Recently Played With tracking
export const recentlyPlayedSchema = z.object({
  id: z.string(),
  userId: z.string(),
  playedWithId: z.string(),
  lastPlayedAt: z.number(),
});

export type RecentlyPlayed = z.infer<typeof recentlyPlayedSchema>;

// Party Message Schema
export const partyMessageSchema = z.object({
  id: z.string(),
  partyId: z.string(),
  userId: z.string(),
  displayName: z.string(),
  message: z.string(),
  createdAt: z.number(),
});

export type PartyMessage = z.infer<typeof partyMessageSchema>;

export const insertPartyMessageSchema = partyMessageSchema.omit({
  id: true,
  createdAt: true,
});

export type InsertPartyMessage = z.infer<typeof insertPartyMessageSchema>;

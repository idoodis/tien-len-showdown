import { z } from 'zod';

const playerIdSchema = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/, 'invalid player id');
const displayNameSchema = z
  .string()
  .min(1, 'display name required')
  .max(20, 'display name max 20 chars')
  .transform((v) => v.trim());

export const createRoomSchema = z.object({
  playerId: playerIdSchema,
  displayName: displayNameSchema,
});
export const joinRoomSchema = z.object({
  code: z.string().min(4).max(10),
  playerId: playerIdSchema,
  displayName: displayNameSchema,
});
export const sitSchema = z.object({
  code: z.string().min(4).max(10),
  playerId: playerIdSchema,
  seat: z.number().int().min(0).max(3),
});
export const standSchema = z.object({
  code: z.string().min(4).max(10),
  playerId: playerIdSchema,
});
export const startSchema = z.object({
  code: z.string().min(4).max(10),
  playerId: playerIdSchema,
});
export const playSchema = z.object({
  code: z.string().min(4).max(10),
  playerId: playerIdSchema,
  cardIds: z.array(z.number().int().min(0).max(51)).min(1).max(13),
});
export const passSchema = z.object({
  code: z.string().min(4).max(10),
  playerId: playerIdSchema,
});
export const queueSchema = z.object({
  code: z.string().min(4).max(10),
  playerId: playerIdSchema,
  cardIds: z.array(z.number().int().min(0).max(51)).min(0).max(13),
});
export const leaveSchema = z.object({
  code: z.string().min(4).max(10),
  playerId: playerIdSchema,
});
export const playAgainSchema = z.object({
  code: z.string().min(4).max(10),
  playerId: playerIdSchema,
});

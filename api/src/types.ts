import type { IncomingMessage, ServerResponse } from 'http';
import type Stripe from 'stripe';

export interface UserSession {
  bnetId: string;
  battletag: string;
  accessToken: string;
  expiry: number;
}

export interface UserProgress {
  attunements: Record<string, boolean>;
  bis: Record<string, boolean>;
}

export interface BnetTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface BnetUserInfo {
  sub: string;
  battletag: string;
  id: number;
}

export interface BnetApiResponse<T = any> {
  status: number;
  data: T;
}

export interface CharacterEquipment {
  equipped_items: EquippedItem[];
}

export interface EquippedItem {
  item?: { id: number };
  name: string | Record<string, string>;
  slot?: { type: string };
  quality?: { type: string };
  level?: { value: number };
}

export type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  url?: URL
) => void | Promise<void>;

export interface ApiResponse<T = any> {
  error?: string;
  [key: string]: T;
}

export interface StripeSessionResponse {
  sessionId: string;
  url: string;
}

export interface Supporter {
  name: string;
  amount: number;
  date: string;
}

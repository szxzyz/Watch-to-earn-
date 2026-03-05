import {
  users,
  earnings,
  referrals,
  withdrawals,
  adminSettings,
  promoCodes,
  promoCodeUsage,
  advertiserTasks,
  taskClicks,
  type User,
  type UpsertUser,
  type InsertEarning,
  type Earning,
  type Referral,
  type InsertReferral,
  type Withdrawal,
  type InsertWithdrawal,
  type AdminSetting,
  type PromoCode,
  type InsertPromoCode,
  type PromoCodeUsage,
  type InsertPromoCodeUsage,
  type AdvertiserTask,
  type InsertAdvertiserTask,
  type TaskClick,
  type InsertTaskClick,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  getAllAdminSettings(): Promise<AdminSetting[]>;
  getAdminSetting(key: string): Promise<string | undefined>;
  updateAdminSetting(key: string, value: string): Promise<void>;
  getUser(id: string): Promise<User | undefined>;
  getTelegramUser(telegramId: string): Promise<{ user: User | undefined }>;
  upsertTelegramUser(telegramId: string, userData: any): Promise<{ user: User; isNewUser: boolean }>;
  updateUserBalance(userId: string, amount: string): Promise<void>;
  updateUserTonBalance(userId: string, amount: string): Promise<void>;
  incrementAdsWatched(userId: string): Promise<void>;
  addEarning(earning: InsertEarning): Promise<Earning>;
  getUserEarnings(userId: string, limit?: number): Promise<Earning[]>;
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getUserWithdrawals(userId: string): Promise<Withdrawal[]>;
  createReferral(referrerId: string, referredId: string): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  getUserByReferralCode(referralCode: string): Promise<User | null>;
  generateReferralCode(userId: string): Promise<string>;
  getPromoCode(code: string): Promise<PromoCode | undefined>;
  getPromoCodeUsage(promoCodeId: string, userId: string): Promise<PromoCodeUsage | undefined>;
  createPromoCodeUsage(promoCodeId: string, userId: string, amount: string): Promise<void>;
  getAdvertiserTasks(): Promise<AdvertiserTask[]>;
  createTaskClick(click: InsertTaskClick): Promise<TaskClick>;
  ensureAdminUserExists(): Promise<void>;
  backfillExistingReferralBUGRewards(): Promise<void>;
  checkAndPerformDailyResetV2(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getTelegramUser(telegramId: string): Promise<{ user: User | undefined }> {
    const [user] = await db.select().from(users).where(eq(users.telegram_id, telegramId));
    return { user };
  }

  async upsertTelegramUser(telegramId: string, userData: any): Promise<{ user: User; isNewUser: boolean }> {
    const { user: existingUser } = await this.getTelegramUser(telegramId);
    const isNewUser = !existingUser;
    const data = { ...userData, telegram_id: telegramId, updatedAt: new Date() };
    if (existingUser) {
      const [user] = await db.update(users).set(data).where(eq(users.id, existingUser.id)).returning();
      return { user, isNewUser };
    } else {
      const [user] = await db.insert(users).values({ ...data, balance: "0", ton_balance: "0" }).returning();
      await this.generateReferralCode(user.id);
      return { user, isNewUser };
    }
  }

  async getAllAdminSettings(): Promise<AdminSetting[]> {
    return db.select().from(adminSettings);
  }

  async getAdminSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(adminSettings).where(eq(adminSettings.settingKey, key));
    return setting?.settingValue;
  }

  async updateAdminSetting(key: string, value: string): Promise<void> {
    await db.insert(adminSettings).values({ settingKey: key, settingValue: value }).onConflictDoUpdate({
      target: adminSettings.settingKey,
      set: { settingValue: value, updatedAt: new Date() }
    });
  }

  async addEarning(earning: InsertEarning): Promise<Earning> {
    const [newEarning] = await db.insert(earnings).values(earning).returning();
    return newEarning;
  }

  async getUserEarnings(userId: string, limit: number = 20): Promise<Earning[]> {
    return db.select().from(earnings).where(eq(earnings.userId, userId)).orderBy(desc(earnings.createdAt)).limit(limit);
  }

  async updateUserBalance(userId: string, amount: string): Promise<void> {
    await db.update(users).set({ balance: amount, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async updateUserTonBalance(userId: string, amount: string): Promise<void> {
    await db.update(users).set({ ton_balance: amount, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async incrementAdsWatched(userId: string): Promise<void> {
    await db.update(users).set({ 
      ads_watched_today: sql`ads_watched_today + 1`, 
      ads_watched: sql`ads_watched + 1`,
      updatedAt: new Date() 
    }).where(eq(users.id, userId));
  }

  async createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> {
    const [newWithdrawal] = await db.insert(withdrawals).values(withdrawal).returning();
    return newWithdrawal;
  }

  async getUserWithdrawals(userId: string): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).where(eq(withdrawals.userId, userId)).orderBy(desc(withdrawals.createdAt));
  }

  async createReferral(referrerId: string, referredId: string): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values({ referrerId, refereeId }).returning();
    return newReferral;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.referrerId, userId));
  }

  async generateReferralCode(userId: string): Promise<string> {
    const code = Math.random().toString(36).substring(2, 14).toUpperCase();
    await db.update(users).set({ referral_code: code }).where(eq(users.id, userId));
    return code;
  }

  async getUserByReferralCode(referralCode: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.referral_code, referralCode));
    return user || null;
  }

  async getPromoCode(code: string): Promise<PromoCode | undefined> {
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, code));
    return promo;
  }

  async getPromoCodeUsage(promoCodeId: string, userId: string): Promise<PromoCodeUsage | undefined> {
    const [usage] = await db.select().from(promoCodeUsage).where(and(eq(promoCodeUsage.promoCodeId, promoCodeId), eq(promoCodeUsage.userId, userId)));
    return usage;
  }

  async createPromoCodeUsage(promoCodeId: string, userId: string, amount: string): Promise<void> {
    await db.insert(promoCodeUsage).values({ promoCodeId, userId, rewardAmount: amount });
  }

  async getAdvertiserTasks(): Promise<AdvertiserTask[]> {
    return db.select().from(advertiserTasks).where(eq(advertiserTasks.status, 'active'));
  }

  async createTaskClick(click: InsertTaskClick): Promise<TaskClick> {
    const [newClick] = await db.insert(taskClicks).values(click).returning();
    return newClick;
  }

  async ensureAdminUserExists(): Promise<void> {}
  async backfillExistingReferralBUGRewards(): Promise<void> {}
  async checkAndPerformDailyResetV2(): Promise<void> {}
}

export const storage = new DatabaseStorage();

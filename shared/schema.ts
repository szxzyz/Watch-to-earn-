import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  integer,
  boolean,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegram_id: varchar("telegram_id", { length: 20 }).unique(),
  username: varchar("username"),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  personal_code: text("personal_code"),
  balance: decimal("balance", { precision: 20, scale: 0 }).default("0"),
  ton_balance: decimal("ton_balance", { precision: 30, scale: 10 }).default("0"),
  ton_app_balance: decimal("ton_app_balance", { precision: 30, scale: 10 }).default("0"),
  ads_watched: integer("ads_watched").default(0),
  daily_ads_watched: integer("daily_ads_watched").default(0),
  ads_watched_today: integer("ads_watched_today").default(0),
  daily_earnings: decimal("daily_earnings", { precision: 30, scale: 10 }),
  last_ad_watch: timestamp("last_ad_watch"),
  last_ad_date: timestamp("last_ad_date"),
  current_streak: integer("current_streak").default(0),
  last_streak_date: timestamp("last_streak_date"),
  level: integer("level").default(1),
  referred_by: varchar("referred_by"),
  referral_code: text("referral_code"),
  friends_invited: integer("friends_invited"),
  first_ad_watched: boolean("first_ad_watched").default(false),
  flagged: boolean("flagged").default(false),
  flag_reason: text("flag_reason"),
  banned: boolean("banned").default(false),
  banned_reason: text("banned_reason"),
  banned_at: timestamp("banned_at"),
  device_id: text("device_id"),
  device_fingerprint: jsonb("device_fingerprint"),
  is_primary_account: boolean("is_primary_account").default(true),
  lastLoginAt: timestamp("last_login_at"),
  last_login_ip: text("last_login_ip"),
  last_login_device: text("last_login_device"),
  last_login_user_agent: text("last_login_user_agent"),
  channel_visited: boolean("channel_visited").default(false),
  app_shared: boolean("app_shared").default(false),
  last_reset_date: timestamp("last_reset_date"),
  task_share_completed_today: boolean("task_share_completed_today").default(false),
  task_channel_completed_today: boolean("task_channel_completed_today").default(false),
  task_community_completed_today: boolean("task_community_completed_today").default(false),
  task_checkin_completed_today: boolean("task_checkin_completed_today").default(false),
  extra_ads_watched_today: integer("extra_ads_watched_today").default(0),
  last_extra_ad_date: timestamp("last_extra_ad_date"),
  ton_wallet_address: text("ton_wallet_address"),
  ton_wallet_comment: text("ton_wallet_comment"),
  usdt_wallet_address: text("usdt_wallet_address"),
  telegram_stars_username: text("telegram_stars_username"),
  telegram_username_wallet: text("telegram_username_wallet"),
  cwallet_id: text("cwallet_id"),
  wallet_updated_at: timestamp("wallet_updated_at"),
  pending_referral_bonus: decimal("pending_referral_bonus", { precision: 30, scale: 10 }).default("0"),
  total_claimed_referral_bonus: decimal("total_claimed_referral_bonus", { precision: 30, scale: 10 }).default("0"),
  usd_balance: decimal("usd_balance", { precision: 30, scale: 10 }).default("0"),
  pdz_balance: decimal("pdz_balance", { precision: 30, scale: 10 }).default("0"),
  bug_balance: decimal("bug_balance", { precision: 30, scale: 10 }).default("0"),
  withdraw_balance: decimal("withdraw_balance", { precision: 30, scale: 10 }).default("0"),
  total_earnings: decimal("total_earnings", { precision: 30, scale: 10 }).default("0"),
  total_earned: decimal("total_earned", { precision: 30, scale: 10 }).default("0"),
  app_version: text("app_version"),
  browser_fingerprint: text("browser_fingerprint"),
  registered_at: timestamp("registered_at").defaultNow(),
  referrer_uid: text("referrer_uid"),
  is_channel_group_verified: boolean("is_channel_group_verified").default(false),
  last_membership_check: timestamp("last_membership_check"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const earnings = pgTable("earnings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 30, scale: 10 }).notNull(),
  source: varchar("source").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawals = pgTable("withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 30, scale: 10 }).notNull(),
  status: varchar("status").default('pending'),
  method: varchar("method").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").references(() => users.id).notNull(),
  refereeId: varchar("referee_id").references(() => users.id).notNull(),
  status: varchar("status").default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminSettings = pgTable("admin_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: varchar("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  updated_by: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const advertiserTasks = pgTable("advertiser_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  link: text("link"),
  status: varchar("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskClicks = pgTable("task_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").references(() => advertiserTasks.id).notNull(),
  publisher_id: varchar("publisher_id").notNull(),
  reward_amount: decimal("reward_amount", { precision: 30, scale: 10 }).default("0"),
  clickedAt: timestamp("clicked_at").defaultNow(),
});

export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  rewardAmount: decimal("reward_amount", { precision: 30, scale: 10 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const promoCodeUsage = pgTable("promo_code_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promoCodeId: varchar("promo_code_id").references(() => promoCodes.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  rewardAmount: decimal("reward_amount", { precision: 30, scale: 10 }).notNull(),
  usedAt: timestamp("used_at").defaultNow(),
});

export const banLogs = pgTable("ban_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bannedUserId: varchar("banned_user_id").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  banType: varchar("ban_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEarningSchema = createInsertSchema(earnings).omit({ id: true, createdAt: true });
export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAdvertiserTaskSchema = createInsertSchema(advertiserTasks).omit({ id: true, createdAt: true });
export const insertTaskClickSchema = createInsertSchema(taskClicks).omit({ id: true, clickedAt: true });
export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, createdAt: true });
export const insertPromoCodeUsageSchema = createInsertSchema(promoCodeUsage).omit({ id: true, usedAt: true });
export const insertBanLogSchema = createInsertSchema(banLogs).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type Earning = typeof earnings.$inferSelect;
export type InsertEarning = z.infer<typeof insertEarningSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type AdminSetting = typeof adminSettings.$inferSelect;
export type AdvertiserTask = typeof advertiserTasks.$inferSelect;
export type InsertAdvertiserTask = z.infer<typeof insertAdvertiserTaskSchema>;
export type TaskClick = typeof taskClicks.$inferSelect;
export type InsertTaskClick = z.infer<typeof insertTaskClickSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;
export type InsertPromoCodeUsage = z.infer<typeof insertPromoCodeUsageSchema>;
export type BanLog = typeof banLogs.$inferSelect;
export type InsertBanLog = z.infer<typeof insertBanLogSchema>;

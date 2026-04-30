import {
  users,
  earnings,
  referrals,
  referralCommissions,
  promoCodes,
  promoCodeUsage,
  withdrawals,
  userBalances,
  transactions,
  dailyTasks,
  advertiserTasks,
  taskClicks,
  adminSettings,
  banLogs,
  deposits,
  miningBoosts,
  userMachines,
  type User,
  type UpsertUser,
  type InsertEarning,
  type Earning,
  type Referral,
  type InsertReferral,
  type ReferralCommission,
  type InsertReferralCommission,
  type PromoCode,
  type InsertPromoCode,
  type PromoCodeUsage,
  type InsertPromoCodeUsage,
  type Withdrawal,
  type InsertWithdrawal,
  type UserBalance,
  type InsertUserBalance,
  type Transaction,
  type InsertTransaction,
  type DailyTask,
  type InsertDailyTask,
  type Deposit,
  type InsertDeposit,
  type MiningBoost,
  type InsertMiningBoost,
  type UserMachine,
} from "../shared/schema";
import { MINING_LEVELS, getMiningLevel } from "../shared/miningLevels";
import { db } from "./db";
import { eq, desc, and, gte, lt, sql } from "drizzle-orm";
import crypto from "crypto";

// Payment system configuration
export interface PaymentSystem {
  id: string;
  name: string;
  emoji: string;
  minWithdrawal: number;
  fee: number;
}

export let PAYMENT_SYSTEMS: PaymentSystem[] = [
  { id: 'sat_withdraw', name: 'SAT', emoji: '₿', minWithdrawal: 100, fee: 0 }
];

// Helper to update payment systems from admin settings
export function updatePaymentSystemsFromSettings(minWithdraw: number, fee: number) {
  PAYMENT_SYSTEMS = [
    { id: 'sat_withdraw', name: 'SAT', emoji: '₿', minWithdrawal: minWithdraw, fee: fee }
  ];
}

// Interface for storage operations
export interface IStorage {
  getAllAdminSettings(): Promise<AdminSetting[]>;
  updateAdminSetting(key: string, value: string): Promise<void>;
  updatePaymentSystemsFromSettings(minWithdraw: number, fee: number): void;
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<{ user: User; isNewUser: boolean }>;
  
  // Earnings operations
  addEarning(earning: InsertEarning): Promise<Earning>;
  getUserEarnings(userId: string, limit?: number): Promise<Earning[]>;
  getUserStats(userId: string): Promise<{
    todayEarnings: string;
    weekEarnings: string;
    monthEarnings: string;
    totalEarnings: string;
  }>;
  
  // Balance operations
  updateUserBalance(userId: string, amount: string): Promise<void>;
  
  // Streak operations
  updateUserStreak(userId: string): Promise<{ newStreak: number; rewardEarned: string }>;
  
  // Ads tracking
  incrementAdsWatched(userId: string): Promise<void>;
  incrementExtraAdsWatched(userId: string): Promise<void>;
  resetDailyAdsCount(userId: string): Promise<void>;
  canWatchAd(userId: string): Promise<boolean>;
  canWatchExtraAd(userId: string): Promise<boolean>;
  
  // Withdrawal operations
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getUserWithdrawals(userId: string): Promise<Withdrawal[]>;
  
  // Admin withdrawal operations
  getAllPendingWithdrawals(): Promise<Withdrawal[]>;
  getAllWithdrawals(): Promise<Withdrawal[]>;
  updateWithdrawalStatus(withdrawalId: string, status: string, transactionHash?: string, adminNotes?: string): Promise<Withdrawal>;
  
  // Referral operations
  createReferral(referrerId: string, referredId: string): Promise<Referral>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  
  // Generate referral code
  generateReferralCode(userId: string): Promise<string>;
  getUserByReferralCode(referralCode: string): Promise<User | null>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserBanStatus(userId: string, banned: boolean, reason?: string, adminId?: string, banType?: string, adminBanReason?: string): Promise<void>;
  
  // Telegram user operations
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  upsertTelegramUser(telegramId: string, userData: Omit<UpsertUser, 'id' | 'telegramId'>): Promise<{ user: User; isNewUser: boolean }>;
  
  // Mining operations
  getMiningBoosts(userId: string): Promise<MiningBoost[]>;
  addMiningBoost(boost: InsertMiningBoost): Promise<MiningBoost>;
  
  // Daily reset system
  performDailyReset(): Promise<void>;
  checkAndPerformDailyReset(): Promise<void>;
  
  // User balance operations
  getUserBalance(userId: string): Promise<UserBalance | undefined>;
  createOrUpdateUserBalance(userId: string, balance?: string): Promise<UserBalance>;
  deductBalance(userId: string, amount: string): Promise<{ success: boolean; message: string }>;
  addBalance(userId: string, amount: string): Promise<void>;
  
  // Admin/Statistics operations
  getAppStats(): Promise<{
    totalUsers: number;
    activeUsersToday: number;
    totalInvites: number;
    totalEarnings: string;
    totalReferralEarnings: string;
    totalPayouts: string;
    tonWithdrawn: string;
    newUsersLast24h: number;
    totalAdsWatched: number;
    adsWatchedToday: number;
    pendingWithdrawals: number;
    approvedWithdrawals: number;
    rejectedWithdrawals: number;
    pendingDeposits: number;
    totalMiningSats: string;
    miningToday: string;
    usersWithReferrals: number;
    totalSatsWithdrawn: string;
  }>;
  checkAndActivateReferralOnChannelJoin(userId: string): Promise<void>;

  // Mining operations
  getMiningState(userId: string): Promise<{
    currentMining: string;
    miningRate: string;
    lastClaim: Date;
    maxMining: string;
  }>;
  claimMining(userId: string): Promise<{
    success: boolean;
    amount: string;
    message: string;
  }>;
  hasEverBoughtBoost(userId: string): Promise<boolean>;
  
  // Deposit operations
  getPendingDeposit(userId: string): Promise<Deposit | undefined>;
  createDeposit(deposit: InsertDeposit): Promise<Deposit>;
  getUserDeposits(userId: string): Promise<Deposit[]>;
  getDeposit(depositId: string): Promise<Deposit | undefined>;

  // New Mining operations
  getMiningBoosts(userId: string): Promise<MiningBoost[]>;
  addMiningBoost(boost: InsertMiningBoost): Promise<MiningBoost>;
  
  // Referral Tasks
  getUserReferralTasks(userId: string): Promise<UserReferralTask[]>;
  claimReferralTask(userId: string, taskId: string): Promise<{ success: boolean; message: string; rewardAXN?: string; miningBoost?: string }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUserVerificationStatus(userId: string, isVerified: boolean): Promise<void> {
    await db.update(users)
      .set({ 
        isChannelGroupVerified: isVerified,
        lastMembershipCheck: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    try {
      // Use raw SQL to avoid Drizzle ORM issues
      const result = await db.execute(sql`
        SELECT * FROM users WHERE telegram_id = ${telegramId} LIMIT 1
      `);
      const user = result.rows[0] as User | undefined;
      return user;
    } catch (error) {
      console.error('Error in getUserByTelegramId:', error);
      throw error;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<{ user: User; isNewUser: boolean }> {
    // Check if user already exists
    const existingUser = await this.getUser(userData.id!);
    const isNewUser = !existingUser;
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // Auto-generate referral code for new users if they don't have one
    if (isNewUser && !user.referralCode) {
      try {
        await this.generateReferralCode(user.id);
      } catch (error) {
        console.error('Failed to generate referral code for new user:', error);
      }
    }
    
    // Auto-create balance record for new users
    if (isNewUser) {
      try {
        await this.createOrUpdateUserBalance(user.id, '0');
        console.log(`✅ Created balance record for new user: ${user.id}`);
      } catch (error) {
        console.error('Failed to create balance record for new user:', error);
      }
    }
    
    return { user, isNewUser };
  }

  async upsertTelegramUser(telegramId: string, userData: Omit<UpsertUser, 'id' | 'telegramId'>): Promise<{ user: User; isNewUser: boolean }> {
    // Sanitize user data to prevent SQL issues
    const sanitizedData = {
      ...userData,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      username: userData.username || null,
      personalCode: userData.personalCode || telegramId,
      withdrawBalance: userData.withdrawBalance || '0',
      totalEarnings: userData.totalEarnings || '0',
      adsWatched: userData.adsWatched || 0,
      dailyAdsWatched: userData.dailyAdsWatched || 0,
      dailyEarnings: userData.dailyEarnings || '0',
      level: userData.level || 1,
      flagged: userData.flagged || false,
      banned: userData.banned || false
      // NOTE: Don't generate referral code here - it will be handled separately for new users only
    };
    
    // Check if user already exists by Telegram ID
    let existingUser = await this.getUserByTelegramId(telegramId);
    
    // If not found by telegram_id, check if user exists by personal_code (for migration scenarios)
    if (!existingUser && sanitizedData.personalCode) {
      const result = await db.execute(sql`
        SELECT * FROM users WHERE personal_code = ${sanitizedData.personalCode} LIMIT 1
      `);
      const userByPersonalCode = result.rows[0] as User | undefined;
      
      if (userByPersonalCode) {
        // User exists but doesn't have telegram_id set - update it
        const updateResult = await db.execute(sql`
          UPDATE users 
          SET telegram_id = ${telegramId},
              first_name = ${sanitizedData.firstName}, 
              last_name = ${sanitizedData.lastName}, 
              username = ${sanitizedData.username},
              updated_at = NOW()
          WHERE personal_code = ${sanitizedData.personalCode}
          RETURNING *
        `);
        const user = updateResult.rows[0] as User;
        return { user, isNewUser: false };
      }
    }
    
    const isNewUser = !existingUser;
    
    if (existingUser) {
      // For existing users, update fields and ensure referral code exists
      const result = await db.execute(sql`
        UPDATE users 
        SET first_name = ${sanitizedData.firstName}, 
            last_name = ${sanitizedData.lastName}, 
            username = ${sanitizedData.username},
            updated_at = NOW()
        WHERE telegram_id = ${telegramId}
        RETURNING *
      `);
      const user = result.rows[0] as User;
      
      // Ensure existing user has referral code
      if (!user.referralCode) {
        console.log('🔄 Generating missing referral code for existing user:', user.id);
        try {
          await this.generateReferralCode(user.id);
          // Fetch updated user with referral code
          const updatedUser = await this.getUser(user.id);
          return { user: updatedUser || user, isNewUser };
        } catch (error) {
          console.error('Failed to generate referral code for existing user:', error);
          return { user, isNewUser };
        }
      }
      
      return { user, isNewUser };
    } else {
      // For new users, check if email already exists
      // If it does, we'll create a unique email by appending the telegram ID
      let finalEmail = userData.email;
      try {
        // Try to create with the provided email first
        const result = await db.execute(sql`
          INSERT INTO users (
            telegram_id, email, first_name, last_name, username, personal_code, 
            withdraw_balance, total_earnings, ads_watched, daily_ads_watched, 
            daily_earnings, level, flagged, banned
          )
          VALUES (
            ${telegramId}, ${finalEmail}, ${sanitizedData.firstName}, ${sanitizedData.lastName}, 
            ${sanitizedData.username}, ${sanitizedData.personalCode}, ${sanitizedData.withdrawBalance}, 
            ${sanitizedData.totalEarnings}, ${sanitizedData.adsWatched}, ${sanitizedData.dailyAdsWatched}, 
            ${sanitizedData.dailyEarnings}, ${sanitizedData.level}, ${sanitizedData.flagged}, 
            ${sanitizedData.banned}
          )
          RETURNING *
        `);
        const user = result.rows[0] as User;
        
        // Auto-generate referral code for new users
        try {
          await this.generateReferralCode(user.id);
        } catch (error) {
          console.error('Failed to generate referral code for new Telegram user:', error);
        }
        
        // Auto-create balance record for new users
        try {
          await this.createOrUpdateUserBalance(user.id, '0');
          console.log(`✅ Created balance record for new Telegram user: ${user.id}`);
        } catch (error) {
          console.error('Failed to create balance record for new Telegram user:', error);
        }
        
        // Fetch updated user with referral code
        const updatedUser = await this.getUser(user.id);
        return { user: updatedUser || user, isNewUser };
      } catch (error: any) {
        // Handle unique constraint violations
        if (error.code === '23505') {
          if (error.constraint === 'users_email_unique') {
            finalEmail = `${telegramId}@telegram.user`;
          } else if (error.constraint === 'users_personal_code_unique') {
            // If personal_code conflict, use telegram ID as personal code
            sanitizedData.personalCode = `tg_${telegramId}`;
          }
          
          // Try again with modified data
          const result = await db.execute(sql`
            INSERT INTO users (
              telegram_id, email, first_name, last_name, username, personal_code, 
              withdraw_balance, total_earnings, ads_watched, daily_ads_watched, 
              daily_earnings, level, flagged, banned
            )
            VALUES (
              ${telegramId}, ${finalEmail}, ${sanitizedData.firstName}, ${sanitizedData.lastName}, 
              ${sanitizedData.username}, ${sanitizedData.personalCode}, ${sanitizedData.withdrawBalance}, 
              ${sanitizedData.totalEarnings}, ${sanitizedData.adsWatched}, ${sanitizedData.dailyAdsWatched}, 
              ${sanitizedData.dailyEarnings}, ${sanitizedData.level}, ${sanitizedData.flagged}, 
              ${sanitizedData.banned}
            )
            RETURNING *
          `);
          const user = result.rows[0] as User;
          
          // Auto-generate referral code for new users
          try {
            await this.generateReferralCode(user.id);
          } catch (error) {
            console.error('Failed to generate referral code for new Telegram user:', error);
          }
          
          // Auto-create balance record for new users
          try {
            await this.createOrUpdateUserBalance(user.id, '0');
            console.log(`✅ Created balance record for new Telegram user: ${user.id}`);
          } catch (error) {
            console.error('Failed to create balance record for new Telegram user:', error);
          }
          
          // Fetch updated user with referral code
          const updatedUser = await this.getUser(user.id);
          return { user: updatedUser || user, isNewUser };
        } else {
          throw error;
        }
      }
    }
  }

  async getAppSetting(key: string, defaultValue: string | number): Promise<string> {
    try {
      const [setting] = await db
        .select({ settingValue: adminSettings.settingValue })
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, key))
        .limit(1);
      
      if (setting && setting.settingValue) {
        return setting.settingValue;
      }
      return String(defaultValue);
    } catch (error) {
      console.error(`Error getting app setting ${key}:`, error);
      return String(defaultValue);
    }
  }

  async watchAd(userId: string, adType: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    return { success: true, newBalance: user.balance };
  }

  async getAllAdminSettings(): Promise<AdminSetting[]> {
    return db.select().from(adminSettings);
  }

  async updateAdminSetting(key: string, value: string): Promise<void> {
    await db
      .insert(adminSettings)
      .values({
        settingKey: key,
        settingValue: value,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: adminSettings.settingKey,
        set: {
          settingValue: value,
          updatedAt: new Date()
        }
      });
  }

  async updatePaymentSystemsFromSettings(minWithdraw: number, fee: number) {
    // In our simplified TON-only model, we update the app settings directly.
    // The payment system logic is handled by getAppSetting in WithdrawalPopup.
    await this.updateAdminSetting('minimum_withdrawal_ton', minWithdraw.toString());
    await this.updateAdminSetting('withdrawal_fee_ton', fee.toString());
    console.log(`✅ Payment system settings updated: Min=${minWithdraw}, Fee=${fee}`);
  }

  // Mining operations
  async claimMining(userId: string): Promise<{ success: boolean; amount: string; message: string }> {
    try {
      const user = await this.getUser(userId);
      if (!user) throw new Error("User not found");

      const miningState = await this.getMiningState(userId);
      const amount = miningState.currentMining;

      if (parseFloat(amount) < 1) {
        return { success: false, amount: "0", message: "Minimum claim is 1 AXN" };
      }

      await db.transaction(async (tx) => {
        const now = new Date();
        const updateData: any = {
          balance: sql`COALESCE(${users.balance}, 0) + ${amount}`,
          withdrawBalance: sql`COALESCE(${users.withdrawBalance}, 0) + ${amount}`,
          totalEarnings: sql`COALESCE(${users.totalEarnings}, 0) + ${amount}`,
          lastMiningClaim: now,
          updatedAt: now
        };

        await tx.update(users)
          .set(updateData)
          .where(eq(users.id, userId));

        await tx.insert(earnings).values({
          userId,
          amount,
          source: "mining",
          description: "Mining claim",
        });
      });

      return { success: true, amount, message: `Successfully claimed ${amount} AXN` };
    } catch (error) {
      console.error("Error claiming mining:", error);
      return { success: false, amount: "0", message: "Failed to claim mining" };
    }
  }

  async getMiningState(userId: string) {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const now = new Date();
    const lastClaim = user.lastMiningClaim || user.createdAt || new Date();
    
    // Get all active boosts from DB
    const boosts = await this.getMiningBoosts(userId);
    
    // Base rate
    const baseRate = 0.00001;
    // Referral boost stored as per-hour value
    const referralBoostHourly = parseFloat(user.referralMiningBoost || "0");
    const referralBoostPerSec = referralBoostHourly / 3600;
    // Ad section boosts (per-hour values stored on user record)
    const adSection1BoostHourly = parseFloat((user as any).adSection1Boost || "0");
    const adSection2BoostHourly = parseFloat((user as any).adSection2Boost || "0");
    const adBoostPerSec = (adSection1BoostHourly + adSection2BoostHourly) / 3600;
    let totalRate = baseRate + referralBoostPerSec + adBoostPerSec;
    boosts.forEach(boost => {
      totalRate += parseFloat(boost.miningRate);
    });
    
    const secondsPassed = Math.floor((now.getTime() - lastClaim.getTime()) / 1000);
    const currentMining = (secondsPassed * totalRate).toFixed(5);
    const maxMining = (24 * 60 * 60 * totalRate).toFixed(2);

    return {
      currentMining,
      miningRate: (totalRate * 3600).toFixed(4),
      lastClaim,
      maxMining,
      rawMiningRate: totalRate,
      referralBoost: referralBoostHourly.toFixed(4),
      boosts
    };
  }

  // ============================================================
  // AXN MINING MACHINE SYSTEM
  // ============================================================

  async getOrCreateMachine(userId: string): Promise<UserMachine> {
    const [existing] = await db.select().from(userMachines).where(eq(userMachines.userId, userId));
    if (existing) return existing;
    const now = new Date();
    const [created] = await db.insert(userMachines).values({
      userId,
      miningLevel: 1,
      capacityLevel: 1,
      cpuLevel: 1,
      hasEnergy: true,
      antivirusActive: false,
      machineHealth: 100,
      lastClaimTime: now,
      lastVirusAttack: now,
    }).returning();
    return created;
  }

  async getAxnMachineState(userId: string) {
    const machine = await this.getOrCreateMachine(userId);
    const user = await this.getUser(userId);
    const now = new Date();

    const mLvl = getMiningLevel(machine.miningLevel);
    const cLvl = getMiningLevel(machine.capacityLevel);
    const cpuLvl = getMiningLevel(machine.cpuLevel);

    const miningRate = mLvl.rate;          // AXN/s
    const capacity = cLvl.capacity;        // max AXN stored
    const cpuDurationSec = cpuLvl.cpuMin * 60;

    // Determine CPU running state
    const cpuRunning = !!(machine.cpuEndTime && machine.cpuEndTime > now);
    const cpuRemainingSeconds = cpuRunning
      ? Math.max(0, Math.floor((machine.cpuEndTime!.getTime() - now.getTime()) / 1000))
      : 0;

    // Compute mined AXN (capped at capacity, only while CPU running and health > 0)
    let minedAxn = 0;
    if (machine.machineHealth > 0 && machine.cpuStartTime && machine.lastClaimTime) {
      const mineFrom = machine.lastClaimTime > machine.cpuStartTime
        ? machine.lastClaimTime
        : machine.cpuStartTime;
      const mineUntil = machine.cpuEndTime && machine.cpuEndTime < now ? machine.cpuEndTime : now;
      if (mineUntil > mineFrom) {
        const seconds = Math.floor((mineUntil.getTime() - mineFrom.getTime()) / 1000);
        minedAxn = Math.min(capacity, seconds * miningRate);
      }
    }

    // Compute pending virus damage (displayed to UI, not yet applied)
    let virusDamage = 0;
    let nextVirusIn = 120; // seconds until next virus attack
    if (!machine.antivirusActive && machine.lastVirusAttack) {
      const secSinceAttack = Math.floor((now.getTime() - machine.lastVirusAttack.getTime()) / 1000);
      virusDamage = Math.floor(secSinceAttack / 120);
      nextVirusIn = 120 - (secSinceAttack % 120);
    }

    const balance = parseFloat(user?.balance || '0');

    return {
      miningLevel: machine.miningLevel,
      capacityLevel: machine.capacityLevel,
      cpuLevel: machine.cpuLevel,
      miningRate,
      capacity,
      cpuDurationSec,
      minedAxn: parseFloat(minedAxn.toFixed(4)),
      cpuRunning,
      cpuRemainingSeconds,
      hasEnergy: machine.hasEnergy,
      antivirusActive: machine.antivirusActive,
      machineHealth: machine.machineHealth,
      energyCost: mLvl.energyCost,
      repairCost: mLvl.repairCost,
      antivirusCost: mLvl.antivirusCost,
      upgMining: mLvl.upgMining,
      upgCapacity: cLvl.upgCapacity,
      upgCpu: cpuLvl.upgCpu,
      isMaxLevel: machine.miningLevel >= 25,
      balance,
      pendingVirusDamage: virusDamage,
      nextVirusIn,
      lastVirusAttack: machine.lastVirusAttack,
    };
  }

  async startCpu(userId: string): Promise<{ success: boolean; message: string }> {
    const machine = await this.getOrCreateMachine(userId);
    const now = new Date();

    if (!machine.hasEnergy) {
      return { success: false, message: 'No energy! Refill energy to start mining.' };
    }
    if (machine.machineHealth <= 0) {
      return { success: false, message: 'Machine is broken! Repair it first.' };
    }
    if (machine.cpuEndTime && machine.cpuEndTime > now) {
      return { success: false, message: 'CPU is already running!' };
    }

    const cpuLvl = getMiningLevel(machine.cpuLevel);
    const cpuDurationMs = cpuLvl.cpuMin * 60 * 1000;
    const cpuEndTime = new Date(now.getTime() + cpuDurationMs);

    await db.update(userMachines).set({
      hasEnergy: false,
      cpuStartTime: now,
      cpuEndTime,
      lastClaimTime: now,
      updatedAt: now,
    }).where(eq(userMachines.userId, userId));

    return { success: true, message: 'CPU started! Mining is now active.' };
  }

  async claimAxnMining(userId: string): Promise<{ success: boolean; amount: number; message: string }> {
    const machine = await this.getOrCreateMachine(userId);
    const state = await this.getAxnMachineState(userId);

    if (state.minedAxn < 0.01) {
      return { success: false, amount: 0, message: 'Nothing to claim yet. Start CPU and let it mine.' };
    }

    const amount = state.minedAxn;
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.update(users).set({
        balance: sql`COALESCE(${users.balance}, 0) + ${amount.toString()}`,
        updatedAt: now,
      }).where(eq(users.id, userId));

      await tx.update(userMachines).set({
        lastClaimTime: now,
        updatedAt: now,
      }).where(eq(userMachines.userId, userId));

      await tx.insert(earnings).values({
        userId,
        amount: amount.toString(),
        source: 'axn_mining',
        description: `AXN Mining claim - Level ${machine.miningLevel}`,
      });
    });

    return { success: true, amount, message: `Claimed ${amount.toFixed(4)} AXN` };
  }

  async refillEnergy(userId: string): Promise<{ success: boolean; message: string }> {
    const machine = await this.getOrCreateMachine(userId);
    if (machine.hasEnergy) {
      return { success: false, message: 'Energy tank is already full!' };
    }
    const mLvl = getMiningLevel(machine.miningLevel);
    const cost = mLvl.energyCost;
    const user = await this.getUser(userId);
    const balance = parseFloat(user?.balance || '0');

    if (balance < cost) {
      return { success: false, message: `Not enough AXN. Need ${cost} AXN to refill energy.` };
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.update(users).set({
        balance: sql`COALESCE(${users.balance}, 0) - ${cost.toString()}`,
        updatedAt: now,
      }).where(eq(users.id, userId));
      await tx.update(userMachines).set({
        hasEnergy: true,
        updatedAt: now,
      }).where(eq(userMachines.userId, userId));
    });

    return { success: true, message: `Energy refilled! Spent ${cost} AXN.` };
  }

  async repairMachine(userId: string): Promise<{ success: boolean; message: string }> {
    const machine = await this.getOrCreateMachine(userId);
    if (machine.machineHealth >= 100) {
      return { success: false, message: 'Machine is already at full health!' };
    }
    const mLvl = getMiningLevel(machine.miningLevel);
    const cost = mLvl.repairCost;
    const user = await this.getUser(userId);
    const balance = parseFloat(user?.balance || '0');

    if (balance < cost) {
      return { success: false, message: `Not enough AXN. Need ${cost} AXN to repair.` };
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.update(users).set({
        balance: sql`COALESCE(${users.balance}, 0) - ${cost.toString()}`,
        updatedAt: now,
      }).where(eq(users.id, userId));
      await tx.update(userMachines).set({
        machineHealth: 100,
        updatedAt: now,
      }).where(eq(userMachines.userId, userId));
    });

    return { success: true, message: `Machine repaired to 100% health! Spent ${cost} AXN.` };
  }

  async toggleAntivirus(userId: string): Promise<{ success: boolean; active: boolean; message: string }> {
    const machine = await this.getOrCreateMachine(userId);
    const now = new Date();

    // Turning ON costs AXN
    if (!machine.antivirusActive) {
      const mLvl = getMiningLevel(machine.miningLevel);
      const cost = mLvl.antivirusCost;
      const user = await this.getUser(userId);
      const balance = parseFloat(user?.balance || '0');
      if (balance < cost) {
        return { success: false, active: false, message: `Need ${cost} AXN to activate antivirus.` };
      }
      await db.transaction(async (tx) => {
        await tx.update(users).set({
          balance: sql`COALESCE(${users.balance}, 0) - ${cost.toString()}`,
          updatedAt: now,
        }).where(eq(users.id, userId));
        await tx.update(userMachines).set({
          antivirusActive: true,
          lastVirusAttack: null,
          updatedAt: now,
        }).where(eq(userMachines.userId, userId));
      });
      return { success: true, active: true, message: `Antivirus activated! Spent ${cost} AXN.` };
    } else {
      await db.update(userMachines).set({
        antivirusActive: false,
        lastVirusAttack: now,
        updatedAt: now,
      }).where(eq(userMachines.userId, userId));
      return { success: true, active: false, message: 'Antivirus deactivated. Watch out for viruses!' };
    }
  }

  async upgradeSubsystem(userId: string, type: 'mining' | 'capacity' | 'cpu'): Promise<{ success: boolean; newLevel: number; message: string }> {
    const machine = await this.getOrCreateMachine(userId);
    const currentLevel = type === 'mining' ? machine.miningLevel
      : type === 'capacity' ? machine.capacityLevel
      : machine.cpuLevel;

    if (currentLevel >= 25) {
      return { success: false, newLevel: currentLevel, message: 'Already at maximum level!' };
    }

    const levelData = getMiningLevel(currentLevel);
    const cost = type === 'mining' ? levelData.upgMining
      : type === 'capacity' ? levelData.upgCapacity
      : levelData.upgCpu;

    const user = await this.getUser(userId);
    const balance = parseFloat(user?.balance || '0');
    if (balance < cost) {
      return { success: false, newLevel: currentLevel, message: `Need ${cost.toLocaleString()} AXN to upgrade.` };
    }

    const newLevel = currentLevel + 1;
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.update(users).set({
        balance: sql`COALESCE(${users.balance}, 0) - ${cost.toString()}`,
        updatedAt: now,
      }).where(eq(users.id, userId));

      const updateData: any = { updatedAt: now };
      if (type === 'mining') updateData.miningLevel = newLevel;
      else if (type === 'capacity') updateData.capacityLevel = newLevel;
      else updateData.cpuLevel = newLevel;

      await tx.update(userMachines).set(updateData).where(eq(userMachines.userId, userId));
    });

    const subsystemName = type === 'mining' ? 'Mining' : type === 'capacity' ? 'Capacity' : 'CPU';
    return { success: true, newLevel, message: `${subsystemName} upgraded to level ${newLevel}!` };
  }

  async applyVirusDamage(userId: string): Promise<void> {
    const machine = await this.getOrCreateMachine(userId);
    if (machine.antivirusActive) return;

    const now = new Date();

    // If timer was never started, set it now and return (first exposure)
    if (!machine.lastVirusAttack) {
      await db.update(userMachines).set({ lastVirusAttack: now, updatedAt: now })
        .where(eq(userMachines.userId, userId));
      return;
    }

    const lastAttack = machine.lastVirusAttack;
    const secSince = Math.floor((now.getTime() - lastAttack.getTime()) / 1000);
    const attacks = Math.floor(secSince / 120); // 1 attack per 2 minutes
    if (attacks <= 0) return;

    const damage = attacks; // 1 AXN per attack
    const healthDamage = Math.min(machine.machineHealth, attacks * 5); // 5 health per attack

    const user = await this.getUser(userId);
    const balance = parseFloat(user?.balance || '0');
    const actualDamage = Math.min(damage, balance);

    await db.transaction(async (tx) => {
      if (actualDamage > 0) {
        await tx.update(users).set({
          balance: sql`GREATEST(0, COALESCE(${users.balance}, 0) - ${actualDamage.toString()})`,
          updatedAt: now,
        }).where(eq(users.id, userId));
      }
      await tx.update(userMachines).set({
        machineHealth: Math.max(0, machine.machineHealth - healthDamage),
        lastVirusAttack: now,
        updatedAt: now,
      }).where(eq(userMachines.userId, userId));
    });
  }

  // Transaction operations
  async addTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    
    console.log(`📊 Transaction recorded: ${transaction.type} of ${transaction.amount} AXN for user ${transaction.userId} - ${transaction.source}`);
    return newTransaction;
  }

  // Helper function to log transactions for referral system
  async logTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    return this.addTransaction(transactionData);
  }

  // Earnings operations
  async addEarning(earning: InsertEarning): Promise<Earning> {
    const [newEarning] = await db
      .insert(earnings)
      .values(earning)
      .returning();
    
    // Log transaction for security and tracking
    await this.logTransaction({
      userId: earning.userId,
      amount: earning.amount,
      type: 'addition',
      source: earning.source,
      description: earning.description || `${earning.source} earning`,
      metadata: { earningId: newEarning.id }
    });
    
    // Update canonical user_balances table and keep users table in sync
    // All earnings contribute to available balance
    if (parseFloat(earning.amount) !== 0) {
      try {
        // Ensure user has a balance record first with improved error handling
        await this.createOrUpdateUserBalance(earning.userId);
        
        // Update canonical user_balances table
        await db
          .update(userBalances)
          .set({
            balance: sql`COALESCE(${userBalances.balance}, 0) + ${earning.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(userBalances.userId, earning.userId));
      } catch (balanceError) {
        console.error('Error updating user balance in addEarning:', balanceError);
        // Auto-create the record if it doesn't exist instead of throwing error
        try {
          console.log('🔄 Attempting to auto-create missing balance record...');
          await this.createOrUpdateUserBalance(earning.userId, '0');
          // Retry the balance update
          await db
            .update(userBalances)
            .set({
              balance: sql`COALESCE(${userBalances.balance}, 0) + ${earning.amount}`,
              updatedAt: new Date(),
            })
            .where(eq(userBalances.userId, earning.userId));
          console.log('✅ Successfully recovered from balance error');
        } catch (recoveryError) {
          console.error('❌ Failed to recover from balance error:', recoveryError);
          // Continue with the function - don't let balance errors block earnings
        }
      }
      
      try {
        // Keep users table in sync for compatibility
        await db
          .update(users)
          .set({
            balance: sql`COALESCE(${users.balance}, 0) + ${earning.amount}`,
            withdrawBalance: sql`COALESCE(${users.withdrawBalance}, 0) + ${earning.amount}`,
            totalEarned: sql`COALESCE(${users.totalEarned}, 0) + ${earning.amount}`,
            totalEarnings: sql`COALESCE(${users.totalEarnings}, 0) + ${earning.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(users.id, earning.userId));
      } catch (userUpdateError) {
        console.error('Error updating users table in addEarning:', userUpdateError);
        // Don't throw - the earning was already recorded
      }
    }
    
    // Check and activate referral bonuses FIRST after ad watch (critical for referral system)
    // This must happen BEFORE processing commissions so the referral status is updated to 'completed'
    if (earning.source === 'ad_watch') {
      await this.checkAndActivateReferralBonus(earning.userId);
    }
    
    // Process referral commission (10% of user's earnings)
    // Only process commissions for non-referral earnings to avoid recursion
    // This runs AFTER activation so the referral is already 'completed' when checking
    if (earning.source !== 'referral_commission' && earning.source !== 'referral') {
      await this.processReferralCommission(earning.userId, newEarning.id, earning.amount);
    }
    
    return newEarning;
  }

  async getUserEarnings(userId: string, limit: number = 20): Promise<Earning[]> {
    return db
      .select()
      .from(earnings)
      .where(eq(earnings.userId, userId))
      .orderBy(desc(earnings.createdAt))
      .limit(limit);
  }

  async getUserStats(userId: string): Promise<{
    todayEarnings: string;
    weekEarnings: string;
    monthEarnings: string;
    totalEarnings: string;
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    const [todayResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${earnings.amount}), 0)`,
      })
      .from(earnings)
      .where(
        and(
          eq(earnings.userId, userId),
          gte(earnings.createdAt, today),
          sql`${earnings.source} <> 'withdrawal'`
        )
      );

    const [weekResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${earnings.amount}), 0)`,
      })
      .from(earnings)
      .where(
        and(
          eq(earnings.userId, userId),
          gte(earnings.createdAt, weekAgo),
          sql`${earnings.source} <> 'withdrawal'`
        )
      );

    const [monthResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${earnings.amount}), 0)`,
      })
      .from(earnings)
      .where(
        and(
          eq(earnings.userId, userId),
          gte(earnings.createdAt, monthAgo),
          sql`${earnings.source} <> 'withdrawal'`
        )
      );

    const [totalResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${earnings.amount}), 0)`,
      })
      .from(earnings)
      .where(
        and(
          eq(earnings.userId, userId),
          sql`${earnings.source} <> 'withdrawal'`
        )
      );

    return {
      todayEarnings: todayResult.total,
      weekEarnings: weekResult.total,
      monthEarnings: monthResult.total,
      totalEarnings: totalResult.total,
    };
  }

  async updateUserBalance(userId: string, amount: string): Promise<void> {
    // Ensure user has a balance record first
    await this.createOrUpdateUserBalance(userId);
    
    // Update the canonical user_balances table
    await db
      .update(userBalances)
      .set({
        balance: sql`${userBalances.balance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(userBalances.userId, userId));
  }

  async convertAXNToTon(userId: string, axnAmount: number): Promise<{ success: boolean; message: string; tonAmount?: number }> {
    const user = await this.getUser(userId);
    if (!user) return { success: false, message: "User not found" };

    const currentBalance = parseFloat(user.balance || "0");
    if (currentBalance < axnAmount) {
      return { success: false, message: "Insufficient AXN balance" };
    }

    // 10,000 AXN = 1 TON
    const tonAmount = axnAmount / 10000;

    await db.transaction(async (tx) => {
      // Deduct AXN
      await tx.update(users)
        .set({
          balance: sql`${users.balance} - ${axnAmount.toString()}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Add TON
      await tx.update(users)
        .set({
          tonBalance: sql`COALESCE(${users.tonBalance}, 0) + ${tonAmount.toString()}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Record transaction
      await tx.insert(transactions).values({
        userId,
        amount: axnAmount.toString(),
        type: 'subtraction',
        source: 'conversion',
        description: `Converted ${axnAmount} AXN to ${tonAmount} TON`,
      });
    });

    const updatedUser = await this.getUser(userId);
    return { success: true, message: "Conversion successful", tonAmount: parseFloat(updatedUser?.tonBalance || "0") };
  }

  // Helper function to get the correct day bucket start (12:00 PM UTC)
  private getDayBucketStart(date: Date): Date {
    const bucketStart = new Date(date);
    bucketStart.setUTCHours(12, 0, 0, 0);
    
    // If the event occurred before 12:00 PM UTC on its calendar day,
    // it belongs to the previous day's bucket
    if (date.getTime() < bucketStart.getTime()) {
      bucketStart.setUTCDate(bucketStart.getUTCDate() - 1);
    }
    
    return bucketStart;
  }

  async updateUserStreak(userId: string): Promise<{ newStreak: number; rewardEarned: string; isBonusDay: boolean }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date();
    const lastStreakDate = user.lastStreakDate;
    let newStreak = (user.currentStreak || 0) + 1;
    let rewardEarned = "1";
    let isBonusDay = false;

    if (lastStreakDate) {
      const lastClaim = new Date(lastStreakDate);
      const minutesSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60);
      
      if (minutesSinceLastClaim < 5) {
        return { newStreak: user.currentStreak || 0, rewardEarned: "0", isBonusDay: false };
      }
    }

    await db
      .update(users)
      .set({
        currentStreak: newStreak,
        lastStreakDate: now,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    if (parseFloat(rewardEarned) > 0) {
      await this.addEarning({
        userId,
        amount: rewardEarned,
        source: 'bonus_claim',
        description: `Bonus claim - earned 1 AXN`,
      });
    }

    return { newStreak, rewardEarned, isBonusDay };
  }

  async incrementExtraAdsWatched(userId: string): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return;
    const now = new Date();
    await db.update(users).set({
      extraAdsWatchedToday: sql`${users.extraAdsWatchedToday} + 1`,
      lastExtraAdDate: now,
      updatedAt: now,
    }).where(eq(users.id, userId));
  }

  async canWatchExtraAd(userId: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return false;
    const now = new Date();
    const lastAdDate = user.lastExtraAdDate;
    const isSameDay = lastAdDate && 
      lastAdDate.getUTCFullYear() === now.getUTCFullYear() &&
      lastAdDate.getUTCMonth() === now.getUTCMonth() &&
      lastAdDate.getUTCDate() === now.getUTCDate();
    
    if (!isSameDay) {
      await db.update(users).set({ extraAdsWatchedToday: 0, lastExtraAdDate: now }).where(eq(users.id, userId));
      return true;
    }

    return (user.extraAdsWatchedToday || 0) < 100;
  }

  // Helper function for consistent 12:00 PM UTC reset date calculation
  private getResetDate(date = new Date()): string {
    const utcDate = date.toISOString().split('T')[0];
    
    // If current time is before 12:00 PM UTC, consider it still "yesterday" for tasks
    if (date.getUTCHours() < 12) {
      const yesterday = new Date(date);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    
    return utcDate;
  }

  async incrementAdsWatched(userId: string): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) return;

    const now = new Date();
    const currentResetDate = this.getCurrentResetDate(); // Use new reset method

    // Check if last ad was watched today (same reset period)
    let adsCount = 1; // Default for first ad of the day
    
    if (user.lastAdDate) {
      const lastAdResetDate = this.getCurrentResetDate(); // Use consistent method
      const lastAdDateString = user.lastAdDate.toISOString().split('T')[0];
      
      // If same reset period, increment current count
      if (lastAdDateString === currentResetDate) {
        adsCount = (user.adsWatchedToday || 0) + 1;
      }
    }

    console.log(`📊 ADS_COUNT_DEBUG: User ${userId}, Reset Date: ${currentResetDate}, New Count: ${adsCount}, Previous Count: ${user.adsWatchedToday || 0}`);

    await db
      .update(users)
      .set({
        adsWatchedToday: adsCount,
        adsWatched: sql`COALESCE(${users.adsWatched}, 0) + 1`, // Increment total ads watched
        lastAdDate: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    // NEW: Update task progress for the new task system
    await this.updateTaskProgress(userId, adsCount);
  }

  async resetDailyAdsCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        adsWatchedToday: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async canWatchAd(userId: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return false;
    
    const now = new Date();
    const currentResetDate = this.getResetDate(now);

    let currentCount = 0;
    
    if (user.lastAdDate) {
      const lastAdResetDate = this.getResetDate(user.lastAdDate);
      
      // If same reset period, use current count
      if (lastAdResetDate === currentResetDate) {
        currentCount = user.adsWatchedToday || 0;
      }
    }
    
    return currentCount < 160; // Daily limit of 160 ads
  }


  async createReferral(referrerId: string, referredId: string): Promise<Referral> {
    // Validate inputs
    if (!referrerId || !referredId) {
      throw new Error(`Invalid referral parameters: referrerId=${referrerId}, referredId=${referredId}`);
    }
    
    // Prevent self-referrals
    if (referrerId === referredId) {
      throw new Error('Users cannot refer themselves');
    }
    
    // Verify both users exist
    const referrer = await this.getUser(referrerId);
    const referred = await this.getUser(referredId);
    
    if (!referrer) {
      throw new Error(`Referrer user not found: ${referrerId}`);
    }
    
    if (!referred) {
      throw new Error(`Referred user not found: ${referredId}`);
    }
    
    // Check if referral already exists
    const existingReferral = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.referrerId, referrerId),
        eq(referrals.refereeId, referredId)
      ))
      .limit(1);
    
    if (existingReferral.length > 0) {
      throw new Error('Referral relationship already exists');
    }
    
    // Create the referral relationship (initially pending)
    const [referral] = await db
      .insert(referrals)
      .values({
        referrerId,
        refereeId: referredId,
        rewardAmount: "0.01",
        status: 'pending', // Pending until friend watches 10 ads
      })
      .returning();
    
    // CRITICAL: Also update the referred user's referred_by field with the referrer's referral code
    // This ensures both the referrals table and the user's referred_by field are synchronized
    await db
      .update(users)
      .set({
        referredBy: referrer.referralCode, // Store the referrer's referral code, not their ID
        updatedAt: new Date(),
      })
      .where(eq(users.id, referredId));
    
    console.log(`✅ Referral relationship created (pending): ${referrerId} referred ${referredId}, referred_by updated to: ${referrer.referralCode}`);
    return referral;
  }

  // Check and activate referral bonus when friend watches required number of ads (AXN +  rewards)
  // Uses admin-configured 'referral_ads_required' setting instead of hardcoded value
  async checkAndActivateReferralBonus(userId: string): Promise<void> {
    try {
      // Check if this user has already received their referral bonus
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user || user.firstAdWatched) {
        // Referral bonus already processed for this user
        return;
      }

      // Get admin-configured referral ads requirement (no hardcoded values)
      const referralAdsRequired = parseInt(await this.getAppSetting('referral_ads_required', '1'));
      
      // Count ads watched by this user
      const [adCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(earnings)
        .where(and(
          eq(earnings.userId, userId),
          eq(earnings.source, 'ad_watch')
        ));

      const adsWatched = adCount?.count || 0;
      
      // If user has watched the admin-configured required number of ads, activate referral bonuses
      if (adsWatched >= referralAdsRequired) {
        // Mark this user as having completed the referral ad requirement
        await db
          .update(users)
          .set({ firstAdWatched: true })
          .where(eq(users.id, userId));

        // Get referral reward settings from admin (no hardcoded values)
        const referralRewardEnabled = await this.getAppSetting('referral_reward_enabled', 'false');
        const referralRewardAXN = parseInt(await this.getAppSetting('referral_reward_axn', '50'));
        const referralReward = parseFloat(await this.getAppSetting('referral_reward_usd', '0.0005'));

        // Find pending referrals where this user is the referee
        const pendingReferrals = await db
          .select()
          .from(referrals)
          .where(and(
            eq(referrals.refereeId, userId),
            eq(referrals.status, 'pending')
          ));

        // Activate each pending referral
        for (const referral of pendingReferrals) {
          // Update referral status to completed AND STORE the reward amounts at time of earning
          await db
            .update(referrals)
            .set({ 
              status: 'completed',
              usdRewardAmount: String(referralReward),
              bugRewardAmount: String(referralReward === '0' ? '0' : (parseFloat(String(referralReward)) * 50).toFixed(10))
            })
            .where(eq(referrals.id, referral.id));

    // Award AXN referral bonus to referrer (uses admin-configured amount)
    await this.addEarning({
      userId: referral.referrerId,
      amount: String(referralRewardAXN),
      source: 'referral',
      description: `Referral bonus - friend watched ${referralAdsRequired} ads (+${referralRewardAXN} AXN)`,
    });

    // Award bonus if enabled (uses admin-configured amount)
    if (referralRewardEnabled === 'true' && referralReward > 0) {
      await this.addTONBalance(
        referral.referrerId,
        String(referralReward),
        'referral',
        `Referral bonus - friend watched ${referralAdsRequired} ads (+TON${referralReward})`
      );

      // CRITICAL FIX: Also credit BUG balance for referral bonus
      const bugRewardAmount = parseFloat(String(referralReward)) * 50; // Calculate BUG from TON
      await this.addBUGBalance(
        referral.referrerId,
        String(bugRewardAmount),
        'referral',
        `Referral bonus - BUG earned (+${bugRewardAmount} BUG)`
      );
    }

    // Sync friendsInvited count
    await db.update(users)
      .set({ 
        friendsInvited: sql`COALESCE(${users.friendsInvited}, 0) + 1`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, referral.referrerId));

    console.log(`✅ Referral bonus: ${referralRewardAXN} AXN awarded and friendsInvited incremented for ${referral.referrerId}`);

    /* 
    // CRITICAL: Send ONLY ONE notification to referrer when their friend watches their first ad
    // Uses  reward amount from Admin Settings (no AXN/commission messages)
    try {
      const { sendReferralRewardNotification } = await import('./telegram');
      const referrer = await this.getUser(referral.referrerId);
      const referredUser = await this.getUser(userId);
      
      if (referrer && referrer.telegram_id && referredUser) {
        const referredName = referredUser.username || referredUser.firstName || 'your friend';
        // Send notification with  amount from Admin Settings (not AXN)
        await sendReferralRewardNotification(
          referrer.telegram_id,
          referredName,
          String(referralReward) //  amount from admin settings
        );
        console.log(`📩 Referral reward notification sent to ${referrer.telegram_id} with TON${referralReward} TON`);
      }
    } catch (notifyError) {
      console.error('❌ Error sending referral reward notification:', notifyError);
      // Don't throw - notification failure shouldn't block the referral process
    }
    */
        }
      }
    } catch (error) {
      console.error('Error checking referral bonus activation:', error);
    }
  }

  async checkAndActivateReferralOnChannelJoin(userId: string): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const pendingReferrals = await db
        .select()
        .from(referrals)
        .where(and(
          eq(referrals.refereeId, userId),
          eq(referrals.status, 'pending')
        ));

      if (pendingReferrals.length === 0) return;

      const referralBoostPerInvite = parseFloat(await this.getAppSetting('referral_boost_per_invite', '0.02'));

      for (const referral of pendingReferrals) {
        await db
          .update(referrals)
          .set({ status: 'completed' })
          .where(eq(referrals.id, referral.id));

        const [referrer] = await db.select().from(users).where(eq(users.id, referral.referrerId));
        if (referrer) {
          const previousBoost = parseFloat(referrer.referralMiningBoost || '0');
          const newBoost = (previousBoost + referralBoostPerInvite).toFixed(4);

          await db.update(users)
            .set({
              referralMiningBoost: newBoost,
              friendsInvited: sql`COALESCE(${users.friendsInvited}, 0) + 1`,
              updatedAt: new Date()
            })
            .where(eq(users.id, referral.referrerId));

          console.log(`✅ Referral activated on channel join: ${userId} -> ${referral.referrerId}, boost +${referralBoostPerInvite}/h`);
        }
      }
    } catch (error) {
      console.error('Error activating referral on channel join:', error);
    }
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  // Get total count of ALL invites (regardless of status or if user watched ads)
  async getTotalInvitesCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
    
    return result[0]?.count || 0;
  }

  // Clear orphaned referral - when referrer no longer exists
  async clearOrphanedReferral(userId: string): Promise<void> {
    try {
      // Clear the referredBy field on the user
      await db
        .update(users)
        .set({ 
          referredBy: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      console.log(`✅ Cleared orphaned referral for user ${userId}`);
    } catch (error) {
      console.error(`❌ Error clearing orphaned referral for user ${userId}:`, error);
      // Don't throw - this is a cleanup operation that shouldn't block main flow
    }
  }

  async getUserByReferralCode(referralCode: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, referralCode)).limit(1);
    return user || null;
  }


  async getReferralByUsers(referrerId: string, refereeId: string): Promise<Referral | null> {
    const [referral] = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.referrerId, referrerId),
        eq(referrals.refereeId, refereeId)
      ))
      .limit(1);
    return referral || null;
  }

  // Helper method to ensure all users have referral codes
  async ensureAllUsersHaveReferralCodes(): Promise<void> {
    const usersWithoutCodes = await db
      .select()
      .from(users)
      .where(sql`${users.referralCode} IS NULL OR ${users.referralCode} = ''`);
    
    for (const user of usersWithoutCodes) {
      try {
        await this.generateReferralCode(user.id);
        console.log(`Generated referral code for user ${user.id}`);
      } catch (error) {
        console.error(`Failed to generate referral code for user ${user.id}:`, error);
      }
    }
  }

  // CRITICAL: Fix existing referral data by synchronizing referrals table with referred_by fields
  async fixExistingReferralData(): Promise<void> {
    try {
      console.log('🔄 Starting referral data synchronization...');
      
      // Find all users who have referred_by but no entry in referrals table
      const usersWithReferredBy = await db
        .select({
          userId: users.id,
          referredBy: users.referredBy,
          referralCode: users.referralCode
        })
        .from(users)
        .where(and(
          sql`${users.referredBy} IS NOT NULL`,
          sql`${users.referredBy} != ''`
        ));

      console.log(`Found ${usersWithReferredBy.length} users with referred_by field set`);

      for (const user of usersWithReferredBy) {
        try {
          // Skip if referredBy is null or empty
          if (!user.referredBy) continue;
          
          // Find the referrer by their referral code
          const referrer = await this.getUserByReferralCode(user.referredBy);
          
          if (referrer) {
            // Check if referral relationship already exists
            const existingReferral = await db
              .select()
              .from(referrals)
              .where(and(
                eq(referrals.referrerId, referrer.id),
                eq(referrals.refereeId, user.userId)
              ))
              .limit(1);

            if (existingReferral.length === 0) {
              // Create the missing referral relationship
              await db
                .insert(referrals)
                .values({
                  referrerId: referrer.id,
                  refereeId: user.userId,
                  rewardAmount: "0.01",
                  status: 'pending', // Will be updated by checkAndActivateReferralBonus if user has 10+ ads
                });
              
              console.log(`✅ Created missing referral: ${referrer.id} -> ${user.userId}`);
              
              // Check if this user should have activated referral bonus
              await this.checkAndActivateReferralBonus(user.userId);
            }
          } else {
            console.log(`⚠️  Referrer not found for referral code: ${user.referredBy}`);
          }
        } catch (error) {
          console.error(`❌ Error processing user ${user.userId}:`, error);
        }
      }
      
      console.log('✅ Referral data synchronization completed');
    } catch (error) {
      console.error('❌ Error in fixExistingReferralData:', error);
    }
  }

  async generateReferralCode(userId: string): Promise<string> {
    // First check if user already has a referral code
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (user && user.referralCode) {
      return user.referralCode;
    }
    
    // Generate a secure random referral code using crypto
    const code = crypto.randomBytes(6).toString('hex'); // 12-character hex code
    
    await db
      .update(users)
      .set({
        referralCode: code,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    
    return code;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUserBanStatus(userId: string, banned: boolean, reason?: string, adminId?: string, banType?: string, adminBanReason?: string): Promise<void> {
    await db
      .update(users)
      .set({
        banned,
        bannedReason: reason || null,
        banType: banned ? (banType || 'system') : null,
        adminBanReason: banned ? (adminBanReason || null) : null,
        bannedAt: banned ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    
    // Log the ban action if ban_logs table exists and we have details
    try {
      const { logBanAction } = await import('./deviceTracking');
      if (logBanAction) {
        await logBanAction({
          userId,
          banned,
          reason: reason || (banned ? 'Banned by admin' : 'Unbanned by admin'),
          adminId: adminId || 'system'
        });
      }
    } catch (e) {
      console.warn("Could not log ban action to device tracking:", e);
    }
  }

  // Promo code operations
  async createPromoCode(promoCodeData: InsertPromoCode): Promise<PromoCode> {
    const [promoCode] = await db
      .insert(promoCodes)
      .values(promoCodeData)
      .returning();
    
    return promoCode;
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    return db
      .select()
      .from(promoCodes)
      .orderBy(desc(promoCodes.createdAt));
  }

  async getPromoCode(code: string): Promise<PromoCode | undefined> {
    const [promoCode] = await db
      .select()
      .from(promoCodes)
      .where(sql`LOWER(${promoCodes.code}) = LOWER(${code})`);
    
    return promoCode;
  }

  async updatePromoCodeStatus(id: string, isActive: boolean): Promise<PromoCode> {
    const [promoCode] = await db
      .update(promoCodes)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(promoCodes.id, id))
      .returning();
    
    return promoCode;
  }

  async usePromoCode(code: string, userId: string): Promise<{ success: boolean; message: string; reward?: string; errorType?: string }> {
    // Get promo code
    const promoCode = await this.getPromoCode(code);
    
    if (!promoCode) {
      return { success: false, message: "Invalid promo code", errorType: "invalid" };
    }

    // Check per-user limit
    const userUsageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(promoCodeUsage)
      .where(and(
        eq(promoCodeUsage.promoCodeId, promoCode.id),
        eq(promoCodeUsage.userId, userId)
      ));

    if (userUsageCount[0]?.count >= (promoCode.perUserLimit || 1)) {
      return { success: false, message: "Promo code already applied", errorType: "already_applied" };
    }

    // Check if expired
    if (promoCode.expiresAt && new Date() > new Date(promoCode.expiresAt)) {
      return { success: false, message: "Promo code has expired", errorType: "expired" };
    }

    // Check if active
    if (!promoCode.isActive) {
      return { success: false, message: "Promo code not active", errorType: "not_active" };
    }

    // Check usage limit
    if (promoCode.usageLimit && (promoCode.usageCount || 0) >= promoCode.usageLimit) {
      return { success: false, message: "Promo code usage limit reached", errorType: "not_active" };
    }

    const rewardAmount = promoCode.rewardAmount;
    const rewardType = promoCode.rewardType;

    await db.transaction(async (tx) => {
      // Record usage
      await tx.insert(promoCodeUsage).values({
        promoCodeId: promoCode.id,
        userId,
        rewardAmount: rewardAmount,
      });

      // Update usage count
      await tx
        .update(promoCodes)
        .set({
          usageCount: sql`${promoCodes.usageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(promoCodes.id, promoCode.id));

      // Apply reward based on type and currency
      if (rewardType === 'AXN') {
        const axnReward = rewardAmount; // Use exact amount
        await tx.update(users)
          .set({ 
            balance: sql`COALESCE(${users.balance}, 0) + ${axnReward}`,
            totalEarnings: sql`COALESCE(${users.totalEarnings}, 0) + ${axnReward}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
      } else if (rewardType === 'TON') {
        if (promoCode.rewardCurrency === 'Withdraw') {
          await tx.update(users)
            .set({ 
              tonBalance: sql`COALESCE(CAST(${users.tonBalance} AS NUMERIC), 0) + ${rewardAmount}`,
              updatedAt: new Date()
            })
            .where(eq(users.id, userId));
        } else if (promoCode.rewardCurrency === 'App' || !promoCode.rewardCurrency) {
          // Default to App Balance
          await tx.update(users)
            .set({ 
              tonAppBalance: sql`COALESCE(CAST(${users.tonAppBalance} AS NUMERIC), 0) + ${rewardAmount}`,
              updatedAt: new Date()
            })
            .where(eq(users.id, userId));
        }
      } else if (rewardType === 'BUG') {
        await tx.update(users)
          .set({ 
            bugBalance: sql`COALESCE(${users.bugBalance}, 0) + ${rewardAmount}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
      }
    });

    return {
      success: true,
      message: `Promo code redeemed! You earned ${rewardAmount} ${rewardType}`,
      reward: rewardAmount,
    };
  }

  // Process referral commission (10% of user's earnings)
  async processReferralCommission(userId: string, originalEarningId: number, earningAmount: string): Promise<void> {
    try {
      // Only process commissions for ad watching earnings
      const [earning] = await db
        .select()
        .from(earnings)
        .where(eq(earnings.id, originalEarningId))
        .limit(1);

      if (!earning || earning.source !== 'ad_watch') {
        // Only ad earnings generate commissions
        return;
      }

      // Find who referred this user (must be completed referral)
      const [referralInfo] = await db
        .select({ referrerId: referrals.referrerId })
        .from(referrals)
        .where(and(
          eq(referrals.refereeId, userId),
          eq(referrals.status, 'completed') // Only completed referrals earn commissions
        ))
        .limit(1);

      if (!referralInfo) {
        // User was not referred by anyone or referral not activated
        return;
      }

      // Calculate 10% commission on ad earnings only
      const commissionAmount = (parseFloat(earningAmount) * 0.10).toFixed(8);
      
      // Record the referral commission
      await db.insert(referralCommissions).values({
        referrerId: referralInfo.referrerId,
        referredUserId: userId,
        originalEarningId,
        commissionAmount,
      });

      // Add commission as earnings to the referrer
      await this.addEarning({
        userId: referralInfo.referrerId,
        amount: commissionAmount,
        source: 'referral_commission',
        description: `10% commission from referred user's ad earnings`,
      });

      // Log commission transaction
      await this.logTransaction({
        userId: referralInfo.referrerId,
        amount: commissionAmount,
        type: 'addition',
        source: 'referral_commission',
        description: `10% commission from referred user's ad earnings`,
        metadata: { 
          originalEarningId, 
          referredUserId: userId,
          commissionRate: '10%'
        }
      });

      console.log(`✅ Referral commission of ${commissionAmount} awarded to ${referralInfo.referrerId} from ${userId}'s ad earnings`);
      
      // NOTE: Commission notifications removed to prevent spam on every ad watch
      // Only first-ad referral notifications are sent via sendReferralRewardNotification in checkAndActivateReferralBonus
    } catch (error) {
      console.error('Error processing referral commission:', error);
      // Don't throw error to avoid disrupting the main earning process
    }
  }

  async getUserReferralEarnings(userId: string): Promise<string> {
    const [result] = await db
      .select({ total: sql<string>`COALESCE(SUM(${earnings.amount}), '0')` })
      .from(earnings)
      .where(and(
        eq(earnings.userId, userId),
        sql`${earnings.source} IN ('referral_commission', 'referral')`
      ));

    return result.total;
  }


  async createPayoutRequest(userId: string, amount: string, paymentSystemId: string, paymentDetails?: string): Promise<{ success: boolean; message: string; withdrawalId?: string }> {
    try {
      // Get user data
      const user = await this.getUser(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Sync payment systems with admin settings before processing
      const minWithdrawSetting = await db.select().from(adminSettings).where(eq(adminSettings.settingKey, 'minimum_withdrawal_sat')).limit(1);
      const feeSetting = await db.select().from(adminSettings).where(eq(adminSettings.settingKey, 'withdrawal_fee_sat')).limit(1);
      
      const minWithdrawValue = parseFloat(minWithdrawSetting[0]?.settingValue || "100");
      const feeValue = parseFloat(feeSetting[0]?.settingValue || "10");
      
      updatePaymentSystemsFromSettings(minWithdrawValue, feeValue);

      // SAT withdrawal only
      const effectivePaymentSystemId = 'sat_withdraw';
      const paymentSystem = PAYMENT_SYSTEMS.find(p => p.id === effectivePaymentSystemId);
      if (!paymentSystem) {
        return { success: false, message: 'Invalid payment system' };
      }
      
      const requestedAmount = parseFloat(amount);
      const fee = paymentSystem.fee;
      const netAmount = requestedAmount - fee;
      
      // Validate minimum withdrawal amount and ensure net amount is positive
      if (requestedAmount < paymentSystem.minWithdrawal) {
        return { success: false, message: `Minimum withdrawal is ${paymentSystem.minWithdrawal} SAT` };
      }
      
      if (netAmount <= 0) {
        return { success: false, message: `Withdrawal amount must be greater than the fee of ${fee} SAT` };
      }

      // Check SAT balance (use main balance field)
      const isAdmin = user.telegram_id === process.env.TELEGRAM_ADMIN_ID;
      
      const userBalance = parseFloat(user.balance || '0');
      
      console.log('Balance check details:', { isAdmin, userBalance, requestedAmount, paymentSystemId: effectivePaymentSystemId });

      if (!isAdmin && userBalance < requestedAmount) {
        return { 
          success: false, 
          message: `Insufficient SAT balance. You have ${Math.floor(userBalance)} SAT, but requested ${Math.floor(requestedAmount)} SAT.` 
        };
      }

      // Create pending withdrawal record (DO NOT deduct balance yet)
      const withdrawalDetails = {
        paymentSystem: paymentSystem.name,
        paymentDetails: paymentDetails,
        paymentSystemId: effectivePaymentSystemId,
        requestedAmount: requestedAmount.toString(),
        fee: fee.toString(),
        netAmount: netAmount.toString(),
        totalDeducted: requestedAmount.toString()
      };

      const [withdrawal] = await db.insert(withdrawals).values({
        userId: userId,
        amount: amount,
        status: 'pending',
        method: paymentSystem.name,
        details: withdrawalDetails
      }).returning();

      return { 
        success: true, 
        message: `Withdrawal request created successfully. You will receive ${Math.floor(netAmount)} SAT.`,
        withdrawalId: withdrawal.id
      };
    } catch (error) {
      console.error('Error creating payout request:', error);
      return { success: false, message: 'Error processing payout request' };
    }
  }

  async getAppStats(): Promise<{
    totalUsers: number;
    activeUsersToday: number;
    totalInvites: number;
    totalEarnings: string;
    totalReferralEarnings: string;
    totalPayouts: string;
    tonWithdrawn: string;
    newUsersLast24h: number;
    totalAdsWatched: number;
    adsWatchedToday: number;
    pendingWithdrawals: number;
    approvedWithdrawals: number;
    rejectedWithdrawals: number;
    pendingDeposits: number;
  }> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Total users
      const [totalUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users);

      // Active users today (users who earned something today)
      const [activeUsersResult] = await db
        .select({ count: sql<number>`count(DISTINCT ${earnings.userId})` })
        .from(earnings)
        .where(gte(earnings.createdAt, today));

      // Total invites
      const [totalInvitesResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(referrals);

      // Total earnings (AXN)
      const [totalEarningsResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(total_earnings AS NUMERIC)), '0')` })
        .from(users);

      // Total referral earnings
      const [totalReferralEarningsResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(commission_amount AS NUMERIC)), '0')` })
        .from(referralCommissions);

      // Total payouts (approved withdrawals sum in TON)
      const [totalPayoutsResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), '0')` })
        .from(withdrawals)
        .where(sql`status IN ('completed', 'success', 'paid', 'Approved', 'approved')`);

      // Total TON withdrawn (same as total payouts since all withdrawals are in TON)
      const tonWithdrawnResult = totalPayoutsResult;

      // New users in last 24h
      const [newUsersResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.createdAt, yesterday));

      // Ads stats
      const [adsRes] = await db.select({ 
        total: sql<number>`COALESCE(SUM(ads_watched), 0)`,
        today: sql<number>`COALESCE(SUM(ads_watched_today), 0)`
      }).from(users);

      // Withdrawal counts
      const [withdrawStatusRes] = await db.select({
        pending: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')`,
        approved: sql<number>`COUNT(*) FILTER (WHERE status IN ('completed', 'success', 'paid', 'Approved', 'approved'))`,
        rejected: sql<number>`COUNT(*) FILTER (WHERE status = 'rejected')`
      }).from(withdrawals);

      // Pending deposits count
      const [pendingDepositsRes] = await db.select({
        count: sql<number>`count(*)`
      }).from(deposits).where(eq(deposits.status, 'pending'));

      // Total SAT mined (sum of all user balances + totalEarnings)
      const [totalMiningSatsRes] = await db.select({
        total: sql<string>`COALESCE(SUM(CAST(total_earnings AS NUMERIC)), '0')`
      }).from(users);

      // SAT mined today (sum of ad_watch earnings today)
      const [miningTodayRes] = await db.select({
        total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), '0')`
      }).from(earnings).where(and(
        gte(earnings.createdAt, today),
        eq(earnings.source, 'ad_watch')
      ));

      // Users with at least 1 referral (completed)
      const [usersWithReferralsRes] = await db.select({
        count: sql<number>`COUNT(DISTINCT referrer_id)`
      }).from(referrals).where(eq(referrals.status, 'completed'));

      // Total SAT withdrawn (approved withdrawals)
      const [totalSatsWithdrawnRes] = await db.select({
        total: sql<string>`COALESCE(SUM(CAST(amount AS NUMERIC)), '0')`
      }).from(withdrawals).where(sql`status IN ('completed', 'success', 'paid', 'Approved', 'approved')`);

      return {
        totalUsers: Number(totalUsersResult.count || 0),
        activeUsersToday: Number(activeUsersResult.count || 0),
        totalInvites: Number(totalInvitesResult.count || 0),
        totalEarnings: totalEarningsResult.total || '0',
        totalReferralEarnings: totalReferralEarningsResult.total || '0',
        totalPayouts: totalPayoutsResult.total || '0',
        tonWithdrawn: tonWithdrawnResult.total || '0',
        newUsersLast24h: Number(newUsersResult.count || 0),
        totalAdsWatched: Number(adsRes.total || 0),
        adsWatchedToday: Number(adsRes.today || 0),
        pendingWithdrawals: Number(withdrawStatusRes.pending || 0),
        approvedWithdrawals: Number(withdrawStatusRes.approved || 0),
        rejectedWithdrawals: Number(withdrawStatusRes.rejected || 0),
        pendingDeposits: Number(pendingDepositsRes.count || 0),
        totalMiningSats: totalMiningSatsRes.total || '0',
        miningToday: miningTodayRes.total || '0',
        usersWithReferrals: Number(usersWithReferralsRes.count || 0),
        totalSatsWithdrawn: totalSatsWithdrawnRes.total || '0',
      };
    } catch (error) {
      console.error('❌ Error in getAppStats:', error);
      return {
        totalUsers: 0,
        activeUsersToday: 0,
        totalInvites: 0,
        totalEarnings: '0',
        totalReferralEarnings: '0',
        totalPayouts: '0',
        tonWithdrawn: '0',
        newUsersLast24h: 0,
        totalAdsWatched: 0,
        adsWatchedToday: 0,
        pendingWithdrawals: 0,
        approvedWithdrawals: 0,
        rejectedWithdrawals: 0,
        pendingDeposits: 0,
        totalMiningSats: '0',
        miningToday: '0',
        usersWithReferrals: 0,
        totalSatsWithdrawn: '0',
      };
    }
  }

  async getAllUsersWithStats(): Promise<any[]> {
    try {
      // Fetch users with real-time referral count from the referrals table
      const allUsers = await db.select({
        id: users.id,
        telegram_id: users.telegram_id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        balance: users.balance,
        totalEarnings: users.total_earnings,
        tonBalance: users.tonBalance,
        bugBalance: users.bugBalance,
        adsWatched: users.adsWatched,
        adsWatchedToday: users.adsWatchedToday,
        referredBy: users.referredBy,
        personalCode: users.personalCode,
        referralCode: users.referralCode,
        banned: users.banned,
        bannedReason: users.bannedReason,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        totalWithdrawn: users.totalClaimedReferralBonus,
        totalEarned: users.total_earned,
        friendsInvited: users.friendsInvited,
        miningRate: users.miningRate,
        referralMiningBoost: users.referralMiningBoost,
        referralCount: sql<number>`(SELECT count(*) FROM ${referrals} WHERE ${referrals.referrerId} = ${users.id})`
      }).from(users).orderBy(desc(users.createdAt));
      
      return allUsers.map(user => ({
        ...user,
        balance: user.balance?.toString() || '0',
        totalEarnings: user.totalEarnings?.toString() || '0',
        tonBalance: user.tonBalance?.toString() || '0',
        bugBalance: user.bugBalance?.toString() || '0',
        totalWithdrawn: user.totalWithdrawn?.toString() || '0',
        totalEarned: user.totalEarned?.toString() || '0',
        miningRate: user.miningRate?.toString() || '0',
        referralMiningBoost: user.referralMiningBoost?.toString() || '0',
        friendsInvited: user.friendsInvited ?? 0,
      }));
    } catch (error) {
      console.error('❌ Error in getAllUsersWithStats:', error);
      return [];
    }
  }

  async getBanLogs(): Promise<BanLog[]> {
    return db.select().from(banLogs).orderBy(desc(banLogs.createdAt));
  }

  // Withdrawal operations (missing implementations)
  async createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> {
    const [result] = await db.insert(withdrawals).values(withdrawal).returning();
    return result;
  }

  async getUserWithdrawals(userId: string): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).where(eq(withdrawals.userId, userId)).orderBy(desc(withdrawals.createdAt));
  }

  async getAllPendingWithdrawals(): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).where(eq(withdrawals.status, 'pending')).orderBy(desc(withdrawals.createdAt));
  }

  async getAllWithdrawals(): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).orderBy(desc(withdrawals.createdAt));
  }

  async updateWithdrawalStatus(withdrawalId: string, status: string, transactionHash?: string, adminNotes?: string): Promise<Withdrawal> {
    const updateData: any = { status, updatedAt: new Date() };
    if (transactionHash) updateData.transactionHash = transactionHash;
    if (adminNotes) updateData.adminNotes = adminNotes;
    
    const [result] = await db.update(withdrawals).set(updateData).where(eq(withdrawals.id, withdrawalId)).returning();
    
    // If withdrawal is approved, deduct balance now
    if (status === 'approved' || status === 'completed' || status === 'success' || status === 'Approved') {
      console.log(`💰 Deducting balance for approved withdrawal ${withdrawalId} from user ${result.userId}`);
      
      const user = await this.getUser(result.userId);
      if (user) {
        const withdrawalAmount = parseFloat(result.amount);
        const currentTonBalance = parseFloat(user.tonBalance || "0");
        const currentWithdrawBalance = parseFloat(user.withdrawBalance || "0");
        
        // Update user balances in users table
        await db.update(users)
          .set({
            tonBalance: (currentTonBalance - withdrawalAmount).toFixed(10),
            withdrawBalance: (currentWithdrawBalance - withdrawalAmount).toFixed(10),
            updatedAt: new Date(),
          })
          .where(eq(users.id, result.userId));

        // Update user_balances table
        await db.update(userBalances)
          .set({
            balance: sql`COALESCE(${userBalances.balance}, 0) - ${result.amount}`,
            updatedAt: new Date(),
          })
          .where(eq(userBalances.userId, result.userId));
          
        // Log transaction for the deduction
        await this.logTransaction({
          userId: result.userId,
          amount: result.amount,
          type: 'deduction',
          source: 'withdrawal',
          description: `Withdrawal ${status}`,
          metadata: { withdrawalId: result.id }
        });
      }
    }
    
    return result;
  }

  async approveWithdrawal(withdrawalId: string, adminNotes?: string, transactionHash?: string): Promise<{ success: boolean; message: string; withdrawal?: Withdrawal }> {
    try {
      // Get withdrawal details
      const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId));
      if (!withdrawal) {
        return { success: false, message: 'Withdrawal not found' };
      }
      
      if (withdrawal.status !== 'pending') {
        return { success: false, message: 'Withdrawal is not pending' };
      }

      // Get user for logging and balance management
      const user = await this.getUser(withdrawal.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const withdrawalAmount = parseFloat(withdrawal.amount);
      
      // Get the total amount that should be deducted (includes fee) from withdrawal details
      // The withdrawal.amount is the NET amount after fee, but we need to deduct the TOTAL (with fee)
      const withdrawalDetails = withdrawal.details as any;
      const totalToDeduct = withdrawalDetails?.totalDeducted 
        ? parseFloat(withdrawalDetails.totalDeducted) 
        : withdrawalAmount;
      
      // ALL withdrawals use SAT balance
      const currency = 'SAT';
      const userBalance = parseFloat(user.balance || '0');
      
      if (userBalance >= totalToDeduct) {
        // Deduct SAT balance on approval
        console.log(`💰 Deducting SAT balance now for approved withdrawal`);
        console.log(`💰 Net amount: ${withdrawalAmount} SAT, Total to deduct (with fee): ${totalToDeduct} SAT`);
        console.log(`💰 Previous SAT balance: ${userBalance}, New balance: ${(userBalance - totalToDeduct).toFixed(2)}`);

        const newBalance = (userBalance - totalToDeduct).toFixed(2);
        
        await db
          .update(users)
          .set({
            balance: newBalance,
            updatedAt: new Date()
          })
          .where(eq(users.id, withdrawal.userId));
        console.log(`✅ SAT balance deducted: ${userBalance} → ${newBalance}`);
      } else {
        // Legacy withdrawal — balance already deducted at request time, just approve
        console.log(`⚠️ Legacy withdrawal detected - balance was already deducted at request time`);
        console.log(`💰 Current SAT balance: ${userBalance}, Required: ${totalToDeduct}`);
        console.log(`✅ Approving without additional balance deduction (legacy flow)`);
      }

      // Record withdrawal in earnings history for proper stats tracking
      const paymentSystemName = withdrawal.method;
      const description = `Withdrawal approved: ${withdrawal.amount} ${currency} via ${paymentSystemName}`;
      
      await db.insert(earnings).values({
        userId: withdrawal.userId,
        amount: `-${withdrawalAmount.toString()}`,
        source: 'withdrawal',
        description: description,
      });

      // Also log the transaction for audit trail
      await this.logTransaction({
        userId: withdrawal.userId,
        amount: `-${withdrawalAmount.toString()}`,
        type: 'debit',
        source: 'withdrawal',
        description: description,
        metadata: { withdrawalId, currency, method: paymentSystemName }
      });

      // Update withdrawal status to Approved and mark as deducted
      const updateData: any = { 
        status: 'Approved', 
        deducted: true,
        updatedAt: new Date() 
      };
      if (transactionHash) updateData.transactionHash = transactionHash;
      if (adminNotes) updateData.adminNotes = adminNotes;
      
      const [updatedWithdrawal] = await db.update(withdrawals).set(updateData).where(eq(withdrawals.id, withdrawalId)).returning();
      
      console.log(`✅ Withdrawal #${withdrawalId} approved with balance deduction — ${currency} balance updated ✅`);
      
      // Send group notification for approval
      try {
        // sendWithdrawalApprovedNotification now handles both user notification (Type 1) 
        // and group notification. Admin notification is disabled.
        const { sendWithdrawalApprovedNotification } = require('./telegram');
        await sendWithdrawalApprovedNotification(updatedWithdrawal);
      } catch (notifyError) {
        console.error('⚠️ Failed to send withdrawal approval notification:', notifyError);
      }
      
      return { success: true, message: 'Withdrawal approved and processed', withdrawal: updatedWithdrawal };
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      return { success: false, message: 'Error processing withdrawal approval' };
    }
  }

  async rejectWithdrawal(withdrawalId: string, adminNotes?: string): Promise<{ success: boolean; message: string; withdrawal?: Withdrawal }> {
    try {
      // Get withdrawal details
      const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId));
      if (!withdrawal) {
        return { success: false, message: 'Withdrawal not found' };
      }
      
      if (withdrawal.status !== 'pending') {
        return { success: false, message: 'Withdrawal is not pending' };
      }

      // Get user and withdrawal details for potential refund
      const user = await this.getUser(withdrawal.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      const withdrawalAmount = parseFloat(withdrawal.amount);
      const withdrawalDetails = withdrawal.details as any;
      const totalToRefund = withdrawalDetails?.totalDeducted 
        ? parseFloat(withdrawalDetails.totalDeducted) 
        : withdrawalAmount;
      const bugToRefund = withdrawalDetails?.bugDeducted ? parseFloat(withdrawalDetails.bugDeducted) : 0;
      const currentSatBalance = parseFloat(user.balance || '0');
      
      // For legacy withdrawals (pre-SAT), refund the SAT balance
      if (currentSatBalance < totalToRefund) {
        console.log(`⚠️ Legacy withdrawal detected - refunding SAT balance that was deducted at request time`);
        const newSatBalance = (currentSatBalance + totalToRefund).toFixed(2);
        
        await db
          .update(users)
          .set({
            balance: newSatBalance,
            updatedAt: new Date()
          })
          .where(eq(users.id, withdrawal.userId));
        console.log(`💰 SAT balance refunded: ${currentSatBalance} → ${newSatBalance}`);
      } else {
        // NEW withdrawal - balance was never deducted, nothing to refund
        console.log(`❌ Withdrawal #${withdrawalId} rejected - no refund needed (balance was never deducted)`);
        console.log(`💡 User balance remains unchanged`);
      }

      // Update withdrawal status to rejected
      const updateData: any = { 
        status: 'rejected', 
        refunded: false,
        deducted: false,
        updatedAt: new Date() 
      };
      if (adminNotes) updateData.adminNotes = adminNotes;
      
      const [updatedWithdrawal] = await db.update(withdrawals).set(updateData).where(eq(withdrawals.id, withdrawalId)).returning();
      
      console.log(`✅ Withdrawal #${withdrawalId} rejected - balance remains untouched`);
      
      return { success: true, message: 'Withdrawal rejected', withdrawal: updatedWithdrawal };
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      return { success: false, message: 'Error processing withdrawal rejection' };
    }
  }

  async getWithdrawal(withdrawalId: string): Promise<Withdrawal | undefined> {
    const [withdrawal] = await db.select().from(withdrawals).where(eq(withdrawals.id, withdrawalId));
    return withdrawal;
  }


  // Ensure all required system tasks exist for production deployment
  async ensureSystemTasksExist(): Promise<void> {
    try {
      // Get first available user to be the owner, or create a system user
      let firstUser = await db.select({ id: users.id }).from(users).limit(1).then(users => users[0]);
      
      if (!firstUser) {
        console.log('⚠️ No users found, creating system user for task ownership');
        // Create a system user for task ownership
        const systemUser = await db.insert(users).values({
          id: 'system-user',
          username: 'System',
          firstName: 'System',
          lastName: 'Tasks',
          referralCode: 'SYSTEM',
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning({ id: users.id });
        firstUser = systemUser[0];
        console.log('✅ System user created for task ownership');
      }

      // Define all system tasks with exact specifications
      const systemTasks = [
        // Fixed daily tasks
        {
          id: 'channel-visit-check-update',
          type: 'channel_visit',
          url: 'https://t.me/PaidAdsNews',
          rewardPerUser: '0.00015000', // 0.00015  formatted to 8 digits for precision
          title: 'Channel visit (Check Update)',
          description: 'Visit our Telegram channel for updates and news'
        },
        {
          id: 'app-link-share',
          type: 'share_link',
          url: 'share://referral',
          rewardPerUser: '0.00020000', // 0.00020  formatted to 8 digits for precision
          title: 'App link share (Share link)',
          description: 'Share your affiliate link with friends'
        },
        {
          id: 'invite-friend-valid',
          type: 'invite_friend',
          url: 'invite://friend',
          rewardPerUser: '0.00050000', // 0.00050  formatted to 8 digits for precision
          title: 'Invite friend (valid)',
          description: 'Invite 1 valid friend to earn rewards'
        },
        // Daily ads goal tasks
        {
          id: 'ads-goal-mini',
          type: 'ads_goal_mini',
          url: 'watch://ads/mini',
          rewardPerUser: '0.00045000', // 0.00045  formatted to 8 digits for precision
          title: 'Mini (Watch 15 ads)',
          description: 'Watch 15 ads to complete this daily goal'
        },
        {
          id: 'ads-goal-light',
          type: 'ads_goal_light',
          url: 'watch://ads/light',
          rewardPerUser: '0.00060000', // 0.00060  formatted to 8 digits for precision
          title: 'Light (Watch 25 ads)',
          description: 'Watch 25 ads to complete this daily goal'
        },
        {
          id: 'ads-goal-medium',
          type: 'ads_goal_medium',
          url: 'watch://ads/medium',
          rewardPerUser: '0.00070000', // 0.00070  formatted to 8 digits for precision
          title: 'Medium (Watch 45 ads)',
          description: 'Watch 45 ads to complete this daily goal'
        },
        {
          id: 'ads-goal-hard',
          type: 'ads_goal_hard',
          url: 'watch://ads/hard',
          rewardPerUser: '0.00080000', // 0.00080  formatted to 8 digits for precision
          title: 'Hard (Watch 75 ads)',
          description: 'Watch 75 ads to complete this daily goal'
        }
      ];

      // Create or update each system task
      for (const task of systemTasks) {
        const existingTask = await this.getPromotion(task.id);
        
        if (existingTask) {
          // Update existing task to match current specifications
          await db.update(promotions)
            .set({
              type: task.type,
              url: task.url,
              rewardPerUser: task.rewardPerUser,
              title: task.title,
              description: task.description,
              status: 'active',
              isApproved: true // System tasks are pre-approved
            })
            .where(eq(promotions.id, task.id));
          
          console.log(`✅ System task updated: ${task.title}`);
        } else {
          // Create new system task
          await db.insert(promotions).values({
            id: task.id,
            ownerId: firstUser.id,
            type: task.type,
            url: task.url,
            cost: '0',
            rewardPerUser: task.rewardPerUser,
            limit: 100000, // High limit for system tasks
            claimedCount: 0,
            status: 'active',
            isApproved: true, // System tasks are pre-approved
            title: task.title,
            description: task.description,
            createdAt: new Date()
          });
          
          console.log(`✅ System task created: ${task.title}`);
        }
      }

      console.log('✅ All system tasks ensured successfully');
    } catch (error) {
      console.error('❌ Error ensuring system tasks exist:', error);
      // Don't throw - server should still start even if task creation fails
    }
  }


  // Ensure admin user with unlimited balance exists for production deployment
  async ensureAdminUserExists(): Promise<void> {
    try {
      const adminTelegramId = '6653616672';
      const maxBalance = '999999999'; // Unlimited AXN for admin testing
      
      // Check if admin user already exists
      const existingAdmin = await this.getUserByTelegramId(adminTelegramId);
      if (existingAdmin) {
        // Always keep admin balance at max for testing
        await db.update(users)
          .set({ 
            balance: maxBalance,
            updatedAt: new Date()
          })
          .where(eq(users.telegram_id, adminTelegramId));
        
        // Also update user_balances table
        await db.insert(userBalances).values({
          userId: existingAdmin.id,
          balance: maxBalance,
          createdAt: new Date(),
          updatedAt: new Date()
        }).onConflictDoUpdate({
          target: [userBalances.userId],
          set: {
            balance: maxBalance,
            updatedAt: new Date()
          }
        });
        
        console.log('✅ Admin balance set to ∞ AXN (999999999):', adminTelegramId);
        return;
      }

      // Create admin user with unlimited balance
      const adminUser = await db.insert(users).values({
        telegram_id: adminTelegramId,
        username: 'admin',
        balance: maxBalance,
        referralCode: 'ADMIN001',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any).returning();

      if (adminUser[0]) {
        // Also create user balance record
        await db.insert(userBalances).values({
          userId: adminUser[0].id,
          balance: maxBalance,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log('✅ Admin user created with unlimited balance:', adminTelegramId);
      }
    } catch (error) {
      console.error('❌ Error ensuring admin user exists:', error);
      // Don't throw - server should still start even if admin creation fails
    }
  }

  // Promotion system removed - using Ads Watch Tasks system only

  async getAvailablePromotionsForUser(userId: string): Promise<any> {
    // Get all active and approved promotions - ALWAYS show them
    const allPromotions = await db.select().from(promotions)
      .where(and(eq(promotions.status, 'active'), eq(promotions.isApproved, true)))
      .orderBy(desc(promotions.createdAt));

    const currentDate = this.getCurrentTaskDate();
    const availablePromotions = [];

    for (const promotion of allPromotions) {
      // Check if this is a daily task type
      const isDailyTask = [
        'channel_visit', 'share_link', 'invite_friend',
        'ads_goal_mini', 'ads_goal_light', 'ads_goal_medium', 'ads_goal_hard'
      ].includes(promotion.type);

      const periodDate = isDailyTask ? currentDate : undefined;
      
      // Get current task status from the new system
      const taskStatus = await this.getTaskStatus(userId, promotion.id, periodDate);
      
      let completionStatus = 'locked';
      let statusMessage = 'Click to start';
      let progress = null;
      let buttonText = 'Start';

      if (taskStatus) {
        if (taskStatus.status === 'claimed') {
          completionStatus = 'claimed';
          statusMessage = '✅ Done';
          buttonText = '✅ Done';
        } else if (taskStatus.status === 'claimable') {
          completionStatus = 'claimable';
          statusMessage = 'Ready to claim!';
          buttonText = 'Claim';
        } else {
          // Status is 'locked' - check if we can make it claimable
          const verificationResult = await this.verifyTask(userId, promotion.id, promotion.type);
          if (verificationResult.status === 'claimable') {
            completionStatus = 'claimable';
            statusMessage = 'Ready to claim!';
            buttonText = 'Claim';
          } else {
            completionStatus = 'locked';
            if (promotion.type.startsWith('ads_goal_')) {
              const user = await this.getUser(userId);
              const adsWatchedToday = user?.adsWatchedToday || 0;
              const adsGoalThresholds = {
                'ads_goal_mini': 15,
                'ads_goal_light': 25,
                'ads_goal_medium': 45,
                'ads_goal_hard': 75
              };
              const requiredAds = adsGoalThresholds[promotion.type as keyof typeof adsGoalThresholds] || 0;
              statusMessage = `Watch ${Math.max(0, requiredAds - adsWatchedToday)} more ads (${adsWatchedToday}/${requiredAds})`;
              progress = {
                current: adsWatchedToday,
                required: requiredAds,
                percentage: Math.min(100, (adsWatchedToday / requiredAds) * 100)
              };
              buttonText = 'Watch Ads';
            } else if (promotion.type === 'invite_friend') {
              statusMessage = 'Invite a friend first';
              buttonText = 'Copy Link';
            } else if (promotion.type === 'share_link') {
              statusMessage = 'Share your affiliate link first';
              buttonText = 'Share Link';
            } else if (promotion.type === 'channel_visit') {
              statusMessage = 'Visit the channel';
              buttonText = 'Visit Channel';
            }
          }
        }
      } else {
        // No task status yet - create initial status
        await this.setTaskStatus(userId, promotion.id, 'locked', periodDate);
        
        // Set default messages based on task type
        if (promotion.type === 'channel_visit') {
          statusMessage = 'Visit the channel';
          buttonText = 'Visit Channel';
        } else if (promotion.type === 'share_link') {
          statusMessage = 'Share your affiliate link';
          buttonText = 'Share Link';
        } else if (promotion.type === 'invite_friend') {
          statusMessage = 'Invite a friend';
          buttonText = 'Copy Link';
        } else if (promotion.type.startsWith('ads_goal_')) {
          const adsGoalThresholds = {
            'ads_goal_mini': 15,
            'ads_goal_light': 25,
            'ads_goal_medium': 45,
            'ads_goal_hard': 75
          };
          const requiredAds = adsGoalThresholds[promotion.type as keyof typeof adsGoalThresholds] || 0;
          const user = await this.getUser(userId);
          const adsWatchedToday = user?.adsWatchedToday || 0;
          statusMessage = `Watch ${Math.max(0, requiredAds - adsWatchedToday)} more ads (${adsWatchedToday}/${requiredAds})`;
          progress = {
            current: adsWatchedToday,
            required: requiredAds,
            percentage: Math.min(100, (adsWatchedToday / requiredAds) * 100)
          };
          buttonText = 'Watch Ads';
        }
      }

      // ALWAYS add the task - never filter out
      availablePromotions.push({
        ...promotion,
        completionStatus,
        statusMessage,
        buttonText,
        progress
      });
    }

    return {
      success: true,
      tasks: availablePromotions.map(p => ({
        id: p.id,
        title: p.title || 'Untitled Task',
        description: p.description || '',
        type: p.type,
        channelUsername: p.url?.match(/t\.me\/([^/?]+)/)?.[1],
        botUsername: p.url?.match(/t\.me\/([^/?]+)/)?.[1],
        reward: p.rewardPerUser || '0',
        completedCount: p.claimedCount || 0,
        totalSlots: p.limit || 1000,
        isActive: p.status === 'active',
        createdAt: p.createdAt,
        claimUrl: p.url,
        // New task status system properties
        completionStatus: (p as any).completionStatus,
        statusMessage: (p as any).statusMessage,
        buttonText: (p as any).buttonText,
        progress: (p as any).progress
      })),
      total: availablePromotions.length
    };
  }


  // Task completion system removed - using Ads Watch Tasks system only


  // Get current date in YYYY-MM-DD format for 12:00 PM UTC reset
  private getCurrentTaskDate(): string {
    const now = new Date();
    const resetHour = 12; // 12:00 PM UTC
    
    // If current time is before 12:00 PM UTC, use yesterday's date
    if (now.getUTCHours() < resetHour) {
      now.setUTCDate(now.getUTCDate() - 1);
    }
    
    return now.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  }


  async completeDailyTask(promotionId: string, userId: string, rewardAmount: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if promotion exists
      const promotion = await this.getPromotion(promotionId);
      if (!promotion) {
        return { success: false, message: 'Daily task not found' };
      }

      // Check if user already completed this daily task today
      const hasCompleted = await this.hasUserCompletedDailyTask(promotionId, userId);
      if (hasCompleted) {
        return { success: false, message: 'You have already completed this daily task today' };
      }

      const currentDate = this.getCurrentTaskDate();

      // Record daily task completion
      await db.insert(dailyTaskCompletions).values({
        promotionId,
        userId,
        taskType: promotion.type, // Use promotion type as task type
        rewardAmount,
        progress: 1,
        required: 1,
        completed: true,
        claimed: true,
        completionDate: currentDate,
      });

      console.log(`📊 DAILY_TASK_COMPLETION_LOG: UserID=${userId}, TaskID=${promotionId}, AmountRewarded=${rewardAmount}, Date=${currentDate}, Status=SUCCESS, Title="${promotion.title}"`);

      // Add reward to user's earnings balance
      await this.addBalance(userId, rewardAmount);

      // Add earning record
      await this.addEarning({
        userId,
        amount: rewardAmount,
        source: 'daily_task_completion',
        description: `Daily task completed: ${promotion.title}`,
      });

      // Send task completion notification to user via Telegram
      try {
        const { sendTaskCompletionNotification } = await import('./telegram');
        await sendTaskCompletionNotification(userId, rewardAmount);
      } catch (error) {
        console.error('Failed to send task completion notification:', error);
        // Don't fail the task completion if notification fails
      }

      return { success: true, message: 'Daily task completed successfully' };
    } catch (error) {
      console.error('Error completing daily task:', error);
      return { success: false, message: 'Error completing daily task' };
    }
  }

  async checkAdsGoalCompletion(userId: string, adsGoalType: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    const currentDate = this.getCurrentTaskDate();
    const adsWatchedToday = user.adsWatchedToday || 0;

    // Define ads goal thresholds
    const adsGoalThresholds = {
      'ads_goal_mini': 15,
      'ads_goal_light': 25, 
      'ads_goal_medium': 45,
      'ads_goal_hard': 75
    };

    const requiredAds = adsGoalThresholds[adsGoalType as keyof typeof adsGoalThresholds];
    if (!requiredAds) return false;

    // Check if user has watched enough ads today
    return adsWatchedToday >= requiredAds;
  }

  // Helper method to check if user has valid referral today (only 1 allowed per day)
  async hasValidReferralToday(userId: string): Promise<boolean> {
    try {
      // Check if there's an actual new referral created today in the referrals table
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const todayReferrals = await db
        .select({ count: sql`count(*)` })
        .from(referrals)
        .where(
          and(
            eq(referrals.referrerId, userId),
            gte(referrals.createdAt, startOfDay),
            lt(referrals.createdAt, endOfDay)
          )
        );

      const count = Number(todayReferrals[0]?.count || 0);
      console.log(`🔍 Referral validation for user ${userId}: ${count} new referrals today`);
      
      return count >= 1;
    } catch (error) {
      console.error('Error checking valid referral today:', error);
      return false;
    }
  }

  // Helper method to check if user has shared their link today
  async hasSharedLinkToday(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;
      
      // Use the new appShared field for faster lookup
      return user.appShared || false;
    } catch (error) {
      console.error('Error checking link share today:', error);
      return false;
    }
  }

  // Helper method to check if user has visited channel today
  async hasVisitedChannelToday(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;
      
      // Use the new channelVisited field for faster lookup
      return user.channelVisited || false;
    } catch (error) {
      console.error('Error checking channel visit today:', error);
      return false;
    }
  }

  // Method to record that user shared their link (called from frontend)
  async recordLinkShare(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user already shared today
      const hasShared = await this.hasSharedLinkToday(userId);
      if (hasShared) {
        return { success: true, message: 'Link share already recorded today' };
      }

      // Update the appShared field
      await db.update(users)
        .set({ appShared: true })
        .where(eq(users.id, userId));

      return { success: true, message: 'Link share recorded successfully' };
    } catch (error) {
      console.error('Error recording link share:', error);
      return { success: false, message: 'Failed to record link share' };
    }
  }

  // ============== NEW TASK STATUS SYSTEM FUNCTIONS ==============
  
  // Get or create task status for user
  async getTaskStatus(userId: string, promotionId: string, periodDate?: string): Promise<TaskStatus | null> {
    try {
      const [taskStatus] = await db.select().from(taskStatuses)
        .where(and(
          eq(taskStatuses.userId, userId),
          eq(taskStatuses.promotionId, promotionId),
          periodDate ? eq(taskStatuses.periodDate, periodDate) : sql`${taskStatuses.periodDate} IS NULL`
        ));
      return taskStatus || null;
    } catch (error) {
      console.error('Error getting task status:', error);
      return null;
    }
  }

  // Update or create task status
  async setTaskStatus(
    userId: string, 
    promotionId: string, 
    status: 'locked' | 'claimable' | 'claimed',
    periodDate?: string,
    progressCurrent?: number,
    progressRequired?: number,
    metadata?: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const existingStatus = await this.getTaskStatus(userId, promotionId, periodDate);
      
      if (existingStatus) {
        // Update existing status
        await db.update(taskStatuses)
          .set({
            status,
            progressCurrent,
            progressRequired,
            metadata,
            updatedAt: sql`now()`
          })
          .where(eq(taskStatuses.id, existingStatus.id));
      } else {
        // Create new status
        await db.insert(taskStatuses).values({
          userId,
          promotionId,
          periodDate,
          status,
          progressCurrent: progressCurrent || 0,
          progressRequired: progressRequired || 0,
          metadata
        });
      }
      
      return { success: true, message: 'Task status updated successfully' };
    } catch (error) {
      console.error('Error setting task status:', error);
      return { success: false, message: 'Failed to update task status' };
    }
  }

  // Verify task and update status to claimable
  async verifyTask(userId: string, promotionId: string, taskType: string): Promise<{ success: boolean; message: string; status?: 'claimable' | 'locked' | 'claimed' }> {
    try {
      const promotion = await this.getPromotion(promotionId);
      if (!promotion) {
        return { success: false, message: 'Task not found' };
      }

      const isDailyTask = ['channel_visit', 'share_link', 'invite_friend', 'ads_goal_mini', 'ads_goal_light', 'ads_goal_medium', 'ads_goal_hard'].includes(taskType);
      const periodDate = isDailyTask ? this.getCurrentTaskDate() : undefined;

      // Check current status
      const currentStatus = await this.getTaskStatus(userId, promotionId, periodDate);
      if (currentStatus?.status === 'claimed') {
        return { success: false, message: 'Task already claimed', status: 'claimed' };
      }

      let verified = false;
      let progressCurrent = 0;
      let progressRequired = 0;

      // Perform verification based on task type
      switch (taskType) {
        case 'channel_visit':
          // Channel visit is immediately claimable after user clicks
          verified = true;
          break;
          
        case 'share_link':
          // Check if user has shared their link
          verified = await this.hasSharedLinkToday(userId);
          break;
          
        case 'invite_friend':
          // Check if user has valid referral today
          verified = await this.hasValidReferralToday(userId);
          break;
          
        case 'ads_goal_mini':
        case 'ads_goal_light':
        case 'ads_goal_medium':
        case 'ads_goal_hard':
          // Check if user met ads goal
          const user = await this.getUser(userId);
          const adsWatchedToday = user?.adsWatchedToday || 0;
          
          const adsGoalThresholds = {
            'ads_goal_mini': 15,
            'ads_goal_light': 25,
            'ads_goal_medium': 45,
            'ads_goal_hard': 75
          };
          
          progressRequired = adsGoalThresholds[taskType as keyof typeof adsGoalThresholds] || 0;
          progressCurrent = adsWatchedToday;
          verified = adsWatchedToday >= progressRequired;
          break;
          
        default:
          verified = true; // For other task types, assume verified
      }

      const newStatus = verified ? 'claimable' : 'locked';
      await this.setTaskStatus(userId, promotionId, newStatus, periodDate, progressCurrent, progressRequired);

      return { 
        success: true, 
        message: verified ? 'Task verified, ready to claim!' : 'Task requirements not met yet',
        status: newStatus
      };
    } catch (error) {
      console.error('Error verifying task:', error);
      return { success: false, message: 'Failed to verify task' };
    }
  }

  // Claim task reward
  async claimTaskReward(userId: string, promotionId: string): Promise<{ success: boolean; message: string; rewardAmount?: string; newBalance?: string }> {
    try {
      const promotion = await this.getPromotion(promotionId);
      if (!promotion) {
        return { success: false, message: 'Task not found' };
      }

      const isDailyTask = ['channel_visit', 'share_link', 'invite_friend', 'ads_goal_mini', 'ads_goal_light', 'ads_goal_medium', 'ads_goal_hard'].includes(promotion.type);
      const periodDate = isDailyTask ? this.getCurrentTaskDate() : undefined;

      // Check current status
      const currentStatus = await this.getTaskStatus(userId, promotionId, periodDate);
      if (!currentStatus) {
        return { success: false, message: 'Task status not found' };
      }
      
      if (currentStatus.status === 'claimed') {
        return { success: false, message: 'Task already claimed' };
      }
      
      if (currentStatus.status !== 'claimable') {
        return { success: false, message: 'Task not ready to claim' };
      }

      // Prevent users from claiming their own tasks
      if (promotion.ownerId === userId) {
        return { success: false, message: 'You cannot claim your own task' };
      }

      const rewardAmount = promotion.rewardPerUser || '0';
      
      // Record claim in appropriate table
      if (isDailyTask) {
        await db.insert(dailyTaskCompletions).values({
          promotionId,
          userId,
          taskType: promotion.type,
          rewardAmount,
          progress: 1,
          required: 1,
          completed: true,
          claimed: true,
          completionDate: periodDate!,
        });
      } else {
        await db.insert(taskCompletions).values({
          promotionId,
          userId,
          rewardAmount,
          verified: true,
        });
      }

      // Add reward to balance
      await this.addBalance(userId, rewardAmount);

      // Add earning record
      await this.addEarning({
        userId,
        amount: rewardAmount,
        source: isDailyTask ? 'daily_task_completion' : 'task_completion',
        description: `Task completed: ${promotion.title}`,
      });

      // Update task status to claimed
      await this.setTaskStatus(userId, promotionId, 'claimed', periodDate);

      // Get updated balance
      const updatedBalance = await this.getUserBalance(userId);

      console.log(`📊 TASK_CLAIM_LOG: UserID=${userId}, TaskID=${promotionId}, AmountRewarded=${rewardAmount}, Status=SUCCESS, Title="${promotion.title}"`);

      // Send notification
      try {
        const { sendTaskCompletionNotification } = await import('./telegram');
        await sendTaskCompletionNotification(userId, rewardAmount);
      } catch (error) {
        console.error('Failed to send task completion notification:', error);
      }

      return { 
        success: true, 
        message: 'Task claimed successfully!',
        rewardAmount,
        newBalance: updatedBalance?.balance || '0'
      };
    } catch (error) {
      console.error('Error claiming task reward:', error);
      return { success: false, message: 'Failed to claim task reward' };
    }
  }

  // ============== END NEW TASK STATUS SYSTEM FUNCTIONS ==============

  // Method to record that user visited channel (called from frontend)
  async recordChannelVisit(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user already visited today
      const hasVisited = await this.hasVisitedChannelToday(userId);
      if (hasVisited) {
        return { success: true, message: 'Channel visit already recorded today' };
      }

      // Update the channelVisited field
      await db.update(users)
        .set({ channelVisited: true })
        .where(eq(users.id, userId));

      return { success: true, message: 'Channel visit recorded successfully' };
    } catch (error) {
      console.error('Error recording channel visit:', error);
      return { success: false, message: 'Failed to record channel visit' };
    }
  }

  // Method to increment referrals today count when a referral is made
  async incrementReferralsToday(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get current user data
      const user = await this.getUser(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Increment referrals today count
      const newCount = (user.friendsInvited || 0) + 1;
      await db.update(users)
        .set({ friendsInvited: newCount })
        .where(eq(users.id, userId));

      return { success: true, message: `Referrals today count updated to ${newCount}` };
    } catch (error) {
      console.error('Error incrementing referrals today:', error);
      return { success: false, message: 'Failed to increment referrals today' };
    }
  }

  // Daily reset system - runs at 12:00 PM UTC
  async performDailyReset(): Promise<void> {
    try {
      console.log('🔄 Starting daily reset at 12:00 PM UTC...');
      
      const currentDate = new Date();
      const currentDateString = currentDate.toISOString().split('T')[0];
      const periodStart = new Date(currentDate);
      periodStart.setUTCHours(12, 0, 0, 0); // 12:00 PM UTC period start
      
      // 1. Check if reset was already performed for this period (idempotency)
      const usersNeedingReset = await db.select({ id: users.id })
        .from(users)
        .where(sql`${users.lastResetAt} < ${periodStart.toISOString()} OR ${users.lastResetAt} IS NULL`)
        .limit(1000); // Process in batches
      
      if (usersNeedingReset.length === 0) {
        console.log('🔄 Daily reset already completed for this period');
        return;
      }
      
      console.log(`🔄 Resetting ${usersNeedingReset.length} users for period ${currentDateString}`);
      
      // 2. Reset all users' daily counters and tracking fields
      await db.update(users)
        .set({ 
          adsWatchedToday: 0,
          channelVisited: false,
          appShared: false,
          linkShared: false,
          friendInvited: false,
          friendsInvited: 0,
          adSection1Boost: "0",
          adSection2Boost: "0",
          adSection1Count: 0,
          adSection2Count: 0,
          lastResetDate: currentDate,
          lastResetAt: periodStart,
          lastAdDate: currentDate 
        })
        .where(sql`${users.lastResetAt} < ${periodStart.toISOString()} OR ${users.lastResetAt} IS NULL`);
      
      // 3. Create daily task completion records for all task types for this period
      const taskTypes = ['channel_visit', 'share_link', 'invite_friend', 'ads_mini', 'ads_light', 'ads_medium', 'ads_hard'];
      const taskRewards = {
        'channel_visit': '0.000025',
        'share_link': '0.000025', 
        'invite_friend': '0.00005',
        'ads_mini': '0.000035', // 15 ads
        'ads_light': '0.000055', // 25 ads
        'ads_medium': '0.000095', // 45 ads
        'ads_hard': '0.000155' // 75 ads
      };
      const taskRequirements = {
        'channel_visit': 1,
        'share_link': 1,
        'invite_friend': 1,
        'ads_mini': 15,
        'ads_light': 25,
        'ads_medium': 45,
        'ads_hard': 75
      };
      
      for (const user of usersNeedingReset) {
        for (const taskType of taskTypes) {
          try {
            await db.insert(dailyTaskCompletions).values({
              userId: user.id,
              taskType,
              rewardAmount: taskRewards[taskType as keyof typeof taskRewards],
              progress: 0,
              required: taskRequirements[taskType as keyof typeof taskRequirements],
              completed: false,
              claimed: false,
              completionDate: currentDateString,
            }).onConflictDoNothing(); // Ignore if already exists
          } catch (error) {
            console.warn(`⚠️ Failed to create daily task ${taskType} for user ${user.id}:`, error);
          }
        }
      }
      
      // 4. Clean up old daily task completions (older than 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoString = weekAgo.toISOString().split('T')[0];
      
      await db.delete(dailyTaskCompletions)
        .where(sql`${dailyTaskCompletions.completionDate} < ${weekAgoString}`);
      
      console.log('✅ Daily reset completed successfully at 12:00 PM UTC');
      console.log(`   - Reset ${usersNeedingReset.length} users for period ${currentDateString}`);
      console.log('   - Reset ads watched today to 0');
      console.log('   - Reset channel visited, app shared, link shared, friend invited to false');
      console.log('   - Reset friends invited count to 0');
      console.log('   - Created daily task completion records');
      console.log('   - Cleaned up old task completions');
    } catch (error) {
      console.error('❌ Error during daily reset:', error);
    }
  }

  // Check if it's time for daily reset (12:00 PM UTC)
  async checkAndPerformDailyReset(): Promise<void> {
    const now = new Date();
    
    // Check if it's exactly 12:00 PM UTC (within 1 minute window)
    const isResetTime = now.getUTCHours() === 12 && now.getUTCMinutes() === 0;
    
    if (isResetTime) {
      await this.performDailyReset();
    }
  }

  // Simplified methods for the new schema - no complex tracking needed
  async updatePromotionCompletedCount(promotionId: string): Promise<void> {
    // No-op since we removed complex tracking
    return;
  }

  async updatePromotionMessageId(promotionId: string, messageId: string): Promise<void> {
    // Note: message_id field doesn't exist in promotions schema
    // This could be tracked separately if needed in the future
    console.log(`📌 Promotion ${promotionId} posted with message ID: ${messageId}`);
  }

  async deactivateCompletedPromotions(): Promise<void> {
    // No-op since we removed complex tracking  
    return;
  }

  // User balance operations
  async getUserBalance(userId: string): Promise<UserBalance | undefined> {
    try {
      const [balance] = await db.select().from(userBalances).where(eq(userBalances.userId, userId));
      return balance;
    } catch (error) {
      console.error('Error getting user balance:', error);
      return undefined;
    }
  }

  async createOrUpdateUserBalance(userId: string, balance?: string): Promise<UserBalance> {
    try {
      // Use upsert pattern with ON CONFLICT to handle race conditions
      const [result] = await db.insert(userBalances)
        .values({
          userId,
          balance: balance || '0',
        })
        .onConflictDoUpdate({
          target: userBalances.userId,
          set: {
            balance: balance ? balance : sql`${userBalances.balance}`,
            updatedAt: new Date()
          }
        })
        .returning();
      return result;
    } catch (error) {
      console.error('Error creating/updating user balance:', error);
      // Fallback: try to get existing balance if upsert fails
      try {
        const existingBalance = await this.getUserBalance(userId);
        if (existingBalance) {
          return existingBalance;
        }
      } catch (fallbackError) {
        console.error('Fallback getUserBalance also failed:', fallbackError);
      }
      throw error;
    }
  }

  async deductBalance(userId: string, amount: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user is admin - admins have unlimited balance
      const user = await this.getUser(userId);
      const isAdmin = user?.telegram_id === process.env.TELEGRAM_ADMIN_ID;
      
      if (isAdmin) {
        console.log('🔑 Admin has unlimited balance - allowing deduction');
        return { success: true, message: 'Balance deducted successfully (admin unlimited)' };
      }

      let balance = await this.getUserBalance(userId);
      if (!balance) {
        // Create balance record with 0 if user not found
        balance = await this.createOrUpdateUserBalance(userId, '0');
      }

      const currentBalance = parseFloat(balance.balance || '0');
      const deductAmount = parseFloat(amount);

      if (currentBalance < deductAmount) {
        return { success: false, message: 'Insufficient balance' };
      }

      await db.update(userBalances)
        .set({
          balance: sql`${userBalances.balance} - ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(userBalances.userId, userId));

      // Record transaction for balance deduction
      await this.addTransaction({
        userId,
        amount: `-${amount}`,
        type: 'deduction',
        source: 'task_creation',
        description: `Task creation cost deducted - fixed rate`,
        metadata: { 
          deductedAmount: amount,
          fixedCost: '0.01',
          reason: 'task_creation_fee'
        }
      });

      return { success: true, message: 'Balance deducted successfully' };
    } catch (error) {
      console.error('Error deducting balance:', error);
      return { success: false, message: 'Error deducting balance' };
    }
  }

  async addBalance(userId: string, amount: string): Promise<void> {
    try {
      // First ensure the user has a balance record
      let existingBalance = await this.getUserBalance(userId);
      if (!existingBalance) {
        // Create new balance record with the amount if user not found
        await this.createOrUpdateUserBalance(userId, amount);
      } else {
        // Add to existing balance
        await db.update(userBalances)
          .set({
            balance: sql`${userBalances.balance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(userBalances.userId, userId));
      }
    } catch (error) {
      console.error('Error adding balance:', error);
      throw error;
    }
  }

  // Promotion claims methods
  async hasUserClaimedPromotion(promotionId: string, userId: string): Promise<boolean> {
    const [claim] = await db.select().from(promotionClaims)
      .where(and(
        eq(promotionClaims.promotionId, promotionId),
        eq(promotionClaims.userId, userId)
      ));
    return !!claim;
  }


  async incrementPromotionClaimedCount(promotionId: string): Promise<void> {
    await db.update(promotions)
      .set({
        claimedCount: sql`${promotions.claimedCount} + 1`,
      })
      .where(eq(promotions.id, promotionId));
  }

  // ===== NEW SIMPLE TASK SYSTEM =====
  
  // Fixed task configuration for the 9 sequential ads-based tasks
  private readonly TASK_CONFIG = [
    { level: 1, required: 20, reward: "0.00033000" },
    { level: 2, required: 20, reward: "0.00033000" },
    { level: 3, required: 20, reward: "0.00033000" },
    { level: 4, required: 20, reward: "0.00033000" },
    { level: 5, required: 20, reward: "0.00033000" },
    { level: 6, required: 20, reward: "0.00033000" },
    { level: 7, required: 20, reward: "0.00033000" },
    { level: 8, required: 20, reward: "0.00033000" },
    { level: 9, required: 20, reward: "0.00033000" },
  ];

  // Get current reset date in YYYY-MM-DD format (resets at 00:00 UTC)
  private getCurrentResetDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  // Initialize or get daily tasks for a user
  async getUserDailyTasks(userId: string): Promise<DailyTask[]> {
    const resetDate = this.getCurrentResetDate();
    
    // Get existing tasks for today
    const existingTasks = await db
      .select()
      .from(dailyTasks)
      .where(and(
        eq(dailyTasks.userId, userId),
        eq(dailyTasks.resetDate, resetDate)
      ))
      .orderBy(dailyTasks.taskLevel);

    // If no tasks exist for today, create them
    if (existingTasks.length === 0) {
      const tasksToInsert: InsertDailyTask[] = this.TASK_CONFIG.map(config => ({
        userId,
        taskLevel: config.level,
        progress: 0,
        required: config.required,
        completed: false,
        claimed: false,
        rewardAmount: config.reward,
        resetDate,
      }));

      await db.insert(dailyTasks).values(tasksToInsert);
      
      // Fetch the newly created tasks
      return await db
        .select()
        .from(dailyTasks)
        .where(and(
          eq(dailyTasks.userId, userId),
          eq(dailyTasks.resetDate, resetDate)
        ))
        .orderBy(dailyTasks.taskLevel);
    }

    return existingTasks;
  }

  // Update task progress when user watches ads (truly independent task progress)
  async updateTaskProgress(userId: string, adsWatchedToday: number): Promise<void> {
    const resetDate = this.getCurrentResetDate();
    
    // Get all tasks for today ordered by level
    const tasks = await this.getUserDailyTasks(userId);
    
    // Find the currently active task (first task that hasn't been claimed and all previous tasks are claimed)
    let currentTask = null;
    
    for (const task of tasks) {
      if (!task.claimed) {
        // Check if all previous tasks are claimed (sequential unlock)
        let canActivate = true;
        for (const prevTask of tasks) {
          if (prevTask.taskLevel < task.taskLevel && !prevTask.claimed) {
            canActivate = false;
            break;
          }
        }
        
        if (canActivate) {
          currentTask = task;
          break;
        }
      }
    }
    
    // If no current task found, all tasks are claimed or blocked by prerequisites
    if (!currentTask) {
      return;
    }
    
    // Calculate how many ads have been "consumed" by previous claimed tasks
    let adsConsumedByPreviousTasks = 0;
    for (const task of tasks) {
      if (task.taskLevel < currentTask.taskLevel && task.claimed) {
        adsConsumedByPreviousTasks += task.required;
      }
    }
    
    // Calculate independent progress for current task
    // This ensures each task starts at 0 when it becomes active and only counts ads from that point
    const adsAvailableForCurrentTask = Math.max(0, adsWatchedToday - adsConsumedByPreviousTasks);
    const newProgress = Math.min(adsAvailableForCurrentTask, currentTask.required);
    const isCompleted = newProgress >= currentTask.required;
    
    // Only update the currently active task with independent progress
    await db
      .update(dailyTasks)
      .set({
        progress: newProgress,
        completed: isCompleted,
        completedAt: isCompleted && !currentTask.completed ? new Date() : currentTask.completedAt,
        updatedAt: new Date(),
      })
      .where(and(
        eq(dailyTasks.userId, userId),
        eq(dailyTasks.taskLevel, currentTask.taskLevel),
        eq(dailyTasks.resetDate, resetDate)
      ));
    
    // Reset progress of all non-active tasks to ensure they start fresh when they become active
    await db
      .update(dailyTasks)
      .set({
        progress: 0,
        completed: false,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(dailyTasks.userId, userId),
        eq(dailyTasks.resetDate, resetDate),
        sql`${dailyTasks.taskLevel} > ${currentTask.taskLevel}`,
        eq(dailyTasks.claimed, false)
      ));
  }

  // Claim a completed daily task reward
  async claimDailyTaskReward(userId: string, taskLevel: number): Promise<{ success: boolean; message: string; rewardAmount?: string }> {
    const resetDate = this.getCurrentResetDate();
    
    // Get the specific task
    const [task] = await db
      .select()
      .from(dailyTasks)
      .where(and(
        eq(dailyTasks.userId, userId),
        eq(dailyTasks.taskLevel, taskLevel),
        eq(dailyTasks.resetDate, resetDate)
      ));

    if (!task) {
      return { success: false, message: "Task not found" };
    }

    if (!task.completed) {
      return { success: false, message: "Task not completed yet" };
    }

    if (task.claimed) {
      return { success: false, message: "Task already claimed" };
    }

    // Check if this is sequential (can only claim if previous tasks are claimed)
    if (taskLevel > 1) {
      const previousTask = await db
        .select()
        .from(dailyTasks)
        .where(and(
          eq(dailyTasks.userId, userId),
          eq(dailyTasks.taskLevel, taskLevel - 1),
          eq(dailyTasks.resetDate, resetDate)
        ));

      if (previousTask.length === 0 || !previousTask[0].claimed) {
        return { success: false, message: "Complete previous tasks first" };
      }
    }

    // Mark task as claimed
    await db
      .update(dailyTasks)
      .set({
        claimed: true,
        claimedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(dailyTasks.userId, userId),
        eq(dailyTasks.taskLevel, taskLevel),
        eq(dailyTasks.resetDate, resetDate)
      ));

    // Add reward to user balance
    await this.addEarning({
      userId,
      amount: task.rewardAmount,
      source: 'task_completion',
      description: `Task ${taskLevel} completed: Watch ${task.required} ads`,
    });

    // Log transaction
    await this.logTransaction({
      userId,
      amount: task.rewardAmount,
      type: 'addition',
      source: 'task_completion',
      description: `Task ${taskLevel} reward`,
      metadata: { taskLevel, required: task.required, resetDate }
    });

    return {
      success: true,
      message: "Task reward claimed successfully",
      rewardAmount: task.rewardAmount
    };
  }

  // Get next available task (first unclaimed task)
  async getNextAvailableTask(userId: string): Promise<DailyTask | null> {
    const tasks = await this.getUserDailyTasks(userId);
    
    // Find the first unclaimed task
    for (const task of tasks) {
      if (!task.claimed) {
        return task;
      }
    }
    
    return null; // All tasks claimed
  }

  // New daily reset - runs at 00:00 UTC instead of 12:00 PM UTC
  async performDailyResetV2(): Promise<void> {
    try {
      console.log('🔄 Starting daily reset at 00:00 UTC (new task system)...');
      
      const currentDate = new Date();
      const currentDateString = currentDate.toISOString().split('T')[0];
      const resetTime = new Date(currentDate);
      resetTime.setUTCHours(0, 0, 0, 0); // 00:00 UTC reset
      
      // Check if today's reset has already been performed
      const usersNeedingReset = await db.select({ id: users.id })
        .from(users)
        .where(sql`${users.lastResetDate} != ${currentDateString} OR ${users.lastResetDate} IS NULL`)
        .limit(1000);
      
      if (usersNeedingReset.length === 0) {
        console.log('🔄 Daily reset already completed for today');
        return;
      }
      
      console.log(`🔄 Resetting ${usersNeedingReset.length} users for ${currentDateString}`);
      
      // Reset all users' daily counters and ad watch boosts
      await db.update(users)
        .set({ 
          adsWatchedToday: 0,
          adSection1Boost: "0",
          adSection2Boost: "0",
          adSection1Count: 0,
          adSection2Count: 0,
          lastResetDate: currentDate,
          updatedAt: new Date(),
        })
        .where(sql`${users.lastResetDate} != ${currentDateString} OR ${users.lastResetDate} IS NULL`);
      
      console.log('✅ Daily reset completed successfully (new task system)');
      
    } catch (error) {
      console.error('❌ Error in daily reset (new task system):', error);
      throw error;
    }
  }

  // Check and perform daily reset (called every 5 minutes)
  async checkAndPerformDailyResetV2(): Promise<void> {
    try {
      const now = new Date();
      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();
      
      // Run reset at 00:00-00:05 UTC to catch the reset window
      if (currentHour === 0 && currentMinute < 5) {
        await this.performDailyResetV2();
      }
    } catch (error) {
      console.error('❌ Error checking daily reset:', error);
      // Don't throw to avoid disrupting the interval
    }
  }

  // Get all advertiser tasks (for admin panel)
  async getAllTasks(): Promise<any[]> {
    const result = await db
      .select()
      .from(advertiserTasks)
      .orderBy(desc(advertiserTasks.createdAt));
    return result;
  }

  // Get pending tasks (under_review status) for admin approval
  async getPendingTasks(): Promise<any[]> {
    const result = await db
      .select()
      .from(advertiserTasks)
      .where(eq(advertiserTasks.status, 'under_review'))
      .orderBy(desc(advertiserTasks.createdAt));
    return result;
  }

  // Create a new advertiser task
  async createTask(taskData: {
    advertiserId: string;
    taskType: string;
    title: string;
    link: string;
    totalClicksRequired: number;
    costPerClick: string;
    totalCost: string;
    status?: string;
  }): Promise<any> {
    const [task] = await db
      .insert(advertiserTasks)
      .values({
        advertiserId: taskData.advertiserId,
        taskType: taskData.taskType,
        title: taskData.title,
        link: taskData.link,
        totalClicksRequired: taskData.totalClicksRequired,
        costPerClick: taskData.costPerClick,
        totalCost: taskData.totalCost,
        status: taskData.status || 'under_review',
        currentClicks: 0,
      })
      .returning();
    
    console.log(`📝 Task created: ${task.id} by ${taskData.advertiserId}`);
    return task;
  }

  // Get monthly leaderboard
  async getMonthlyLeaderboard(currentUserId?: string): Promise<any> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const leaderboard = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        totalEarned: sql<string>`COALESCE(SUM(${earnings.amount}), 0)`,
      })
      .from(users)
      .leftJoin(earnings, and(
        eq(users.id, earnings.userId),
        gte(earnings.createdAt, monthStart),
        sql`${earnings.source} NOT IN ('withdrawal', 'referral_commission')`
      ))
      .where(eq(users.banned, false))
      .groupBy(users.id)
      .orderBy(desc(sql`COALESCE(SUM(${earnings.amount}), 0)`))
      .limit(100);

    let userRank = null;
    if (currentUserId) {
      const userIndex = leaderboard.findIndex(u => u.id === currentUserId);
      if (userIndex !== -1) {
        userRank = userIndex + 1;
      }
    }

    return {
      leaderboard: leaderboard.map((u, i) => ({
        ...u,
        rank: i + 1,
        displayName: u.username || u.firstName || 'Anonymous'
      })),
      userRank
    };
  }

  // Get valid (completed) referral count for a user
  async getValidReferralCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(referrals)
      .innerJoin(users, eq(referrals.refereeId, users.id))
      .where(and(
        eq(referrals.referrerId, userId),
        eq(referrals.status, 'completed'),
        eq(users.banned, false)
      ));
    
    return result[0]?.count || 0;
  }

  // Get tasks created by a specific user (my tasks)
  async getMyTasks(userId: string): Promise<any[]> {
    const result = await db
      .select()
      .from(advertiserTasks)
      .where(eq(advertiserTasks.advertiserId, userId))
      .orderBy(desc(advertiserTasks.createdAt));
    return result;
  }

  // Get active tasks for a user (excludes tasks they've already completed, their own tasks, and tasks that hit click limit)
  async getActiveTasksForUser(userId: string): Promise<any[]> {
    const result = await db
      .select()
      .from(advertiserTasks)
      .where(and(
        eq(advertiserTasks.status, 'running'),
        sql`${advertiserTasks.advertiserId} != ${userId}`,
        sql`${advertiserTasks.currentClicks} < ${advertiserTasks.totalClicksRequired}`,
        sql`NOT EXISTS (
          SELECT 1 FROM task_clicks 
          WHERE task_clicks.task_id = ${advertiserTasks.id} 
          AND task_clicks.publisher_id = ${userId}
        )`
      ))
      .orderBy(desc(advertiserTasks.createdAt));
    return result;
  }

  // Get a specific task by ID
  async getTaskById(taskId: string): Promise<any | null> {
    const [task] = await db
      .select()
      .from(advertiserTasks)
      .where(eq(advertiserTasks.id, taskId));
    return task || null;
  }

  // Approve a task (change status from under_review to running)
  async approveTask(taskId: string): Promise<any> {
    const [updatedTask] = await db
      .update(advertiserTasks)
      .set({
        status: 'running',
        updatedAt: new Date()
      })
      .where(eq(advertiserTasks.id, taskId))
      .returning();
    
    console.log(`✅ Task ${taskId} approved and set to running`);
    return updatedTask;
  }

  // Reject a task (change status to rejected)
  async rejectTask(taskId: string): Promise<any> {
    const [updatedTask] = await db
      .update(advertiserTasks)
      .set({
        status: 'rejected',
        updatedAt: new Date()
      })
      .where(eq(advertiserTasks.id, taskId))
      .returning();
    
    console.log(`❌ Task ${taskId} rejected`);
    return updatedTask;
  }

  // Pause a task (change status from running to paused)
  async pauseTask(taskId: string): Promise<any> {
    const [updatedTask] = await db
      .update(advertiserTasks)
      .set({
        status: 'paused',
        updatedAt: new Date()
      })
      .where(eq(advertiserTasks.id, taskId))
      .returning();
    
    console.log(`⏸️ Task ${taskId} paused`);
    return updatedTask;
  }

  // Resume a task (change status from paused to running)
  async resumeTask(taskId: string): Promise<any> {
    const [updatedTask] = await db
      .update(advertiserTasks)
      .set({
        status: 'running',
        updatedAt: new Date()
      })
      .where(eq(advertiserTasks.id, taskId))
      .returning();
    
    console.log(`▶️ Task ${taskId} resumed`);
    return updatedTask;
  }

  // Delete a task
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(advertiserTasks)
        .where(eq(advertiserTasks.id, taskId))
        .returning({ id: advertiserTasks.id });
      
      if (result.length === 0) {
        console.log(`⚠️ Task ${taskId} not found for deletion`);
        return false;
      }
      
      console.log(`🗑️ Task ${taskId} deleted`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting task ${taskId}:`, error);
      return false;
    }
  }

  // Record a task click (when publisher clicks on a task)
  async recordTaskClick(taskId: string, publisherId: string): Promise<{
    success: boolean;
    message: string;
    reward?: number;
    task?: any;
  }> {
    try {
      // Get the task
      const task = await this.getTaskById(taskId);
      
      if (!task) {
        return { success: false, message: "Task not found" };
      }

      // Check if task is active and running
      if (task.status !== 'running') {
        return { success: false, message: "Task is not active" };
      }

      // Check if user is clicking their own task
      if (task.advertiserId === publisherId) {
        return { success: false, message: "You cannot click your own task" };
      }

      // Check if user already clicked this task
      const existingClick = await db
        .select()
        .from(taskClicks)
        .where(and(
          eq(taskClicks.taskId, taskId),
          eq(taskClicks.publisherId, publisherId)
        ))
        .limit(1);

      if (existingClick.length > 0) {
        return { success: false, message: "You have already completed this task" };
      }

      // Check if task has reached its click limit
      if (task.currentClicks >= task.totalClicksRequired) {
        return { success: false, message: "Task has reached its click limit" };
      }

      // Get reward amount from admin settings based on task type
      const rewardSettingKey = task.taskType === 'bot' ? 'bot_task_reward' : 
                               task.taskType === 'partner' ? 'partner_task_reward' : 
                               'channel_task_reward';
      const rewardSetting = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, rewardSettingKey))
        .limit(1);
      
      // Get partner task reward from settings if partner task, otherwise use regular rewards
      const partnerRewardSetting = await db
        .select()
        .from(adminSettings)
        .where(eq(adminSettings.settingKey, 'partner_task_reward'))
        .limit(1);
      const partnerReward = parseInt(partnerRewardSetting[0]?.settingValue || '5');
      
      const rewardAXN = task.taskType === 'partner' ? partnerReward : 
                        parseInt(rewardSetting[0]?.settingValue || (task.taskType === 'bot' ? '20' : '30'));

      // Insert click record
      await db.insert(taskClicks).values({
        taskId: taskId,
        publisherId: publisherId,
        rewardAmount: rewardAXN.toString(),
      });

      // Increment current clicks on the task
      const newClickCount = task.currentClicks + 1;
      const isCompleted = newClickCount >= task.totalClicksRequired;

      await db
        .update(advertiserTasks)
        .set({
          currentClicks: newClickCount,
          status: isCompleted ? 'completed' : 'running',
          completedAt: isCompleted ? new Date() : undefined,
          updatedAt: new Date()
        })
        .where(eq(advertiserTasks.id, taskId));

      // Add reward to user's balance
      const [publisher] = await db
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, publisherId));

      const currentBalance = parseInt(publisher?.balance || '0');
      const newBalance = currentBalance + rewardAXN;

      await db
        .update(users)
        .set({
          balance: newBalance.toString(),
          updatedAt: new Date()
        })
        .where(eq(users.id, publisherId));

      // Record the earning
      await db.insert(earnings).values({
        userId: publisherId,
        amount: rewardAXN.toString(),
        source: 'task_completion',
        description: `Completed ${task.taskType} task: ${task.title}`,
      });

      console.log(`✅ Task click recorded: ${taskId} by ${publisherId} - Reward: ${rewardAXN} AXN`);

      return {
        success: true,
        message: "Task click recorded successfully",
        reward: rewardAXN,
        task: {
          ...task,
          currentClicks: newClickCount,
          status: isCompleted ? 'completed' : 'running'
        }
      };
    } catch (error: any) {
      // Handle unique constraint violation (user already clicked)
      if (error.code === '23505') {
        return { success: false, message: "You have already completed this task" };
      }
      console.error(`❌ Error recording task click:`, error);
      return { success: false, message: "Failed to record task click" };
    }
  }

  // Add  balance to user
  async addTONBalance(userId: string, amount: string, source: string, description: string): Promise<void> {
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid  amount');
      }

      // Get current  balance
      const [user] = await db
        .select({ tonBalance: users.tonBalance })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      const currentUsdBalance = parseFloat(user.tonBalance || '0');
      const newUsdBalance = (currentUsdBalance + amountNum).toFixed(10);

      // Update user's  balance
      await db
        .update(users)
        .set({
          tonBalance: newUsdBalance,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Log the transaction
      await this.logTransaction({
        userId,
        amount: amount,
        type: 'credit',
        source: source,
        description: description,
        metadata: { rewardType: '' }
      });

      console.log(`✅ Added TON${amountNum}  to user ${userId}. New balance: TON${newUsdBalance}`);
    } catch (error) {
      console.error(`Error adding  balance:`, error);
      throw error;
    }
  }

  // Add BUG balance to user (CRITICAL FIX for referral earnings)
  async addBUGBalance(userId: string, amount: string, source: string, description: string): Promise<void> {
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid BUG amount');
      }

      // Get current BUG balance
      const [user] = await db
        .select({ bugBalance: users.bugBalance })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      const currentBugBalance = parseFloat(user.bugBalance || '0');
      const newBugBalance = (currentBugBalance + amountNum).toFixed(10);

      // Update user's BUG balance
      await db
        .update(users)
        .set({
          bugBalance: newBugBalance,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Log the transaction
      await this.logTransaction({
        userId,
        amount: amount,
        type: 'credit',
        source: source,
        description: description,
        metadata: { rewardType: 'BUG' }
      });

      console.log(`✅ Added ${amountNum} BUG to user ${userId}. New balance: ${newBugBalance}`);
    } catch (error) {
      console.error(`Error adding BUG balance:`, error);
      throw error;
    }
  }

  // Backfill BUG rewards for existing referrals (fix for users who earned before the update)
  async backfillExistingReferralBUGRewards(): Promise<void> {
    try {
      console.log('🔄 Starting backfill of BUG rewards for existing referrals...');
      
      // First, ensure columns exist
      try {
        await db.execute(sql`
          ALTER TABLE referrals ADD COLUMN IF NOT EXISTS ton_reward_amount DECIMAL(30, 10) DEFAULT '0';
          ALTER TABLE referrals ADD COLUMN IF NOT EXISTS bug_reward_amount DECIMAL(30, 10) DEFAULT '0';
        `);
      } catch (error) {
        console.log('ℹ️ Referral columns already exist');
      }
      
      // Get all completed referrals that don't have bugRewardAmount set
      const referralsNeedingBugCredit = await db.execute(sql`
        SELECT id, referrer_id, status, ton_reward_amount, bug_reward_amount 
        FROM referrals 
        WHERE status = 'completed' AND (bug_reward_amount = '0' OR bug_reward_amount IS NULL)
        AND ton_reward_amount > 0
      `);

      const rows = referralsNeedingBugCredit.rows || [];
      console.log(`📊 Found ${rows.length} referrals needing BUG credit backfill`);

      for (const ref of rows) {
        try {
          // Parse  amount with strict validation
          const usdReward = ref.ton_reward_amount;
          if (!usdReward || usdReward === null) {
            console.log(`⏭️ Skipping referral ${ref.id} - no  reward amount stored`);
            continue;
          }

          const usdAmount = parseFloat(String(usdReward));
          if (isNaN(usdAmount) || usdAmount <= 0) {
            console.log(`⏭️ Skipping referral ${ref.id} - invalid  amount: ${usdReward}`);
            continue;
          }

          // Calculate BUG from  amount (50 BUG per )
          const bugAmount = usdAmount * 50;
          if (isNaN(bugAmount) || bugAmount <= 0) {
            console.log(`⏭️ Skipping referral ${ref.id} - calculated BUG amount is invalid: ${bugAmount}`);
            continue;
          }

          // Update referral record with BUG amount
          await db.execute(sql`
            UPDATE referrals 
            SET bug_reward_amount = ${bugAmount.toFixed(10)}
            WHERE id = ${ref.id}
          `);

          // Credit BUG to referrer's balance
          await this.addBUGBalance(
            ref.referrer_id,
            bugAmount.toFixed(10),
            'referral_backfill',
            `Backfilled BUG from referral reward (+${bugAmount.toFixed(2)} BUG)`
          );

          console.log(`✅ Backfilled ${bugAmount.toFixed(2)} BUG for referral ${ref.id} to user ${ref.referrer_id}`);
        } catch (error) {
          console.error(`⚠️ Failed to backfill referral ${ref.id}:`, error);
        }
      }

      console.log(`✅ Backfill of BUG rewards completed!`);
    } catch (error) {
      console.error('❌ Error during BUG rewards backfill:', error);
    }
  }

  async deductBalanceForWithdrawal(userId: string, amount: string, currency: string = ''): Promise<boolean> {
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        console.error('Invalid deduction amount:', amount);
        return false;
      }

      // All withdrawals (TON, Stars, etc.) use tonBalance column
      const [user] = await db
        .select({ tonBalance: users.tonBalance, balance: users.balance })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        console.error('User not found for balance deduction');
        return false;
      }

      if (currency === 'AXN') {
        const currentBalance = parseFloat(user.balance || '0');
        if (currentBalance < amountNum) {
          console.error(`Insufficient AXN balance: ${currentBalance} < ${amountNum}`);
          return false;
        }
        const newBalance = Math.round(currentBalance - amountNum).toString();
        await db.update(users).set({ balance: newBalance, updatedAt: new Date() }).where(eq(users.id, userId));
        return true;
      }

      const currentBalance = parseFloat(user.tonBalance || '0');
      if (currentBalance < amountNum) {
        console.error(`Insufficient TON balance: ${currentBalance} < ${amountNum}`);
        return false;
      }

      const newBalance = (currentBalance - amountNum).toFixed(10);
      await db.update(users).set({ tonBalance: newBalance, updatedAt: new Date() }).where(eq(users.id, userId));
      console.log(`💰 Deducted ${amountNum} TON from user ${userId}. New balance: ${newBalance}`);
      return true;
    } catch (error) {
      console.error('Error deducting balance for withdrawal:', error);
      return false;
    }
  }

  async getRunningTasksForUser(userId: string): Promise<any[]> {
    const runningTasks = await db
      .select()
      .from(advertiserTasks)
      .where(eq(advertiserTasks.status, 'running'))
      .orderBy(desc(advertiserTasks.createdAt));

    const completedClicksResult = await db
      .select({ taskId: taskClicks.taskId })
      .from(taskClicks)
      .where(eq(taskClicks.publisherId, userId));

    const completedTaskIds = new Set(completedClicksResult.map(c => c.taskId));

    return runningTasks
      .filter(task => 
        task.advertiserId !== userId && 
        !completedTaskIds.has(task.id) &&
        task.currentClicks < task.totalClicksRequired
      )
      .map(task => ({
        ...task,
        isAdminTask: true,
        rewardAXN: Math.round(parseFloat(task.costPerClick || '0.0001750') * 10000000),
      }));
  }

  // Deposit operations implementation
  async hasEverBoughtBoost(userId: string): Promise<boolean> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count FROM mining_boosts WHERE user_id = ${userId}
      `);
      const count = parseInt(result.rows[0].count as string);
      return count > 0;
    } catch (error) {
      console.error('Error checking boost purchase history:', error);
      return false;
    }
  }

  async getPendingDeposit(userId: string): Promise<Deposit | undefined> {
    try {
      const [deposit] = await db
        .select()
        .from(deposits)
        .where(and(eq(deposits.userId, userId), eq(deposits.status, 'pending')))
        .limit(1);
      return deposit;
    } catch (error) {
      console.error('Error fetching pending deposit:', error);
      return undefined;
    }
  }

  async createDeposit(deposit: InsertDeposit): Promise<Deposit> {
    const [newDeposit] = await db
      .insert(deposits)
      .values({
        ...deposit,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newDeposit;
  }

  async getUserDeposits(userId: string): Promise<Deposit[]> {
    return db
      .select()
      .from(deposits)
      .where(eq(deposits.userId, userId))
      .orderBy(desc(deposits.createdAt));
  }

  async updateDepositStatus(depositId: string, status: string, adminNotes?: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Use FOR UPDATE to lock the row and prevent race conditions in production
      // We use the ORM select with forUpdate() for automatic camelCase mapping and safety
      const [deposit] = await tx
        .select()
        .from(deposits)
        .where(eq(deposits.id, depositId))
        .for('update');
      
      if (!deposit) throw new Error("Deposit not found");

      // Prevent re-processing already completed or failed deposits (Idempotency)
      if (deposit.status !== 'pending') {
        console.log(`⚠️ Deposit ${depositId} already has status ${deposit.status}. Skipping update.`);
        return;
      }

      await tx.update(deposits)
        .set({ 
          status, 
          updatedAt: new Date() 
        })
        .where(eq(deposits.id, depositId));

      if (status === 'completed') {
        // Atomic balance update
        const [user] = await tx
          .select({ id: users.id, tonAppBalance: users.tonAppBalance })
          .from(users)
          .where(eq(users.id, deposit.userId))
          .for('update');
        
        if (user) {
          const depositAmount = parseFloat(deposit.amount);
          
          await tx.update(users)
            .set({ 
              tonAppBalance: sql`COALESCE(ton_app_balance, 0) + ${depositAmount.toString()}`,
              updatedAt: new Date()
            })
            .where(eq(users.id, deposit.userId));

          await tx.insert(transactions).values({
            userId: deposit.userId,
            amount: deposit.amount,
            type: 'addition',
            source: 'deposit',
            description: `Deposit of ${deposit.amount} TON completed (Manual Approval)`,
            metadata: { 
              depositId: deposit.id,
              approvedAt: new Date().toISOString()
            }
          });
          
          console.log(`✅ User ${deposit.userId} balance credited with ${deposit.amount} TON from deposit ${deposit.id}`);
        }
      }
    });
  }
  async getDeposit(depositId: string): Promise<Deposit | undefined> {
    try {
      const [deposit] = await db.select().from(deposits).where(eq(deposits.id, depositId)).limit(1);
      return deposit;
    } catch (error: any) {
      console.error("Error fetching deposit:", error);
      if (error.code === '42P01') return undefined;
      throw error;
    }
  }

  async getMiningBoosts(userId: string): Promise<MiningBoost[]> {
    const now = new Date();
    const boosts = await db.select()
      .from(miningBoosts)
      .where(and(eq(miningBoosts.userId, userId), gte(miningBoosts.expiresAt, now)));
    return boosts;
  }

  async addMiningBoost(boost: InsertMiningBoost): Promise<MiningBoost> {
    const [newBoost] = await db.insert(miningBoosts).values(boost).returning();
    return newBoost;
  }

  async getUserReferralTasks(userId: string): Promise<UserReferralTask[]> {
    const { userReferralTasks } = await import("../shared/schema");
    return db.select().from(userReferralTasks).where(eq(userReferralTasks.userId, userId));
  }

  async claimReferralTask(userId: string, taskId: string): Promise<{ success: boolean; message: string; rewardAXN?: string; miningBoost?: string }> {
    const { userReferralTasks } = await import("../shared/schema");
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const tasks = [
      { id: 'task_1', required: 1, rewardAXN: '1', boost: '0.0001' },
      { id: 'task_2', required: 3, rewardAXN: '3', boost: '0.0003' },
      { id: 'task_3', required: 10, rewardAXN: '5', boost: '0.0005' },
      { id: 'task_4', required: 25, rewardAXN: '10', boost: '0.001' },
      { id: 'task_5', required: 50, rewardAXN: '25', boost: '0.002' },
      { id: 'task_6', required: 100, rewardAXN: '30', boost: '0.003' },
    ];

    const task = tasks.find(t => t.id === taskId);
    if (!task) return { success: false, message: "Task not found" };

    const totalInvited = user.friendsInvited || 0;
    if (totalInvited < task.required) {
      return { success: false, message: `You need ${task.required} invites to claim this reward.` };
    }

    // Check if already claimed
    const existing = await db.select().from(userReferralTasks)
      .where(and(eq(userReferralTasks.userId, userId), eq(userReferralTasks.taskId, taskId)));
    
    if (existing.length > 0) {
      return { success: false, message: "Task already claimed" };
    }

    await db.transaction(async (tx) => {
      // 1. Record claim
      await tx.insert(userReferralTasks).values({ userId, taskId });

      // 2. Add AXN reward
      await tx.update(users)
        .set({ 
          balance: sql`COALESCE(${users.balance}, 0) + ${task.rewardAXN}`,
          withdrawBalance: sql`COALESCE(${users.withdrawBalance}, 0) + ${task.rewardAXN}`,
          totalEarned: sql`COALESCE(${users.totalEarned}, 0) + ${task.rewardAXN}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // 3. Add permanent mining boost (99 years)
      const now = new Date();
      const expiresAt = new Date(now.getFullYear() + 99, now.getMonth(), now.getDate());
      await tx.insert(miningBoosts).values({
        userId,
        planId: `referral_${taskId}`,
        miningRate: (parseFloat(task.boost) / 3600).toFixed(10), // Convert AXN/h to AXN/s
        expiresAt,
      });

      // 4. Log transaction
      await tx.insert(transactions).values({
        userId,
        amount: task.rewardAXN,
        type: 'addition',
        source: 'referral_task',
        description: `Claimed reward for ${task.required} invites`,
        metadata: { taskId, boost: task.boost }
      });
    });

    return { success: true, message: "Reward claimed successfully!", rewardAXN: task.rewardAXN, miningBoost: task.boost };
  }
}

export const storage = new DatabaseStorage();

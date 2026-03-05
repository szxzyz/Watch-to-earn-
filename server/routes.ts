import crypto from 'crypto';
import { Router } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Router): Promise<Server> {
  // --- Auth & User Routes ---
  app.get('/api/auth/user', async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  });

  app.post('/api/auth/telegram', async (req: any, res) => {
    try {
      const { initData, startParam } = req.body;
      const urlParams = new URLSearchParams(initData);
      const tgUser = JSON.parse(urlParams.get('user') || '{}');
      
      if (!tgUser.id) return res.status(400).json({ message: 'Invalid Telegram data' });

      const { user, isNewUser } = await storage.upsertTelegramUser(tgUser.id.toString(), {
        username: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        referredBy: startParam,
      });

      if (isNewUser && startParam) {
        const referrer = await storage.getUserByReferralCode(startParam);
        if (referrer) {
          await storage.createReferral(referrer.id, user.id);
        }
      }

      req.session.userId = user.id;
      res.json(user);
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // --- Ads Routes ---
  app.post('/api/ads/watch', async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    await storage.incrementAdsWatched(req.session.userId);
    const reward = await storage.getAdminSetting('rewardPerAd') || '2';
    const user = await storage.getUser(req.session.userId);
    const newBalance = (parseFloat(user?.balance || "0") + parseFloat(reward)).toString();
    await storage.updateUserBalance(req.session.userId, newBalance);
    await storage.addEarning({
      userId: req.session.userId,
      amount: reward,
      source: 'ad',
      description: 'Watched an advertisement'
    });
    res.json({ success: true, reward, newBalance });
  });

  // --- Referral Routes ---
  app.get('/api/referrals/stats', async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    const referrals = await storage.getUserReferrals(req.session.userId);
    res.json({
      totalInvites: referrals.length,
      successfulInvites: referrals.filter(r => r.status === 'completed').length
    });
  });

  // --- Admin Routes ---
  app.get('/api/admin/settings', async (req: any, res) => {
    const settings = await storage.getAllAdminSettings();
    const settingsMap = settings.reduce((acc: any, s) => {
      acc[s.settingKey] = s.settingValue;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.put('/api/admin/settings', async (req: any, res) => {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await storage.updateAdminSetting(key, value as string);
    }
    res.json({ success: true });
  });

  app.get('/api/app-settings', async (req: any, res) => {
    const settings = await storage.getAllAdminSettings();
    const settingsMap = settings.reduce((acc: any, s) => {
      acc[s.settingKey] = s.settingValue;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  // --- Tasks ---
  app.get('/api/tasks/home/unified', async (req: any, res) => {
    res.json({ success: true, tasks: [], completedTaskIds: [] });
  });

  // --- Promo Codes ---
  app.post('/api/promo-codes/redeem', async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { code } = req.body;
    const promo = await storage.getPromoCode(code);
    
    if (!promo || !promo.isActive) {
      return res.status(404).json({ message: 'Invalid or inactive promo code' });
    }

    const usage = await storage.getPromoCodeUsage(promo.id, req.session.userId);
    if (usage) {
      return res.status(400).json({ message: 'You have already redeemed this code' });
    }

    const user = await storage.getUser(req.session.userId);
    const newBalance = (parseFloat(user?.balance || "0") + parseFloat(promo.rewardAmount)).toString();
    
    await storage.updateUserBalance(req.session.userId, newBalance);
    await storage.createPromoCodeUsage(promo.id, req.session.userId, promo.rewardAmount);
    await storage.addEarning({
      userId: req.session.userId,
      amount: promo.rewardAmount,
      source: 'promo',
      description: `Redeemed promo code: ${code}`
    });

    res.json({ success: true, message: `Promo code redeemed! +${promo.rewardAmount} AXN` });
  });

  // --- Conversion ---
  app.post('/api/convert-to-ton', async (req: any, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    const { axnAmount } = req.body;
    const user = await storage.getUser(req.session.userId);
    
    if (!user || parseFloat(user.balance || "0") < axnAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const rate = parseFloat(await storage.getAdminSetting('axn_to_ton_rate') || '0.0001');
    const tonAmount = (axnAmount * rate).toFixed(10);
    
    const newBalance = (parseFloat(user.balance || "0") - axnAmount).toString();
    const newTonBalance = (parseFloat(user.tonBalance || "0") + parseFloat(tonAmount)).toString();
    
    await storage.updateUserBalance(req.session.userId, newBalance);
    await storage.updateUserTonBalance(req.session.userId, newTonBalance);
    
    res.json({ success: true, tonAmount });
  });

  const httpServer = createServer(app);
  return httpServer;
}

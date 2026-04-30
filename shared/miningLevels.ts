export interface MiningLevel {
  level: number;
  rate: number;       // AXN per second
  capacity: number;   // max AXN stored
  cpuMin: number;     // CPU duration in minutes
  energyCost: number; // AXN cost to refill energy (per CPU run)
  repairCost: number; // AXN cost to repair machine health
  antivirusCost: number; // AXN cost to activate antivirus
  upgMining: number;  // AXN cost to upgrade mining subsystem
  upgCapacity: number; // AXN cost to upgrade capacity subsystem
  upgCpu: number;     // AXN cost to upgrade CPU subsystem
}

export const MINING_LEVELS: MiningLevel[] = [
  { level: 1,  rate: 0.01, capacity: 24,  cpuMin: 60,   energyCost: 10,  repairCost: 15,   antivirusCost: 5,   upgMining: 200,    upgCapacity: 160,    upgCpu: 130 },
  { level: 2,  rate: 0.02, capacity: 48,  cpuMin: 90,   energyCost: 20,  repairCost: 25,   antivirusCost: 10,  upgMining: 400,    upgCapacity: 300,    upgCpu: 250 },
  { level: 3,  rate: 0.03, capacity: 72,  cpuMin: 120,  energyCost: 30,  repairCost: 40,   antivirusCost: 15,  upgMining: 800,    upgCapacity: 600,    upgCpu: 500 },
  { level: 4,  rate: 0.04, capacity: 96,  cpuMin: 150,  energyCost: 45,  repairCost: 60,   antivirusCost: 22,  upgMining: 1500,   upgCapacity: 1100,   upgCpu: 900 },
  { level: 5,  rate: 0.05, capacity: 120, cpuMin: 180,  energyCost: 60,  repairCost: 85,   antivirusCost: 30,  upgMining: 3000,   upgCapacity: 2200,   upgCpu: 1800 },
  { level: 6,  rate: 0.06, capacity: 144, cpuMin: 240,  energyCost: 80,  repairCost: 120,  antivirusCost: 40,  upgMining: 6000,   upgCapacity: 4500,   upgCpu: 3500 },
  { level: 7,  rate: 0.07, capacity: 168, cpuMin: 300,  energyCost: 110, repairCost: 170,  antivirusCost: 55,  upgMining: 12000,  upgCapacity: 9000,   upgCpu: 7000 },
  { level: 8,  rate: 0.08, capacity: 192, cpuMin: 360,  energyCost: 175, repairCost: 275,  antivirusCost: 86,  upgMining: 39000,  upgCapacity: 31000,  upgCpu: 21500 },
  { level: 9,  rate: 0.09, capacity: 216, cpuMin: 480,  energyCost: 200, repairCost: 320,  antivirusCost: 100, upgMining: 50000,  upgCapacity: 40000,  upgCpu: 28000 },
  { level: 10, rate: 0.10, capacity: 240, cpuMin: 600,  energyCost: 240, repairCost: 400,  antivirusCost: 130, upgMining: 65000,  upgCapacity: 52000,  upgCpu: 36000 },
  { level: 11, rate: 0.11, capacity: 264, cpuMin: 720,  energyCost: 280, repairCost: 470,  antivirusCost: 160, upgMining: 80000,  upgCapacity: 65000,  upgCpu: 45000 },
  { level: 12, rate: 0.12, capacity: 288, cpuMin: 840,  energyCost: 320, repairCost: 550,  antivirusCost: 190, upgMining: 100000, upgCapacity: 80000,  upgCpu: 55000 },
  { level: 13, rate: 0.13, capacity: 312, cpuMin: 960,  energyCost: 360, repairCost: 620,  antivirusCost: 220, upgMining: 120000, upgCapacity: 95000,  upgCpu: 65000 },
  { level: 14, rate: 0.14, capacity: 336, cpuMin: 1080, energyCost: 380, repairCost: 660,  antivirusCost: 240, upgMining: 150000, upgCapacity: 120000, upgCpu: 85000 },
  { level: 15, rate: 0.15, capacity: 360, cpuMin: 1200, energyCost: 400, repairCost: 700,  antivirusCost: 260, upgMining: 180000, upgCapacity: 150000, upgCpu: 120000 },
  { level: 16, rate: 0.16, capacity: 384, cpuMin: 1320, energyCost: 450, repairCost: 780,  antivirusCost: 300, upgMining: 220000, upgCapacity: 180000, upgCpu: 150000 },
  { level: 17, rate: 0.17, capacity: 408, cpuMin: 1440, energyCost: 500, repairCost: 860,  antivirusCost: 340, upgMining: 260000, upgCapacity: 210000, upgCpu: 180000 },
  { level: 18, rate: 0.18, capacity: 432, cpuMin: 1560, energyCost: 550, repairCost: 950,  antivirusCost: 380, upgMining: 300000, upgCapacity: 250000, upgCpu: 210000 },
  { level: 19, rate: 0.19, capacity: 456, cpuMin: 1680, energyCost: 600, repairCost: 1000, antivirusCost: 420, upgMining: 360000, upgCapacity: 300000, upgCpu: 250000 },
  { level: 20, rate: 0.20, capacity: 480, cpuMin: 1800, energyCost: 650, repairCost: 1100, antivirusCost: 460, upgMining: 420000, upgCapacity: 350000, upgCpu: 280000 },
  { level: 21, rate: 0.21, capacity: 504, cpuMin: 1920, energyCost: 700, repairCost: 1200, antivirusCost: 500, upgMining: 500000, upgCapacity: 400000, upgCpu: 320000 },
  { level: 22, rate: 0.22, capacity: 528, cpuMin: 2040, energyCost: 750, repairCost: 1300, antivirusCost: 540, upgMining: 580000, upgCapacity: 470000, upgCpu: 380000 },
  { level: 23, rate: 0.23, capacity: 552, cpuMin: 2160, energyCost: 800, repairCost: 1400, antivirusCost: 580, upgMining: 650000, upgCapacity: 550000, upgCpu: 450000 },
  { level: 24, rate: 0.24, capacity: 576, cpuMin: 2280, energyCost: 850, repairCost: 1450, antivirusCost: 600, upgMining: 750000, upgCapacity: 620000, upgCpu: 550000 },
  { level: 25, rate: 0.25, capacity: 600, cpuMin: 2400, energyCost: 900, repairCost: 1500, antivirusCost: 650, upgMining: 850000, upgCapacity: 700000, upgCpu: 650000 },
];

export function getMiningLevel(level: number): MiningLevel {
  const clamped = Math.max(1, Math.min(25, level));
  return MINING_LEVELS[clamped - 1];
}

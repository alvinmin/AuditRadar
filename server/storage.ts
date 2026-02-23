import {
  type User, type InsertUser,
  type RiskSector, type InsertRiskSector,
  type RiskMetric, type InsertRiskMetric,
  type RiskAlert, type InsertRiskAlert,
  type HeatmapData, type InsertHeatmapData,
  users, riskSectors, riskMetrics, riskAlerts, heatmapData
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllSectors(): Promise<RiskSector[]>;
  getSector(id: string): Promise<RiskSector | undefined>;
  createSector(sector: InsertRiskSector): Promise<RiskSector>;

  getAllMetrics(): Promise<RiskMetric[]>;
  getMetricsBySector(sectorId: string): Promise<RiskMetric[]>;
  createMetric(metric: InsertRiskMetric): Promise<RiskMetric>;

  getAllAlerts(): Promise<RiskAlert[]>;
  getAlertsBySector(sectorId: string): Promise<RiskAlert[]>;
  createAlert(alert: InsertRiskAlert): Promise<RiskAlert>;

  getAllHeatmapData(): Promise<HeatmapData[]>;
  getHeatmapDataBySector(sectorId: string): Promise<HeatmapData[]>;
  createHeatmapData(data: InsertHeatmapData): Promise<HeatmapData>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllSectors(): Promise<RiskSector[]> {
    return db.select().from(riskSectors);
  }

  async getSector(id: string): Promise<RiskSector | undefined> {
    const [sector] = await db.select().from(riskSectors).where(eq(riskSectors.id, id));
    return sector;
  }

  async createSector(sector: InsertRiskSector): Promise<RiskSector> {
    const [created] = await db.insert(riskSectors).values(sector).returning();
    return created;
  }

  async getAllMetrics(): Promise<RiskMetric[]> {
    return db.select().from(riskMetrics);
  }

  async getMetricsBySector(sectorId: string): Promise<RiskMetric[]> {
    return db.select().from(riskMetrics).where(eq(riskMetrics.sectorId, sectorId));
  }

  async createMetric(metric: InsertRiskMetric): Promise<RiskMetric> {
    const [created] = await db.insert(riskMetrics).values(metric).returning();
    return created;
  }

  async getAllAlerts(): Promise<RiskAlert[]> {
    return db.select().from(riskAlerts);
  }

  async getAlertsBySector(sectorId: string): Promise<RiskAlert[]> {
    return db.select().from(riskAlerts).where(eq(riskAlerts.sectorId, sectorId));
  }

  async createAlert(alert: InsertRiskAlert): Promise<RiskAlert> {
    const [created] = await db.insert(riskAlerts).values(alert).returning();
    return created;
  }

  async getAllHeatmapData(): Promise<HeatmapData[]> {
    return db.select().from(heatmapData);
  }

  async getHeatmapDataBySector(sectorId: string): Promise<HeatmapData[]> {
    return db.select().from(heatmapData).where(eq(heatmapData.sectorId, sectorId));
  }

  async createHeatmapData(data: InsertHeatmapData): Promise<HeatmapData> {
    const [created] = await db.insert(heatmapData).values(data).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();

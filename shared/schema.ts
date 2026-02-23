import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const riskSectors = pgTable("risk_sectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
});

export const riskMetrics = pgTable("risk_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectorId: varchar("sector_id").notNull().references(() => riskSectors.id),
  metricType: text("metric_type").notNull(),
  score: real("score").notNull(),
  previousScore: real("previous_score"),
  predictedScore: real("predicted_score"),
  confidence: real("confidence"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const riskAlerts = pgTable("risk_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectorId: varchar("sector_id").notNull().references(() => riskSectors.id),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  metricType: text("metric_type"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const heatmapData = pgTable("heatmap_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectorId: varchar("sector_id").notNull().references(() => riskSectors.id),
  riskDimension: text("risk_dimension").notNull(),
  value: real("value").notNull(),
  trend: text("trend").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertRiskSectorSchema = createInsertSchema(riskSectors).omit({ id: true });
export const insertRiskMetricSchema = createInsertSchema(riskMetrics).omit({ id: true });
export const insertRiskAlertSchema = createInsertSchema(riskAlerts).omit({ id: true });
export const insertHeatmapDataSchema = createInsertSchema(heatmapData).omit({ id: true });

export type InsertRiskSector = z.infer<typeof insertRiskSectorSchema>;
export type RiskSector = typeof riskSectors.$inferSelect;
export type InsertRiskMetric = z.infer<typeof insertRiskMetricSchema>;
export type RiskMetric = typeof riskMetrics.$inferSelect;
export type InsertRiskAlert = z.infer<typeof insertRiskAlertSchema>;
export type RiskAlert = typeof riskAlerts.$inferSelect;
export type InsertHeatmapData = z.infer<typeof insertHeatmapDataSchema>;
export type HeatmapData = typeof heatmapData.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

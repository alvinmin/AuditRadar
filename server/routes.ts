import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/sectors", async (_req, res) => {
    try {
      const sectors = await storage.getAllSectors();
      res.json(sectors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sectors" });
    }
  });

  app.get("/api/sectors/:id", async (req, res) => {
    try {
      const sector = await storage.getSector(req.params.id);
      if (!sector) return res.status(404).json({ message: "Sector not found" });
      res.json(sector);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sector" });
    }
  });

  app.get("/api/metrics", async (_req, res) => {
    try {
      const metrics = await storage.getAllMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/metrics/:sectorId", async (req, res) => {
    try {
      const metrics = await storage.getMetricsBySector(req.params.sectorId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/alerts", async (_req, res) => {
    try {
      const alerts = await storage.getAllAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  app.get("/api/heatmap", async (_req, res) => {
    try {
      const data = await storage.getAllHeatmapData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch heatmap data" });
    }
  });

  app.get("/api/news", async (_req, res) => {
    try {
      const news = await storage.getAllMarketNews();
      res.json(news);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch market news" });
    }
  });

  app.get("/api/news/:sector", async (req, res) => {
    try {
      const news = await storage.getMarketNewsBySector(req.params.sector);
      res.json(news);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news for sector" });
    }
  });

  return httpServer;
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CacheService } from "./cache.service";
import { getRedis, isRedisConnected } from "../config/redis";

vi.mock("../config/redis", () => ({
  getRedis: vi.fn(),
  isRedisConnected: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Cache Service", () => {
  const mockRedis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    scan: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRedis).mockReturnValue(mockRedis as any);
  });

  describe("get", () => {
    it("should return null if Redis is disconnected", async () => {
      vi.mocked(isRedisConnected).mockReturnValue(false);
      const result = await CacheService.get("test_key");
      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it("should retrieve and deserialize data when Redis is active", async () => {
      vi.mocked(isRedisConnected).mockReturnValue(true);
      const testData = { name: "Sunset Festival", status: "published" };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await CacheService.get<typeof testData>("event:123");
      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith("mad:cache:event:123");
    });

    it("should degrade gracefully and return null if JSON parsing fails", async () => {
      vi.mocked(isRedisConnected).mockReturnValue(true);
      mockRedis.get.mockResolvedValue("{bad json");

      const result = await CacheService.get("event:123");
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("should skip setting value if Redis is disconnected", async () => {
      vi.mocked(isRedisConnected).mockReturnValue(false);
      await CacheService.set("test_key", { a: 1 });
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it("should set serialized JSON value with custom TTL", async () => {
      vi.mocked(isRedisConnected).mockReturnValue(true);
      const value = { data: "my-cache" };

      await CacheService.set("user:session", value, 120);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "mad:cache:user:session",
        JSON.stringify(value),
        "EX",
        120,
      );
    });

    it("should set value without TTL expiration if set to 0", async () => {
      vi.mocked(isRedisConnected).mockReturnValue(true);
      const value = { role: "admin" };

      await CacheService.set("user:role", value, 0);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "mad:cache:user:role",
        JSON.stringify(value),
      );
    });
  });

  describe("del", () => {
    it("should call Redis del with full prefix key", async () => {
      vi.mocked(isRedisConnected).mockReturnValue(true);
      await CacheService.del("stale:data");
      expect(mockRedis.del).toHaveBeenCalledWith("mad:cache:stale:data");
    });
  });

  describe("delPattern", () => {
    it("should scan and delete all matching keys", async () => {
      vi.mocked(isRedisConnected).mockReturnValue(true);
      mockRedis.scan
        .mockResolvedValueOnce([
          "next_cursor",
          ["mad:cache:events:1", "mad:cache:events:2"],
        ])
        .mockResolvedValueOnce(["0", ["mad:cache:events:3"]]);

      await CacheService.delPattern("events:*");

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith(
        "mad:cache:events:1",
        "mad:cache:events:2",
      );
      expect(mockRedis.del).toHaveBeenCalledWith("mad:cache:events:3");
    });
  });
});

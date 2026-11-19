import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import { CodeQualityValidator } from "./code_quality_validator";

vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe("CodeQualityValidator 249-Line Baseline Enforcement", () => {
  let validator: CodeQualityValidator;

  beforeEach(() => {
    validator = new CodeQualityValidator();
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it("passes when a new service file has exactly 249 lines", async () => {
    const fakeContent = Array(249)
      .fill("export function doWork() {}")
      .join("\n");
    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (String(path).includes("code_quality_baseline.json")) {
        return JSON.stringify({ entries: {} });
      }
      return fakeContent;
    });

    const result = await validator.run(
      ["apps/server/src/services/new.service.ts"],
      { changedFiles: [] } as any,
    );
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when a new un-baselined service file has 250 lines", async () => {
    const fakeContent = Array(250)
      .fill("export function doWork() {}")
      .join("\n");
    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (String(path).includes("code_quality_baseline.json")) {
        return JSON.stringify({ entries: {} });
      }
      return fakeContent;
    });

    const result = await validator.run(
      ["apps/server/src/services/new.service.ts"],
      { changedFiles: [] } as any,
    );
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe("VAL-QUAL-004");
    expect(result.errors[0].snippet).toContain("Limit: 249 lines");
  });

  it("fails when a new test file has 250 lines", async () => {
    const fakeContent = Array(250).fill('it("test", () => {});').join("\n");
    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (String(path).includes("code_quality_baseline.json")) {
        return JSON.stringify({ entries: {} });
      }
      return fakeContent;
    });

    const result = await validator.run(
      ["apps/server/src/services/new.service.test.ts"],
      { changedFiles: [] } as any,
    );
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].rule).toBe("VAL-QUAL-006");
    expect(result.errors[0].snippet).toContain("Limit: 249 lines");
  });

  it("reports warning without failing build for an unchanged legacy baseline file", async () => {
    const fakeContent = Array(350)
      .fill("export function legacy() {}")
      .join("\n");
    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (String(path).includes("code_quality_baseline.json")) {
        return JSON.stringify({
          entries: {
            "apps/server/src/services/legacy.service.ts": {
              ruleId: "VAL-QUAL-004",
              lineCount: 350,
            },
          },
        });
      }
      return fakeContent;
    });

    const result = await validator.run(
      ["apps/server/src/services/legacy.service.ts"],
      { changedFiles: [] } as any,
    );
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain(
      "[BASELINE] Legacy code quality debt",
    );
  });

  it("fails if an unchanged legacy baseline file exceeds its frozen baseline ceiling", async () => {
    const fakeContent = Array(355)
      .fill("export function legacy() {}")
      .join("\n");
    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (String(path).includes("code_quality_baseline.json")) {
        return JSON.stringify({
          entries: {
            "apps/server/src/services/legacy.service.ts": {
              ruleId: "VAL-QUAL-004",
              lineCount: 350,
            },
          },
        });
      }
      return fakeContent;
    });

    const result = await validator.run(
      ["apps/server/src/services/legacy.service.ts"],
      { changedFiles: [] } as any,
    );
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Freeze Violation");
  });

  it("fails if a baseline file is modified and still exceeds 249 lines", async () => {
    const fakeContent = Array(300)
      .fill("export function legacy() {}")
      .join("\n");
    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (String(path).includes("code_quality_baseline.json")) {
        return JSON.stringify({
          entries: {
            "apps/server/src/services/legacy.service.ts": {
              ruleId: "VAL-QUAL-004",
              lineCount: 350,
            },
          },
        });
      }
      return fakeContent;
    });

    const result = await validator.run(
      ["apps/server/src/services/legacy.service.ts"],
      { changedFiles: ["apps/server/src/services/legacy.service.ts"] } as any,
    );
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Modified maintained file");
  });

  it("auto-prunes a baseline entry when a file is brought below 250 lines", async () => {
    const fakeContent = Array(150)
      .fill("export function cleaned() {}")
      .join("\n");
    let writtenData = "";
    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (String(path).includes("code_quality_baseline.json")) {
        return JSON.stringify({
          entries: {
            "apps/server/src/services/cleaned.service.ts": {
              ruleId: "VAL-QUAL-004",
              lineCount: 350,
            },
          },
        });
      }
      return fakeContent;
    });
    vi.mocked(fs.writeFileSync).mockImplementation((_path: any, data: any) => {
      writtenData = String(data);
    });

    const result = await validator.run(
      ["apps/server/src/services/cleaned.service.ts"],
      { changedFiles: [] } as any,
    );
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(writtenData).toContain('"entries": {}');
  });
});

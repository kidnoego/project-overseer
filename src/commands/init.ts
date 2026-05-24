import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  OVERSEER_DIR,
  validateProjectRoot,
  assertInsideOverseer,
  SecurityError,
} from "../core/path-guards.js";

export type InitResult = {
  rootDir: string;
  overseerDir: string;
  configPath: string;
  createdDirectories: string[];
};

export async function runInit(rootDir: string): Promise<InitResult> {
  // --- Security: validate the project root before doing anything ---
  validateProjectRoot(rootDir);

  const overseerDir = join(rootDir, OVERSEER_DIR);
  const directories = [
    overseerDir,
    join(overseerDir, "reports"),
    join(overseerDir, "cache"),
    join(overseerDir, "memory"),
  ];

  // --- Security: every target must be inside .overseer/ ---
  for (const directory of directories) {
    assertInsideOverseer(rootDir, directory);
    await mkdir(directory, { recursive: true });
  }

  const configPath = join(overseerDir, "config.json");

  // --- Security: config must be written inside .overseer/ ---
  assertInsideOverseer(rootDir, configPath);

  const config = {
    schemaVersion: 1,
    createdBy: "ovr init",
    reportsDir: "reports",
    cacheDir: "cache",
    memoryDir: "memory",
  };

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") {
      throw error;
    }
  });

  return {
    rootDir,
    overseerDir,
    configPath,
    createdDirectories: directories,
  };
}

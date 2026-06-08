#!/usr/bin/env node

import { execa } from "execa";
import ora, { Ora } from "ora";
import chalk from "chalk";
import boxen from "boxen";
import { tmpdir } from "os";
import { readFileSync, writeFileSync } from "fs";
import pkg from "./package.json" with { type: "json" };

const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );

const currentVersion: string = pkg.version;
const CACHE_FILE = `${tmpdir()}/wixn-version-cache.json`;
const CACHE_TTL = 24 * 60 * 60 * 1000;
const toNum = (v: string) =>
  v.split(".").reduce((acc, n) => acc * 1000 + Number(n), 0);

const checkVersion = async () => {
  try {
    let latestVersion: string | undefined;

    try {
      const cache = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
      if (Date.now() - cache.ts < CACHE_TTL) latestVersion = cache.version;
    } catch {}

    if (!latestVersion) {
      const res = await fetch("https://registry.npmjs.org/wixn/latest");
      ({ version: latestVersion } = (await res.json()) as { version: string });
      writeFileSync(
        CACHE_FILE,
        JSON.stringify({ version: latestVersion, ts: Date.now() }),
      );
    }

    if (toNum(latestVersion) > toNum(currentVersion)) {
      console.log(
        boxen(
          chalk.yellow.bold(
            `Update available: ${currentVersion} → ${latestVersion}\n`,
          ) + chalk.dim("Run: npm i -g wixn  or  bun add -g wixn"),
          { padding: 1, borderColor: "yellow", borderStyle: "round" },
        ),
      );
    }
  } catch {
    console.error(chalk.dim("(version check failed)"));
  }
};

const args = process.argv.slice(2);

const log = {
  success: (msg: string) => console.log(chalk.green.bold(msg)),
  error: (msg: string) => console.log(chalk.red.bold(msg)),
  info: (msg: string) => console.log(chalk.blue.bold(msg)),
};

const commands: Record<string, { type: string; action: string; past: string }> =
  {
    install: { type: "install", action: "Installing", past: "Installed" },
    i: { type: "install", action: "Installing", past: "Installed" },
    add: { type: "install", action: "Installing", past: "Installed" },
    uninstall: {
      type: "uninstall",
      action: "Uninstalling",
      past: "Uninstalled",
    },
    remove: { type: "uninstall", action: "Uninstalling", past: "Uninstalled" },
    rm: { type: "uninstall", action: "Uninstalling", past: "Uninstalled" },
  };

let spinner: Ora;

const cleanup = (signal: string) => {
  if (spinner?.isSpinning) spinner.stop();
  console.log(chalk.yellow.bold(`\nAborted (${signal})`));
  process.exit(130);
};

process.on("SIGINT", () => cleanup("SIGINT"));
process.on("SIGTERM", () => cleanup("SIGTERM"));
process.on("SIGHUP", () => cleanup("SIGHUP"));

const main = async () => {
  checkVersion();

  try {
    if (args.length < 2) {
      log.error(
        "Please provide a command (install, uninstall) and package name.",
      );
      process.exit(1);
    }

    const cmd = commands[args[0]];
    if (!cmd) {
      log.error(`Invalid command: ${args[0]}`);
      process.exit(1);
    }

    const { type, action, past } = cmd;
    const skipWixInstall = args.includes("--nx");
    const packages = args.slice(1).filter((s) => s !== "--nx");
    const cwd = process.cwd();

    spinner = ora({
      text: chalk.bold(`${action} packages...`),
      discardStdin: false, // for ctrl+c to work as expected
    }).start();

    const completed: string[] = [];
    const failed: string[] = [];

    const packagePromises = packages.map(async (pkg) => {
      const ok = await execa("npm", [type, pkg], { cwd }).then(
        () => true,
        () => false,
      );
      spinner.stop();
      if (ok) {
        log.success(`✅ ${chalk.bold(pkg)} ${past}`);
        completed.push(pkg);
      } else {
        log.error(`❌ ${chalk.bold(pkg)} couldn't be ${past}`);
        failed.push(pkg);
      }
      spinner.start();
    });

    const start = performance.now();

    for (const batch of chunk(packagePromises, 5)) {
      await Promise.allSettled(batch);
    }

    if (!skipWixInstall) {
      spinner.text = chalk.bold("Applying changes to Wix...");
      const slowHint = setTimeout(() => {
        spinner.stop();
        log.info("Taking a while... use --nx to skip `wix install` next time.");
        spinner.start();
      }, 10000);
      await execa("wix", ["install"], { cwd });
      clearTimeout(slowHint);
    }

    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    spinner.clear();

    const summary = chalk.bold(
      `${past} Packages: ${chalk.green(completed.join(", "))} ${elapsed}s`,
    );

    if (failed.length > 0) {
      log.error(`\nFailed to ${type} packages: ${failed.join(", ")}`);
      console.log(summary);
      process.exit(1);
    }

    console.log("\n" + summary);
    process.exit(0);
  } catch (err: any) {
    if (spinner?.isSpinning) spinner.clear();
    log.error(
      `\n\nMake sure @wix/cli is installed and you are in a Wix project directory as a logged-in user.`,
    );
    log.error(
      `Run 'npm i -g @wix/cli@latest' to install Wix CLI tools, and then run 'wix login' to login into your Wix account.`,
    );
    log.error(`\nError: ${err.message}`);
    process.exit(1);
  }
};

main();

#!/usr/bin/env node

import { exec } from "child_process";
import ora from "ora";
import chalk from "chalk";

const COMMANDS = {
  install: "wix install",
  uninstall: "wix uninstall",
  remove: "wix uninstall", // Alias for uninstall
};

const log = {
  success: (msg) => console.log(chalk.green.bold(msg)),
  error: (msg) => console.log(chalk.red.bold(msg)),
  info: (msg) => console.log(chalk.blue.bold(msg)),
};

const runCommand = async (command, packages) => {
  const promises = packages.map((pkg) => {
    const spinner = ora(`${command} ${pkg} in progress`).start();

    return new Promise((resolve) => {
      exec(`${COMMANDS[command]} ${pkg}`, (error, stdout, stderr) => {
        if (error) {
          spinner.fail(`${command} failed for ${pkg}: ${stderr.trim()}`);
          resolve({ package: pkg, status: "failed", error: stderr.trim() });
        } else {
          spinner.succeed(`${command} succeeded for ${pkg}`);
          resolve({ package: pkg, status: "success", output: stdout.trim() });
        }
      });
    });
  });

  return Promise.all(promises);
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    log.error("Usage: wixn <install|uninstall|remove> package1 package2...");
    process.exit(1);
  }

  const [command, ...packages] = args;

  if (!COMMANDS[command]) {
    log.error(`Invalid command: ${command}`);
    log.info(`Supported commands: ${Object.keys(COMMANDS).join(", ")}`);
    process.exit(1);
  }

  log.info(`Starting ${command} for ${packages.length} packages...`);
  const results = await runCommand(command, packages);

  // Summary
  const succeeded = results.filter(({ status }) => status === "success");
  const failed = results.filter(({ status }) => status === "failed");

  log.success(`\n${succeeded.length} packages succeeded:`);
  succeeded.forEach(({ package: pkg }) => console.log(` - ${pkg}`));

  if (failed.length > 0) {
    log.error(`\n${failed.length} packages failed:`);
    failed.forEach(({ package: pkg, error }) =>
      console.log(` - ${pkg}: ${error}`)
    );
  }
};

main().catch((err) => {
  log.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});

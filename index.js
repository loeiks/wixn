#!/usr/bin/env node

import { execa } from 'execa';
import ora from 'ora';
import chalk from 'chalk';

const args = process.argv.slice(2);
const installCommands = ['install', 'i'];
const uninstallCommands = ['remove', 'uninstall', 'rm'];

const log = {
    success: (msg) => console.log(chalk.green.bold(msg)),
    error: (msg) => console.log(chalk.red.bold(msg)),
    info: (msg) => console.log(chalk.blue.bold(msg)),
};

let type = null;
let action = null;

const main = async () => {
    if (args.length < 2) {
        console.log("Please provide a command (install, uninstall) and package name.");
        process.exit(1);
    }

    if (installCommands.includes(args[0])) {
        type = "install";
        action = "Installing"
    } else if (uninstallCommands.includes(args[0])) {
        type = "uninstall";
        action = "Uninstalling"
    } else {
        console.error(`Invalid command: ${args[0]}`);
        process.exit(1);
    }

    args.shift();

    const completedPackages = [];
    const failedPackages = [];
    const spinner = ora({ text: chalk.bold(`${action} packages...`) }).start();

    for (const packageName of args) {
        ora(spinner.text = chalk.bold(`${action} ${chalk.blue(packageName)}...`));
        const result = await execa("wix", [type, packageName], { cwd: process.cwd() });

        if (result.exitCode === 0) {
            completedPackages.push(packageName);
            log.success(`\n✅ ${packageName} ${action.slice(0, -4).toLowerCase()}led`);
        } else {
            log.error(`Error when ${action.toLowerCase()} ${packageName}`);
            console.error(error);
            failedPackages.push(packageName);
            log.error(`\n❌ ${packageName} ${action.slice(0, -4).toLowerCase()}led`);
        }
    }

    if (failedPackages.length > 0) {
        log.error(`Failed to ${action.slice(0, -4).toLowerCase()} packages: ${failedPackages.join(', ')}\n`);
    }

    spinner.clear();

    const tick = chalk.greenBright.bold(('✔'));
    console.log(tick, chalk.bold(`${action.slice(0, -4)}led Packages: ${chalk.green(completedPackages.join(', '))}`));
    process.exit(0);
}

main();
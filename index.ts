#!/usr/bin/env node

import { execa } from 'execa';
import ora, { Ora } from 'ora';
import chalk from 'chalk';
import _ from 'lodash'

const args = process.argv.slice(2);
const installCommands = ['install', 'i', 'add'];
const uninstallCommands = ['remove', 'uninstall', 'rm'];

const log = {
    success: (msg: string) => console.log(chalk.green.bold(msg)),
    error: (msg: string) => console.log(chalk.red.bold(msg)),
    info: (msg: string) => console.log(chalk.blue.bold(msg)),
};

let spinner: Ora;
const wixn: { type: string, action: string, currentAction: string, skipWixInstall: boolean } = {
    action: "",
    type: "",
    currentAction: "",
    skipWixInstall: false
};

const main = async () => {
    try {
        if (args.length < 2) {
            log.error("Please provide a command (install, uninstall) and package name.");
            process.exit(1);
        }

        if (installCommands.includes(args[0])) {
            wixn.type = "install";
            wixn.action = "Installing"
            wixn.currentAction = wixn.action + " packages";
        } else if (uninstallCommands.includes(args[0])) {
            wixn.type = "uninstall";
            wixn.action = "Uninstalling"
            wixn.currentAction = wixn.action + " packages";
        } else {
            log.error(`Invalid command: ${args[0]}`);
            process.exit(1);
        }

        if (args.includes("--nx")) {
            wixn.skipWixInstall = true;
        }

        const packagesToProcess = args.slice(1).filter(s => s !== "--nx");
        const actionPastTense = `${wixn.type}ed`; // e.g., "installed", "uninstalled"

        // Start the spinner to show overall progress.
        spinner = ora({ text: chalk.bold(`${wixn.action} packages...`) }).start();

        const loadingDots = ['.', '..', '...'];
        let loadingDotsIndex = 0;

        setInterval(() => {
            spinner.text = chalk.bold(`${wixn.currentAction}${loadingDots[loadingDotsIndex]}`);
            loadingDotsIndex = (loadingDotsIndex + 1) % loadingDots.length; // Cycle through dots
        }, 400);

        const completedPackages: string[] = [];
        const failedPackages: string[] = [];

        // Create an array of promises, each handling a package installation/uninstallation concurrently.
        // Each promise temporarily stops the spinner to log its progress and then restarts it.
        const packagePromises = packagesToProcess.map(async (packageName) => {
            try {
                await execa("npm", [wixn.type, packageName], { cwd: process.cwd() });

                spinner.stop();
                log.success(`✅ ${chalk.bold(packageName)} ${actionPastTense}`);
                spinner.start();
                completedPackages.push(packageName);

                return { status: 'fulfilled', packageName };
            } catch (error: any) {
                spinner.stop();
                log.error(`❌ ${chalk.bold(packageName)} couldn't ${actionPastTense}`);
                spinner.start();
                failedPackages.push(packageName);

                return { status: 'rejected', packageName, error: error.message as string };
            }
        });

        const start = performance.now();

        const packagePromiseChunks = _.chunk(packagePromises, 5);
        for (const promises of packagePromiseChunks) {
            await Promise.allSettled(promises);
        }

        if (!wixn.skipWixInstall) {
            wixn.currentAction = "Applying changes to Wix"
            await execa("wix", ["install"], { cwd: process.cwd() });
        }

        const end = performance.now() - start;
        spinner.clear();

        // Print the final summary
        const summary = chalk.bold(`${wixn.action.slice(0, -4)}led Packages: ${chalk.green(completedPackages.join(', '))} ${chalk.bold((end / 1000).toFixed(2))}s`)

        if (failedPackages.length > 0) {
            log.error(`\nFailed to ${wixn.type} packages: ${failedPackages.join(', ')}`);
            console.log(summary);
            process.exit(1);
        }

        console.log("\n" + summary);
        process.exit(0);
    } catch (err: any) {
        if (spinner && spinner.isSpinning) {
            spinner.clear();
        }

        log.error(`\n\nMake sure @wix/cli is installed and you are in a Wix project directory as a logged-in user.`);
        log.error(`Run 'npm i -g @wix/cli@latest' to install Wix CLI tools, and then run 'wix login' to login into your Wix account.`);
        log.error(`\nError: ${err.message}`);
        process.exit(1);
    }
}

main();
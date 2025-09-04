#!/usr/bin/env node

import { execa } from 'execa';
import ora from 'ora';
import chalk from 'chalk';

const args = process.argv.slice(2);
const installCommands = ['install', 'i', 'add'];
const uninstallCommands = ['remove', 'uninstall', 'rm'];

const log = {
    success: (msg) => console.log(chalk.green.bold(msg)),
    error: (msg) => console.log(chalk.red.bold(msg)),
    info: (msg) => console.log(chalk.blue.bold(msg)),
};

const wixn = {
    type: null,
    action: null
}

const main = async () => {
    /**@type {import('ora').Ora} */
    let spinner;
    let spinnerInterval;

    try {
        if (args.length < 2) {
            log.error("Please provide a command (install, uninstall) and package name.");
            process.exit(1);
        }

        if (installCommands.includes(args[0])) {
            wixn.type = "install";
            wixn.action = "Installing"
        } else if (uninstallCommands.includes(args[0])) {
            wixn.type = "uninstall";
            wixn.action = "Uninstalling"
        } else {
            log.error(`Invalid command: ${args[0]}`);
            process.exit(1);
        }

        const packagesToProcess = args.slice(1);
        const actionPastTense = `${wixn.type}ed`; // e.g., "installed", "uninstalled"

        // Start the spinner to show overall progress.
        spinner = ora({ text: chalk.bold(`${wixn.action} packages...`) }).start();

        const loadingDots = ['.', '..', '...'];
        let loadingDotsIndex = 0;

        spinnerInterval = setInterval(() => {
            spinner.text = chalk.bold(`${wixn.action} packages${loadingDots[loadingDotsIndex]}`);
            loadingDotsIndex = (loadingDotsIndex + 1) % loadingDots.length; // Cycle through dots
        }, 400);

        const completedPackages = [];
        const failedPackages = [];

        // Create an array of promises, each handling a package installation/uninstallation concurrently.
        // Each promise temporarily stops the spinner to log its progress and then restarts it.
        const packagePromises = packagesToProcess.map(async (packageName) => {
            try {
                await execa("wix", [wixn.type, packageName], { cwd: process.cwd() });

                spinner.stop();
                log.success(`✅ ${chalk.bold(packageName)} ${actionPastTense}`);
                spinner.start();
                completedPackages.push(packageName);

                return { status: 'fulfilled', packageName };
            } catch (error) {
                spinner.stop();
                log.error(`❌ ${chalk.bold(packageName)} couldn't ${actionPastTense}`);
                spinner.start();
                failedPackages.push(packageName);

                return { status: 'rejected', packageName, error: error.message };
            }
        });

        const start = performance.now();
        await Promise.allSettled(packagePromises);
        const end = performance.now() - start;
        clearInterval(spinnerInterval);
        spinner.stop();

        // Print the final summary
        const summary = chalk.bold(`${wixn.action.slice(0, -4)}led Packages: ${chalk.green(completedPackages.join(', '))} ${chalk.bold((end / 1000).toFixed(2))}s`)

        if (failedPackages.length > 0) {
            log.error(`\nFailed to ${wixn.type} packages: ${failedPackages.join(', ')}`);
            console.log(summary);
            process.exit(1);
        }

        console.log("\n" + summary);
        process.exit(0);
    } catch (err) {
        if (spinnerInterval) {
            clearInterval(spinnerInterval);
        }

        if (spinner && spinner.isSpinning) {
            spinner.stop();
        }

        log.error(`\n\nMake sure @wix/cli is installed and you are in a Wix project directory as a logged-in user.`);
        log.error(`Run 'npm i -g @wix/cli@latest' to install Wix CLI tools, and then run 'wix login' to login into your Wix account.`);
        log.error(`\nError: ${err.message}`);
        process.exit(1);
    }
}

main();
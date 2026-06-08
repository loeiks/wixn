# wixn

This simple tool let you easily install and uninstall multiple packages for your Wix websites. Example usage;

```bash
npx wixn add moment lodash axios @wix/stores
```

```bash
npx wixn rm axios lodash
```

> You can use `bunx` too!

**You can install with the following aliases:**

- install
- add
- i

**You can uninstall with the following aliases:**

- uninstall
- remove
- rm

## Install

If you don't want to repeat `npx` or `bunx` prefix every time you can install package globally:

`bun add -g wixn` or `npm install -g wixn` and then just use `wixn` as a direct command like this:

```bash
wixn add moment lodash axios @wix/stores
```

### How it Works?

`wixn` runs install or uninstall commands in parallel, it uses `npm install` and `npm uninstall` instead of `wix install/uninstall` this makes process faster but to apply changes on Wix `wix install` has to run. So `wixn` runs `wix install` command at the end and apply changes.

If you only need the autocompletions etc at the current moment you can use `--nx` flag and skip `wix install` command in the end. But before you preview or deploy changes you should run `wix install` to apply changes also for Wix. 

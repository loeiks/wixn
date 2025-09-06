# wixn

This is a simple tool to let you easily install and uninstall multiple NPM packages for your Wix websites. Example usage;

```cli
npx wixn i/install/add moment lodash axios @wix/stores
```

```cli
npx wixn rm/remove/uninstall axios lodash
```

**You can install with the following commands;**

- install
- add
- i

**You can uninstall with the following commands;**

- uninstall
- remove
- rm

---

### How it Works?

`wixn` runs install or uninstall commands in parallel, it uses `npm install` and `npm uninstall` instead of `wix install/uninstall` this makes process faster but to apply changes on Wix `wix install` has to run. So `wixn` runs `wix install` command at the end and apply changes.

If you only need the autocompletions etc at the current moment you can use `--nx` flag and skip `wix install` command in the end. But before you preview or deploy changes you should run `wix install` to apply changes also for Wix. 

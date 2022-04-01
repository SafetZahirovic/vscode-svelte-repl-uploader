# repl-svelte README

This is a simple extension that allows you to upload svelte files to REPL. Simply choose files you want to upload, give REPL a name and you´re done. 

# Getting the token

In order to get the token, you'll need to do the following: 

1. Login to Svelte REPL: ![alt text](./assets/login.png)
2. Login and authorize app on github: ![alt text](./assets/authorize.png)
3. When done, go Chrome dev tools (⌥⌘I) and copy only `value` from svelte.dev cookied. You don't need name (`sid`): ![alt text](./assets/token.png)
4. In vscode settings, search for `replSvelte` and paste in your token there.
5. Done 🥳
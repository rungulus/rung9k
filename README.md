# rung9k
discord bot that do r9k things (working 2023 no glitches)

- monitors specified channel
- deletes duplicate messages
- mutes user (from channel) for 2 seconds, quadrupling each time they send a duplicate message
- mutes decay after 6 hours
- monitors posts for specific reactions, and if a user gets over 5 it bans them (from the channel only!)

### [click here for an r9k explainer](https://blog.xkcd.com/2008/01/14/robot9000-and-xkcd-signal-attacking-noise-in-chat/)

## installing
- clone the repo and open a terminal inside the extracted folder
- run `npm install`
- edit `config.setup.json` and rename it to `config.json`
- run `node .`

you can ignore the ENO errors, they should be fixed when the bot starts gathering data

### future
- delete non-ascii posts
- mutliple channel support
- use commands to designate channel not config.json
- more sex
- use discord timeouts instead of channel permissions (if we can get granular)
- levenshtein distance support

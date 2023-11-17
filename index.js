const fs = require('fs');
const { Client } = require('discord.js');
const crypto = require('crypto');
const config = require('./config.json');
const { Intents } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
let messageHashes = {};

function calculateDelay(count) {
    return Math.min(6 * 60 * 60 * 1000, 2000 * Math.pow(4, count));
}

client.once('ready', () => {
    console.log('Bot is online');

    if (fs.existsSync('data.json')) {
        try {
            const data = fs.readFileSync('data.json', 'utf8');
            const parsedData = JSON.parse(data);
            messageHashes = parsedData.hashes || {};
        } catch (err) {
            console.error('Error reading file:', err);
        }
    }
});

client.on('message', async (message) => {
    if (message.author.bot || message.channel.id !== config.channelID) return;

    const contentWithoutSpecialChars = message.content.replace(/[^a-zA-Z0-9]/g, '');
    const lowercaseContent = contentWithoutSpecialChars.toLowerCase();
    const hash = crypto.createHash('md5').update(lowercaseContent).digest('hex');

    // if (message.reactions.cache.has(emojiToCheck) && message.reactions.cache.get(emojiToCheck).count >= requiredReactions) {
    //     console.log(`Detected ${requiredReactions} reactions of ${emojiToCheck} on a message.`);
    //     const userPermissions = message.channel.permissionsFor(message.author);
    //     if (userPermissions && userPermissions.has('SEND_MESSAGES')) {
    //         await message.channel.updateOverwrite(message.author, {
    //             SEND_MESSAGES: false,
    //         });
    //         console.log(`User ${message.author.tag} has been restricted from sending messages in this channel.`);
    //     }
    // }


	if (messageHashes[hash]) {
		const count = messageHashes[hash].count || 0;
		const delay = calculateDelay(count);

		const userPermissions = message.channel.permissionsFor(message.author);

		if (userPermissions && userPermissions.has('SEND_MESSAGES')) {
			await message.channel.updateOverwrite(message.author, {
				SEND_MESSAGES: false,
			});
			setTimeout(async () => {
				await message.channel.updateOverwrite(message.author, {
					SEND_MESSAGES: true,
				});
			}, delay);
		}

		const deletedContent = message.content;
		message.delete();

		try {
			const userToDM = await client.users.fetch(message.author.id);
			const countdownTime = new Date(Date.now() + delay);
			const unixTimestamp = Math.floor(countdownTime.getTime() / 1000);
			await userToDM.send(`Sending "${deletedContent}" is very unwise. You can post again <t:${unixTimestamp}:R>.`);
		}
		catch (error) {
			console.error('Error sending DM:', error);
		}

		messageHashes[hash].count = count + 1;
		messageHashes[hash].expireTimestamp = Date.now() + delay;
	}
	else {
		messageHashes[hash] = {
			count: 1,
			lowercaseContent: lowercaseContent, // Store lowercase content
		};

		console.log(`Message "${message.content}" hashed to ${hash}`);
	}
});

client.on('messageReactionAdd', async (reaction, user) => {
	const emojiToCheck = '➖'; // Replace with your emoji to check
    const requiredReactions = 5;

    try {
        // Fetch the message associated with the reaction
        const message = reaction.message;

        // Your logic for handling reactions added to any message
        if (message.reactions.cache.get(emojiToCheck).count >= requiredReactions) {
			const userPermissions = message.channel.permissionsFor(message.author);
			if (userPermissions && userPermissions.has('SEND_MESSAGES')) {
				await message.channel.updateOverwrite(message.author, {
					SEND_MESSAGES: false,
				});
            console.log('Saw specified emote! They are past limit!');
        }
        console.log('Saw reaction!');
	}
    } catch (error) {
        console.error('Error handling reaction:', error);
    }
});

client.login(config.token);

setInterval(() => {
	const now = Date.now();
	for (const hash in messageHashes) {
		if (messageHashes[hash].expireTimestamp && messageHashes[hash].expireTimestamp <= now) {
			delete messageHashes[hash];
		}
	}

	fs.writeFile('data.json', JSON.stringify({ hashes: messageHashes }), (err) => {
		if (err) throw err;
	});
}, 30000);

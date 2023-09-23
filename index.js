const fs = require('fs');
const { Client } = require('discord.js');
const crypto = require('crypto');
const config = require('./config.json');

const client = new Client();
let messageHashes = {};

function calculateDelay(count) {
	return Math.min(6 * 60 * 60 * 1000, 2000 * Math.pow(4, count));
}

client.once('ready', () => {
	console.log('Bot is online');

	// Load existing data from file, if it exists
	if (fs.existsSync('data.json')) {
		try {
			const data = fs.readFileSync('data.json', 'utf8');
			const parsedData = JSON.parse(data);
			messageHashes = parsedData.hashes || {};
		}
		catch (err) {
			console.error('Error reading file:', err);
		}
	}
});

client.on('message', async (message) => {
	if (message.author.bot || message.channel.id !== config.channelID) return;

	const contentWithoutSpecialChars = message.content.replace(/[^a-zA-Z0-9]/g, '');
	const hash = crypto.createHash('md5').update(contentWithoutSpecialChars).digest('hex');

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
			// Initialize count to 1 for new entries
		};

		console.log(`Message "${message.content}" hashed to ${hash}`);
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

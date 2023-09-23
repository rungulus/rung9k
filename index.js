const fs = require('fs');
const { Client } = require('discord.js');
const crypto = require('crypto');
const config = require('./config.json');

const client = new Client();
let messageHashes = {};

// Load existing data from file, if it exists
try {
	const data = fs.readFileSync('data.json', 'utf8');
	const parsedData = JSON.parse(data);
	messageHashes = parsedData.hashes || {};
}
catch (err) {
	console.error('Error reading file:', err);
}

client.once('ready', () => {
	console.log('Bot is online');
});

client.on('message', async (message) => {
	if (message.author.bot || message.channel.id !== config.channelID) return;

	const hash = crypto.createHash('md5').update(message.content).digest('hex');
	const user = message.author.id;

	if (messageHashes[hash] && messageHashes[hash].author === user) {
		const originalMessage = messageHashes[hash];
		const count = originalMessage.count || 0;
		const delay = 2000 * Math.pow(2, count);

		const userPermissions = message.channel.permissionsFor(originalMessage.author);

		if (userPermissions && userPermissions.has('SEND_MESSAGES')) {
			await message.channel.updateOverwrite(originalMessage.author, {
				SEND_MESSAGES: false,
			});
			setTimeout(async () => {
				await message.channel.updateOverwrite(originalMessage.author, {
					SEND_MESSAGES: true,
				});
			}, delay);
		}

		const deletedContent = message.content;
		// Store the content of the deleted message

		message.delete();

		try {
			const userToDM = await client.users.fetch(originalMessage.author);
			const countdownTime = new Date(Date.now() + delay);
			const unixTimestamp = Math.floor(countdownTime.getTime() / 1000);
			// Convert to seconds
			await userToDM.send(`Sending "${deletedContent}" is very unwise. You can post again <t:${unixTimestamp}:R>.`);
		}
		catch (error) {
			console.error('Error sending DM:', error);
		}

		messageHashes[hash].count = count + 1;
		messageHashes[hash].expireTimestamp = Math.floor((Date.now() + delay) / 1000);
		// Convert to seconds
	}
	else {
		messageHashes[hash] = {
			author: user,
			count: 0,
		};

		console.log(`Message "${message.content}" hashed to ${hash}`);
	}
});


client.login(config.token);

// Save message hashes to file periodically
setInterval(() => {
	fs.writeFile('data.json', JSON.stringify({ hashes: messageHashes }), (err) => {
		if (err) throw err;
	});
}, 30000);
// Save every 30 seconds

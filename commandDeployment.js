const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const env = require('dotenv').config({ path: './Configs/.env' })

if (env.error) {
	console.log(chalk.red('Error loading .evn configs!'))
	return
}

const token = process.env.TOKEN;
const clientID = process.env.CLIENT_ID;

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationCommands(clientID), { body: commands })
	.then(() => console.log('Commandos registrados com sucesso!'))
	.catch(console.error);

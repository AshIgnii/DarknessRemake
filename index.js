//Libs
const fs = require('fs');
const { Client, Collection, Intents, MessageEmbed } = require('discord.js');
const Voice = require('@discordjs/voice');
const chalk = require('chalk');

//Configs
const token = require('./Configs/settings.json').token;
const hguildID = require('./Configs/settings.json').homeGuildID;
const hgErrorChannel = require('./Configs/settings.json').homeGuildErrorChannel;

//Client
const myIntents = new Intents();
myIntents.add(Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES);

const client = new Client({ intents: myIntents });
const queue = new Map();

//Registro dos Commandos
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));


for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

//Functions
async function logError(eInteraction, e) {
	let hguild = await client.guilds.cache.find(hg => hg.id == hguildID);
	let echannel = await hguild.channels.fetch(hgErrorChannel);

	let embed = new MessageEmbed()
		.setAuthor('Erro', 'https://cdn0.iconfinder.com/data/icons/shift-free/32/Error-512.png')
		.setColor('RED')
		.setDescription(`Comando: ${eInteraction.commandName} \n Autor: ${eInteraction.user.tag} \n Server: ${eInteraction.guild.name} \n \n ${e.name + ': ' + e.message}`)
		.setTimestamp(eInteraction.createdTimestamp)
	echannel.send({embeds:[embed]})
}

//Ready Event
client.once('ready', () => {
	//Console
	const version = require('./package.json').version;
	const name = require('./package.json').name;
	const author = require('./package.json').author;

	let pText = `
      d8b                     d8b
      88P                     ?88
     d88                       88b
 d888888   d888b8b    88bd88b  888  d88'  88bd88b  d8888b .d888b, .d888b,
d8P  ?88  d8P  ?88    88P      888bd8P    88P  ?8bd8b_,dP ?8b,    ?8b,
88b  ,88b 88b  ,88b  d88      d88888b    d88   88P88b        ?8b     ?8b
 ?88P  88b ?88P' 88bd88'     d88'  ?88b,d88'   88b ?888P' ?888P'  ?888P
 `
  console.log(chalk.blueBright(pText))
  console.log('===================================');
  console.log(chalk.green('Estou Online!') + '\n' +
    'Bot:' + name + '\n' +
    'Autor:' + author + '\n' +
    'Versão:' + version + '\n' +
    'Servers:' + client.guilds.cache.size); //Cmd Output
  console.log('===================================');
  console.log(chalk.blueBright('Log:'));
});

//Interaction Event
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);
	const serverQueue = queue.get(interaction.guild.id);

	if (!command) return;
	console.log(chalk.bgYellow('Processando comando...'));
  console.log(chalk.yellow(`Comando:${interaction.commandName}, Server:${interaction.guild.name}, Autor:${interaction.user.tag}`));

	try {
		if (interaction.commandName == 'tocar') {
			await command.execute(interaction, serverQueue, queue);
			console.log('tocar')
		} else {
			await command.execute(interaction);
		}
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'Ocorreu um erro durante a execução deste comando :(', ephemeral: true });
		logError(interaction, error)
	}
});

//Login
client.login(token);

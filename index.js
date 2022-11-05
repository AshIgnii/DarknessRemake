//Libs
const fs = require('fs');
const {
  Client,
  Collection,
  GatewayIntentBits,
  EmbedBuilder,
  InteractionType
} = require('discord.js');
const Voice = require('@discordjs/voice');
const chalk = require('chalk');
const env = require('dotenv').config({
  path: './Configs/.env'
})


//Configs
BigInt.prototype["toJSON"] = function() {
  return this.toString();
};

if (env.error) {
  console.log(chalk.red('Erro ao carregar .env'));
  return;
}

const logFolder = './Logs/';
const token = process.env.TOKEN;
const hguildID = process.env.HOME_GUILD_ID;
const hgErrorChannel = process.env.HOME_GUILD_ERROR_CHANNEL;


//Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages]
});
const queue = new Map();

//Commands setup
client.commands = new Collection();
const commandFiles = fs.readdirSync('./Commands').filter(file => file.endsWith('.js'));


for (const file of commandFiles) {
  const command = require(`./Commands/${file}`);
  client.commands.set(command.data.name, command);
};

//Functions
async function logError(eInteraction, e) {
  let errObj = {
    Error: []
  };
  errObj.Error.push({
    Interaction: eInteraction
  }, {
    Name: e.name
  }, {
    Message: e.message
  }, {
    Path: `${e.fileName} : ${e.collumnNumber}:${e.lineNumber}`
  }, {
    Cause: e.cause
  }, {
    Stack: e.stack
  });
  let eObjJSON = JSON.stringify(errObj);

  let tdy = new Date();

  let mon = tdy.getMonth() + 1;
  if (mon < 10) mon = '0' + mon;

  let day = tdy.getDate();
  if (day < 10) day = '0' + day;

  let yr = tdy.getFullYear();
  let hr = tdy.getHours();
  let min = tdy.getMinutes();
  let sec = tdy.getSeconds();

  let formDate = `${hr}:${min}:${sec}-${day}/${mon}/${yr}`;

  await fs.writeFile(`Error-${formDate}.json`, eObjJSON);

  let hguild = await client.guilds.cache.find(hg => hg.id == hguildID);
  let echannel = await hguild.channels.fetch(hgErrorChannel);

  let embed = new EmbedBuilder()
    .setAuthor({
      name: 'Erro',
      iconURL: 'https://cdn0.iconfinder.com/data/icons/shift-free/32/Error-512.png'
    })
    .setColor('Red')
    .setDescription(`Comando: ${eInteraction.commandName} \n Autor: ${eInteraction.user.tag} \n Server: ${eInteraction.guild.name} \n \n ${e.name + ': ' + e.message}`)
    .setTimestamp(eInteraction.createdTimestamp)
  echannel.send({
    embeds: [embed]
  });
};

//Ready Event
client.once('ready', () => {
  //Terminal Output
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
  console.log(chalk.blueBright(pText));
  console.log('===================================');
  console.log(chalk.green('Estou Online!') + `\n
    Bot: ${name} \n
    Autor: ${author} \n
    Versão: ${version} \n
    Servers: ${client.guilds.cache.size}`);
  console.log('===================================');
  console.log(chalk.blueBright('Log:'));
});

//Interaction Event
client.on('interactionCreate', async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) return;
  console.log(chalk.bgYellow('Processando comando...'));
  console.log(chalk.yellow(`Comando:${interaction.commandName}, Server:${interaction.guild.name}, Autor:${interaction.user.tag}`));

  try {
    if (interaction.commandName == 'play' || interaction.commandName == 'skip') {
      let serverQueue;
      if (queue.has(interaction.guild.id)) {
        serverQueue = await queue.get(interaction.guild.id);
        if (serverQueue.has('construct') && serverQueue.get('construct').songs.length <= 0) {
          serverQueue.delete('construct')
        }
      } else {
        serverQueue = queue.set(interaction.guild.id, new Map())
      }
      await command.execute(interaction, serverQueue, queue);
    } else {
      await command.execute(interaction);
    }
  } catch (error) {
    console.error(error);
    try {
      reply = await interaction.channel.send({
          content: 'Ocorreu um erro durante a execução deste comando :('
        })
        .then(setTimeout(() => {
          reply.delete();
        }, 10000));
    } catch (e) {
      console.log('Erro!', e)
    }
    logError(interaction, error);
  };
});

//Login
client.login(token);

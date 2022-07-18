const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Testa o seu ping com o bot e mostra a latência com a API.'),
	async execute(interaction) {
		let ping = (Date.now() - interaction.createdTimestamp)
	  let api = interaction.client.ws.ping
		let embed = new EmbedBuilder()
	  	.setAuthor({name:'Pong!', iconURL:'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/259/ping-pong_1f3d3.png'})
	  	.setColor('GREEN')
	  	.setDescription(`💻 Sua latência com o bot é: \`${ping}ms\`. \n 📡 A API está com \`${api}ms\` de latência.`)
		  .setTimestamp(interaction.createdTimestamp)
		await interaction.reply({embeds: [embed]});
	},
};

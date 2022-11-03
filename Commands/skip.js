const {
  SlashCommandBuilder,
  EmbedBuilder,
  guildClientVoice
} = require('discord.js');
const Voice = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setNameLocalization('pt-BR', 'pular')
    .setDescription('Skips to the next song in the queue')
    .setDescriptionLocalization('pt-BR', 'Pula para a proxima música na fila'),
  async execute(interaction, serverQueue, queue) {
    await interaction.deferReply();

    let queuecst = await serverQueue.get('construct');
    if (typeof queuecst === 'undefined' || queuecst === null) { //Check if queue exists
      await interaction.editReply({content:'Não estou tocando nada no momento!', ephemeral: false});
      return;
    };

    let guildClientVoice = await Voice.getVoiceConnection(interaction.guildId);
    let member = await interaction.member;
    if (typeof guildClientVoice.joinConfig.channelId !== 'undefined' || typeof guildClientVoice.joinConfig.channelId !== null) {
      let vchannel = interaction.guild.channels.cache.find(chnl => chnl.id == guildClientVoice.joinConfig.channelId);
      if (vchannel === member.voice.channel) {

        try {
          let djrole = member.roles.cache.find(role => role.name.toLowerCase() == 'dj');
          djrole = typeof djrole !== 'undefined' || djrole === null;
        } catch(e) {
          djrole = false
          throw e;
        }

        if (vchannel.members.length <= 2 || djrole || member.permissions.has('MANAGE_CHANNELS', true)) {
          const queueConstruct = await queue.get(interaction.guild.id).get('construct');
          await queueConstruct.connection.emit('skip');
          await interaction.editReply({content:'⏩ Pulando a música atual...', ephemeral: false});
          return;
        } else {
          await interaction.editReply({content:'🚫 Você não tem as permissões necessárias para realizar essa ação!', ephemeral: false});
          return;
        };
      };
      await interaction.editReply({content:'Não estou em seu canal de voz!', ephemeral: false});
      return;
    };
  },
};

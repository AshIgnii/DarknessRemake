const {
  SlashCommandBuilder
} = require('@discordjs/builders');
const {
  EmbedBuilder,
  VoiceChannel
} = require('discord.js');
const Voice = require('@discordjs/voice');
const ytsr = require('ytsr');
const playdl = require('play-dl');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tocar')
    .setDescription('Adiciona uma musica à fila para ser tocada')
    .addStringOption(option =>
      option.setName('musica')
      .setDescription('URL do youtube ou termo de pesquisa')
      .setRequired(true)),
  async execute(interaction, serverQueue, queue) {
    function validURL(str) {
      var pattern = new RegExp('^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$');
      return !!pattern.test(str);
    };

    client = interaction.client;
    await interaction.deferReply(); //Differ the reply to avoid errors

    if (!interaction.member.voice.channel) {
      interaction.editReply({
        content: 'Você precisa estar em um canal de voz para executar esse comando',
        ephemeral: true
      });
      return;
    };

    let args = interaction.options.get('musica').value;
    if (typeof serverQueue.get('construct') === 'undefined' || serverQueue.get('construct') === null) {
      const constructTemplate = {
        textChannel: interaction.channelId,
        voiceChannel: interaction.member.voice.channelId,
        songs: [],
        connection: null,
        volume: 5,
        playing: false
      };
      serverQueue.set('construct', constructTemplate);
    };

    var songurl;
    if (validURL(args) && args.includes('watch')) { //Video
      songurl = args;
    } else if (validURL(args) && args.includes('list')) { //Playlist
      interaction.editReply({
        content: 'Playlists ainda não são suportadas =(',
        ephemeral: true
      });
    } else { //Search term
      try {
        searchResult = await ytsr(args, options = {
          limit: 2
        });
      } catch (e) {
        console.log(e);
        return;
      };

      fsturl = searchResult.items[0].url.toString();
      sndurl = searchResult.items[1].url.toString();

      if (fsturl.startsWith('https://www.youtube.com/user') && !sndurl.startsWith('https://www.youtube.com/user')) {
        songurl = sndurl;
      } else if (!fsturl.startsWith('https://www.youtube.com/user')) {
        songurl = fsturl;
      } else {
        interaction.editReply({
          content: 'Não consegui encontrar nenhum vídeo =(',
          ephemeral: true
        });
        return;
      };
    };

    //Info
    songInfo = await playdl.video_basic_info(songurl);

    let thumb = await songInfo.video_details.thumbnails;

    let likes = await songInfo.video_details.likes;
    if (likes == null) {
      likes = '0'
    };

    let length = await songInfo.video_details.durationRaw;

    let requester = interaction.member.displayName;

    let views = songInfo.video_details.views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); //Adds commas

    song = {
      title: songInfo.video_details.title,
      url: songInfo.video_details.url,
      thumb: thumb[3].url,
      views: views,
      author: songInfo.video_details.channel.name,
      likes: likes,
      requester: requester,
      duration: length,
    };

    //Push
    serverQueue.get('construct').songs.push(song);

    //Play
    voiceChannel = interaction.member.voice.channel;
    guildID = interaction.guild.id;
    creator = voiceChannel.guild.voiceAdapterCreator;
    queueConstruct = await serverQueue.get('construct');

    let con = await Voice.getVoiceConnection(interaction.guild.id); //Check if bot is already in a voice channel

    if (typeof con === 'undefined' || con === null) { //If not join voice channel and begin playing
      const connection = await Voice.joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildID,
        adapterCreator: creator,
      });
      play(interaction.guild, queueConstruct.songs[0], true, connection);
      return;
    } else { //Else, notify that the song has been added to the queue
      if (typeof leaveTimeout === 'undefined' || leaveTimeout === null) {
        queueConstruct.connection = con;

        let embed = createEmbed('queue', song)
        interaction.editReply({
          embeds: [embed]
        });
        return;
      } else {
        queueConstruct.connection = con;
        play(interaction.guild, queueConstruct.songs[0], true, queueConstruct.connection);
      }
    };

    //Play function
    async function play(guild, song, message, connection, player, currentlyPlayingMsgId) {
      var msg;
      if (message == true) {
        let rembed = createEmbed('queue', song)
        interaction.editReply({
          embeds: [rembed]
        });

        let embed = createEmbed('playing', song)
        msg = await interaction.channel.send({
          embeds: [embed]
        });
        currentlyPlayingMsgId = msg.id
      };

      if (!song) {
        queueConstruct.playing = false
        if (typeof leaveTimeout === 'undefined' || leaveTimeout === null) {
          leaveTimeout = setTimeout(function() {
            leaveIfInactive()
          }, 60000);
        };
        return;
      };

      var plr;
      if (typeof player === 'undefined' || player === null) {
        //Create player
        const player = await Voice.createAudioPlayer({
          behaviors: {
            noSubscriber: Voice.NoSubscriberBehavior.Pause,
          },
        });
        plr = player
      } else {
        plr = player
      };

      //Set resource and play
      let songst = await playdl.stream(song.url);
      const resource = await Voice.createAudioResource(songst.stream, {
        inputType: songst.type
      });
      plr.play(resource);

      //Add a listener to play the next song in the queue (if it does not exist already)
      if (plr.listenerCount('stateChange') == 0) { //Prevents multiple listeners
        plr.addListener('stateChange', async (oldS, newS) => {
          if (newS.status == 'idle' && oldS.status == 'playing') { //Check if a song finished
            serverQueue = await queue.get(interaction.guild.id);
            queueConstruct = await serverQueue.get('construct'); //Update the construct

            if (!queueConstruct || queueConstruct.songs.length == 0) { //Leave if there's no more songs
              queueConstruct.playing = false
              if (typeof leaveTimeout === 'undefined' || variable === null) {
                leaveTimeout = setTimeout(function() {
                  leaveIfInactive()
                }, 60000);
              };
              return;
            };
            if (queueConstruct.songs.length != 0) { //Shift the queue and play the next song
              queueConstruct.songs.shift();
              await play(interaction.guild, queueConstruct.songs[0], false, connection, plr, currentlyPlayingMsgId);

              if (currentlyPlayingMsgId) {
                song = queueConstruct.songs[0]
                if (typeof song == 'undefined') return;
                let embed = createEmbed('playing', song)
                let eMsg = await interaction.channel.messages.fetch(currentlyPlayingMsgId);
                eMsg.edit({
                  embeds: [embed]
                });
              };
            };
          };
        });
      };

      //Subscribe
      const subscription = connection.subscribe(plr);
      queueConstruct.playing = true
      serverQueue = queue.get(interaction.guild.id);
      serverQueue.set('construct', queueConstruct); //Update the serverQueue
    };

    async function leaveIfInactive() {
      serverQueue = await queue.get(interaction.guild.id);
      queueConstruct = await serverQueue.get('construct');
      if (!queueConstruct || queueConstruct.songs.length == 0) {
        let con = await Voice.getVoiceConnection(interaction.guild.id);
        con.destroy();
        queue.delete(interaction.guild.id);
      };
    };

    function createEmbed(type, mSong) {
      if (typeof mSong == 'undefined') return;

      let typeMsg;
      let color;
      if (type == 'queue') {
        typeMsg = 'Foi adicionado a fila!';
        color = 'DARK_PURPLE';
      } else if (type == 'playing') {
        typeMsg = '🎧 Tocando';
        color = 'FUCHSIA';
      };

      let avt = client.user.avatarURL()
      let embed = new EmbedBuilder()
        .setAuthor({
          name: `${typeMsg}`,
          iconURL: avt.toString()
        })
        .setThumbnail(mSong.thumb)
        .setColor(color)
        .setDescription(`**[${mSong.title}](${mSong.url})**`)
        .setURL(mSong.url)
        .setTimestamp(interaction.createdTimestamp)

      if (type == 'playing') {
        embed.addFields({
          name: '**Views**',
          value: `${mSong.views}`,
          inline: true
        }, {
          name: '**Autor**',
          value: `${mSong.author}`,
          inline: true
        }, {
          name: '**Avaliação**',
          value: `👍 ${mSong.likes}`,
          inline: true
        });
      };

      return embed;
    }
  }
};

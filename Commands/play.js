const {
  SlashCommandBuilder
} = require('@discordjs/builders');
const {
  EmbedBuilder,
  VoiceChannel
} = require('discord.js');
const Voice = require('@discordjs/voice');
const ytpl = require('ytpl');
const ytsr = require('ytsr');
const playdl = require('play-dl');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setNameLocalization('pt-BR', 'tocar')
    .setDescription('Adds a song to the queue to be played')
    .setDescriptionLocalization('pt-BR', 'Adiciona uma musica à fila para ser tocada')
    .addStringOption(option =>
      option.setName('song')
      .setNameLocalization('pt-BR', 'música')
      .setDescription('Youtube URL or search term')
      .setDescriptionLocalization('pt-BR', 'URL do Youtube ou termo de pesquisa')
      .setRequired(true)),
  async execute(interaction, serverQueue, queue) {
    function validURL(str, returnArray) {
      let pattern = new RegExp('((?:(?:https?:)?\/\/)?(?:(?:www|m)\.)?(?:youtube\.com|youtu.be)(?:\/([\w\-]+\?v=|embed\/|watch|v\/|playlist)?)(?:\\?list=|\\?\\w=)?([a-zA-Z0-9]{11,}))(?:(&list=)([a-zA-Z0-9]{11,}))?');
      if (!returnArray) {
        return !!pattern.test(str);
      } else {
        return pattern.exec(str);
      }
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

    let args = interaction.options.get('song').value;
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

    let songURL;
    let urlGroups;
    let playlistID;
    let currentlyPlayingMsgId;
    if (validURL(args, false)) {
      urlGroups = validURL(args, true)
      if (urlGroups[2] === 'playlist' || typeof urlGroups[4] !== 'undefined') { //Playlist
        if (typeof urlGroups[4] !== 'undefined') { //Video URL with playlist
          let plresult = await ytpl(urlGroups[5])
          await getInfoandPlay(urlGroups[1], true, plresult)
          let videosArray = [];
          for (i = 0; i < plresult.items.length; i++) {
            if (plresult.items[i].shortUrl != urlGroups[1]) {
              videosArray.push(plresult.items[i].shortUrl)
            }
          }
          for (i = 0; i < videosArray.length; i++) {
            await getInfoandPlay(videosArray[i], true);
          };
        } else if(urlGroups[2] == 'playlist') { //Playlist URL
          let plresult = await ytpl(urlGroups[3])
          for (i = 0; i < plresult.items.length; i++) {
            if (i == 0) {
              await getInfoandPlay(plresult.items[i].shortUrl, true, plresult);
            } else {
              await getInfoandPlay(plresult.items[i].shortUrl, true);
            }
          }
        }
      } else if (urlGroups[2] === 'watch') { //Video
        getInfoandPlay(urlGroups[1], false);
      }
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
        songURL = sndurl;
      } else if (!fsturl.startsWith('https://www.youtube.com/user')) {
        songURL = fsturl;
      } else {
        interaction.editReply({
          content: 'Não consegui encontrar nenhum vídeo =(',
          ephemeral: true
        });
        return;
      };
      getInfoandPlay(songURL, false);
    };

    async function getInfoandPlay(url, isPlaylistElement, playlist) {
      songInfo = await playdl.video_basic_info(url);

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

      if (typeof playlist != 'undefined' || playlist != null) {
        let embed = createEmbed('playlist', song, playlist)
        interaction.editReply({
          embeds: [embed]
        });

        let pEmbed = createEmbed('playing', song)
        msg = await interaction.channel.send({
          embeds: [pEmbed]
        });
        currentlyPlayingMsgId = msg.id;
      }

      if (typeof con === 'undefined' || con === null) { //If not join voice channel and begin playing
        const connection = await Voice.joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guildID,
          adapterCreator: creator,
        });
        play(interaction.guild, queueConstruct.songs[0], !isPlaylistElement, connection, null, currentlyPlayingMsgId);
        return;
      } else { //Else, notify that the song has been added to the queue
        if (typeof leaveTimeout === 'undefined' || leaveTimeout === null) {
          queueConstruct.connection = con;

          if (!isPlaylistElement) {
            let embed = createEmbed('queue', song);
            interaction.editReply({
              embeds: [embed]
            });
            return;
          }
        } else {
          leaveTimeout = null;
          queueConstruct.connection = con;
          play(interaction.guild, queueConstruct.songs[0], !isPlaylistElement, queueConstruct.connection, null, currentlyPlayingMsgId);
        }
      };
    };

    //Play function
    async function play(guild, song, message, connection, player, currentlyPlayingMsgId) {
      let msg;
      if (message == true) {
        let rembed = createEmbed('queue', song)
        interaction.editReply({
          embeds: [rembed]
        });

        let embed = createEmbed('playing', song)
        msg = await interaction.channel.send({
          embeds: [embed]
        });
        currentlyPlayingMsgId = msg.id;
      };

      if (!song) {
        queueConstruct.playing = false
        if (typeof leaveTimeout === 'undefined' || leaveTimeout === null) {
          leaveTimeout = setTimeout(function() {
            leaveIfInactive();
          }, 60000);
        };
        return;
      };

      let plr;
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

            if (typeof queueConstruct === 'undefined' || queueConstruct === null || queueConstruct.songs.length == 0) { //Set a timeout to leave if there's no more songs
              queueConstruct.playing = false;
              if (typeof leaveTimeout === 'undefined' || leaveTimeout === null) {
                leaveTimeout = setTimeout(function() {
                  leaveIfInactive();
                }, 60000);
              };
              return;
            };
            if (queueConstruct.songs.length != 0) { //Shift the queue and play the next song
              queueConstruct.songs.shift();
              await play(interaction.guild, queueConstruct.songs[0], false, connection, plr, currentlyPlayingMsgId);

              if (typeof currentlyPlayingMsgId != 'undefined' || currentlyPlayingMsgId != null) {
                song = queueConstruct.songs[0];
                if (typeof song == 'undefined') return;
                let embed = createEmbed('playing', song);
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
      if (typeof queueConstruct == 'undefined' || queueConstruct == null || queueConstruct.songs.length == 0) { //Prevents leaving if a song has been added during the inactivity
        let con = await Voice.getVoiceConnection(interaction.guild.id);
        con.destroy();
        queue.delete(interaction.guild.id);
        queueConstruct = undefined;
        serverQueue = undefined;
      };
    };

    function createEmbed(type, mSong, plst) {
      if (typeof mSong == 'undefined') return;

      let typeMsg;
      let color;
      if (type === 'queue') {
        typeMsg = 'Foi adicionado a fila!';
        color = 'DarkPurple';
      } else if (type === 'playing') {
        typeMsg = '🎧 Tocando';
        color = 'Fuchsia';
      } else if (type === 'playlist') {
        typeMsg = '💽 Playlist foi adicionada a fila';
        color = 'Purple';
      };

      let avt = client.user.avatarURL();

      let embed = new EmbedBuilder();
      if (type !== 'playlist') {
        embed.setAuthor({
          name: `${typeMsg}`,
          iconURL: avt.toString()
        });
        embed.setThumbnail(mSong.thumb);
        embed.setColor(color);
        embed.setDescription(`**[${mSong.title}](${mSong.url})**`);
        embed.setURL(mSong.url);
        embed.setTimestamp(interaction.createdTimestamp);

        if (type === 'playing') {
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
      } else if (type === 'playlist') {
        embed.setAuthor({
          name: `${typeMsg}`,
          iconURL: avt.toString()
        });
        embed.setThumbnail(mSong.thumb);
        embed.setColor(color);
        embed.setDescription(`**[${plst.title}](${plst.url})**`);
        embed.setURL(plst.url);
        embed.setTimestamp(interaction.createdTimestamp);
        embed.addFields({
          name: `Foram adicionados ${plst.items.length} vídeos a fila`,
          value: `** **`,
          inline: true
        });
      }
      return embed;
    }
  }
};

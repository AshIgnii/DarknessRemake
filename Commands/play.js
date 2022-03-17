const {
  SlashCommandBuilder
} = require('@discordjs/builders');
const {
  MessageEmbed,
  VoiceChannel
} = require('discord.js');
const Voice = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

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
    }

    client = interaction.client;
    await interaction.deferReply(); //Differ the reply to avoid errors

    if (!interaction.member.voice.channel) {
      interaction.editReply({
        content: 'Você precisa estar em um canal de voz para executar esse comando',
        ephemeral: true
      });
      return;
    }

    let args = interaction.options.get('musica').value;
    if (serverQueue.get('construct') == undefined) {
      const constructTemplate = {
        textChannel: interaction.channelId,
        voiceChannel: interaction.member.voice.channelId,
        songs: [],
        connection: null,
        volume: 5,
        playing: false
      };
      serverQueue.set('construct', constructTemplate);
    }

    var songurl;
    if (validURL(args) && args.includes('watch')) { //Video
      songurl = args;
    } else if (validURL(args) && args.includes('list')) { //Playlist
      interaction.editReply({
        content: 'Playlists ainda não são suportadas =(',
        ephemeral: true
      });
    } else { //Search term
      searchResult = await ytsr(args, options = {
        limit: 2
      });

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
      }
    };

    //Info
    songInfo = await ytdl.getInfo(songurl);
    let thumb = await songInfo.player_response.videoDetails.thumbnail.thumbnails;

    let likes = await songInfo.videoDetails.likes;
    if (likes == null) {
      likes = '0'
    };

    let lengthSec = await songInfo.videoDetails.lengthSeconds;
    lengthSec = parseInt(lengthSec);

    let minutes = Math.floor(lengthSec / 60);
    let seconds = lengthSec - minutes * 60;
    if (seconds.toString().length == 1) {
      seconds = '0' + seconds.toString();
    };

    let requester = interaction.member.displayName;

    let views = songInfo.player_response.videoDetails.viewCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); //Adds commas

    let lengthForm = `${minutes}:${seconds}`;
    song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
      thumb: thumb[3].url,
      views: views,
      author: songInfo.player_response.videoDetails.author,
      likes: likes,
      requester: requester,
      duration: lengthForm,
    };

    //Push
    serverQueue.get('construct').songs.push(song);

    //Play
    voiceChannel = interaction.member.voice.channel;
    guildID = interaction.guild.id;
    creator = voiceChannel.guild.voiceAdapterCreator;
    queueConstruct = await serverQueue.get('construct');

    try {
      let con = await Voice.getVoiceConnection(interaction.guild.id); //Check if bot is already in a voice channel

      if (con == undefined) { //If not join voice channel and begin playing
        const connection = await Voice.joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: guildID,
          adapterCreator: creator,
        });
        queueConstruct.connection = connection;

        play(interaction.guild, queueConstruct.songs[0], true, connection);
        return;
      } else { //Else, notify that the song has been added to the queue
        queueConstruct.connection = con;

        let embed = new MessageEmbed()
          .setAuthor({
            name: 'Foi adicionado a fila!',
            iconURL: client.user.avatarURL
          })
          .setThumbnail(song.thumb)
          .setColor('AQUA')
          .setDescription(`**[${song.title}](${song.url})**`)
          .setURL(song.url)
          .addField('**Views**', `${song.views}`, true)
          .addField('**Autor**', `${song.author}`, true)
          .addField('**Avaliação**', `👍 ${song.likes}`, true)
          .setTimestamp(interaction.createdTimestamp);
        interaction.editReply({
          embeds: [embed]
        })
      }
    } catch (err) {
      console.log(err)
      queue.delete(interaction.guild.id);
    }

    //Play function
    async function play(guild, song, message, connection, player) {
      if (message == true) {
        let embed = new MessageEmbed()
          .setAuthor({
            name: 'Tocando',
            iconURL: client.user.avatarURL
          })
          .setThumbnail(song.thumb)
          .setColor('AQUA')
          .setDescription(`**[${song.title}](${song.url})**`)
          .setURL(song.url)
          .addField('**Views**', `${song.views}`, true)
          .addField('**Autor**', `${song.author}`, true)
          .addField('**Avaliação**', `👍 ${song.likes}`, true)
          .setTimestamp(interaction.createdTimestamp)
        interaction.editReply({
          embeds: [embed]
        })
      }

      if (!song) {
        let con = await Voice.getVoiceConnection(interaction.guild.id);
        con.destroy();
        queue.delete(guild.id);
        return;
      }

      var plr;
      if (player == undefined) {
        //Create player
        const player = await Voice.createAudioPlayer({
          behaviors: {
            noSubscriber: Voice.NoSubscriberBehavior.Pause,
          },
        });
        plr = player
      } else {
        plr = player
      }

      //Set resource and play
      const resource = await Voice.createAudioResource(ytdl(song.url));
      plr.play(resource);

      //Add a listener to play the next song in the queue (if it does not exist already)
      if (plr.listenerCount('stateChange') == 0) { //Prevents multiple listeners
        plr.addListener('stateChange', async (oldS, newS) => {
          if (newS.status == 'idle' && oldS.status == 'playing') { //Check if a song finished
            serverQueue = await queue.get(interaction.guild.id)
            queueConstruct = await serverQueue.get('construct') //Update the construct

            if (!queueConstruct || queueConstruct.songs.length == 0) { //Destroy the connection if there's no more songs
              let con = await Voice.getVoiceConnection(interaction.guild.id);
              con.destroy();
              queue.delete(guild.id);
              return;
            }
            if (queueConstruct.songs.length != 0) { //Shift the queue and play the next song
              queueConstruct.songs.shift();
              await play(guild, queueConstruct.songs[0], false, connection, plr);
            }
          }
        });
      }

      //Subscribe
      const subscription = connection.subscribe(plr);
      serverQueue = queue.get(interaction.guild.id)
      serverQueue.set('construct', queueConstruct) //Update the serverQueue
    }
  }
};

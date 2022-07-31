const {
  SlashCommandBuilder
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setNameLocalization('pt-BR', 'dado')
    .setDescription('Rolls a dice with up to 100k sides. If no argument is given it will be a 6 side dice')
    .setDescriptionLocalization('pt-BR', 'Rola um dado com até 100k de faces. Caso nenhum argumento seja fornecido será de 6 faces')
    .addNumberOption(option =>
      option.setName('sides')
      .setNameLocalization('pt-BR', 'faces')
      .setDescription('How many sides does the dice have')
      .setDescriptionLocalization('pt-BR', 'número de faces do dado')
      .setRequired(false)),
  async execute(interaction) {
    let resultado = Math.floor(Math.random() * 6);
    if (interaction.options.get('sides')) {
      let fc = interaction.options.get('sides').value;
      if (fc > 100000) fc = 100000;
      resultado = Math.floor(Math.random()*fc)
    }
    await interaction.reply({content:`🎲: ${resultado.toString()}`, ephemeral: false});
  },
};

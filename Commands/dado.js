const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dado')
    .setDescription('Rola um dado de até 100000 faces. Caso nenhum argumento seja fornecido será de 6 faces')
    .addNumberOption(option =>
      option.setName('faces')
      .setDescription('Numero de faces do dado')
      .setRequired(false)),
  async execute(interaction) {
    let resultado = Math.floor(Math.random() * 6);
    if (interaction.options.get('faces')) {
      let fc = interaction.options.get('faces').value;
      if (fc > 100000) fc = 100000;
      resultado = Math.floor(Math.random()*fc)
    }
    await interaction.reply({content:`🎲 Resultado: ${resultado.toString()}`, ephemeral: true});
  },
};

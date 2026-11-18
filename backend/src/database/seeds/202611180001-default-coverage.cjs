"use strict";

const roles = {
  flexible: ["Chapista", "Auxiliar de chapista"],
  kitchen: ["Auxiliar de cozinha"],
  cashier: ["Caixa"],
  attendant: ["Atendente"],
  chapista: ["Chapista"],
  chapistaHelper: ["Auxiliar de chapista"],
};

const rows = [];
for (let day = 1; day <= 4; day++) {
  rows.push(
    { cargo_alvo: "Chapista ou auxiliar de chapista", cargos_aceitos: roles.flexible, dia_semana: day, quantidade: 2 },
    { cargo_alvo: "Auxiliar de cozinha", cargos_aceitos: roles.kitchen, dia_semana: day, quantidade: 2 },
    { cargo_alvo: "Caixa", cargos_aceitos: roles.cashier, dia_semana: day, quantidade: 1 },
    { cargo_alvo: "Atendente", cargos_aceitos: roles.attendant, dia_semana: day, quantidade: 1 },
  );
}
for (let day = 5; day <= 7; day++) {
  rows.push(
    { cargo_alvo: "Chapista", cargos_aceitos: roles.chapista, dia_semana: day, quantidade: 2 },
    { cargo_alvo: "Auxiliar de chapista", cargos_aceitos: roles.chapistaHelper, dia_semana: day, quantidade: 1 },
    { cargo_alvo: "Auxiliar de cozinha", cargos_aceitos: roles.kitchen, dia_semana: day, quantidade: 2 },
    { cargo_alvo: "Caixa", cargos_aceitos: roles.cashier, dia_semana: day, quantidade: 1 },
    { cargo_alvo: "Atendente", cargos_aceitos: roles.attendant, dia_semana: day, quantidade: 2 },
  );
}

module.exports = {
  async up(queryInterface) {
    const [result] = await queryInterface.sequelize.query("SELECT COUNT(*) AS total FROM necessidades_cobertura");
    if (Number(result[0].total) === 0) {
      await queryInterface.bulkInsert("necessidades_cobertura", rows.map((row) => ({
        ...row,
        cargos_aceitos: JSON.stringify(row.cargos_aceitos),
      })));
    }
  },
  async down(queryInterface) {
    // Não apaga regras da lancheria ao desfazer o seed, pois podem ter sido ajustadas.
  },
};

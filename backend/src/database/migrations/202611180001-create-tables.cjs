"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = new Set((await queryInterface.showAllTables()).map((table) =>
      String(typeof table === "object" ? table.tableName : table).toLowerCase(),
    ));
    const createIfMissing = async (name, columns, options = {}) => {
      if (existing.has(name.toLowerCase())) return false;
      await queryInterface.createTable(name, columns, options);
      return true;
    };

    await createIfMissing("usuarios", {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      nome: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(254), allowNull: false, unique: true },
      senha_hash: { type: Sequelize.STRING(255), allowNull: false },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      criado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      atualizado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") },
    });

    const createdEmployees = await createIfMissing("funcionarios", {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      nome: { type: Sequelize.STRING(120), allowNull: false },
      cargo: { type: Sequelize.STRING(80), allowNull: false },
      matricula: { type: Sequelize.STRING(40), allowNull: true, unique: true },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      criado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      atualizado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") },
    });
    if (createdEmployees) await queryInterface.addIndex("funcionarios", ["ativo", "nome"], { name: "idx_funcionarios_ativos_nome" });

    const createdCoverage = await createIfMissing("necessidades_cobertura", {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      cargo_alvo: { type: Sequelize.STRING(80), allowNull: false },
      cargos_aceitos: { type: Sequelize.JSON, allowNull: false },
      dia_semana: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false, comment: "1=segunda-feira até 7=domingo" },
      quantidade: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false },
    });
    if (createdCoverage) await queryInterface.addIndex("necessidades_cobertura", ["cargo_alvo", "dia_semana"], { name: "uq_cobertura_cargo_dia", unique: true });

    await createIfMissing("escalas", {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      inicio_semana: { type: Sequelize.DATEONLY, allowNull: false, unique: true },
      status: { type: Sequelize.ENUM("rascunho", "publicada"), allowNull: false, defaultValue: "rascunho" },
      criado_por: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: "usuarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      criado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      atualizado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP") },
    });

    const createdScheduleDays = await createIfMissing("escala_dias", {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      escala_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: "escalas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      funcionario_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: "funcionarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      data: { type: Sequelize.DATEONLY, allowNull: false },
      tipo: { type: Sequelize.ENUM("trabalho", "folga"), allowNull: false },
      cargo_coberto: { type: Sequelize.STRING(80), allowNull: true },
    });
    if (createdScheduleDays) {
      await queryInterface.addIndex("escala_dias", ["escala_id", "funcionario_id", "data"], { name: "uq_escala_funcionario_data", unique: true });
      await queryInterface.addIndex("escala_dias", ["escala_id", "data", "tipo"], { name: "idx_escala_dias_data_tipo" });
    }
  },

  async down(queryInterface) {
    throw new Error("Migration base protegida: crie um banco de desenvolvimento vazio para reiniciar o esquema.");
  },
};

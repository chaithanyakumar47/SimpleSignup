const Sequelize = require('sequelize');

const sequelize = require('../util/database');

const User = sequelize.define('user', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    username: Sequelize.STRING,
    email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
    },

    password: Sequelize.STRING,
    isPremium: Sequelize.BOOLEAN,
    totalExpenses: Sequelize.INTEGER,
    totalIncome: Sequelize.INTEGER


});

module.exports = User;
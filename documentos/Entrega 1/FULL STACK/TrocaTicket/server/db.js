// Pool de conexões com o MySQL. A conexão vem de server/config.js, que lê server/.env de qualquer
// pasta em que o terminal esteja (antes, o .env era procurado na pasta do terminal).
const mysql = require('mysql2/promise');
const { configBanco } = require('./config');

const pool = mysql.createPool({
    ...configBanco(),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;

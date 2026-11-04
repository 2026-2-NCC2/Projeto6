const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = require('./db');

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

app.get('/api/testar-conexao', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ status: 'Conectado com sucesso!', resultado: rows[0].solution });
  } catch (error) {
    console.error('Erro ao conectar ao MySQL:', error);
    res.status(500).json({ error: 'Erro interno ao conectar ao banco de dados' });
  }
});
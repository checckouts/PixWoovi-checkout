const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Serve arquivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '.')));

// Rota principal para carregar o seu checkout
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const WOOVI_API_URL = 'https://api.woovi.com/api/v1';
const WOOVI_APP_ID = process.env.WOOVI_APP_ID;

// Rota para gerar o Pix (chamada pelo seu index.html )
app.post('/api/pix', async (req, res) => {
    try {
        const { payer_name, payer_cpf, payer_phone, amount } = req.body;

        if (!payer_name || !payer_cpf || !amount) {
            return res.status(400).json({ success: false, message: 'Campos obrigatórios ausentes.' });
        }

        const valueInCents = Math.round(parseFloat(amount.replace(',', '.')) * 100);
        const correlationID = crypto.randomUUID();

        const payload = {
            correlationID: correlationID,
            value: valueInCents,
            comment: `Pagamento de ${payer_name}`,
            customer: {
                name: payer_name,
                taxID: payer_cpf.replace(/\D/g, ''),
                email: 'cliente@email.com',
                phone: payer_phone.replace(/\D/g, '')
            }
        };

        const response = await axios.post(`${WOOVI_API_URL}/charge`, payload, {
            headers: {
                'Authorization': WOOVI_APP_ID,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.charge) {
            return res.json({
                success: true,
                pixCode: response.data.charge.brCode,
                correlationID: correlationID
            });
        } else {
            throw new Error('Resposta inválida da Woovi');
        }

    } catch (error) {
        console.error('Erro ao gerar PIX:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao processar o pagamento Pix.',
            error: error.response ? error.response.data : error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// api/index.js
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv'; // Importa o dotenv
dotenv.config()

const app = express();
app.use(express.json()); // Habilita o parsing de JSON no corpo da requisição

// Inicializa a API do Gemini. A chave será lida automaticamente da variável de ambiente GEMINI_API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Rota POST para interagir com o agente
app.post('/ask', async (req, res) => {
  const { pergunta, contexto = "Estudo Bíblico" } = req.body;

  if (!pergunta) {
    return res.status(400).json({ error: "O campo 'pergunta' é obrigatório." });
  }

  // 1. Defina o 'System Instruction' (instrução de função/personalidade)
  const systemInstruction = `Você é um Auxiliar de Estudos Bíblicos. Sua função é responder a perguntas sobre a Bíblia de forma objetiva, com base em textos bíblicos e teologia reconhecida. Seja respeitoso, forneça referências bíblicas quando possível e evite opiniões pessoais. O contexto da pergunta é: ${contexto}.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Um modelo rápido e eficaz para este tipo de tarefa
      contents: pergunta,
      config: {
        systemInstruction: systemInstruction,
        // Opcional: Aumente a temperatura para respostas mais criativas ou deixe baixa para maior factualidade
        // temperature: 0.5 
      }
    });

    res.json({
      resposta: response.text,
      referencia_gemini: "Modelo Gemini 2.5 Flash"
    });

  } catch (error) {
    console.error("Erro ao chamar a API do Gemini:", error);
    res.status(500).json({ error: "Ocorreu um erro na comunicação com a IA." });
  }
});

// A Vercel espera um handler exportado para funções serverless
export default app;
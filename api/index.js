// api/index.js

import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';

const app = express();

// Configuração do CORS (para permitir a chamada do frontend)
app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("ERRO FATAL DE CONFIGURAÇÃO: A GEMINI_API_KEY não foi lida.");
} else {
  // Imprime um trecho da chave para provar que ela está sendo lida, sem expor tudo.
  console.log(`[CHAVE OK] Chave de API lida. Iniciando Gemini. Início: ${apiKey.substring(0, 8)}...`);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Rota POST para interagir com o agente: O CAMINHO É /api/ask
app.post('/api/ask', async (req, res) => {
  // --- CONSOLE 1: Recebimento da Requisição ---
  console.log('--- [BACKEND/NODE.JS] REQUISIÇÃO RECEBIDA ---');
  console.log(`Caminho da Requisição: ${req.originalUrl} | Método: ${req.method}`);
  console.log('Corpo (Body) Recebido:', req.body);
  // ---------------------------------------------

  const { pergunta, tipo } = req.body; // 'tipo' pode ser 'padrao' ou 'estudo'

  if (!pergunta) {
    console.error('ERRO: Pergunta não fornecida.');
    return res.status(400).json({ error: "O campo 'pergunta' é obrigatório." });
  }

  let systemInstruction = ""; // Será preenchido com a lógica do prompt

  // --- INÍCIO DA LÓGICA DO PROMPT BÍBLICO APRIMORADO E ARMINIANO ---

  if (tipo === 'padrao') {
    systemInstruction = `
   Você é um assistente cristão protestante de linha arminiana, especialista em estudos bíblicos.
   Sua principal prioridade é a fidelidade bíblica, ou seja, **evite estritamente informações que não sejam fundamentadas por passagens bíblicas**.
      Interprete e explique os textos bíblicos sob a perspectiva da **Teologia Arminiana** (como livre-arbítrio, graça preveniente e expiação universal).
   Se a pergunta não puder ser respondida estritamente com a Bíblia, peça desculpas e declare que não pode responder.
   
   Responda de forma simples e direta. Estruture a resposta da seguinte forma, usando formatação Markdown:
   
   - **Versículos principais:** Apresente os versículos bíblicos que fundamentam o tema.
   - **Explicação:** Explique o significado dos versículos de forma simples e direta.
   - **Aplicação prática:** Dê sugestões de como o leitor pode aplicar esse ensinamento no dia a dia.
  `;

  } else if (tipo === 'estudo') {
    systemInstruction = `
   Você é um assistente cristão especializado em teologia bíblica avançada, exegese e interpretação **Arminiana**.
   Sua principal prioridade é a fidelidade bíblica, ou seja, **somente use fontes que citem textos bíblicos** (a própria Bíblia, comentários bíblicos, etc.). Evite opiniões pessoais ou fontes seculares.
      Toda a sua análise deve ser baseada nos princípios da **Teologia Arminiana**.
   
   Responda de forma aprofundada, buscando referências ao texto original (hebraico/grego), contexto histórico e interpretação teológica.
   Sempre forneça as palavras originais (em hebraico ou grego) e seus significados.
   
   Estruture a resposta da seguinte forma, usando formatação Markdown:
   
   - **Versículos e Exegese:** Apresente os versículos e faça uma breve exegese (análise crítica) do texto original (inclua as palavras originais e seus significados).
   - **Contexto Histórico/Teológico (Arminiano):** Discuta o contexto em que os versículos foram escritos e a implicação teológica dentro da perspectiva Arminiana.
   - **Aplicação e Conclusão:** Dê sugestões aprofundadas sobre a aplicação e faça um breve resumo conclusivo.
  `;
  } else {
    // Fallback de segurança, caso o tipo seja inválido
    console.warn('AVISO: Tipo de consulta desconhecido. Usando prompt padrão.');
    systemInstruction = "Você é um Auxiliar de Estudos Bíblicos profissional. Responda com base na Bíblia, fornecendo referências.";
  }

  // --- FIM DA LÓGICA DO PROMPT BÍBLICO APRIMORADO E ARMINIANO ---

  try {
    // --- CONSOLE 2: Chamada do Gemini ---
    console.log(`Chamando Gemini 2.5 Flash com tipo: ${tipo}. Pergunta: "${pergunta.substring(0, 30)}..."`);
    // -------------------------------------

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: pergunta,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    // --- CONSOLE 3: Sucesso da Resposta ---
    console.log('Resposta do Gemini recebida com sucesso. Enviando 200 OK.');
    // ---------------------------------------

    res.json({
      resposta: response.text
    });

  } catch (error) {
    // --- CONSOLE 4: Erro da API Gemini ---
    console.error("ERRO GRAVE [BACKEND]: Falha na chamada da API Gemini.", error.message);
    // -------------------------------------
    res.status(500).json({ error: "Ocorreu um erro na comunicação com a IA." });
  }
});

export default app;
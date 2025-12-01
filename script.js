
const GEMINI_API_KEY = "AIzaSyD4bQ_216W4T-BM-awa1TEa4zEcMFUsbX0";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;


const questionTextarea = document.getElementById('question');
const responseDiv = document.getElementById('response');
const copyButton = document.getElementById('copyButton');

// Configuração de Geração de Token
const generationConfig = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 1024,
};


const REQUEST_TIMEOUT = 15000; // 15 segundos


/**
 * Função utilitária para adicionar timeout à requisição fetch.
 */
function fetchWithTimeout(resource, options = {}) {
  const { timeout = REQUEST_TIMEOUT } = options;

  // Verifica se a função AbortSignal.timeout está disponível (moderno)
  if (typeof AbortSignal.timeout === 'function') {
    options.signal = AbortSignal.timeout(timeout);
    return fetch(resource, options);
  }

  // Fallback para navegadores mais antigos
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const response = fetch(resource, {
    ...options,
    signal: controller.signal
  }).finally(() => {
    clearTimeout(id);
  });
  return response;
}

/**
 * Tenta fazer uma requisição mínima à API para mitigar o 'Cold Start'.
 */
async function warmUpGemini() {
  const dummyQuestion = "O que é a Bíblia em uma palavra?";

  const simpleSystemInstruction = "Você é um assistente conciso. Responda à próxima pergunta com UMA ÚNICA palavra.";

  const requestBody = {
    contents: [{ role: "user", parts: [{ text: dummyQuestion }] }],
    generationConfig: { maxOutputTokens: 10 }, // Configuração para ser rápido
    systemInstruction: { parts: [{ text: simpleSystemInstruction }] }
  };

  try {
    // Usamos um timeout de 5s, pois não precisamos esperar a resposta, apenas acionar a API
    await fetchWithTimeout(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      timeout: 20000 // Apenas 5 segundos para o warm-up
    });
    console.log("✅ Gemini Warm-up bem-sucedido ou iniciado em segundo plano.");
  } catch (error) {
    console.warn("⚠️ Falha (esperada ou não) durante o Warm-up inicial:", error.message);
  }
}


// Função principal chamada pelos botões
async function askQuestion(tipo) {
  const pergunta = questionTextarea.value.trim();

  if (!pergunta) {
    Toastify({
      text: "Por favor, insira uma pergunta!",
      duration: 3000,
      gravity: "top",
      position: "center",
      style: { backgroundColor: "red" },
    }).showToast();
    return;
  }

  responseDiv.innerHTML = '<p class="loading">Aguarde, estamos buscando a resposta... (Pode demorar um pouco na primeira vez.)</p>';
  copyButton.classList.add('hidden');
  toggleButtons(true);

  try {
    let systemInstruction = "";

    // --- LÓGICA DO PROMPT BÍBLICO E ARMINIANO ---
    if (tipo === 'padrao') {
      systemInstruction = `
                Você é um assistente cristão protestante de linha arminiana, especialista em estudos bíblicos.
      Responda às perguntas com base na Bíblia e forneça referências bíblicas sempre que possível.
      Estruture a resposta da seguinte forma:
      - **Versículos principais:** Apresente versículos que fundamentam o tema.
      - **Explicação:** Explique o significado dos versículos de forma simples e direta.
      - **Aplicação prática:** Dê sugestões de como o leitor pode aplicar esse ensinamento no dia a dia.
            `;

    } else if (tipo === 'estudo') {
      systemInstruction = `
      Você é um assistente cristão especializado em teologia bíblica avançada. 
      Responda de forma aprofundada, buscando referências ao texto original da Bíblia em hebraico e grego, contexto histórico, exegese e interpretação teológica. 
      Sempre forneça as palavras originais e seus significados.
      - **Versículos principais:** Apresente versículos que fundamentam o tema.
      - **Explicação:** Explique o significado dos versículos de forma simples e direta.
      - **Aplicação prática:** Dê sugestões de como o leitor pode aplicar esse ensinamento no dia a dia.
            `;
    } else {
      systemInstruction = "Você é um Auxiliar de Estudos Bíblicos profissional. Responda com base na Bíblia, fornecendo referências.";
    }
    // --- FIM DA LÓGICA DO PROMPT ---

    const requestBody = {
      contents: [{
        role: "user",
        parts: [{ text: pergunta }]
      }],
      generationConfig: generationConfig,
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };

    // Usa fetchWithTimeout para evitar que a requisição fique travada
    const response = await fetchWithTimeout(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      timeout: REQUEST_TIMEOUT
    });

    const data = await response.json();

    if (response.ok) {
      // Sucesso
      const answer = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;

      if (answer) {
        responseDiv.innerHTML = formatResponse(answer);
        showCopyButton();
      } else {
        console.error("Erro: Estrutura de resposta inesperada do Gemini.", data);
        responseDiv.innerHTML = '<p class="error">Erro: Não foi possível obter a resposta da IA. (Resposta vazia)</p>';
      }
    } else {
      // Erro da API do Gemini (Chave Inválida, Limite Excedido, etc.)
      console.error("Erro da API Gemini:", data);
      responseDiv.innerHTML = `<p class="error">Erro da API Gemini: ${data.error && data.error.message ? data.error.message : 'Ocorreu um erro.'}</p>`;
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      responseDiv.innerHTML = '<p class="error">ERRO DE TEMPO LIMITE: A API demorou mais de 15s para responder. Tente novamente.</p>';
    } else {
      console.error("ERRO DE REDE ou INESPERADO:", error);
      responseDiv.innerHTML = '<p class="error">Ocorreu um erro ao buscar a resposta. Verifique o console.</p>';
    }
  } finally {
    toggleButtons(false);
  }
}


// --- FUNÇÕES DE UTILIDADE (formatResponse, copyToClipboard, etc.) ---

function formatResponse(response) {
  if (!response) return '<p>Erro ao processar a resposta.</p>';

  let formatted = response;

  // 1. Substitui **Negrito** por <strong>Negrito</strong> e adiciona quebra de linha
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<br><br><strong>$1</strong>');

  // 2. Remove asteriscos que parecem ser marcadores de lista/bullet points
  formatted = formatted.replace(/^\s*\*\s*/gm, '');
  formatted = formatted.replace(/^\s*\*/gm, '');

  // 3. Substitui \n (nova linha) por <br>
  formatted = formatted.replace(/\n/g, '<br>');

  // 4. Adiciona uma quebra de linha extra para itens de lista numerada (ex: "1.")
  formatted = formatted.replace(/(\d\.)/g, '<br>$1');

  return `<p>${formatted.trim()}</p>`;
}

function copyToClipboard() {
  const responseText = responseDiv.innerText;

  if (!responseText.trim() || responseText.includes("Erro")) {
    Toastify({
      text: "Nada para copiar!",
      duration: 3000,
      gravity: "top",
      position: "center",
      style: { backgroundColor: "red" },
    }).showToast();
    return;
  }

  navigator.clipboard.writeText(responseText).then(() => {
    Toastify({
      text: "Resposta copiada para a área de transferência! 📋",
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { backgroundColor: "#4CAF50" },
    }).showToast();
  });
}

function showCopyButton() {
  document.getElementById('copyButton').classList.remove('hidden');
}

function toggleButtons(disabled) {
  document.querySelectorAll('.button-group button').forEach(button => {
    button.disabled = disabled;
  });
}
function hideSplashScreen() {
  const splashScreen = document.getElementById('splash-screen');
  if (splashScreen) {
    splashScreen.classList.add('hidden');
    setTimeout(() => {
      splashScreen.style.display = 'none';
    }, 500);
  }
}

// --- EXECUÇÃO DO WARM-UP NO CARREGAMENTO ---
warmUpGemini();
hideSplashScreen()
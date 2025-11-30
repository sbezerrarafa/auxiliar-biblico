// public/script.js

// --- CONSTANTES DO DOM ---
const questionTextarea = document.getElementById('question');
const responseDiv = document.getElementById('response');
const copyButton = document.getElementById('copyButton');
const splashScreen = document.getElementById('splash-screen');
const form = document.getElementById('question-form'); // Mantido para referência

// O endpoint real da sua API
const API_URL = '/api/ask';


// Esconde a tela de splash após 1 segundo
setTimeout(() => {
  if (splashScreen) {
    splashScreen.style.display = 'none';
  }
}, 1000);

// Função principal chamada pelos botões (Explicação Padrão / Estudo Aprofundado)
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

  // Limpa a resposta anterior e mostra o loading
  responseDiv.innerHTML = '<p class="loading">Aguarde, estamos buscando a resposta...</p>';
  copyButton.classList.add('hidden');
  toggleButtons(true); // Desabilita botões

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Note que estamos usando 'pergunta' e 'tipo' (mode) conforme o backend
      body: JSON.stringify({ pergunta, tipo }),
    });

    // Tenta ler o corpo da resposta
    const responseText = await response.text();

    if (response.status === 404) {
      responseDiv.innerHTML = '<p class="error">Erro 404: Rota não encontrada. Verifique o vercel.json.</p>';
      return;
    }

    let data;
    try {
      // Tenta fazer o parsing do JSON
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("ERRO DE PARSING: Resposta do servidor não é JSON válida.", responseText);
      responseDiv.innerHTML = '<p class="error">Erro interno do servidor. Resposta ilegível.</p>';
      return;
    }


    if (response.ok) {
      // Se o backend retornar sucesso, a resposta estará em data.resposta
      const answer = data.resposta;

      // --- AQUI USAMOS SUA FUNÇÃO DE FORMATAÇÃO ---
      responseDiv.innerHTML = formatResponse(answer);
      showCopyButton(); // Exibe o botão de copiar
      // saveToHistory(pergunta, answer); // Comentei para evitar erro se o loadHistory não existir

    } else {
      // Se o backend retornar erro (status 400 ou 500)
      responseDiv.innerHTML = `<p class="error">Erro: ${data.error || 'Ocorreu um erro na API.'}</p>`;
    }

  } catch (error) {
    console.error("ERRO FINAL DE CONEXÃO:", error);
    responseDiv.innerHTML = '<p class="error">Ocorreu um erro ao buscar a resposta. Verifique o console.</p>';
  } finally {
    toggleButtons(false); // Reabilita os botões
  }
}


/**
 * Função para formatar a resposta Markdown para HTML
* @param {string} response Texto da resposta da IA.
 * @returns {string} Texto formatado em HTML.
 */
function formatResponse(response) {
  if (!response) return '<p>Erro ao processar a resposta.</p>';

  let formatted = response;

  // 1. Substitui **Negrito** por <strong>Negrito</strong>. Adicionamos <br><br> para quebra antes
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<br><br><strong>$1</strong>');

  // 2. Remove asteriscos que parecem ser marcadores de lista/bullet points:
  //    - Captura o asterisco (*) seguido de um espaço (\s) no início de uma linha (^).
  //    - Captura o asterisco (*) que está sozinho em uma linha ou seguido de espaços.
  //    - Usa a flag 'gm' para global e multiline.
  formatted = formatted.replace(/^\s*\*\s*/gm, ''); // Remove "* " no início da linha
  formatted = formatted.replace(/^\s*\*/gm, '');     // Remove "*" no início da linha

  // 3. Substitui \n (nova linha) por <br>
  formatted = formatted.replace(/\n/g, '<br>');

  // 4. Garante que os títulos formatados com **Negrito** fiquem em uma nova linha
  //    (se não vierem já com quebras do Gemini)
  //    Isso já foi tratado no passo 1 ao adicionar <br><br> antes de <strong>

  // 5. Adiciona uma quebra de linha extra para itens de lista numerada (ex: "1.")
  formatted = formatted.replace(/(\d\.)/g, '<br>$1');

  // 6. Remove qualquer asterisco remanescente que possa ter sido um itálico que não foi pego,
  //    ou asteriscos que ficaram soltos.
  //    CUIDADO: Se você quiser *itálico* manter, remova esta linha.
  //    Para remover itálicos: formatted = formatted.replace(/\*(.*?)\*/g, '$1'); 

  // Remove espaços em branco extras no início e no fim
  return `<p>${formatted.trim()}</p>`;
}

/**
 * Função para copiar o texto da resposta
 */
function copyToClipboard() {
  const responseText = document.getElementById('response').innerText;

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

/**
 * Exibe o botão de copiar
 */
function showCopyButton() {
  document.getElementById('copyButton').classList.remove('hidden');
}

/**
 * Alterna o estado de disabled dos botões
 */
function toggleButtons(disabled) {
  document.querySelectorAll('.button-group button').forEach(button => {
    button.disabled = disabled;
  });
}



document.addEventListener('DOMContentLoaded', loadHistory);

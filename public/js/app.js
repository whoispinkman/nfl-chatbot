// public/js/app.js
// Lógica del frontend para el chatbot NFL
// - Muestra mensajes del usuario y del bot
// - Maneja el formulario de envío
// - Maneja los "starters" (botones de inicio)
// - Hace scroll interno en la ventana de mensajes

// Historial simple por si quieres usarlo en el backend más adelante
const history = [];

document.addEventListener('DOMContentLoaded', () => {
  // Referencias a los elementos clave del DOM
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const starterButtons = document.querySelectorAll('.starter-btn');

  // 1) Primer mensaje del bot EXACTAMENTE "Hola"
  addMessage('bot', 'Hola');

  // 2) Envío del formulario (cuando el usuario da Enter o clic en "Enviar")
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault(); // evita recarga de la página

    const text = chatInput.value.trim();
    if (!text) return; // si el usuario no escribió nada, no hacemos nada

    sendUserMessage(text);
    chatInput.value = ''; // limpiamos la caja de texto
  });

  // 3) Manejo de los botones de conversation starters
  starterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Usamos el data-prompt si existe; si no, el texto del botón
      const prompt = btn.getAttribute('data-prompt') || btn.innerText;
      sendUserMessage(prompt);
    });
  });

  // =========================
  // Funciones internas
  // =========================

  /**
   * Agrega un mensaje al área de chat.
   * @param {'user' | 'bot'} sender - quién envía el mensaje
   * @param {string} text - texto del mensaje
   */
  function addMessage(sender, text) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', sender === 'user' ? 'user' : 'bot');

  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  bubble.textContent = text;

  msgDiv.appendChild(bubble);
  chatMessages.appendChild(msgDiv);


    // Autoscroll SOLO dentro de la ventana de mensajes
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Envía un mensaje del usuario:
   *  - Lo muestra en el chat.
   *  - Llama al backend /api/chat.
   *  - Cuando llega la respuesta del bot, la muestra.
   */
  function sendUserMessage(text) {
    // Mostrar mensaje del usuario
    addMessage('user', text);

    // Añadir al historial
    history.push({ role: 'user', content: text });

    // Llamar al backend
    fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        history // por si el backend quiere contexto
      })
    })
      .then((res) => res.json())
      .then((data) => {
        const reply =
          data.reply || 'Hubo un problema al generar la respuesta del chatbot.';
        addMessage('bot', reply);
        history.push({ role: 'bot', content: reply });
      })
      .catch((err) => {
        console.error('Error en fetch /api/chat:', err);
        const fallback =
          'Hubo un problema técnico al procesar tu mensaje. ' +
          'Intenta de nuevo o hazme otra pregunta sobre la NFL.';
        addMessage('bot', fallback);
        history.push({ role: 'bot', content: fallback });
      });
  }
});

// public/js/app.js
// Lógica del frontend para el chatbot NFL
// - Maneja el envío de mensajes
// - Maneja los starters
// - Muestra los mensajes en la ventana de chat
// - Hace scroll interno en el área de mensajes

// Historial simple por si quieres usarlo después (el backend actualmente no lo usa mucho)
const history = [];

document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos del DOM
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const starterButtons = document.querySelectorAll('.starter-btn');

  // 1) Primer mensaje del bot EXACTAMENTE "Hola"
  addMessage('bot', 'Hola');

  // 2) Cuando el usuario envía el formulario (Enter o botón Enviar)
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault(); // evita que la página se recargue

    const text = chatInput.value.trim();
    if (!text) return; // si el usuario no escribió nada, no hacemos nada

    sendUserMessage(text);
    chatInput.value = ''; // limpiar el campo de texto
  });

  // 3) Cuando el usuario hace clic en un botón de starter
  starterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Usamos el data-prompt si existe, si no, el texto del botón
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
   * @param {string} text - contenido del mensaje
   */
  function addMessage(sender, text) {
    // Crear el contenedor del mensaje
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user' : 'bot');

    // Crear la "burbuja" del mensaje
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    bubble.textContent = text;

    // Insertar en el DOM
    msgDiv.appendChild(bubble);
    chatMessages.appendChild(msgDiv);

    // Autoscroll SOLO dentro del contenedor de mensajes
    // Esto hace que el scroll baje al último mensaje
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Envía un mensaje del usuario:
   * - Lo muestra en el chat.
   * - Llama al backend /api/chat.
   * - Cuando llega la respuesta del bot, la muestra.
   */
  function sendUserMessage(text) {
    // Mostrar el mensaje del usuario en la ventana
    addMessage('user', text);

    // Guardarlo en el historial
    history.push({ role: 'user', content: text });

    // Llamar al backend
    fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        history // por si más adelante quieres usarlo en el server
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

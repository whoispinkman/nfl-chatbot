// public/js/app.js
// Maneja la UI del chat: mensajes, envío al backend y starters.

const history = [];

document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const starterButtons = document.querySelectorAll('.starter-btn');

  // 1) Primer mensaje del bot EXACTAMENTE "Hola"
  addMessage('bot', 'Hola');

  // 2) Envío del formulario
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    sendUserMessage(text);
    chatInput.value = '';
  });

  // 3) Starters
  starterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt') || btn.innerText;
      sendUserMessage(prompt);
    });
  });

  // --------- funciones internas ---------

  function addMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user' : 'bot');

    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    bubble.textContent = text;

    msgDiv.appendChild(bubble);
    chatMessages.appendChild(msgDiv);

    // Autoscroll SOLO dentro del contenedor de mensajes
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function sendUserMessage(text) {
    // Mostrar mensaje del usuario
    addMessage('user', text);

    // Guardar en historial
    history.push({ role: 'user', content: text });

    // Llamar al backend
    fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: text,
        history
      })
    })
      .then((res) => res.json())
      .then((data) => {
        const reply = data.reply || 'Hubo un problema al generar la respuesta.';
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

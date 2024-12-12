document.addEventListener('DOMContentLoaded', () => {
    let counter = 0;
    const socket = io();
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    const messages = document.getElementById('messages');
    const randomButton = document.getElementById('chat-random-message');
  
    // Send random message
    randomButton.addEventListener('click', async () => {
      try {
        const response = await fetch('https://api.quotable.io/random');
        if (!response.ok) throw new Error('Failed to fetch quote');
        const data = await response.json();
        const randomQuote = `${data.content} — ${data.author}`;
        const clientOffset = `random-${Date.now()}`;
        socket.emit('chat message', randomQuote, clientOffset);
      } catch (error) {
        console.error('Error fetching random quote:', error);
      }
    });
  
    // Send normal message
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value) {
        const clientOffset = `${socket.id}-${counter++}`;
        socket.emit('chat message', input.value, clientOffset);
        input.value = '';
      }
    });
  
    // Handle received messages
    socket.on('chat message', (msg, clientOffset) => {
      const item = document.createElement('li');
      item.textContent = msg;
  
      // Highlight random messages
      if (clientOffset?.startsWith('random-')) {
        item.classList.add('random-message');
      }
  
      messages.appendChild(item);
      window.scrollTo(0, document.body.scrollHeight);
    });
  });
  
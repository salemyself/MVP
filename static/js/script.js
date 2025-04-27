// Обработчик формы чата
async function submitChatForm(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('submit-chat');
    const chatOutput = document.getElementById('chat-output');
    const placeholder = chatOutput.querySelector('.placeholder');
    
    const essayText = document.getElementById('essay-text').value.trim();
    const requirementsText = document.getElementById('requirements').value.trim();

    if (!essayText || !requirementsText) {
        alert('Пожалуйста, заполните оба поля: текст эссе и критерии проверки.');
        return;
    }

    // Убираем placeholder
    if (placeholder && chatOutput.contains(placeholder)) {
        chatOutput.removeChild(placeholder);
    }

    // Показываем сообщение пользователя
    const userMsgElement = document.createElement('p');
    userMsgElement.classList.add('user-message');
    const shortEssay = essayText.length > 100 ? essayText.substring(0, 100) + '...' : essayText;
    const shortReq = requirementsText.length > 100 ? requirementsText.substring(0, 100) + '...' : requirementsText;
    userMsgElement.textContent = `Эссе: "${shortEssay}" | Требования: "${shortReq}"`;
    chatOutput.appendChild(userMsgElement);

    // Показываем индикатор загрузки
    submitBtn.disabled = true;
    const thinkingMsgElement = document.createElement('p');
    thinkingMsgElement.classList.add('ai-message');
    thinkingMsgElement.innerHTML = '<i>Проверяй.AI анализирует текст...</i>';
    chatOutput.appendChild(thinkingMsgElement);
    chatOutput.scrollTop = chatOutput.scrollHeight;

    try {
        // Отправляем запрос на сервер
        const response = await fetch('/submit_chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                essay: essayText,
                requirements: requirementsText
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка сервера');
        }

        // Удаляем индикатор загрузки
        chatOutput.removeChild(thinkingMsgElement);

        // Показываем ответ от ИИ
        const aiMsgElement = document.createElement('p');
        aiMsgElement.classList.add('ai-message');
        
        if (data.error) {
            aiMsgElement.textContent = data.error;
        } else {
            aiMsgElement.innerHTML = data.response;
        }
        
        chatOutput.appendChild(aiMsgElement);

    } catch (error) {
        console.error('Ошибка:', error);
        chatOutput.removeChild(thinkingMsgElement);
        const errorMsgElement = document.createElement('p');
        errorMsgElement.classList.add('ai-message');
        errorMsgElement.textContent = `Ошибка: ${error.message}`;
        chatOutput.appendChild(errorMsgElement);
    } finally {
        submitBtn.disabled = false;
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }
}

// Обработчик формы подписки
async function submitSubscribeForm(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const emailInput = form.querySelector('input[type="email"]');

    try {
        submitBtn.disabled = true;
        
        const response = await fetch('/subscribe', {
            method: 'POST',
            body: new FormData(form)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка сервера');
        }

        alert(data.message);
        form.reset();
    } catch (error) {
        console.error('Ошибка:', error);
        alert(`Ошибка: ${error.message}`);
        emailInput.focus();
    } finally {
        submitBtn.disabled = false;
    }
}

// Обновление года в футере
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('current-year').textContent = new Date().getFullYear();
});

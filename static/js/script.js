// Глобальные переменные
let uploadedFiles = [];

// Обработчик формы чата
async function submitChatForm(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('submit-chat');
    const chatOutput = document.getElementById('chat-output');
    const placeholder = chatOutput.querySelector('.placeholder');
    
    const essayText = document.getElementById('essay-text').value.trim();
    const requirementsText = document.getElementById('requirements').value.trim();

    if (!essayText && uploadedFiles.length === 0) {
        alert('Пожалуйста, введите текст эссе или загрузите файлы.');
        return;
    }

    if (!requirementsText) {
        alert('Пожалуйста, укажите критерии проверки.');
        return;
    }

    // Убираем placeholder
    if (placeholder && chatOutput.contains(placeholder)) {
        chatOutput.removeChild(placeholder);
    }

    // Показываем сообщение пользователя
    const userMsgElement = document.createElement('p');
    userMsgElement.classList.add('user-message');
    
    let userMessage = '';
    if (essayText) {
        const shortEssay = essayText.length > 100 ? essayText.substring(0, 100) + '...' : essayText;
        userMessage += `Текст: "${shortEssay}"`;
    }
    if (uploadedFiles.length > 0) {
        const fileNames = uploadedFiles.map(f => f.name).join(', ');
        userMessage += (userMessage ? ' | ' : '') + `Файлы: ${fileNames}`;
    }
    const shortReq = requirementsText.length > 50 ? requirementsText.substring(0, 50) + '...' : requirementsText;
    userMessage += ` | Требования: "${shortReq}"`;
    
    userMsgElement.textContent = userMessage;
    chatOutput.appendChild(userMsgElement);

    // Показываем индикатор загрузки
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Анализируем...';
    
    const thinkingMsgElement = document.createElement('p');
    thinkingMsgElement.classList.add('ai-message');
    thinkingMsgElement.innerHTML = '<i>Проверяй.AI анализирует текст...</i>';
    chatOutput.appendChild(thinkingMsgElement);
    chatOutput.scrollTop = chatOutput.scrollHeight;

    try {
        // Создаем FormData для отправки файлов
        const formData = new FormData();
        formData.append('essay', essayText);
        formData.append('requirements', requirementsText);
        
        // Добавляем файлы
        uploadedFiles.forEach(file => {
            formData.append('files', file);
        });

        // Отправляем запрос на сервер
        const response = await fetch('/submit_chat', {
            method: 'POST',
            body: formData
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
            aiMsgElement.innerHTML = `<strong style="color: #dc3545;">Ошибка:</strong> ${data.error}`;
        } else {
            aiMsgElement.innerHTML = data.response;
        }
        
        chatOutput.appendChild(aiMsgElement);

        // Добавляем кнопки действий если есть chat_id
        if (data.chat_id) {
            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('chat-actions');
            actionsDiv.innerHTML = `
                <a href="/chat/${data.chat_id}" class="btn btn-secondary" style="text-decoration: none;">Просмотреть диалог</a>
            `;
            chatOutput.appendChild(actionsDiv);
        }

        // Очищаем форму
        document.getElementById('essay-text').value = '';
        document.getElementById('requirements').value = '';
        clearUploadedFiles();

        // Обновляем историю чатов если мы на странице чата
        if (window.location.pathname === '/chat') {
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }

    } catch (error) {
        console.error('Ошибка:', error);
        chatOutput.removeChild(thinkingMsgElement);
        const errorMsgElement = document.createElement('p');
        errorMsgElement.classList.add('ai-message');
        errorMsgElement.innerHTML = `<strong style="color: #dc3545;">Ошибка:</strong> ${error.message}`;
        chatOutput.appendChild(errorMsgElement);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Отправить на проверку';
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }
}

// Обработчик загрузки файлов
function initFileUpload() {
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-input');
    const uploadedFilesContainer = document.getElementById('uploaded-files');

    if (!fileUploadArea || !fileInput) return;

    // Клик по области загрузки
    fileUploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // Обработка выбора файлов
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Drag & Drop
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });

    fileUploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
    });

    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
}

function handleFiles(files) {
    const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         'application/rtf'];
    
    Array.from(files).forEach(file => {
        if (allowedTypes.includes(file.type) || file.name.endsWith('.txt')) {
            if (file.size <= 16 * 1024 * 1024) { // 16MB
                uploadedFiles.push(file);
                displayUploadedFile(file);
            } else {
                alert(`Файл ${file.name} слишком большой. Максимальный размер: 16MB`);
            }
        } else {
            alert(`Файл ${file.name} имеет неподдерживаемый формат. Поддерживаются: TXT, PDF, DOC, DOCX, RTF`);
        }
    });
}

function displayUploadedFile(file) {
    const uploadedFilesContainer = document.getElementById('uploaded-files');
    if (!uploadedFilesContainer) return;

    const fileElement = document.createElement('div');
    fileElement.classList.add('uploaded-file');
    fileElement.innerHTML = `
        <span class="uploaded-file-name">${file.name}</span>
        <button type="button" class="remove-file" onclick="removeFile('${file.name}')">×</button>
    `;
    
    uploadedFilesContainer.appendChild(fileElement);
}

function removeFile(fileName) {
    uploadedFiles = uploadedFiles.filter(file => file.name !== fileName);
    
    const uploadedFilesContainer = document.getElementById('uploaded-files');
    const fileElements = uploadedFilesContainer.querySelectorAll('.uploaded-file');
    
    fileElements.forEach(element => {
        if (element.querySelector('.uploaded-file-name').textContent === fileName) {
            element.remove();
        }
    });
}

function clearUploadedFiles() {
    uploadedFiles = [];
    const uploadedFilesContainer = document.getElementById('uploaded-files');
    if (uploadedFilesContainer) {
        uploadedFilesContainer.innerHTML = '';
    }
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.value = '';
    }
}

// Удаление чата
async function deleteChat(chatId) {
    if (!confirm('Вы уверены, что хотите удалить этот диалог?')) {
        return;
    }

    try {
        const response = await fetch(`/delete_chat/${chatId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Удаляем элемент из списка
            const chatElement = document.querySelector(`[data-chat-id="${chatId}"]`);
            if (chatElement) {
                chatElement.remove();
            }
            
            // Если мы на странице просмотра этого чата, перенаправляем на главную страницу чата
            if (window.location.pathname.includes(`/chat/${chatId}`)) {
                window.location.href = '/chat';
            }
        } else {
            alert('Ошибка при удалении диалога');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении диалога');
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
        submitBtn.innerHTML = '<span class="loading"></span> Отправляем...';
        
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
        submitBtn.innerHTML = 'Участвую!';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Обновление года в футере
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // Инициализация загрузки файлов
    initFileUpload();

    // Обработчики форм
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', submitChatForm);
    }

    const subscribeForm = document.querySelector('.cta-form');
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', submitSubscribeForm);
    }

    // Активный элемент в истории чатов
    const currentPath = window.location.pathname;
    const chatHistoryItems = document.querySelectorAll('.chat-history-item');
    chatHistoryItems.forEach(item => {
        const link = item.querySelector('a');
        if (link && link.getAttribute('href') === currentPath) {
            item.classList.add('active');
        }
    });
});

// Функция для копирования цветового кода
function copyColorCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        // Показываем уведомление
        const notification = document.createElement('div');
        notification.textContent = `Скопировано: ${code}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-color);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: fadeInOut 2s ease-in-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 2000);
    });
}

// CSS для анимации уведомления
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-20px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-20px); }
    }
`;
document.head.appendChild(style);
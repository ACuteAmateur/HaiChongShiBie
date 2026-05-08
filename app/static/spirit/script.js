// 全局变量存储会话ID
let currentSessionId = null;

// 初始化聊天会话
async function initChatSession() {
    try {
        const response = await fetch('/start_session', {
            method: 'POST'
        });
        const data = await response.json();
        currentSessionId = data.session_id;
        console.log('新会话已创建:', currentSessionId);
    } catch (error) {
        console.error('初始化会话失败:', error);
        alert('无法初始化聊天会话，请刷新页面重试');
    }
}

// 页面加载时初始化会话
window.onload = initChatSession;

// 发送消息
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    if (!message) return;

    if (!currentSessionId) {
        await initChatSession();
        if (!currentSessionId) return;
    }

    appendMessage('我', message);
    input.value = '';
    input.focus();
    showLoading();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                session_id: currentSessionId
            }),
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        appendMessage('小精灵', data.response);
    } catch (error) {
        console.error('发送消息失败:', error);
        appendMessage('系统', `出错: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// 添加一条消息到聊天框
function appendMessage(sender, text) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';

    if (sender === '我') {
        messageDiv.classList.add('user-message');
    } else if (sender === '小精灵') {
        messageDiv.classList.add('bot-message');
    } else {
        messageDiv.classList.add('system-message');
    }

    messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(messageDiv);
    scrollToBottom();
}

// 显示思考中
function showLoading() {
    const chatBox = document.getElementById('chatBox');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading';
    loadingDiv.className = 'message system-message';
    loadingDiv.innerHTML = `<em>小精灵思考中...</em>`;
    chatBox.appendChild(loadingDiv);
    scrollToBottom();
}

// 隐藏思考中
function hideLoading() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// 聊天框滚动到底部
function scrollToBottom() {
    const chatBox = document.getElementById('chatBox');
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: 'smooth'
    });
}

// 清空聊天记录
async function clearChat() {
    if (!currentSessionId) return;

    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';

    try {
        const response = await fetch('/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: currentSessionId })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        appendMessage('系统', '聊天记录已清空');
    } catch (error) {
        console.error('清空聊天记录失败:', error);
        appendMessage('系统', `清空失败: ${error.message}`);
    }
}

// 绑定回车发送
document.getElementById('userInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

// 绑定发送按钮
document.getElementById('sendBtn').addEventListener('click', sendMessage);

// 绑定清空按钮
document.getElementById('clearBtn').addEventListener('click', clearChat);

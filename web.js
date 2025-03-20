// Web storage implementation
const webStorage = {
    get: async (keys) => {
        if (typeof keys === 'string') {
            return { [keys]: JSON.parse(localStorage.getItem(keys)) };
        }
        const result = {};
        for (const key of keys) {
            result[key] = JSON.parse(localStorage.getItem(key));
        }
        return result;
    },
    set: async (items) => {
        for (const [key, value] of Object.entries(items)) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }
};

let currentPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    await loadSettings();
    await loadPrompts();
    initializeChatInterface();
}

function setupEventListeners() {
    // Save settings button
    const saveSettingsBtn = document.getElementById('save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    // Add prompt button
    const addPromptBtn = document.getElementById('add-prompt');
    if (addPromptBtn) {
        addPromptBtn.addEventListener('click', addNewPrompt);
    }
    
    // Initialize chat interface if it exists
    initializeChatInterface();
}

async function loadSettings() {
    const { apiKey } = await webStorage.get('apiKey');
    document.getElementById('api-key').value = apiKey || '';
}

async function saveSettings() {
    const apiKey = document.getElementById('api-key').value.trim();
    await webStorage.set({ apiKey });
    showStatus('Settings saved successfully!');
}

function showStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.style.display = 'block';
    setTimeout(() => {
        status.style.display = 'none';
    }, 2000);
}

async function loadPrompts() {
    try {
        const result = await webStorage.get('prompts');
        const promptsContainer = document.getElementById('saved-prompts');
        if (!promptsContainer) return;

        promptsContainer.innerHTML = '';
        
        const prompts = Array.isArray(result.prompts) ? result.prompts : [];
        prompts.forEach((prompt, index) => {
            promptsContainer.appendChild(createPromptElement(prompt, index));
        });
    } catch (error) {
        console.error('Error loading prompts:', error);
    }
}

function createPromptElement(prompt, index) {
    const div = document.createElement('div');
    div.className = 'prompt-template';
    
    div.innerHTML = `
        <h4>${prompt.name}</h4>
        <p>${prompt.text.substring(0, 100)}...</p>
        <div class="prompt-actions">
            <button class="use-btn">Use</button>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
        </div>
    `;
    
    div.querySelector('.use-btn').addEventListener('click', () => usePrompt(prompt));
    div.querySelector('.edit-btn').addEventListener('click', () => editPrompt(index));
    div.querySelector('.delete-btn').addEventListener('click', () => deletePrompt(index));
    
    return div;
}

async function addNewPrompt() {
    const name = document.getElementById('prompt-name').value.trim();
    const text = document.getElementById('prompt-text').value.trim();
    
    if (!name || !text) {
        alert('Please enter both name and prompt text');
        return;
    }

    try {
        const result = await webStorage.get('prompts');
        const prompts = Array.isArray(result.prompts) ? result.prompts : [];
        prompts.push({ name, text });
        await webStorage.set({ prompts });
        
        document.getElementById('prompt-name').value = '';
        document.getElementById('prompt-text').value = '';
        
        await loadPrompts();
    } catch (error) {
        console.error('Error saving prompt:', error);
        alert('Error saving prompt. Please try again.');
    }
}

async function deletePrompt(index) {
    const { prompts = [] } = await webStorage.get('prompts');
    prompts.splice(index, 1);
    await webStorage.set({ prompts });
    await loadPrompts();
}

function usePrompt(prompt) {
    currentPrompt = prompt;
    document.getElementById('prompt-info').textContent = `Using: ${prompt.name}`;
    document.getElementById('chat-container').innerHTML = '';
}

async function sendMessage() {
    if (!currentPrompt) {
        alert('Please select a prompt first');
        return;
    }

    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    input.value = '';

    const responsePlaceholder = addMessage('...', 'assistant');
    await generateResponse(message, responsePlaceholder);
}

function addMessage(text, sender) {
    const container = document.getElementById('chat-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = text;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    return messageDiv;
}

async function generateResponse(message, messageElement) {
    const { apiKey } = await webStorage.get('apiKey');
    if (!apiKey) {
        messageElement.textContent = 'Please set your API key in settings';
        return;
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const prompt = currentPrompt.text.replace('<TEXT>', message);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 2048
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.candidates[0]?.content?.parts[0]?.text;

        if (responseText) {
            // Simulate typing effect
            const words = responseText.split(' ');
            let currentText = '';
            
            for (const word of words) {
                currentText += `${word} `;
                messageElement.textContent = currentText.trim();
                await new Promise(resolve => setTimeout(resolve, 30));
            }
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('API Error:', error);
        messageElement.textContent = `Error: ${error.message}`;
    }
}

function initializeChatInterface() {
    const chatInterface = document.getElementById('chat-interface');
    if (!chatInterface) return;

    chatInterface.innerHTML = `
        <div class="prompt-info" id="prompt-info">Select a prompt to start chatting</div>
        <div class="chat-container" id="chat-container"></div>
        <div class="input-container">
            <div class="input-wrapper">
                <textarea id="user-input" rows="3" placeholder="Type your message here..."></textarea>
                <button id="send-message">Send</button>
            </div>
        </div>
    `;

    // Add event listeners for chat interface
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-message');
    
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Ensure send button event listener is properly attached
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            sendMessage().catch(console.error);
        });
    }
}

function editPrompt(index) {
    webStorage.get('prompts').then(result => {
        const prompts = result.prompts || [];
        const prompt = prompts[index];
        
        // Create and show modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h3>Edit Prompt</h3>
                <div class="input-container">
                    <label>Prompt Name:</label>
                    <input type="text" id="edit-prompt-name" value="${prompt.name}">
                    <label>Prompt Template:</label>
                    <textarea id="edit-prompt-text">${prompt.text}</textarea>
                    <button id="save-edit" class="button-primary">Save Changes</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // Handle close
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.onclick = () => {
            modal.remove();
        };
        
        // Handle save
        const saveBtn = modal.querySelector('#save-edit');
        saveBtn.onclick = async () => {
            const newName = modal.querySelector('#edit-prompt-name').value.trim();
            const newText = modal.querySelector('#edit-prompt-text').value.trim();
            
            if (!newName || !newText) {
                alert('Please fill in all fields');
                return;
            }
            
            prompts[index] = { name: newName, text: newText };
            await webStorage.set({ prompts });
            await loadPrompts();
            modal.remove();
        };
    });
}

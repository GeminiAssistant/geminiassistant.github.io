let currentPrompt = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const promptIndex = urlParams.get('prompt');
    
    const { prompts } = await chrome.storage.sync.get(['prompts']);
    currentPrompt = prompts[promptIndex];
    
    document.getElementById('send-message').addEventListener('click', sendMessage);
    document.getElementById('user-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Show prompt info
    const promptInfo = document.getElementById('prompt-info');
    if (currentPrompt) {
        promptInfo.textContent = `Using prompt: ${currentPrompt.name}`;
    }
});

async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    input.value = '';

    // Create a placeholder for assistant's response
    const responsePlaceholder = addMessage('...', 'assistant');
    await streamGeminiResponse(message, responsePlaceholder);
}

async function streamGeminiResponse(message, messageElement) {
    const { apiKey } = await chrome.storage.sync.get(['apiKey']);
    if (!apiKey) {
        messageElement.textContent = 'Please set your API key in settings';
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const prompt = currentPrompt.text.replace('<TEXT>', message);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                safety_settings: {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                },
                generation_config: {
                    temperature: 0.9,
                    topP: 1,
                    topK: 1,
                    maxOutputTokens: 2048
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Response:', errorData);
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data); // For debugging

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid response format from API');
        }

        const responseText = data.candidates[0].content.parts[0].text;

        // Simulate streaming effect
        const words = responseText.split(' ');
        let currentText = '';
        
        for (const word of words) {
            currentText += `${word} `;
            messageElement.textContent = currentText.trim();
            await new Promise(resolve => setTimeout(resolve, 30));
        }

    } catch (error) {
        console.error('Full API Error:', error);
        messageElement.textContent = `Error: ${error.message}. Please check your API key and try again.`;
    }
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

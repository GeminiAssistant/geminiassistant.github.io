/**
 * Handle incoming messages and render them with markdown support
 */
function displayMessage(message, isUser = false) {
    // Assuming 'message' is the text content to display
    
    // Only parse markdown for non-user messages (bot responses)
    const renderedContent = isUser ? sanitizeHTML(message) : renderMarkdownMessage(message);
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(isUser ? 'user-message' : 'bot-message');
    
    // Set the HTML content (safely parsed from markdown)
    messageElement.innerHTML = renderedContent;
    
    // Add to chat container (assuming there's a container with id 'chat-container')
    document.getElementById('chat-container').appendChild(messageElement);
    
    // Scroll to bottom of chat
    scrollToBottom();
}

// Helper function to scroll chat to bottom
function scrollToBottom() {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadPrompts();

    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('add-prompt').addEventListener('click', addNewPrompt);
});

function loadSettings() {
    chrome.storage.sync.get(['apiKey'], (result) => {
        document.getElementById('api-key').value = result.apiKey || '';
    });
}

function loadPrompts() {
    chrome.storage.sync.get(['prompts'], (result) => {
        const prompts = result.prompts || [];
        const promptsContainer = document.getElementById('saved-prompts');
        promptsContainer.innerHTML = '';
        
        prompts.forEach((prompt, index) => {
            const promptDiv = createPromptElement(prompt, index);
            promptsContainer.appendChild(promptDiv);
        });
    });
}

function createPromptElement(prompt, index) {
    const div = document.createElement('div');
    div.className = 'prompt-template';
    
    const title = document.createElement('h4');
    title.textContent = prompt.name;
    
    const text = document.createElement('p');
    text.textContent = `${prompt.text.substring(0, 100)}...`;
    
    const actions = document.createElement('div');
    actions.className = 'prompt-actions';
    
    const useButton = document.createElement('button');
    useButton.textContent = 'Use';
    useButton.dataset.index = index;
    useButton.addEventListener('click', () => openChat(index));
    
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.dataset.index = index;
    editButton.classList.add('edit-button');
    editButton.addEventListener('click', () => editPrompt(index));
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.dataset.index = index;
    deleteButton.addEventListener('click', () => deletePrompt(index));
    
    actions.appendChild(useButton);
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    
    div.appendChild(title);
    div.appendChild(text);
    div.appendChild(actions);
    
    return div;
}

function addNewPrompt() {
    const name = document.getElementById('prompt-name').value;
    const text = document.getElementById('prompt-text').value;
    
    if (!name || !text) {
        alert('لطفا نام و متن پرامپت را وارد کنید');
        return;
    }

    chrome.storage.sync.get(['prompts'], (result) => {
        const prompts = result.prompts || [];
        prompts.push({ name, text });
        chrome.storage.sync.set({ prompts }, () => {
            loadPrompts();
            document.getElementById('prompt-name').value = '';
            document.getElementById('prompt-text').value = '';
        });
    });
}

function deletePrompt(index) {
    chrome.storage.sync.get(['prompts'], (result) => {
        const prompts = result.prompts || [];
        prompts.splice(index, 1);
        chrome.storage.sync.set({ prompts }, loadPrompts);
    });
}

function openChat(promptIndex) {
    chrome.tabs.create({
        url: chrome.runtime.getURL(`chat.html?prompt=${promptIndex}`),
        active: true
    });
}

function saveSettings() {
    const apiKey = document.getElementById('api-key').value.trim();
    
    chrome.storage.sync.set({ apiKey }, () => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => {
            status.style.display = 'none';
        }, 2000);
    });
}

function editPrompt(index) {
    chrome.storage.sync.get(['prompts'], (result) => {
        const prompts = result.prompts || [];
        const prompt = prompts[index];
        
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
        
        modal.querySelector('.close-modal').onclick = () => {
            modal.remove();
        };
        
        modal.querySelector('#save-edit').onclick = () => {
            const newName = modal.querySelector('#edit-prompt-name').value.trim();
            const newText = modal.querySelector('#edit-prompt-text').value.trim();
            
            if (!newName || !newText) {
                alert('Please fill in all fields');
                return;
            }
            
            prompts[index] = { name: newName, text: newText };
            chrome.storage.sync.set({ prompts }, () => {
                loadPrompts();
                modal.remove();
            });
        };
    });
}

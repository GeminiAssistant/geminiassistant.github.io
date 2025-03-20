chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed and ready to use.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getLanguages') {
        chrome.storage.sync.get(['selectedLanguages'], (data) => {
            const languages = data.selectedLanguages || ['auto'];
            sendResponse({ languages });
        });
        return true; // Required for asynchronous response
    }
    
    if (request.action === 'checkApiKey') {
        chrome.storage.sync.get(['apiKey'], (data) => {
            sendResponse({ hasKey: !!data.apiKey });
        });
        return true;
    }
});

// Handle extension updates
chrome.runtime.onUpdateAvailable.addListener(() => {
    console.log('Update available, reloading extension...');
    chrome.runtime.reload();
});

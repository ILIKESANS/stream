const popupChatInput = document.getElementById('popupChatInput');
const popupSendBtn = document.getElementById('popupSendBtn');
const popupChatMessages = document.getElementById('popupChatMessages');
const popupPollContainer = document.getElementById('popupPollContainer');
let popupActivePoll = null;
let popupTotalVotes = 0;
let wasHidden = false;
let pollUpdateInterval;
let maxPopupChatMessages = 200; // Default max chat messages
const popupSubtitlesContainer = document.getElementById('popupSubtitlesContainer');
const popupDonateBtn = document.getElementById('popupDonateBtn');

// Function to receive messages from the parent window
window.addEventListener('message', function(event) {
    if (event.data.type === 'newMessage') {
        const message = event.data.message;
        addMessageToChat(message.username, message.content, message.colorClass);
        
        // Update the message limit if provided
        if (message.maxMessages) {
            maxPopupChatMessages = message.maxMessages;
            trimPopupChatMessages();
        }
    } else if (event.data.type === 'newDonation') {
        const donation = event.data.donation;
        addDonationToChat(donation.username, donation.content, donation.amount);
    } else if (event.data.type === 'viewerUpdate') {
        document.getElementById('popupViewerCount').textContent = event.data.count;
    } else if (event.data.type === 'newPoll') {
        popupActivePoll = event.data.poll;
        updatePopupPoll();
        startPollUpdates();
    } else if (event.data.type === 'pollUpdate') {
        popupActivePoll = event.data.poll;
        popupTotalVotes = event.data.totalVotes;
        updatePopupPoll();
    } else if (event.data.type === 'pollEnded') {
        popupActivePoll = event.data.poll;
        popupTotalVotes = event.data.totalVotes;
        updatePopupPoll();
        stopPollUpdates();
    } else if (event.data.type === 'pollRemoved') {
        popupActivePoll = null;
        updatePopupPoll();
        stopPollUpdates();
    } else if (event.data.type === 'newSubtitle') {
        displaySubtitle(event.data.text);
    }
});

// Function to add a message to the chat
function addMessageToChat(username, message, colorClass) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const usernameSpan = document.createElement('span');
    usernameSpan.className = `username ${colorClass}`;
    usernameSpan.textContent = username + ':';
    
    const contentSpan = document.createElement('span');
    contentSpan.className = 'message-content';
    
    // Check if message is HTML content
    if (message.isHTML) {
        contentSpan.innerHTML = message;
    } else {
        // Check if message is replying to someone (contains @ username)
        if (message.includes('@')) {
            contentSpan.innerHTML = message.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
        } else {
            contentSpan.textContent = message;
        }
    }
    
    messageElement.appendChild(usernameSpan);
    messageElement.appendChild(contentSpan);
    
    popupChatMessages.appendChild(messageElement);
    
    // Check if we need to trim messages
    trimPopupChatMessages();
    
    popupChatMessages.scrollTop = popupChatMessages.scrollHeight;
}

// Function to trim chat messages when limit is reached
function trimPopupChatMessages() {
    const messages = popupChatMessages.querySelectorAll('.message');
    if (messages.length > maxPopupChatMessages) {
        // Remove oldest messages
        for (let i = 0; i < messages.length - maxPopupChatMessages; i++) {
            popupChatMessages.removeChild(messages[i]);
        }
    }
}

// Function to add a donation message to the chat
function addDonationToChat(username, message, amount) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message donation';
    messageElement.innerHTML = `
        <span class="donation-amount">$${amount}</span>
        <span class="username color-4">${username}:</span>
        <span class="message-content">${message}</span>
    `;
    
    popupChatMessages.appendChild(messageElement);
    trimPopupChatMessages();
    popupChatMessages.scrollTop = popupChatMessages.scrollHeight;
}

// Function to update the poll display
function updatePopupPoll() {
    popupPollContainer.innerHTML = '';
    
    if (!popupActivePoll) {
        popupPollContainer.style.display = 'none';
        return;
    }
    
    popupPollContainer.style.display = 'block';
    
    // Calculate time remaining
    const timeRemaining = Math.max(0, popupActivePoll.endTime - Date.now());
    const secondsRemaining = Math.ceil(timeRemaining / 1000);
    
    // Create poll container
    const pollDiv = document.createElement('div');
    pollDiv.className = 'active-poll';
    
    // Create poll title
    const titleDiv = document.createElement('div');
    titleDiv.className = 'active-poll-title';
    titleDiv.textContent = popupActivePoll.title;
    pollDiv.appendChild(titleDiv);
    
    // Create options container
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'poll-options';
    
    // Add options
    popupActivePoll.options.forEach((option) => {
        const percentage = popupTotalVotes > 0 ? Math.round((option.votes / popupTotalVotes) * 100) : 0;
        
        const optionDiv = document.createElement('div');
        optionDiv.className = 'poll-option';
        
        const barDiv = document.createElement('div');
        barDiv.className = 'poll-option-bar';
        barDiv.style.width = `${percentage}%`;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'poll-option-text';
        
        const optionTextSpan = document.createElement('span');
        optionTextSpan.textContent = option.text;
        
        const percentageSpan = document.createElement('span');
        percentageSpan.textContent = `${percentage}%`;
        
        textDiv.appendChild(optionTextSpan);
        textDiv.appendChild(percentageSpan);
        
        optionDiv.appendChild(barDiv);
        optionDiv.appendChild(textDiv);
        optionsDiv.appendChild(optionDiv);
    });
    
    pollDiv.appendChild(optionsDiv);
    
    // Create timer
    const timerDiv = document.createElement('div');
    timerDiv.className = 'poll-timer';
    
    const timerBarDiv = document.createElement('div');
    timerBarDiv.className = 'poll-timer-bar';
    timerBarDiv.style.width = `${(timeRemaining / (popupActivePoll.duration * 1000)) * 100}%`;
    
    timerDiv.appendChild(timerBarDiv);
    pollDiv.appendChild(timerDiv);
    
    // Create votes info
    const votesDiv = document.createElement('div');
    votesDiv.className = 'poll-votes';
    
    const votesCountSpan = document.createElement('span');
    votesCountSpan.textContent = `${popupTotalVotes} vote${popupTotalVotes !== 1 ? 's' : ''}`;
    
    const timeSpan = document.createElement('span');
    timeSpan.textContent = popupActivePoll.isActive ? `${secondsRemaining}s remaining` : 'Poll ended';
    
    votesDiv.appendChild(votesCountSpan);
    votesDiv.appendChild(timeSpan);
    pollDiv.appendChild(votesDiv);
    
    // Add poll status if ended
    if (!popupActivePoll.isActive) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'poll-status';
        const winningText = popupActivePoll.winningOption ? 
            `Poll ended, "${popupActivePoll.winningOption.text}" won!` : 
            "Poll ended";
        statusDiv.textContent = winningText;
        pollDiv.appendChild(statusDiv);
    }
    
    popupPollContainer.appendChild(pollDiv);
}

// Function to display subtitles in the popup
function displaySubtitle(text) {
    // Create new subtitle element
    const subtitleElement = document.createElement('div');
    subtitleElement.className = 'subtitle';
    subtitleElement.textContent = text;
    
    // Add to container with no delay
    popupSubtitlesContainer.innerHTML = ''; // Clear previous subtitles
    popupSubtitlesContainer.appendChild(subtitleElement);
    
    // Auto-remove after a few seconds 
    setTimeout(() => {
        if (popupSubtitlesContainer.contains(subtitleElement)) {
            // Fade out the subtitle
            subtitleElement.style.opacity = '0';
            subtitleElement.style.transform = 'translateY(5px)';
            subtitleElement.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            // Then remove after fade completes
            setTimeout(() => {
                if (popupSubtitlesContainer.contains(subtitleElement)) {
                    popupSubtitlesContainer.removeChild(subtitleElement);
                }
            }, 500);
        }
    }, 3000);
}

// Add visibility change listener to refresh poll data when tab becomes visible again
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        wasHidden = true;
        stopPollUpdates();
    } else if (document.visibilityState === 'visible' && wasHidden) {
        wasHidden = false;
        // Request current poll state from parent window when tab becomes visible
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage({
                type: 'requestPollUpdate'
            }, '*');
            if (popupActivePoll && popupActivePoll.isActive) {
                startPollUpdates();
            }
        }
    }
});

// Function to start poll updates on an interval
function startPollUpdates() {
    stopPollUpdates();
    pollUpdateInterval = setInterval(() => {
        updatePopupPollTimers();
    }, 1000);
}

// Function to stop poll updates
function stopPollUpdates() {
    if (pollUpdateInterval) {
        clearInterval(pollUpdateInterval);
        pollUpdateInterval = null;
    }
}

// Update just the timer parts of the poll without requesting new data
function updatePopupPollTimers() {
    if (!popupActivePoll || !popupActivePoll.isActive) return;
    
    const timerBar = document.querySelector('.poll-timer-bar');
    const timeSpan = document.querySelector('.poll-votes span:last-child');
    
    if (timerBar && timeSpan) {
        const timeRemaining = Math.max(0, popupActivePoll.endTime - Date.now());
        const secondsRemaining = Math.ceil(timeRemaining / 1000);
        
        timerBar.style.width = `${(timeRemaining / (popupActivePoll.duration * 1000)) * 100}%`;
        timeSpan.textContent = `${secondsRemaining}s remaining`;
        
        // End poll locally if timer is up
        if (timeRemaining <= 0 && popupActivePoll.isActive) {
            popupActivePoll.isActive = false;
            updatePopupPoll();
            stopPollUpdates();
            // Request updated poll state from parent
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                    type: 'requestPollUpdate'
                }, '*');
            }
        }
    }
}

// Add donation button functionality
popupDonateBtn.addEventListener('click', function() {
    // Send message to parent window to open donation modal
    if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
            type: 'openDonation'
        }, '*');
    }
});

function sendMessage() {
    const message = popupChatInput.value.trim();
    if (message) {
        window.opener.postMessage({
            type: 'newUserMessage',
            message: message
        }, '*');
        
        // Also show the message in the popup
        addMessageToChat('You', message, 'color-4');
        popupChatInput.value = '';
    }
}

// Event listeners for sending messages
popupSendBtn.addEventListener('click', sendMessage);
popupChatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
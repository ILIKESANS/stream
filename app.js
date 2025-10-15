// ... existing code ...

let mediaRecorder;
let recordedChunks = [];
let timerInterval;
let startTime;
let stream;
let captureCanvas = document.createElement('canvas');
let captureContext = captureCanvas.getContext('2d');
let aiChatInterval;
let isProcessingAIMessage = false;
let pendingCaptureRequests = 0;
let maxSimultaneousCaptureRequests = 2;
let visualEnhancementMode = true; // Enable visual enhancement by default
let previousMessages = []; // Store previous AI-generated messages
let previousUsernames = []; // Store previously used usernames
let extraUserMessageForAI = null;  // Holds a user message to include in the next AI prompt check
let recentChatHistory = []; // Store full chat history with usernames for context
let chatSettings = {
    angry: false,
    memelike: false,
    happy: false,
    botlike: false,
    silly: false,
    sad: false,
    confused: false,
    fan: false,
    customStyles: [] // Array to store custom chat styles
};
let customEmojis = []; // Array to store custom emojis
let activePoll = null;
let pollTimer = null;
let totalVotes = 0;
let aiCheckInterval = 2; // Default interval in seconds
let maxChatMessages = 200; // Default max chat messages limit
let viewerCount = 0;
let viewerCountTimer;
let donationInterval;
let donationChance = 0.15; // Chance of donation per interval check
let subtitlesEnabled = true; // Default to showing subtitles
let subtitlesInterval = null;
let lastTranscribedTime = 0;
let captionGenerationInProgress = false;
let captionBuffer = [];
let continueViewersAfterEnd = false; // New setting to continue viewer messages after end
let styleSubtitles = false; // New setting to apply chat styles to subtitles
let disableStreamBot = false; // New setting to disable StreamBot alerts

let embedPlayer = null; // For embedded video players like YouTube
let embedPlayerType = null; // Type of embedded player
let embedInterval = null; // Interval for checking embed player status

// DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadBtn = document.getElementById('downloadBtn');
const timer = document.getElementById('timer');
const recordingStatus = document.getElementById('recordingStatus');
const preview = document.getElementById('preview');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const popoutBtn = document.getElementById('popoutBtn');
const createPollBtn = document.getElementById('createPollBtn');
const pollForm = document.getElementById('pollForm');
const activePollContainer = document.getElementById('activePollContainer');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const chatSettingsForm = document.getElementById('chatSettingsForm');
const createStyleBtn = document.getElementById('createStyleBtn');
const customStyleModal = document.getElementById('customStyleModal');
const closeCustomStyleBtn = document.getElementById('closeCustomStyleBtn');
const customStyleForm = document.getElementById('customStyleForm');
const subtitlesContainer = document.getElementById('subtitlesContainer');
const subtitlesToggle = document.getElementById('subtitlesToggle');
const streamLinkBtn = document.getElementById('streamLinkBtn');
const continueViewersToggle = document.getElementById('continueViewersToggle');
const donateBtn = document.getElementById('donateBtn');
const styleSubtitlesToggle = document.getElementById('styleSubtitlesToggle');
const createEmojiBtn = document.getElementById('createEmojiBtn');
const emojiModal = document.getElementById('emojiModal');
const emojiForm = document.getElementById('emojiForm');
const emojiPreview = document.getElementById('emojiPreview');
const emojiFileInput = document.getElementById('emojiFileInput');
const emojiGrid = document.getElementById('emojiGrid');
const disableStreamBotCheckbox = document.getElementById('disableStreamBot');

// Event listeners
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
downloadBtn.addEventListener('click', downloadRecording);
sendBtn.addEventListener('click', sendMessage);
popoutBtn.addEventListener('click', openChatPopup);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
chatSettingsForm.addEventListener('submit', saveSettings);
document.getElementById('angryViewers').addEventListener('change', updateChatSettings);
document.getElementById('memeViewers').addEventListener('change', updateChatSettings);
document.getElementById('happyViewers').addEventListener('change', updateChatSettings);
document.getElementById('botViewers').addEventListener('change', updateChatSettings);
document.getElementById('sillyViewers').addEventListener('change', updateChatSettings);
document.getElementById('sadViewers').addEventListener('change', updateChatSettings);
document.getElementById('confusedViewers').addEventListener('change', updateChatSettings);
document.getElementById('fanViewers').addEventListener('change', updateChatSettings);
createPollBtn.addEventListener('click', togglePollForm);
document.getElementById('addOptionBtn').addEventListener('click', addPollOption);
pollForm.addEventListener('submit', createPoll);
continueViewersToggle.addEventListener('change', toggleContinueViewers);
document.getElementById('streamVideoBtn').addEventListener('click', streamVideo);
document.getElementById('aiIntervalSelect').addEventListener('change', function(e) {
    aiCheckInterval = parseFloat(e.target.value);
    // If currently recording or streaming, restart the AI chat generation with new interval
    if ((mediaRecorder && mediaRecorder.state === 'recording') || preview.src && !preview.srcObject) {
        startAIChatGeneration();
    }
});
createStyleBtn.addEventListener('click', openCustomStyleModal);
closeCustomStyleBtn.addEventListener('click', closeCustomStyleModal);
customStyleForm.addEventListener('submit', saveCustomStyle);
document.addEventListener('DOMContentLoaded', loadSettings); // Load custom styles when page loads
subtitlesToggle.addEventListener('change', toggleSubtitles);
streamLinkBtn.addEventListener('click', openStreamLinkModal);
donateBtn.addEventListener('click', openDonationModal);
styleSubtitlesToggle.addEventListener('change', function() {
    styleSubtitles = this.checked;
});
createEmojiBtn.addEventListener('click', openEmojiModal);
document.getElementById('closeEmojiBtn').addEventListener('click', closeEmojiModal);
emojiForm.addEventListener('submit', saveCustomEmoji);
emojiFileInput.addEventListener('change', previewEmojiImage);

document.getElementById('titleMicBtn').addEventListener('click', function() { 
    startVoiceInput('customStyleTitle', this); 
});
document.getElementById('descriptionMicBtn').addEventListener('click', function() { 
    startVoiceInput('customStyleDescription', this); 
});

disableStreamBotCheckbox.addEventListener('change', function(e) {
    chatSettings.disableStreamBot = e.target.checked;
    // Save to localStorage
    localStorage.setItem('disableStreamBot', e.target.checked);
});

// Create and append the stream link modal to the body
const streamLinkModal = document.createElement('div');
streamLinkModal.className = 'stream-link-modal';
streamLinkModal.innerHTML = `
    <div class="stream-link-content">
        <h3>
            Stream from URL (Beta)
            <button id="closeStreamLinkBtn" class="settings-close">&times;</button>
        </h3>
        <form id="streamLinkForm" class="stream-link-form">
            <div>
                <label for="videoUrl">Video URL</label>
                <input type="text" id="videoUrl" placeholder="Enter direct video URL" required>
                <div class="hint-text">Direct video links only (.mp4, .webm, .m3u8)</div>
            </div>
            <div class="supported-sites">
                Supported sites: <span>direct video links (.mp4, .webm, .m3u8)</span>
            </div>
            <div class="button-row">
                <button type="button" id="cancelStreamLinkBtn" class="cancel">Cancel</button>
                <button type="submit" class="submit">Start Streaming</button>
            </div>
        </form>
    </div>
`;
document.body.appendChild(streamLinkModal);

// Stream link modal event listeners
document.getElementById('closeStreamLinkBtn').addEventListener('click', closeStreamLinkModal);
document.getElementById('cancelStreamLinkBtn').addEventListener('click', closeStreamLinkModal);
document.getElementById('streamLinkForm').addEventListener('submit', handleStreamLink);

function updateChatSettings(e) {
    const setting = e.target.id.replace('Viewers', '').toLowerCase();
    chatSettings[setting] = e.target.checked;
}

// Function to toggle subtitles
function toggleSubtitles() {
    subtitlesEnabled = subtitlesToggle.checked;
    if (subtitlesEnabled) {
        subtitlesContainer.style.display = 'block';
    } else {
        subtitlesContainer.style.display = 'none';
        // Clear current subtitles when turning off
        subtitlesContainer.innerHTML = '';
    }
}

// Function to toggle continue viewers setting
function toggleContinueViewers() {
    continueViewersAfterEnd = continueViewersToggle.checked;
}

// Function to start recording
async function startRecording() {
    recordedChunks = [];
    
    try {
        // Check if mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Request permission to record screen with appropriate constraints
        if (isMobile) {
            // Mobile devices mostly support camera recording rather than screen recording
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: true
            });
            recordingStatus.textContent = "Recording from camera...";
        } else {
            // Desktop screen recording
            stream = await navigator.mediaDevices.getDisplayMedia({
                video: { 
                    cursor: "always",
                    displaySurface: "monitor"
                },
                audio: true
            });
        }
        
        // Add event listener for when the user stops sharing
        stream.getVideoTracks()[0].addEventListener('ended', () => {
            // Treat this the same as clicking the stop button
            stopRecording();
        });
        
        // Set up media recorder
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = function() {
            // Create preview video
            const blob = new Blob(recordedChunks, {
                type: 'video/webm'
            });
            const url = URL.createObjectURL(blob);
            preview.src = url;
            preview.muted = false; // Allow audio playback for recorded video preview
            
            // Update UI
            recordingStatus.textContent = "Recording finished";
            downloadBtn.disabled = false;
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };
        
        // Start recording
        mediaRecorder.start();
        
        // Update UI
        startBtn.disabled = true;
        stopBtn.disabled = false;
        if (!isMobile) {
            recordingStatus.textContent = "Recording...";
        }
        
        // Start timer
        startTime = Date.now();
        startTimer();
        
        // Show preview of what's being recorded
        preview.srcObject = stream;
        preview.muted = true; // Mute during live screen recording to prevent feedback
        
        // Start AI chat based on video content
        startAIChatGeneration();
        
        // Start viewer count and donations
        initializeViewerCount();
        startDonations();
        
        // Clear any existing subtitles
        subtitlesContainer.innerHTML = '';
        
    } catch (error) {
        console.error("Error starting recording:", error);
        recordingStatus.textContent = "Failed to start recording: " + error.message;
    }
}

// Updated stopRecording function to also handle streamed videos
function stopRecording() {
    // Stop timer and AI chat generation regardless of source type
    clearInterval(timerInterval);
    
    // Only stop AI chat generation if the continue viewers option is disabled
    if (!continueViewersAfterEnd) {
        stopAIChatGeneration();
    }
    
    clearInterval(viewerCountTimer);
    stopDonations();
    stopGeneratingSubtitles();
    
    // Clean up embedded players if needed
    cleanupEmbeddedPlayer();
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    } else if (preview.src && !preview.srcObject) {
        // For video file streaming mode: pause playback and update UI
        preview.pause();
        downloadBtn.disabled = false;
        recordingStatus.textContent = "Video streaming finished";
    }
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

// Function to download recording
function downloadRecording() {
    if (recordedChunks.length === 0) {
        return;
    }
    
    const blob = new Blob(recordedChunks, {
        type: 'video/webm'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Get current date and time for filename
    const now = new Date();
    const filename = `screen-recording-${now.toISOString().split('T')[0]}-${now.getHours()}-${now.getMinutes()}.webm`;
    
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

// Timer function
function startTimer() {
    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const seconds = Math.floor((elapsedTime / 1000) % 60);
        const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
        
        timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// AI Chat functionality based on screen content
function startAIChatGeneration() {
    // Clear any existing interval
    stopAIChatGeneration();
    
    // Use the selected interval for AI checks
    aiChatInterval = setInterval(() => {
        // Only allow a limited number of capture requests to be pending at once
        if (pendingCaptureRequests < maxSimultaneousCaptureRequests) {
            captureAndGenerateMessages();
        }
    }, aiCheckInterval * 1000);
    
    // Initial capture and message generation
    captureAndGenerateMessages();
}

function stopAIChatGeneration() {
    clearInterval(aiChatInterval);
}

async function captureAndGenerateMessages() {
    if ((!preview.srcObject && !preview.src) && !continueViewersAfterEnd) return;
    
    try {
        pendingCaptureRequests++;
        
        // Only capture from preview if there's content, otherwise use a blank canvas for AI generation
        if ((preview.srcObject || preview.src) && !preview.ended && !preview.paused) {
            captureCanvas.width = preview.videoWidth;
            captureCanvas.height = preview.videoHeight;
            captureContext.drawImage(preview, 0, 0, captureCanvas.width, captureCanvas.height);
        } else if (continueViewersAfterEnd) {
            // For continued generation after video ends, use the last frame if available
            // or create a blank canvas with a message if no last frame exists
            if (captureCanvas.width === 0 || captureCanvas.height === 0) {
                captureCanvas.width = 640;
                captureCanvas.height = 360;
                captureContext.fillStyle = "#0e0e10";
                captureContext.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
                captureContext.fillStyle = "#ffffff";
                captureContext.font = "20px Arial";
                captureContext.fillText("Stream ended", 250, 180);
            }
        }
        
        // Adjust image quality for better AI processing
        const imageQuality = visualEnhancementMode ? 0.85 : 0.7;
        const imageDataUrl = captureCanvas.toDataURL('image/jpeg', imageQuality);
        
        // Request AI description of the current frame with enhanced prompt
        const completion = await getAIDescriptionsOfImage(imageDataUrl);
        
        if (completion && completion.length > 0) {
            // Use staggered timing to make chat feel more natural
            for (let i = 0; i < completion.length; i++) {
                setTimeout(() => {
                    const colorClass = `color-${Math.floor(Math.random() * 6) + 1}`;
                    addMessageToChat(completion[i].username, completion[i].message, colorClass);
                }, i * (1000 + Math.random() * 500)); // More natural timing variation
            }
        }
    } catch (error) {
        console.error("Error generating AI messages:", error);
        // Don't count failed attempts in the pending requests to avoid blocking future attempts
    } finally {
        pendingCaptureRequests--;
    }
}

async function getAIDescriptionsOfImage(imageDataUrl) {
    let retries = 2; // Number of retry attempts
    let delay = 1000; // Starting delay in ms
    
    while (retries >= 0) {
        try {
            // Generate settings prompt based on selected options
            let chatStylePrompt = "";
            if (chatSettings.angry) chatStylePrompt += "Use an angry, critical tone. ";
            if (chatSettings.memelike) chatStylePrompt += "Include lots of memes and internet slang. ";
            if (chatSettings.happy) chatStylePrompt += "Be very positive and supportive. ";
            if (chatSettings.botlike) chatStylePrompt += "Include some messages that seem like bots or spam. ";
            if (chatSettings.silly) chatStylePrompt += "Use a playful, joyful, exaggerated happy tone with silly jokes and wordplay. ";
            if (chatSettings.sad) chatStylePrompt += "Use a sad, melancholic tone, cry about everything happening. ";
            if (chatSettings.confused) chatStylePrompt += "Sound perpetually confused, misunderstand what's happening, ask lots of questions. ";
            if (chatSettings.fan) chatStylePrompt += "Act like devoted fans of the streamer, shower them with compliments and support. ";
            
            // Add custom styles to the prompt
            chatSettings.customStyles.forEach(style => {
                if (style.active) {
                    chatStylePrompt += `${style.description} `;
                }
            });
            
            // Format recent chat history for better context
            const chatHistoryContext = recentChatHistory.length > 0 
                ? recentChatHistory.map(entry => `${entry.username}: ${entry.message}`).join(" | ")
                : "No recent messages";
            
            // Build user context prompt with previous messages and, if available, the latest user message (only for one check)
            let userMessageContext = `What would Twitch chat say about this screen? Here are the last messages for context: ${chatHistoryContext}. Previously used usernames: ${previousUsernames.slice(-20).join(", ")}`;
            if (extraUserMessageForAI) {
                userMessageContext += ` User also said: "${extraUserMessageForAI}".`;
                extraUserMessageForAI = null;
            }
            
            // Add custom emoji information to the prompt
            let emojiContext = "";
            if (customEmojis.length > 0) {
                emojiContext = `The chat has these custom emojis available: ${customEmojis.map(emoji => `${emoji.code} (${emoji.title})`).join(', ')}. Occasionally include these custom emojis in messages where appropriate.`;
            }
            
            // Create a dynamic system prompt with style instructions moved to the beginning for emphasis
            const systemPrompt = `You're an AI simulating a Twitch chat for a streaming session. 
${chatStylePrompt ? `IMPORTANT CHAT STYLE INSTRUCTIONS: ${chatStylePrompt}\n\n` : ''}
Look at the screen recording and generate 5 short, realistic chat messages that viewers might say about what they're seeing.
Keep messages brief (under 60 chars), conversational, and varied in tone.
Include questions, reactions, and observations like real chat messages.
Be aware of previous messages and context to create continuity in the chat.

IMPORTANT: Viewers are extremely knowledgeable about current trends, memes, and internet culture.
They reference recent events, latest memes, and pop culture in their messages.
They know about trending games, streamers, viral content and recent developments in tech and entertainment.
They often make comparisons to similar content they've seen elsewhere on the internet.

IMPORTANT: Some messages should directly reply to or reference other users' previous messages. Use their usernames when replying. Create natural conversational threads.

${emojiContext}

Focus on the most noticeable visual elements in the frame.
If you see text in the image, reference it in some messages when appropriate.
Notice small details in the image - be very visually observant about colors, objects, movements and specific elements.
Pay special attention to every pixel and comment on fine details that most people would miss.
Comment on precise visual elements, not just general themes.
Also generate unique usernames for each message - create diverse, believable usernames.
Generate as unique usernames as possible – avoid common or overused examples.
Respond directly with JSON, following this JSON schema, and no other text:
{
    "messages": [
        {"username": "username1", "message": "message1"},
        {"username": "username2", "message": "message2"},
        {"username": "username3", "message": "message3"},
        {"username": "username4", "message": "message4"},
        {"username": "username5", "message": "message5"}
    ]
}`;
            
            // Call the AI to analyze the image and generate related messages with enhanced prompt
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: userMessageContext },
                            { type: "image_url", image_url: { url: imageDataUrl } }
                        ]
                    }
                ],
                json: true
            });

            // Parse the AI response
            let result = JSON.parse(completion.content);
            
            // Extract messages and usernames
            const messageTexts = result.messages.map(item => item.message);
            const newUsernames = result.messages.map(item => item.username);
            
            // Store the new messages in our history
            previousMessages = previousMessages.concat(messageTexts);
            previousUsernames = previousUsernames.concat(newUsernames);
            
            // Keep only the last 20 messages in history to avoid context getting too large
            if (previousMessages.length > 20) {
                previousMessages = previousMessages.slice(-20);
            }
            
            // Keep only the last 50 usernames
            if (previousUsernames.length > 50) {
                previousUsernames = previousUsernames.slice(-50);
            }
            
            return result.messages;
        } catch (error) {
            console.error(`Error calling AI service (attempt ${2-retries}/2):`, error);
            
            // If no more retries left, return empty array
            if (retries <= 0) {
                console.warn("All AI service retry attempts failed, returning empty messages");
                // Check if StreamBot alerts are enabled
                if (!chatSettings.disableStreamBot) {
                    // Add a fallback message to keep chat active only if StreamBot is not disabled
                    addMessageToChat("StreamBot", "AI service is experiencing high traffic. Messages will resume shortly.", "color-4");
                }
                return [];
            }
            
            // Exponential backoff for retries
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Double the delay for next retry
            retries--;
        }
    }
    
    return []; // Fallback empty response if all retries fail
}

// Also add retry logic for user message responses
async function generateAIResponseToUserMessage(userMessage) {
    const aiResponseTime = parseFloat(localStorage.getItem('aiResponseTime') || 1.5);
    
    let retries = 2;
    let delay = 1000;
    
    while (retries >= 0) {
        try {
            // Generate settings prompt based on selected options
            let chatStylePrompt = "";
            if (chatSettings.angry) chatStylePrompt += "Use an angry, critical tone. ";
            if (chatSettings.memelike) chatStylePrompt += "Include lots of memes and internet slang. ";
            if (chatSettings.happy) chatStylePrompt += "Be very positive and supportive. ";
            if (chatSettings.botlike) chatStylePrompt += "Include some messages that seem like bots or spam. ";
            if (chatSettings.silly) chatStylePrompt += "Use a playful, joyful, exaggerated happy tone with silly jokes and wordplay. ";
            if (chatSettings.sad) chatStylePrompt += "Use a sad, melancholic tone, cry about everything happening. ";
            if (chatSettings.confused) chatStylePrompt += "Sound perpetually confused, misunderstand what's happening, ask lots of questions. ";
            if (chatSettings.fan) chatStylePrompt += "Act like devoted fans of the streamer, shower them with compliments and support. ";
            
            // Add custom styles to the prompt
            chatSettings.customStyles.forEach(style => {
                if (style.active) {
                    chatStylePrompt += `${style.description} `;
                }
            });
            
            // Format recent chat history for better context
            const chatHistoryContext = recentChatHistory.length > 0 
                ? recentChatHistory.map(entry => `${entry.username}: ${entry.message}`).join(" | ")
                : "No recent messages";
                
            const systemPrompt = `You're generating 3-4 Twitch chat messages from different users reacting to a streamer's message.
${chatStylePrompt ? `IMPORTANT CHAT STYLE INSTRUCTIONS: ${chatStylePrompt}\n\n` : ''}
Messages should be brief (under 60 chars), conversational, and varied in tone.
Include a mix of agreement, disagreement, questions, and jokes.

IMPORTANT: Viewers are extremely knowledgeable about current trends, memes, and internet culture.
They reference recent events, latest memes, and pop culture in their messages.
They know about trending games, streamers, viral content and recent developments in tech and entertainment.
They often make comparisons to similar content they've seen elsewhere on the internet.

IMPORTANT: Many of these messages should directly reply to either the streamer or to other chat messages.
Reference previous usernames when replying to create natural conversation threads.

Generate unique usernames for each message - avoid common or overused examples.
Respond directly with JSON, following this JSON schema, and no other text:
{
    "messages": [
        {"username": "username1", "message": "message1"},
        {"username": "username2", "message": "message2"},
        {"username": "username3", "message": "message3"},
        {"username": "username4", "message": "message4"}
    ]
}`;
            
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: `Generate 3-4 chat messages reacting to this streamer's message: "${userMessage}". 
                        Here are the recent chat messages for context: ${chatHistoryContext}`
                    }
                ],
                json: true
            });

            // Parse the AI response
            let result = JSON.parse(completion.content);
            
            // Add the messages to chat with delays based on settings
            result.messages.forEach((msgData, index) => {
                setTimeout(() => {
                    const colorClass = `color-${Math.floor(Math.random() * 6) + 1}`;
                    addMessageToChat(msgData.username, msgData.message, colorClass);
                }, (index * aiResponseTime + Math.random() * aiResponseTime/2) * 1000); 
            });
            
            return; // Success, exit the function
            
        } catch (error) {
            console.error(`Error generating chat responses (attempt ${2-retries}/2):`, error);
            
            // If no more retries left, show a fallback message
            if (retries <= 0) {
                console.warn("All AI service retry attempts failed");
                addMessageToChat("StreamBot", "Sorry, couldn't generate responses right now. Try again in a moment.", "color-4");
                return;
            }
            
            // Exponential backoff for retries
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Double the delay for next retry
            retries--;
        }
    }
}

// Apply similar retry logic to generateSubtitleFromCurrentAudio
async function generateSubtitleFromCurrentAudio() {
    try {
        // Set flag to prevent multiple concurrent requests
        captionGenerationInProgress = true;
        
        // Capture current frame for context
        captureCanvas.width = preview.videoWidth;
        captureCanvas.height = preview.videoHeight;
        captureContext.drawImage(preview, 0, 0, captureCanvas.width, captureCanvas.height);
        const imageDataUrl = captureCanvas.toDataURL('image/jpeg', 0.7);
        
        // Update last transcribed time immediately to prevent duplicate requests
        lastTranscribedTime = preview.currentTime;
        
        // Calculate the current timestamp in the video
        const minutes = Math.floor(preview.currentTime / 60);
        const seconds = Math.floor(preview.currentTime % 60);
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Generate settings prompt based on selected options if style subtitles is enabled
        let chatStylePrompt = "";
        if (styleSubtitles) {
            if (chatSettings.angry) chatStylePrompt += "Use an angry, critical tone. ";
            if (chatSettings.memelike) chatStylePrompt += "Include memes and internet slang. ";
            if (chatSettings.happy) chatStylePrompt += "Be very positive and supportive. ";
            if (chatSettings.botlike) chatStylePrompt += "Use robotic, automated language. ";
            if (chatSettings.silly) chatStylePrompt += "Use a playful, joyful tone with silly jokes. ";
            if (chatSettings.sad) chatStylePrompt += "Use a sad, melancholic tone. ";
            if (chatSettings.confused) chatStylePrompt += "Sound slightly confused or uncertain. ";
            if (chatSettings.fan) chatStylePrompt += "Sound like an enthusiastic fan. ";
            
            // Add custom styles to the prompt
            chatSettings.customStyles.forEach(style => {
                if (style.active) {
                    chatStylePrompt += `${style.description} `;
                }
            });
        }
        
        const styleInstruction = styleSubtitles && chatStylePrompt ? 
            `Apply this style to the subtitle: ${chatStylePrompt}` : 
            "Use simple, neutral language";
        
        // Implement retry logic with exponential backoff
        let retries = 2;
        let delay = 1000;
        
        while (retries >= 0) {
            try {
                const completion = await websim.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `You are a real-time subtitle generator. Generate a very brief subtitle (max 60 chars) that matches what might be said at this moment in the video. Focus on the most obvious content visible, use simple language, and be extremely concise. Pay attention to all visual details and be specific in your description.
                            
                            ${styleInstruction}
                            
                            Respond with just the subtitle text, nothing else.`
                        },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: `Generate an immediate subtitle for this frame at timestamp ${timestamp}` },
                                { type: "image_url", image_url: { url: imageDataUrl } }
                            ]
                        }
                    ]
                });
                
                // Add subtitle to container
                displaySubtitle(completion.content);
                break; // Exit the retry loop on success
                
            } catch (error) {
                console.error(`Error generating subtitle (attempt ${2-retries}/2):`, error);
                
                // If no more retries left, show a simple fallback message
                if (retries <= 0) {
                    if (Math.random() < 0.3) { // Only show occasionally to avoid spam
                        displaySubtitle("Subtitles temporarily unavailable");
                    }
                    break;
                }
                
                // Exponential backoff for retries
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Double the delay for next retry
                retries--;
            }
        }
        
        // Immediately start processing the next subtitle to avoid any gaps
        if (!preview.paused) {
            setTimeout(() => {
                captionGenerationInProgress = false;
                generateSubtitleFromCurrentAudio();
            }, 1500); // Slightly reduced delay to ensure continuous flow
        } else {
            captionGenerationInProgress = false;
        }
        
    } catch (error) {
        console.error("Error in subtitle generation process:", error);
        captionGenerationInProgress = false;
        
        // Even if there's an error, try again shortly to maintain continuous subtitles
        if (!preview.paused) {
            setTimeout(() => generateSubtitleFromCurrentAudio(), 2000);
        }
    }
}

// Chat functionality
function addMessageToChat(username, message, colorClass) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const usernameSpan = document.createElement('span');
    usernameSpan.className = `username ${colorClass}`;
    usernameSpan.textContent = username + ':';
    
    const contentSpan = document.createElement('span');
    contentSpan.className = 'message-content';
    
    // Replace custom emoji codes with the actual images
    let formattedMessage = message;
    customEmojis.forEach(emoji => {
        const regex = new RegExp(emoji.code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        formattedMessage = formattedMessage.replace(regex, `<img src="${emoji.url}" class="inline-emoji" alt="${emoji.title}" title="${emoji.title}" />`);
    });
    
    // Check if message is replying to someone (contains @ username)
    if (formattedMessage.includes('@')) {
        formattedMessage = formattedMessage.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    }
    
    contentSpan.innerHTML = formattedMessage;
    
    messageElement.appendChild(usernameSpan);
    messageElement.appendChild(contentSpan);
    
    chatMessages.appendChild(messageElement);
    
    // Add to recent chat history with username for better AI context
    recentChatHistory.push({username: username, message: message});
    if (recentChatHistory.length > 20) {
        recentChatHistory.shift();
    }
    
    // Check if we need to trim messages
    trimChatMessages();
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Also send to popup if it exists and is open
    if (chatPopupWindow && !chatPopupWindow.closed) {
        chatPopupWindow.postMessage({
            type: 'newMessage',
            message: {
                username: username,
                content: formattedMessage,
                colorClass: colorClass,
                maxMessages: maxChatMessages,
                isHTML: true
            }
        }, '*');
    }
}

function addDonationToChat(username, message, amount) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message donation';
    messageElement.innerHTML = `
        <span class="donation-amount">$${amount}</span>
        <span class="username color-4">${username}:</span>
        <span class="message-content">${message}</span>
    `;
    
    chatMessages.appendChild(messageElement);
    trimChatMessages();
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Also send to popup if it exists and is open
    if (chatPopupWindow && !chatPopupWindow.closed) {
        chatPopupWindow.postMessage({
            type: 'newDonation',
            donation: {
                username: username,
                content: message,
                amount: amount
            }
        }, '*');
    }
}

function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        // Include the sent message in the next AI prompt (only for one check)
        extraUserMessageForAI = message;
        addMessageToChat('You', message, 'color-4');
        chatInput.value = '';
        
        // Generate AI responses to user message
        generateAIResponseToUserMessage(message);
    }
}

// New function to generate AI responses to user messages
async function generateAIResponseToUserMessage(userMessage) {
    const aiResponseTime = parseFloat(localStorage.getItem('aiResponseTime') || 1.5);
    
    let retries = 2;
    let delay = 1000;
    
    while (retries >= 0) {
        try {
            // Generate settings prompt based on selected options
            let chatStylePrompt = "";
            if (chatSettings.angry) chatStylePrompt += "Use an angry, critical tone. ";
            if (chatSettings.memelike) chatStylePrompt += "Include lots of memes and internet slang. ";
            if (chatSettings.happy) chatStylePrompt += "Be very positive and supportive. ";
            if (chatSettings.botlike) chatStylePrompt += "Include some messages that seem like bots or spam. ";
            if (chatSettings.silly) chatStylePrompt += "Use a playful, joyful, exaggerated happy tone with silly jokes and wordplay. ";
            if (chatSettings.sad) chatStylePrompt += "Use a sad, melancholic tone, cry about everything happening. ";
            if (chatSettings.confused) chatStylePrompt += "Sound perpetually confused, misunderstand what's happening, ask lots of questions. ";
            if (chatSettings.fan) chatStylePrompt += "Act like devoted fans of the streamer, shower them with compliments and support. ";
            
            // Add custom styles to the prompt
            chatSettings.customStyles.forEach(style => {
                if (style.active) {
                    chatStylePrompt += `${style.description} `;
                }
            });
            
            // Format recent chat history for better context
            const chatHistoryContext = recentChatHistory.length > 0 
                ? recentChatHistory.map(entry => `${entry.username}: ${entry.message}`).join(" | ")
                : "No recent messages";
                
            const systemPrompt = `You're generating 3-4 Twitch chat messages from different users reacting to a streamer's message.
${chatStylePrompt ? `IMPORTANT CHAT STYLE INSTRUCTIONS: ${chatStylePrompt}\n\n` : ''}
Messages should be brief (under 60 chars), conversational, and varied in tone.
Include a mix of agreement, disagreement, questions, and jokes.

IMPORTANT: Viewers are extremely knowledgeable about current trends, memes, and internet culture.
They reference recent events, latest memes, and pop culture in their messages.
They know about trending games, streamers, viral content and recent developments in tech and entertainment.
They often make comparisons to similar content they've seen elsewhere on the internet.

IMPORTANT: Many of these messages should directly reply to either the streamer or to other chat messages.
Reference previous usernames when replying to create natural conversation threads.

Generate unique usernames for each message - avoid common or overused examples.
Respond directly with JSON, following this JSON schema, and no other text:
{
    "messages": [
        {"username": "username1", "message": "message1"},
        {"username": "username2", "message": "message2"},
        {"username": "username3", "message": "message3"},
        {"username": "username4", "message": "message4"}
    ]
}`;
            
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: `Generate 3-4 chat messages reacting to this streamer's message: "${userMessage}". 
                        Here are the recent chat messages for context: ${chatHistoryContext}`
                    }
                ],
                json: true
            });

            // Parse the AI response
            let result = JSON.parse(completion.content);
            
            // Add the messages to chat with delays based on settings
            result.messages.forEach((msgData, index) => {
                setTimeout(() => {
                    const colorClass = `color-${Math.floor(Math.random() * 6) + 1}`;
                    addMessageToChat(msgData.username, msgData.message, colorClass);
                }, (index * aiResponseTime + Math.random() * aiResponseTime/2) * 1000); 
            });
            
            return; // Success, exit the function
            
        } catch (error) {
            console.error(`Error generating chat responses (attempt ${2-retries}/2):`, error);
            
            // If no more retries left, show a fallback message
            if (retries <= 0) {
                console.warn("All AI service retry attempts failed");
                addMessageToChat("StreamBot", "Sorry, couldn't generate responses right now. Try again in a moment.", "color-4");
                return;
            }
            
            // Exponential backoff for retries
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Double the delay for next retry
            retries--;
        }
    }
}

let chatPopupWindow = null;

function openChatPopup() {
    // Close any existing popup
    if (chatPopupWindow && !chatPopupWindow.closed) {
        chatPopupWindow.close();
    }
    
    // Create a new popup window
    chatPopupWindow = window.open('popup.html', 'StreamChat', 'width=350,height=600,resizable=yes');
    
    // Set up communication between windows
    window.addEventListener('message', function(event) {
        if (event.data.type === 'newUserMessage') {
            addMessageToChat('You', event.data.message, 'color-4');
        } else if (event.data.type === 'requestPollUpdate' && activePoll) {
            // Send current poll data when popup requests an update
            event.source.postMessage({
                type: activePoll ? 'pollUpdate' : 'pollRemoved',
                poll: activePoll ? JSON.parse(JSON.stringify(activePoll)) : null,
                totalVotes: totalVotes
            }, '*');
        } else if (event.data.type === 'openDonation') {
            // Open donation modal when requested from popup
            openDonationModal();
        }
    });
    
    // If there's an active poll, send it to the popup
    chatPopupWindow.addEventListener('load', function() {
        if (activePoll) {
            chatPopupWindow.postMessage({
                type: 'newPoll',
                poll: JSON.parse(JSON.stringify(activePoll))
            }, '*');
            
            chatPopupWindow.postMessage({
                type: 'pollUpdate',
                poll: JSON.parse(JSON.stringify(activePoll)),
                totalVotes: totalVotes
            }, '*');
        }
    });
}

// Poll functions
function togglePollForm() {
    const formContainer = document.getElementById('pollFormContainer');
    const isHidden = formContainer.style.display === 'none';
    
    formContainer.style.display = isHidden ? 'block' : 'none';
    createPollBtn.textContent = isHidden ? 'Cancel Poll' : 'Create Poll';
    
    // Reset form if hiding
    if (!isHidden) {
        pollForm.reset();
        const optionsContainer = document.getElementById('pollOptions');
        while (optionsContainer.children.length > 2) {
            optionsContainer.removeChild(optionsContainer.lastChild);
        }
    }
}

function addPollOption() {
    const optionsContainer = document.getElementById('pollOptions');
    const optionIndex = optionsContainer.children.length + 1;
    
    const optionContainer = document.createElement('div');
    optionContainer.className = 'option-container';
    
    const optionInput = document.createElement('input');
    optionInput.type = 'text';
    optionInput.name = `option${optionIndex}`;
    optionInput.placeholder = `Option ${optionIndex}`;
    optionInput.required = true;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', function() {
        optionsContainer.removeChild(optionContainer);
    });
    
    optionContainer.appendChild(optionInput);
    optionContainer.appendChild(removeBtn);
    optionsContainer.appendChild(optionContainer);
}

function createPoll(e) {
    e.preventDefault();
    
    // If there's already an active poll, don't create a new one
    if (activePoll) {
        return;
    }
    
    const formData = new FormData(pollForm);
    const title = formData.get('pollTitle');
    const duration = parseInt(formData.get('duration'), 10);
    
    const options = [];
    let i = 1;
    while (formData.has(`option${i}`)) {
        const optionText = formData.get(`option${i}`).trim();
        if (optionText) {
            options.push({
                text: optionText,
                votes: 0
            });
        }
        i++;
    }
    
    // Need at least 2 options
    if (options.length < 2) {
        return;
    }
    
    // Create the poll
    activePoll = {
        title,
        options,
        duration,
        startTime: Date.now(),
        endTime: Date.now() + duration * 1000,
        isActive: true
    };
    
    totalVotes = 0;
    
    // Hide form and update button
    togglePollForm();
    
    // Show the active poll
    updateActivePoll();
    
    // Start the timer
    startPollTimer();
    
    // Notify the popout window about the new poll
    if (chatPopupWindow && !chatPopupWindow.closed) {
        chatPopupWindow.postMessage({
            type: 'newPoll',
            poll: JSON.parse(JSON.stringify(activePoll))
        }, '*');
    }
    
    // Generate AI messages about the poll
    generatePollMessages(title, options);
}

function updateActivePoll() {
    if (!activePoll) {
        activePollContainer.innerHTML = '';
        return;
    }
    
    // Calculate time remaining
    const timeRemaining = Math.max(0, activePoll.endTime - Date.now());
    const secondsRemaining = Math.ceil(timeRemaining / 1000);
    
    // Create the poll UI
    let pollHTML = `
        <div class="active-poll">
            <div class="active-poll-title">${activePoll.title}</div>
            <div class="poll-options">
    `;
    
    // Add options
    activePoll.options.forEach((option, index) => {
        const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
        
        pollHTML += `
            <div class="poll-option" onclick="voteOnPoll(${index})">
                <div class="poll-option-bar" style="width: ${percentage}%"></div>
                <div class="poll-option-text">
                    <span>${option.text}</span>
                    <span>${percentage}%</span>
                </div>
            </div>
        `;
    });
    
    pollHTML += `
            </div>
            <div class="poll-timer">
                <div class="poll-timer-bar" style="width: ${(timeRemaining / (activePoll.duration * 1000)) * 100}%"></div>
            </div>
            <div class="poll-votes">
                <span>${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</span>
                <span>${secondsRemaining}s remaining</span>
            </div>
    `;
    
    // Add close button only for active polls
    if (activePoll.isActive) {
        pollHTML += `<button class="poll-close-btn" onclick="endPoll()">End Poll</button>`;
    } else {
        const winningText = activePoll.winningOption ? 
            `Poll ended, "${activePoll.winningOption.text}" won!` : 
            "Poll ended";
        pollHTML += `<div class="poll-status">${winningText}</div>`;
    }
    
    pollHTML += `</div>`;
    
    activePollContainer.innerHTML = pollHTML;
    
    // Update popout window
    if (chatPopupWindow && !chatPopupWindow.closed) {
        chatPopupWindow.postMessage({
            type: 'pollUpdate',
            poll: JSON.parse(JSON.stringify(activePoll)),
            totalVotes: totalVotes
        }, '*');
    }
}

function voteOnPoll(optionIndex) {
    if (!activePoll || !activePoll.isActive) return;
    
    // Increment votes for the selected option
    activePoll.options[optionIndex].votes++;
    totalVotes++;
    
    // Update UI
    updateActivePoll();
    
    // Update popout window
    if (chatPopupWindow && !chatPopupWindow.closed) {
        chatPopupWindow.postMessage({
            type: 'pollUpdate',
            poll: JSON.parse(JSON.stringify(activePoll)),
            totalVotes: totalVotes
        }, '*');
    }
    
    // Generate AI chat reactions to voting
    generatePollVoteMessage(activePoll.options[optionIndex].text);
}

function getRandomUsername() {
    const usernames = [
        'StreamFan', 'PixelGamer', 'TwitchViewer', 'ChatEnjoyer', 'StreamNinja',
        'GamingWizard', 'ViewerX', 'StreamLover', 'PogChampion', 'ChatMaster',
        'LurkerPro', 'StreamFollower', 'EmoteSpammer', 'SubScriber', 'TwitchPrime'
    ];
    
    // Generate a random username and add random numbers
    const baseUsername = usernames[Math.floor(Math.random() * usernames.length)];
    return `${baseUsername}${Math.floor(Math.random() * 1000)}`;
}

async function generatePollVoteMessage(optionText) {
    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You're generating a single Twitch chat message reacting to someone voting in a poll.
                    The message should be brief (under 60 chars), conversational, and should reference the specific option.
                    The viewer is highly knowledgeable about current internet trends, memes, and pop culture.
                    They might compare this poll option to similar polls they've seen on other streams.
                    Generate both a username and message. Vary tone and style to create an authentic chat feel.
                    Respond directly with JSON, following this JSON schema, and no other text:
                    {
                        "username": "username1",
                        "message": "message1"
                    }`
                },
                {
                    role: "user",
                    content: `Generate a single chat message reacting to someone voting for the poll option: "${optionText}"`
                }
            ],
            json: true
        });

        // Parse the AI response
        let result = JSON.parse(completion.content);
        
        // Add the message to chat
        const colorClass = `color-${Math.floor(Math.random() * 6) + 1}`;
        addMessageToChat(result.username, result.message, colorClass);
        
    } catch (error) {
        console.error("Error generating poll reaction:", error);
    }
}

function startPollTimer() {
    // Clear any existing timer
    if (pollTimer) {
        clearInterval(pollTimer);
    }
    
    // Update the poll every second
    pollTimer = setInterval(() => {
        if (!activePoll) {
            clearInterval(pollTimer);
            return;
        }
        
        // Check if the poll has ended
        if (activePoll.isActive && Date.now() >= activePoll.endTime) {
            endPoll();
        } else {
            updateActivePoll();
            
            // Add AI votes periodically during active polls
            if (activePoll.isActive && Math.random() < 0.5) { // 50% chance each tick to add votes
                // Generate 1-3 votes each time
                const votesToAdd = Math.floor(Math.random() * 3) + 1;
                for (let i = 0; i < votesToAdd; i++) {
                    simulateAIVote();
                }
            }
        }
    }, 1000);
}

function simulateAIVote() {
    if (!activePoll || !activePoll.isActive) return;
    
    // Randomly select an option to vote for
    const optionIndex = Math.floor(Math.random() * activePoll.options.length);
    
    // Increment votes for that option
    activePoll.options[optionIndex].votes++;
    totalVotes++;
    
    // Update UI
    updateActivePoll();
    
    // Update popout window
    if (chatPopupWindow && !chatPopupWindow.closed) {
        chatPopupWindow.postMessage({
            type: 'pollUpdate',
            poll: JSON.parse(JSON.stringify(activePoll)),
            totalVotes: totalVotes
        }, '*');
    }
    
    // Occasionally have an AI chatter mention their vote
    if (Math.random() < 0.2) { // 20% chance to announce the vote
        generatePollVoteMessage(activePoll.options[optionIndex].text);
    }
}

function endPoll() {
    if (!activePoll) return;
    
    activePoll.isActive = false;
    activePoll.endTime = Date.now();
    
    // Find winning option
    let winningOption = activePoll.options[0];
    let winningIndex = 0;
    
    activePoll.options.forEach((option, index) => {
        if (option.votes > winningOption.votes) {
            winningOption = option;
            winningIndex = index;
        }
    });
    
    // Add winning option to poll data
    activePoll.winningOption = winningOption;
    activePoll.winningIndex = winningIndex;
    
    updateActivePoll();
    
    // Clear timer
    clearInterval(pollTimer);
    
    // Notify popup
    if (chatPopupWindow && !chatPopupWindow.closed) {
        chatPopupWindow.postMessage({
            type: 'pollEnded',
            poll: JSON.parse(JSON.stringify(activePoll)),
            totalVotes: totalVotes
        }, '*');
    }
    
    // Generate messages about poll results
    generatePollResultMessages(winningOption, winningIndex);
    
    // After 10 seconds, remove the poll
    setTimeout(() => {
        activePoll = null;
        updateActivePoll();
        
        // Notify popup
        if (chatPopupWindow && !chatPopupWindow.closed) {
            chatPopupWindow.postMessage({
                type: 'pollRemoved'
            }, '*');
        }
    }, 10000);
}

async function generatePollResultMessages(winningOption, winningIndex) {
    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You're generating a single Twitch chat message reacting to a poll ending.
                    The message should be brief (under 60 chars), conversational, and should reference the winning option.
                    Generate both a username and message. Vary tone and style to create an authentic chat feel.
                    Respond directly with JSON, following this JSON schema, and no other text:
                    {
                        "username": "username1",
                        "message": "message1"
                    }`
                },
                {
                    role: "user",
                    content: `Generate a single chat message reacting to this poll ending. The winning option was: "${winningOption.text}" with ${winningOption.votes} votes (${Math.round((winningOption.votes / totalVotes) * 100)}% of the total).`
                }
            ],
            json: true
        });

        // Parse the AI response
        let result = JSON.parse(completion.content);
        
        // Add the message to chat
        const colorClass = `color-${Math.floor(Math.random() * 6) + 1}`;
        addMessageToChat(result.username, result.message, colorClass);
        
    } catch (error) {
        console.error("Error generating poll result reaction:", error);
    }
}

async function generatePollMessages(title, options) {
    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You're generating reactions to a new poll in a Twitch chat.
                    Generate 3 short chat messages from different users reacting to a new poll.
                    Keep messages brief (under 60 chars), conversational, and varied in tone.
                    Some should be excited, some should mention specific options.
                    
                    Respond directly with JSON, following this JSON schema, and no other text:
                    {
                        "messages": [
                            {"username": "username1", "message": "message1"},
                            {"username": "username2", "message": "message2"},
                            {"username": "username3", "message": "message3"}
                        ]
                    }`
                },
                {
                    role: "user",
                    content: `Generate chat reactions to this poll: "${title}" with options: ${options.map(o => `"${o.text}"`).join(', ')}`
                }
            ],
            json: true
        });

        // Parse the AI response
        let result = JSON.parse(completion.content);
        
        // Display messages with delays
        result.messages.forEach((msgData, index) => {
            setTimeout(() => {
                const colorClass = `color-${Math.floor(Math.random() * 6) + 1}`;
                addMessageToChat(msgData.username, msgData.message, colorClass);
            }, 500 + index * 1500 + Math.random() * 1000);
        });
    } catch (error) {
        console.error("Error generating poll reactions:", error);
    }
}

// Settings functionality
function openSettings() {
    document.getElementById('maxMessages').value = maxChatMessages;
    const savedResponseTime = localStorage.getItem('aiResponseTime');
    if (savedResponseTime) {
        document.getElementById('aiResponseTime').value = savedResponseTime;
    }
    settingsModal.classList.add('active');
}

function closeSettings() {
    settingsModal.classList.remove('active');
}

function saveSettings(e) {
    e.preventDefault();
    const newMaxMessages = parseInt(document.getElementById('maxMessages').value);
    const newResponseTime = document.getElementById('aiResponseTime').value;
    
    if (newMaxMessages && newMaxMessages > 0) {
        maxChatMessages = newMaxMessages;
        
        // Save AI response time
        localStorage.setItem('aiResponseTime', newResponseTime);
        
        // Trim messages if needed
        trimChatMessages();
        
        // Close the modal
        closeSettings();
    }
}

function trimChatMessages() {
    const messages = chatMessages.querySelectorAll('.message');
    if (messages.length > maxChatMessages) {
        // Remove oldest messages
        for (let i = 0; i < messages.length - maxChatMessages; i++) {
            chatMessages.removeChild(messages[i]);
        }
    }
}

// Initialize viewer count
function initializeViewerCount() {
    // Start with a random number between 50-300
    viewerCount = Math.floor(Math.random() * 250) + 50;
    document.getElementById('viewerCount').textContent = viewerCount;
    
    // Update viewer count every 10-30 seconds
    viewerCountTimer = setInterval(() => {
        // Fluctuate by -10 to +15 viewers
        const change = Math.floor(Math.random() * 26) - 10;
        viewerCount = Math.max(15, viewerCount + change);
        document.getElementById('viewerCount').textContent = viewerCount;
        
        // Also send to popup if open
        if (chatPopupWindow && !chatPopupWindow.closed) {
            chatPopupWindow.postMessage({
                type: 'viewerUpdate',
                count: viewerCount
            }, '*');
        }
    }, Math.floor(Math.random() * 20000) + 10000);
}

// Start fake donations
function startDonations() {
    // Clear any existing interval
    clearInterval(donationInterval);
    
    // Add donations randomly every 20-120 seconds
    donationInterval = setInterval(() => {
        // Only show donation based on random chance
        if (Math.random() < donationChance) {
            generateFakeDonation();
        }
    }, Math.floor(Math.random() * 100000) + 20000);
}

// Stop donations
function stopDonations() {
    clearInterval(donationInterval);
}

// Generate a fake donation
async function generateFakeDonation() {
    try {
        // Generate a realistic amount between $1 and $100
        const donationAmount = Math.floor(Math.random() * 100) + 1;
        
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Generate a single donation message for a Twitch streamer.
                    The message should be short (max 80 chars), like something someone would write when donating.
                    The donor is knowledgeable about current internet trends, memes, streaming culture, and recent events.
                    They might reference current events, popular streamers, or trending content in their donation.
                    Include a unique, creative username that hasn't been used before.
                    Never use these usernames: mfrupper, cherg, coolguy, stackingbooks, websim310, lovecats108.
                    Respond directly with JSON, following this JSON schema, and no other text:
                    {
                        "username": "username",
                        "message": "message"
                    }`
                },
                {
                    role: "user",
                    content: `Generate a donation message for $${donationAmount}`
                }
            ],
            json: true
        });

        // Parse the AI response
        let result = JSON.parse(completion.content);
        
        // Add donation to chat with special styling
        addDonationToChat(result.username, result.message, donationAmount);
        
    } catch (error) {
        console.error("Error generating donation:", error);
    }
}

async function streamVideo() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*';
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                // Stop any ongoing screen recording if active
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    stopRecording();
                }
                
                // Reset state and UI for video file streaming
                recordedChunks = [];
                clearInterval(timerInterval);
                startBtn.disabled = true;
                stopBtn.disabled = false;
                downloadBtn.disabled = true;
                recordingStatus.textContent = "Streaming video...";
                
                // Clear previous chat history when switching videos
                previousMessages = [];
                previousUsernames = [];
                
                // Create object URL for the selected video file
                const videoURL = URL.createObjectURL(file);
                
                // Use the preview element for video playback
                preview.srcObject = null;
                preview.src = videoURL;
                preview.muted = false; // Enable sound for video files
                
                // Clear any existing subtitles
                subtitlesContainer.innerHTML = '';
                
                preview.onloadedmetadata = () => {
                    startTime = Date.now();
                    startTimer();
                    preview.play();
                    startAIChatGeneration();
                    
                    // Start viewer count and donations for video streaming as well
                    initializeViewerCount();
                    startDonations();
                    
                    // Start generating subtitles
                    if (subtitlesEnabled) {
                        startGeneratingSubtitles();
                    }
                    
                    preview.onended = () => {
                        stopRecording();
                        recordingStatus.textContent = "Video streaming finished";
                        if (continueViewersAfterEnd) {
                            startAIChatGeneration();
                        }
                    };
                };
            } catch (error) {
                console.error("Error streaming video:", error);
                recordingStatus.textContent = "Failed to stream video: " + error.message;
            }
        }
    };
    
    fileInput.click();
}

function openCustomStyleModal() {
    customStyleModal.classList.add('active');
}

function closeCustomStyleModal() {
    customStyleModal.classList.remove('active');
    
    // Reset the editing state
    delete customStyleForm.dataset.editingStyleId;
    
    // Reset the submit button text
    const submitBtn = customStyleForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Create Style';
    
    // Reset form
    customStyleForm.reset();
}

function saveCustomStyle(e) {
    e.preventDefault();
    
    const styleTitle = document.getElementById('customStyleTitle').value.trim();
    const styleDescription = document.getElementById('customStyleDescription').value.trim();
    
    if (styleTitle && styleDescription) {
        // Check if we're editing an existing style or creating a new one
        const editingStyleId = customStyleForm.dataset.editingStyleId;
        
        if (editingStyleId) {
            // Update existing style
            const styleIndex = chatSettings.customStyles.findIndex(s => s.id === editingStyleId);
            if (styleIndex !== -1) {
                // Update the style
                chatSettings.customStyles[styleIndex].title = styleTitle;
                chatSettings.customStyles[styleIndex].description = styleDescription;
                
                // Update the label in the UI
                const label = document.querySelector(`label[for="${editingStyleId}"]`);
                if (label) {
                    label.textContent = styleTitle;
                }
            }
            
            // Reset the form's data attribute
            delete customStyleForm.dataset.editingStyleId;
            
            // Reset the submit button text
            const submitBtn = customStyleForm.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Create Style';
        } else {
            // Create a new custom style object
            const newStyle = {
                id: 'custom_' + Date.now(),
                title: styleTitle,
                description: styleDescription,
                active: true
            };
            
            // Add to custom styles array
            chatSettings.customStyles.push(newStyle);
            
            // Create and add checkbox for the new style
            addCustomStyleCheckbox(newStyle);
        }
        
        // Save to local storage
        saveCustomStylesToLocalStorage();
        
        // Close the modal and reset form
        closeCustomStyleModal();
        customStyleForm.reset();
    }
}

function addCustomStyleCheckbox(style) {
    const container = document.querySelector('.checkbox-container');
    
    const checkboxWrapper = document.createElement('div');
    checkboxWrapper.className = 'checkbox-wrapper custom-style-wrapper';
    checkboxWrapper.id = `wrapper_${style.id}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = style.id;
    checkbox.checked = style.active;
    
    const label = document.createElement('label');
    label.htmlFor = style.id;
    label.textContent = style.title;
    
    // Create edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-style-btn';
    editBtn.innerHTML = '✎';
    editBtn.title = 'Edit this style';
    editBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        editCustomStyle(style.id);
    });
    
    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-style-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = 'Remove this style';
    removeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        removeCustomStyle(style.id);
    });
    
    checkbox.addEventListener('change', function() {
        // Update the active state in the chatSettings.customStyles array
        const styleIndex = chatSettings.customStyles.findIndex(s => s.id === style.id);
        if (styleIndex !== -1) {
            chatSettings.customStyles[styleIndex].active = checkbox.checked;
            // Save the updated state to local storage
            saveCustomStylesToLocalStorage();
        }
    });
    
    checkboxWrapper.appendChild(checkbox);
    checkboxWrapper.appendChild(label);
    checkboxWrapper.appendChild(editBtn);
    checkboxWrapper.appendChild(removeBtn);
    container.appendChild(checkboxWrapper);
}

// Add new function to edit a custom style
function editCustomStyle(styleId) {
    // Find the style in the array
    const styleIndex = chatSettings.customStyles.findIndex(s => s.id === styleId);
    if (styleIndex !== -1) {
        const style = chatSettings.customStyles[styleIndex];
        
        // Set the form values
        document.getElementById('customStyleTitle').value = style.title;
        document.getElementById('customStyleDescription').value = style.description;
        
        // Add a data attribute to the form to track which style is being edited
        customStyleForm.dataset.editingStyleId = styleId;
        
        // Change the submit button text
        const submitBtn = customStyleForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Update Style';
        
        // Open the modal
        openCustomStyleModal();
    }
}

// New function to save custom styles to local storage
function saveCustomStylesToLocalStorage() {
    localStorage.setItem('customChatStyles', JSON.stringify(chatSettings.customStyles));
}

// New function to load custom styles from local storage
function loadCustomStyles() {
    const savedStyles = localStorage.getItem('customChatStyles');
    if (savedStyles) {
        chatSettings.customStyles = JSON.parse(savedStyles);
        // Add checkboxes for all saved styles
        chatSettings.customStyles.forEach(style => {
            addCustomStyleCheckbox(style);
        });
    }
    
    // Also load custom emojis
    loadCustomEmojis();
}

// New function to remove a custom style
function removeCustomStyle(styleId) {
    // Confirm before removing
    if (confirm('Are you sure you want to remove this chat style?')) {
        // Remove from the DOM
        const wrapper = document.getElementById(`wrapper_${styleId}`);
        if (wrapper) {
            wrapper.remove();
        }
        
        // Remove from the array
        const styleIndex = chatSettings.customStyles.findIndex(s => s.id === styleId);
        if (styleIndex !== -1) {
            chatSettings.customStyles.splice(styleIndex, 1);
            
            // Save the updated array to local storage
            saveCustomStylesToLocalStorage();
        }
    }
}

// Function to generate subtitles
async function generateSubtitleFromCurrentAudio() {
    try {
        // Set flag to prevent multiple concurrent requests
        captionGenerationInProgress = true;
        
        // Capture current frame for context
        captureCanvas.width = preview.videoWidth;
        captureCanvas.height = preview.videoHeight;
        captureContext.drawImage(preview, 0, 0, captureCanvas.width, captureCanvas.height);
        const imageDataUrl = captureCanvas.toDataURL('image/jpeg', 0.7);
        
        // Update last transcribed time immediately to prevent duplicate requests
        lastTranscribedTime = preview.currentTime;
        
        // Calculate the current timestamp in the video
        const minutes = Math.floor(preview.currentTime / 60);
        const seconds = Math.floor(preview.currentTime % 60);
        const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Generate settings prompt based on selected options if style subtitles is enabled
        let chatStylePrompt = "";
        if (styleSubtitles) {
            if (chatSettings.angry) chatStylePrompt += "Use an angry, critical tone. ";
            if (chatSettings.memelike) chatStylePrompt += "Include memes and internet slang. ";
            if (chatSettings.happy) chatStylePrompt += "Be very positive and supportive. ";
            if (chatSettings.botlike) chatStylePrompt += "Use robotic, automated language. ";
            if (chatSettings.silly) chatStylePrompt += "Use a playful, joyful tone with silly jokes. ";
            if (chatSettings.sad) chatStylePrompt += "Use a sad, melancholic tone. ";
            if (chatSettings.confused) chatStylePrompt += "Sound slightly confused or uncertain. ";
            if (chatSettings.fan) chatStylePrompt += "Sound like an enthusiastic fan. ";
            
            // Add custom styles to the prompt
            chatSettings.customStyles.forEach(style => {
                if (style.active) {
                    chatStylePrompt += `${style.description} `;
                }
            });
        }
        
        const styleInstruction = styleSubtitles && chatStylePrompt ? 
            `Apply this style to the subtitle: ${chatStylePrompt}` : 
            "Use simple, neutral language";
        
        // Implement retry logic with exponential backoff
        let retries = 2;
        let delay = 1000;
        
        while (retries >= 0) {
            try {
                const completion = await websim.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `You are a real-time subtitle generator. Generate a very brief subtitle (max 60 chars) that matches what might be said at this moment in the video. Focus on the most obvious content visible, use simple language, and be extremely concise. Pay attention to all visual details and be specific in your description.
                            
                            ${styleInstruction}
                            
                            Respond with just the subtitle text, nothing else.`
                        },
                        {
                            role: "user",
                            content: [
                                { type: "text", text: `Generate an immediate subtitle for this frame at timestamp ${timestamp}` },
                                { type: "image_url", image_url: { url: imageDataUrl } }
                            ]
                        }
                    ]
                });
                
                // Add subtitle to container
                displaySubtitle(completion.content);
                break; // Exit the retry loop on success
                
            } catch (error) {
                console.error(`Error generating subtitle (attempt ${2-retries}/2):`, error);
                
                // If no more retries left, show a simple fallback message
                if (retries <= 0) {
                    if (Math.random() < 0.3) { // Only show occasionally to avoid spam
                        displaySubtitle("Subtitles temporarily unavailable");
                    }
                    break;
                }
                
                // Exponential backoff for retries
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Double the delay for next retry
                retries--;
            }
        }
        
        // Immediately start processing the next subtitle to avoid any gaps
        if (!preview.paused) {
            setTimeout(() => {
                captionGenerationInProgress = false;
                generateSubtitleFromCurrentAudio();
            }, 1500); // Slightly reduced delay to ensure continuous flow
        } else {
            captionGenerationInProgress = false;
        }
        
    } catch (error) {
        console.error("Error in subtitle generation process:", error);
        captionGenerationInProgress = false;
        
        // Even if there's an error, try again shortly to maintain continuous subtitles
        if (!preview.paused) {
            setTimeout(() => generateSubtitleFromCurrentAudio(), 2000);
        }
    }
}

function displaySubtitle(text) {
    // Create new subtitle element
    const subtitleElement = document.createElement('div');
    subtitleElement.className = 'subtitle';
    subtitleElement.textContent = text;
    
    // Add to container with no delay
    subtitlesContainer.innerHTML = ''; // Clear previous subtitles
    if (subtitlesEnabled) {
        subtitlesContainer.appendChild(subtitleElement);
    }
    
    // Send subtitle to popup chat regardless of local visibility setting
    if (chatPopupWindow && !chatPopupWindow.closed) {
        chatPopupWindow.postMessage({
            type: 'newSubtitle',
            text: text
        }, '*');
    }
    
    // Don't auto-remove subtitles - new ones will replace old ones
    // This ensures there's always a subtitle visible
}

function startGeneratingSubtitles() {
    // Clear any existing interval
    stopGeneratingSubtitles();
    
    // Create subtitles more frequently (every 2 seconds instead of 5)
    subtitlesInterval = setInterval(async () => {
        if (!preview.paused && (preview.currentTime - lastTranscribedTime) > 2 && !captionGenerationInProgress) {
            generateSubtitleFromCurrentAudio();
        }
    }, 2000);
    
    // Initial subtitle generation
    generateSubtitleFromCurrentAudio();
}

function stopGeneratingSubtitles() {
    if (subtitlesInterval) {
        clearInterval(subtitlesInterval);
        subtitlesInterval = null;
    }
}

function openStreamLinkModal() {
    streamLinkModal.classList.add('active');
    document.getElementById('videoUrl').focus();
}

function closeStreamLinkModal() {
    streamLinkModal.classList.remove('active');
    document.getElementById('streamLinkForm').reset();
}

function handleStreamLink(e) {
    e.preventDefault();
    const url = document.getElementById('videoUrl').value.trim();
    
    if (!url) {
        alert('Please enter a valid URL');
        return;
    }
    
    // Only handle direct video URLs
    if (isDirectVideoUrl(url)) {
        streamDirectVideo(url);
    } else {
        alert('Unsupported URL format. Please use direct video links (.mp4, .webm, .m3u8)');
        return;
    }
    
    closeStreamLinkModal();
}

function isYouTubeUrl(url) {
    return false;
}

function isDirectVideoUrl(url) {
    const videoRegex = /\.(mp4|webm|ogg|mov|m3u8)(\?.*)?$/i;
    return videoRegex.test(url);
}

function streamDirectVideo(url) {
    try {
        // Stop any ongoing screen recording or stream if active
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            stopRecording();
        }
        
        // Clean up any existing embedded player
        cleanupEmbeddedPlayer();
        
        // Reset state and UI for video file streaming
        recordedChunks = [];
        clearInterval(timerInterval);
        startBtn.disabled = true;
        stopBtn.disabled = false;
        downloadBtn.disabled = true;
        recordingStatus.textContent = "Streaming video from URL...";
        
        // Clear previous chat history when switching videos
        previousMessages = [];
        previousUsernames = [];
        
        // Clear any existing subtitles
        subtitlesContainer.innerHTML = '';
        
        // Check if it's an HLS stream (.m3u8) and use hls.js if needed
        if (url.toLowerCase().endsWith('.m3u8')) {
            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(url);
                hls.attachMedia(preview);
                hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    preview.muted = false;
                    preview.play();
                    startTime = Date.now();
                    startTimer();
                    startAIChatGeneration();
                    
                    // Start viewer count and donations for video streaming as well
                    initializeViewerCount();
                    startDonations();
                    
                    // Start generating subtitles
                    if (subtitlesEnabled) {
                        startGeneratingSubtitles();
                    }
                });
                
                hls.on(Hls.Events.ERROR, function(event, data) {
                    console.error("HLS error:", data);
                    if (data.fatal) {
                        recordingStatus.textContent = "Error streaming: " + data.type;
                        stopRecording();
                    }
                });
            } else if (preview.canPlayType('application/vnd.apple.mpegurl')) {
                // For browsers that support HLS natively (Safari)
                preview.src = url;
                preview.addEventListener('loadedmetadata', function() {
                    preview.play();
                });
                preview.muted = false;
                preview.onloadedmetadata = () => {
                    startTime = Date.now();
                    startTimer();
                    preview.play();
                    startAIChatGeneration();
                    initializeViewerCount();
                    startDonations();
                    if (subtitlesEnabled) {
                        startGeneratingSubtitles();
                    }
                };
            } else {
                recordingStatus.textContent = "HLS streaming not supported by your browser";
                stopBtn.disabled = true;
                startBtn.disabled = false;
                return;
            }
        } else {
            // Regular video file
            preview.srcObject = null;
            preview.src = url;
            preview.muted = false; // Enable sound for video files
            
            preview.onloadedmetadata = () => {
                startTime = Date.now();
                startTimer();
                preview.play();
                startAIChatGeneration();
                initializeViewerCount();
                startDonations();
                if (subtitlesEnabled) {
                    startGeneratingSubtitles();
                }
            };
        }
        
        preview.onended = () => {
            stopRecording();
            recordingStatus.textContent = "Video streaming finished";
            if (continueViewersAfterEnd) {
                startAIChatGeneration();
            }
        };
        
        preview.onerror = (error) => {
            console.error("Error streaming video:", error);
            recordingStatus.textContent = "Failed to stream video. Direct playback may be restricted.";
            stopBtn.disabled = true;
            startBtn.disabled = false;
        };
    } catch (error) {
        console.error("Error streaming direct video:", error);
        recordingStatus.textContent = "Failed to stream video: " + error.message;
    }
}

function streamYouTubeVideo(url) {
    alert('YouTube videos are not supported. Please use direct video links.');
    return;
}

function cleanupEmbeddedPlayer() {
    // Clear interval for monitoring embedded videos
    if (embedInterval) {
        clearInterval(embedInterval);
        embedInterval = null;
    }
    
    // Remove any YouTube player
    if (embedPlayer && embedPlayerType === 'youtube') {
        try {
            embedPlayer.destroy();
        } catch (e) {
            console.error("Error destroying YouTube player:", e);
        }
    }
    
    embedPlayer = null;
    embedPlayerType = null;
    
    // Restore preview container
    const previewContainer = document.querySelector('.preview-container');
    if (!previewContainer.contains(preview)) {
        previewContainer.innerHTML = '';
        previewContainer.appendChild(preview);
    }
}

// Create and append the donation modal to the body
const donationModal = document.createElement('div');
donationModal.className = 'donation-modal';
donationModal.innerHTML = `
    <div class="donation-content">
        <h3>
            Make a Donation
            <button id="closeDonationBtn" class="settings-close">&times;</button>
        </h3>
        <form id="donationForm" class="donation-form">
            <div>
                <label for="donationAmount">Donation Amount ($)</label>
                <input type="number" id="donationAmount" min="1" max="1000" value="5" required>
                <div class="donation-amount-buttons">
                    <div class="amount-btn" data-amount="5">$5</div>
                    <div class="amount-btn" data-amount="10">$10</div>
                    <div class="amount-btn" data-amount="25">$25</div>
                    <div class="amount-btn" data-amount="50">$50</div>
                    <div class="amount-btn" data-amount="100">$100</div>
                </div>
            </div>
            <div>
                <label for="donationMessage">Message (optional)</label>
                <textarea id="donationMessage" placeholder="Add a message with your donation"></textarea>
            </div>
            <div class="button-row">
                <button type="button" id="cancelDonationBtn" class="cancel">Cancel</button>
                <button type="submit" class="submit">Send Donation</button>
            </div>
        </form>
    </div>
`;
document.body.appendChild(donationModal);

// Event listeners for donation functionality
donateBtn.addEventListener('click', openDonationModal);
document.getElementById('closeDonationBtn').addEventListener('click', closeDonationModal);
document.getElementById('cancelDonationBtn').addEventListener('click', closeDonationModal);
document.getElementById('donationForm').addEventListener('submit', handleDonation);

// Add event listeners for amount buttons
const amountButtons = document.querySelectorAll('.amount-btn');
amountButtons.forEach(button => {
    button.addEventListener('click', function() {
        // Remove selected class from all buttons
        amountButtons.forEach(btn => btn.classList.remove('selected'));
        // Add selected class to clicked button
        this.classList.add('selected');
        // Update input value
        document.getElementById('donationAmount').value = this.dataset.amount;
    });
});

// Set $5 as default selected
document.querySelector('.amount-btn[data-amount="5"]').classList.add('selected');

function openDonationModal() {
    donationModal.classList.add('active');
    document.getElementById('donationAmount').focus();
}

function closeDonationModal() {
    donationModal.classList.remove('active');
    document.getElementById('donationForm').reset();
    // Reset amount button selection
    amountButtons.forEach(btn => btn.classList.remove('selected'));
    document.querySelector('.amount-btn[data-amount="5"]').classList.add('selected');
}

function handleDonation(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('donationAmount').value);
    const message = document.getElementById('donationMessage').value.trim() || "Thanks for the stream!";
    const aiResponseTime = parseFloat(localStorage.getItem('aiResponseTime') || 1.5);
    
    if (amount && amount > 0) {
        // Add user's donation to chat
        addDonationToChat('You', message, amount);
        
        // Generate AI reactions to the donation with configured timing
        setTimeout(() => {
            generateDonationReactions(amount, message);
        }, aiResponseTime * 1000);
        
        // Close the modal and reset form
        closeDonationModal();
    }
}

// Function to generate AI reactions to donations
async function generateDonationReactions(amount, message) {
    try {
        // Generate appropriate number of reactions based on donation amount
        const numReactions = amount >= 50 ? 4 : amount >= 20 ? 3 : 2;
        
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You're generating ${numReactions} Twitch chat messages from different users reacting to a donation.
                    Each message should be brief (under 60 chars), conversational, and varied in tone.
                    Include excitement, gratitude, and sometimes humorous reactions to the donation amount.
                    
                    IMPORTANT: Viewers are extremely knowledgeable about current trends, memes, and internet culture.
                    They reference recent events, memes, and pop culture in their messages.
                    
                    Generate unique usernames for each message - create diverse, believable usernames.
                    Some messages should directly reference either the donation amount or the donation message content.
                    
                    Respond directly with JSON, following this JSON schema, and no other text:
                    {
                        "messages": [
                            {"username": "username1", "message": "message1"},
                            {"username": "username2", "message": "message2"}
                        ]
                    }`
                },
                {
                    role: "user",
                    content: `Generate ${numReactions} chat messages reacting to a $${amount} donation with the message: "${message}"`
                }
            ],
            json: true
        });
        
        // Parse the AI response
        let result = JSON.parse(completion.content);
        
        // Add the messages to chat with slight delays between them
        result.messages.forEach((msgData, index) => {
            setTimeout(() => {
                const colorClass = `color-${Math.floor(Math.random() * 6) + 1}`;
                addMessageToChat(msgData.username, msgData.message, colorClass);
            }, 500 + index * 1000); // Stagger messages with longer delays for donations
        });
        
    } catch (error) {
        console.error("Error generating donation reactions:", error);
    }
}

function startVoiceInput(targetElementId, micButton) {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Voice input is not supported in your browser. Try using Chrome.');
        return;
    }
    
    const targetElement = document.getElementById(targetElementId);
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    // Add recording class to mic button
    micButton.classList.add('recording');
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        // Append to existing text if there is any
        if (targetElement.value) {
            targetElement.value += ' ' + transcript;
        } else {
            targetElement.value = transcript;
        }
        targetElement.focus();
    };
    
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        micButton.classList.remove('recording');
    };
    
    recognition.onend = function() {
        micButton.classList.remove('recording');
    };
    
    recognition.start();
}

// New function to save custom emojis to local storage
function saveCustomEmojisToLocalStorage() {
    localStorage.setItem('customChatEmojis', JSON.stringify(customEmojis));
}

// New function to load custom emojis from local storage
function loadCustomEmojis() {
    const savedEmojis = localStorage.getItem('customChatEmojis');
    if (savedEmojis) {
        customEmojis = JSON.parse(savedEmojis);
        // Render all saved emojis
        updateEmojiGrid();
    }
}

// New function to update the emoji grid display
function updateEmojiGrid() {
    const emojiGrid = document.getElementById('emojiGrid');
    if (!emojiGrid) return;
    
    emojiGrid.innerHTML = '';
    
    customEmojis.forEach(emoji => {
        const emojiItem = document.createElement('div');
        emojiItem.className = 'emoji-item';
        
        const emojiImg = document.createElement('img');
        emojiImg.src = emoji.url;
        emojiImg.className = 'emoji-image';
        emojiImg.alt = emoji.title;
        emojiImg.title = emoji.title;
        
        const emojiCode = document.createElement('div');
        emojiCode.className = 'emoji-code';
        emojiCode.textContent = emoji.code;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-emoji-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Remove this emoji';
        removeBtn.addEventListener('click', () => removeCustomEmoji(emoji.id));
        
        emojiItem.appendChild(emojiImg);
        emojiItem.appendChild(emojiCode);
        emojiItem.appendChild(removeBtn);
        emojiGrid.appendChild(emojiItem);
    });
    
    // Show "no emojis" message if there are none
    if (customEmojis.length === 0) {
        const noEmojisMsg = document.createElement('div');
        noEmojisMsg.textContent = 'No custom emojis yet. Click "Add Emoji" to create one.';
        noEmojisMsg.style.color = '#adadb8';
        noEmojisMsg.style.textAlign = 'center';
        noEmojisMsg.style.padding = '20px 0';
        noEmojisMsg.style.width = "320px"
        emojiGrid.appendChild(noEmojisMsg);
    }
}

// New function to open the emoji modal
function openEmojiModal() {
    document.getElementById('emojiForm').reset();
    document.getElementById('emojiPreview').innerHTML = '';
    document.getElementById('emojiModal').classList.add('active');
}

// New function to close the emoji modal
function closeEmojiModal() {
    document.getElementById('emojiModal').classList.remove('active');
    document.getElementById('emojiForm').reset();
    document.getElementById('emojiPreview').innerHTML = '';
}

// New function to preview the emoji image
function previewEmojiImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Only accept image files
    if (!file.type.match('image.*')) {
        alert('Please select an image file');
        return;
    }
    
    // Preview the image
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('emojiPreview');
        preview.innerHTML = '';
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = 'Emoji Preview';
        preview.appendChild(img);
    };
    reader.readAsDataURL(file);
}

// New function to save a custom emoji
function saveCustomEmoji(e) {
    e.preventDefault();
    
    const title = document.getElementById('emojiTitle').value.trim();
    let code = document.getElementById('emojiCode').value.trim();
    const fileInput = document.getElementById('emojiFileInput');
    
    if (!title || !code || !fileInput.files[0]) {
        alert('Please fill in all fields and select an image');
        return;
    }
    
    // Auto-add colons if they're not present
    if (!code.startsWith(':')) {
        code = ':' + code;
    }
    if (!code.endsWith(':')) {
        code = code + ':';
    }
    
    // Check if code already exists
    if (customEmojis.some(emoji => emoji.code === code)) {
        alert('An emoji with this code already exists');
        return;
    }
    
    // Convert image to data URL
    const reader = new FileReader();
    reader.onload = function(e) {
        const newEmoji = {
            id: 'emoji_' + Date.now(),
            title: title,
            code: code,
            url: e.target.result
        };
        
        // Add to emojis array
        customEmojis.push(newEmoji);
        
        // Save to local storage
        saveCustomEmojisToLocalStorage();
        
        // Update the emoji grid
        updateEmojiGrid();
        
        // Close the modal
        closeEmojiModal();
    };
    reader.readAsDataURL(fileInput.files[0]);
}


// New function to remove a custom emoji
function removeCustomEmoji(emojiId) {
    // Confirm before removing
    if (confirm('Are you sure you want to remove this emoji?')) {
        // Remove from the array
        const emojiIndex = customEmojis.findIndex(emoji => emoji.id === emojiId);
        if (emojiIndex !== -1) {
            customEmojis.splice(emojiIndex, 1);
            
            // Save the updated array to local storage
            saveCustomEmojisToLocalStorage();
            
            // Update the emoji grid
            updateEmojiGrid();
        }
    }
}

function loadSettings() {
    // Load custom styles
    loadCustomStyles();
    
    // Load StreamBot setting
    const disableStreamBot = localStorage.getItem('disableStreamBot');
    if (disableStreamBot !== null) {
        chatSettings.disableStreamBot = disableStreamBot === 'true';
        document.getElementById('disableStreamBot').checked = chatSettings.disableStreamBot;
    }
    
    // Load AI response time setting
    const savedResponseTime = localStorage.getItem('aiResponseTime');
    if (savedResponseTime) {
        document.getElementById('aiResponseTime').value = savedResponseTime;
    }
}

document.addEventListener('DOMContentLoaded', loadSettings);
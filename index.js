import * as webllm from "https://esm.run/@mlc-ai/web-llm@0.2.48";

console.log("WebLLM loaded successfully!");
const messages = [
  {
    content: "あなたは、Sakana AI株式会社が開発したTinySwallowです。小型ながら、誠実で優秀なアシスタントです。",
    role: "system",
  },
];
const appConfig = {
  model_list: [
    {
      model: "https://huggingface.co/SakanaAI/TinySwallow-1.5B-Instruct-q4f32_1-MLC",
      model_id: "TinySwallow-1.5B",
      model_lib:
      // https://github.com/mlc-ai/binary-mlc-llm-libs/tree/main/web-llm-models/v0_2_48
          webllm.modelLibURLPrefix +
          webllm.modelVersion +
          "/Qwen2-1.5B-Instruct-q4f32_1-ctx4k_cs1k-webgpu.wasm",
    },
  ],
};
console.log(appConfig);
// Callback function for initializing progress
function updateProgress(report) {
  const progressBar = document.querySelector('.progress-fill');
  progressBar.style.width = `${report.progress * 100}%`;
}

function updateEngineInitProgressCallback(report) {
  console.log("initialize", report.progress);
  document.getElementById("download-status").textContent = report.text;
  updateProgress(report);
}

let engine;

async function initializeWebLLMEngine() {
  try {
    const button = document.getElementById("download");
    const downloadStatus = document.getElementById("download-status");
    const downloadProgress = document.getElementById("download-progress");
    
    button.disabled = true;
    downloadStatus.style.display = "block";
    downloadProgress.style.display = "block";
    
    engine = await webllm.CreateMLCEngine("TinySwallow-1.5B", {
      appConfig: appConfig,
      initProgressCallback: updateEngineInitProgressCallback,
    });
    console.log("Model successfully loaded!");

    button.style.display = "none";
    downloadStatus.style.display = "none";
    downloadProgress.style.display = "none";
    document.querySelector(".download-container").style.display = "none";

    document.querySelector(".suggestions-container").style.display = "flex";
    document.querySelector(".chat-container").style.display = "flex";
    document.getElementById('reset-chat').style.display = 'flex';
    document.getElementById("send").disabled = false;
    document.getElementById("user-input").disabled = false;
    document.querySelector('.wrapper').classList.add('chat-active');

  } catch (error) {
    console.error("Error loading model:", error);
    button.disabled = false;
    downloadStatus.style.display = "none";
    downloadProgress.style.display = "none";
  }
}

function setLoading(isLoading) {
  const sendButton = document.getElementById("send");
  const resetButton = document.getElementById("reset-chat");
  const spinner = sendButton.querySelector(".spinner");
  const buttonText = sendButton.querySelector(".button-text");
  const userInput = document.getElementById("user-input");
  
  sendButton.disabled = isLoading;
  spinner.classList.toggle("hidden", !isLoading);
  buttonText.classList.toggle("hidden", isLoading);

  resetButton.disabled = isLoading;
  resetButton.style.opacity = isLoading ? "0.5" : "1";
  
  userInput.disabled = isLoading;
  userInput.setAttribute("placeholder", isLoading ? "生成中..." : "メッセージを入力してください。");
}

function resetUIState() {
  const sendButton = document.getElementById("send");
  const spinner = sendButton.querySelector(".spinner");
  const buttonText = sendButton.querySelector(".button-text");
  
  sendButton.disabled = false;
  spinner.classList.add("hidden");
  buttonText.classList.remove("hidden");
  
  const userInput = document.getElementById("user-input");
  userInput.value = "";
  userInput.setAttribute("placeholder", "メッセージを入力してください。");
  userInput.style.height = "24px";
  userInput.disabled = false;
}

let currentGenerationController = null;

function cancelGeneration() {
  if (currentGenerationController) {
    currentGenerationController.abort();
    currentGenerationController = null;
  }
}

async function streamingGenerating(messages, onUpdate, onFinish, onError) {
  try {
    currentGenerationController = new AbortController();
    
    let curMessage = "";
    let usage;
    console.log(messages);
    const completion = await engine.chat.completions.create({
      stream: true,
      messages,
      stream_options: { include_usage: true },
      temperature: 0.7,
      top_p: 0.95,
      logit_bias: {"14444": -100},
      repetition_penalty: 1.2,
      frequency_penalty: 0.5,
    });
    for await (const chunk of completion) {
      if (currentGenerationController === null) {
        return;
      }
      const curDelta = chunk.choices[0]?.delta.content;
      if (curDelta) {
        curMessage += curDelta;
      }
      if (chunk.usage) {
        usage = chunk.usage;
      }
      onUpdate(curMessage);
    }
    if (currentGenerationController !== null) {
      const finalMessage = await engine.getMessage();
      messages.push({ role: "assistant", content: finalMessage });
      onFinish(finalMessage, usage);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Generation was cancelled');
      return;
    }
    onError(err);
  } finally {
    currentGenerationController = null;
  }
}

function onMessageSend() {
  const input = document.getElementById("user-input").value.trim();
  const message = { content: input, role: "user" };
  if (!input) return;
  document.querySelector('.suggestions-container').style.display = 'none';
  document.querySelector('.chat-container').classList.add('no-suggestions');
  setLoading(true);
  
  messages.push(message);
  appendMessage(message);
  document.getElementById("user-input").value = "";
  document.getElementById("user-input").style.height = "24px";
  appendMessage({ content: "お待ちください...", role: "assistant" });

  streamingGenerating(
    messages,
    updateLastMessage,
    (finalMessage, usage) => {
      updateLastMessage(finalMessage);
      setLoading(false);
    },
    (error) => {
      console.error(error);
      setLoading(false);
    }
  );
}

function appendMessage(message) {
  const chatBox = document.getElementById("chat-box");
  const container = document.createElement("div");
  container.classList.add("message-container", message.role);
  const newMessage = document.createElement("div");
  newMessage.classList.add("message");
  marked.setOptions({
    breaks: true, 
    gfm: true
  });
  const formattedMessage = marked.parse(message.content);
  newMessage.innerHTML = formattedMessage;

  container.appendChild(newMessage);
  chatBox.appendChild(container);
  chatBox.scrollTo({
    top: chatBox.scrollHeight,
    behavior: "smooth",
  });
}

function updateLastMessage(content) {
  const messageDoms = document.getElementById("chat-box").querySelectorAll(".message");
  const lastMessageDom = messageDoms[messageDoms.length - 1];
  marked.setOptions({
    breaks: true, 
    gfm: true
  });
  const formattedContent = marked.parse(content);
  lastMessageDom.innerHTML = formattedContent;
  const chatBox = document.getElementById("chat-box");
  chatBox.scrollTo({
    top: chatBox.scrollHeight,
    behavior: "smooth",
  });
}

let isComposing = false;

const textarea = document.getElementById("user-input");
textarea.addEventListener("input", () => {
  textarea.style.height = "24px";
  textarea.style.height = textarea.scrollHeight + "px";
});

textarea.addEventListener("compositionstart", () => {
  isComposing = true;
});

textarea.addEventListener("compositionend", () => {
  isComposing = false;
});

textarea.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !isComposing) {
    event.preventDefault();
    onMessageSend();
  }
});

document.getElementById("user-input").addEventListener("compositionstart", () => {
  isComposing = true;
});

document.getElementById("user-input").addEventListener("compositionend", () => {
  isComposing = false;
});

document.getElementById("user-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !isComposing) {
    event.preventDefault();
    onMessageSend();
  }
});


document.getElementById("download").addEventListener("click", initializeWebLLMEngine);
document.getElementById("send").addEventListener("click", onMessageSend);

document.querySelectorAll('.suggestion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById('user-input');
    input.value = btn.textContent;
    onMessageSend();
    document.querySelector('.suggestions-container').style.display = 'none';
  });
});

document.getElementById('title-link').addEventListener('click', (e) => {
  e.preventDefault();
  if (document.querySelector('.chat-container').style.display === 'flex') {
    cancelGeneration();

    messages.length = 1;
    document.getElementById('chat-box').innerHTML = '';
    
    document.querySelector('.chat-container').style.display = 'none';
    document.querySelector('.suggestions-container').style.display = 'none';
    document.getElementById('reset-chat').style.display = 'none';
    
    const downloadContainer = document.querySelector('.download-container');
    downloadContainer.style.display = 'flex';
    document.getElementById('download').style.display = 'block';
    document.getElementById('download').disabled = false;
    document.getElementById('download-status').style.display = 'none';
    document.getElementById('download-progress').style.display = 'none';
    
    document.querySelector('.wrapper').classList.remove('chat-active');

    resetUIState();
    if (engine) {
      engine = null;
    }
  }
});

document.getElementById('reset-chat').addEventListener('click', () => {
  cancelGeneration();
  messages.length = 1;
  const chatBox = document.getElementById('chat-box');
  while (chatBox.firstChild) {
    chatBox.removeChild(chatBox.firstChild);
  }

  document.querySelector('.suggestions-container').style.display = 'flex';
  resetUIState();

  const userInput = document.getElementById("user-input");
  userInput.disabled = false;
  const sendButton = document.getElementById("send");
  sendButton.disabled = false;
});

const infoButton = document.getElementById('info-button');
const modal = document.getElementById('info-modal');

infoButton.addEventListener('click', () => {
  modal.classList.remove('hidden');
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.add('hidden');
  }
});

const closeModalButton = modal.querySelector('.close-modal');
closeModalButton.addEventListener('click', () => {
  modal.classList.add('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
  // Get existing elements
  const header = document.querySelector('header');
  const headerContent = header.querySelector('.header-content');
  const logo = header.querySelector('.logo').parentElement;
  const modelDescription = document.querySelector('.model-description');

  // Create and setup header main
  const headerMain = document.createElement('div');
  headerMain.className = 'header-main';
  
  // Move elements to new structure
  headerMain.appendChild(headerContent);
  headerMain.appendChild(logo);
  
  // Clear and rebuild header
  header.innerHTML = '';
  header.appendChild(headerMain);
  
  if (modelDescription) {
    header.appendChild(modelDescription);
  }

  // Create and add toggle button
  const headerToggle = document.createElement('button');
  headerToggle.className = 'header-toggle';
  headerToggle.setAttribute('aria-label', '詳細の表示/非表示');
  headerToggle.innerHTML = '<span class="toggle-icon"></span>';
  
  header.appendChild(headerToggle);

  // Add click event
  // Add initial collapsed state when chat is active
  const setHeaderState = () => {
    if (document.querySelector('.wrapper').classList.contains('chat-active')) {
      header.classList.add('header-collapsed');
    } else {
      header.classList.remove('header-collapsed');
    }
  };

  // Set initial state
  setHeaderState();

  // Add click event listener
  headerToggle.addEventListener('click', () => {
    header.classList.toggle('header-collapsed');
  });

  // Watch for chat-active class changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class') {
        setHeaderState();
      }
    });
  });

  observer.observe(document.querySelector('.wrapper'), {
    attributes: true
  });
});
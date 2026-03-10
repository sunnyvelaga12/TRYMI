import React, { useState, useRef, useEffect } from "react";
import Draggable from "react-draggable";
import "./ChatBot.css";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Hi! I'm your TRYMI fashion assistant. Ask me for outfit recommendations, styling tips, or fashion advice!",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [chatbotDisabled, setChatbotDisabled] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const nodeRef = useRef(null);
  const MAX_RETRIES = 3;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
  ];

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize conversation ID when component mounts
  useEffect(() => {
    setConversationId(
      `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );
  }, []);

  // ✅ NEW: Listen for Ask AI events from product cards
  useEffect(() => {
    const handleOpenChatbot = (event) => {
      console.log('🤖 Chatbot opened from product card:', event.detail);

      // Open chatbot
      setIsOpen(true);

      // Set the message if provided
      if (event.detail?.message) {
        setInputMessage(event.detail.message);

        // Auto-send the message after a short delay
        setTimeout(() => {
          if (event.detail.message) {
            const syntheticEvent = { preventDefault: () => { } };
            sendMessage(syntheticEvent, event.detail.message);
          }
        }, 500);
      }
    };

    window.addEventListener('open-chatbot', handleOpenChatbot);

    return () => {
      window.removeEventListener('open-chatbot', handleOpenChatbot);
    };
  }, []); // Empty dependency array to avoid recreating the listener

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(event.target)
      ) {
        setShowAttachMenu(false);
      }
    };

    if (showAttachMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAttachMenu]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // Validate files
    const validFiles = files.filter((file) => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }

      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert(`File "${file.name}" type is not supported.`);
        return false;
      }

      return true;
    });

    // Limit to 5 files
    if (attachedFiles.length + validFiles.length > 5) {
      alert("You can only attach up to 5 files at a time.");
      return;
    }

    // Add files with preview
    const newFiles = validFiles.map((file) => ({
      file,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }));

    setAttachedFiles((prev) => [...prev, ...newFiles]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Close menu after selection
    setShowAttachMenu(false);
  };

  // Remove attached file
  const removeFile = (fileId) => {
    setAttachedFiles((prev) => {
      const updatedFiles = prev.filter((f) => f.id !== fileId);
      // Revoke object URL to prevent memory leaks
      const removedFile = prev.find((f) => f.id === fileId);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return updatedFiles;
    });
  };

  // Toggle attach menu
  const toggleAttachMenu = () => {
    if (chatbotDisabled) {
      alert("Chatbot is disabled. Enable it to use file attachments.");
      return;
    }
    setShowAttachMenu(!showAttachMenu);
  };

  // Handle different attachment options
  const handleUploadFiles = () => {
    fileInputRef.current?.click();
    setShowAttachMenu(false);
  };

  const handleAddFromDrive = () => {
    alert("Google Drive integration coming soon! 🚀");
    setShowAttachMenu(false);
  };

  const handlePhotos = () => {
    // Trigger file input with image-only accept
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = (e) => handleFileSelect(e);
    input.click();
    setShowAttachMenu(false);
  };

  // Convert file to base64 for API
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const sendMessage = async (e, messageText = null) => {
    e?.preventDefault();

    // Check if chatbot is disabled
    if (chatbotDisabled) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "🔐 The AI Chatbot is currently disabled. Please configure the GROQ_API_KEY in the backend to enable this feature.",
          timestamp: new Date(),
          isError: true,
          isDisabled: true,
        },
      ]);
      return;
    }

    const userMessage = messageText || inputMessage.trim();
    if (!userMessage && attachedFiles.length === 0) return;

    setInputMessage("");

    // Process attached files
    const fileData = await Promise.all(
      attachedFiles.map(async (fileObj) => ({
        name: fileObj.name,
        type: fileObj.type,
        size: fileObj.size,
        data: fileObj.type.startsWith("image/")
          ? await fileToBase64(fileObj.file)
          : null,
      }))
    );

    // ✅ Check if this is a product query from localStorage
    const productQueryData = localStorage.getItem('ai_product_query');
    let productContext = null;

    if (productQueryData) {
      try {
        productContext = JSON.parse(productQueryData);
        console.log('📦 Product context loaded:', productContext);
        // Clear after use
        localStorage.removeItem('ai_product_query');
      } catch (e) {
        console.error('Error parsing product query:', e);
      }
    }

    // Add user message to chat with attachments
    const newUserMessage = {
      role: "user",
      content: userMessage || "📎 Attached files",
      timestamp: new Date(),
      attachments: attachedFiles.map((f) => ({
        name: f.name,
        type: f.type,
        preview: f.preview,
      })),
    };

    setMessages((prev) => [...prev, newUserMessage]);

    // Clear attachments after sending
    attachedFiles.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setAttachedFiles([]);

    setIsLoading(true);
    setRetryCount(0);

    try {
      // Get user auth token if available
      const userId =
        localStorage.getItem("userId") || `guest_${conversationId}`;

      // Call your backend chatbot API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // ✅ Enhanced message with product context
      let enhancedMessage = userMessage;
      if (productContext) {
        enhancedMessage = `${userMessage}\n\n[Product Context: ${productContext.product} - ${productContext.category} - ${productContext.price} - ${productContext.description}]`;
      }

      const requestBody = {
        userId: userId,
        conversationId: conversationId,
        message: enhancedMessage,
        userProfile: {},
        context: messages.slice(-6).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        files: fileData.length > 0 ? fileData : undefined,
        productContext: productContext, // ✅ Include product context
      };

      const response = await fetch("https://trymi-backend.onrender.com/api/chatbot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 503) {
          setChatbotDisabled(true);
          const errorData = await response.json();
          throw new Error(errorData.message || "Chatbot service unavailable");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.message) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            timestamp: new Date(),
            suggestions: data.suggestions || [],
          },
        ]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Chat error:", error);

      let errorMessage =
        "Sorry, I'm having trouble connecting right now. Please try again!";
      let isDisabled = false;

      if (error.name === "AbortError") {
        errorMessage =
          "⏱️ The request took too long. Please try a shorter question!";
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage =
          "🌐 Can't reach the server. Please check your connection and try again.";
      } else if (
        error.message.includes("503") ||
        error.message.includes("Chatbot service unavailable")
      ) {
        errorMessage =
          "🔐 AI Chatbot is currently disabled. To enable it, please add your Groq API key (GROQ_API_KEY) to the backend configuration.";
        isDisabled = true;
        setChatbotDisabled(true);
      } else if (error.message.includes("429")) {
        errorMessage =
          "🚦 I'm receiving too many requests. Please wait a moment and try again.";
      } else if (error.message.includes("500")) {
        errorMessage = "⚠️ Server error occurred. Please try again shortly.";
      } else if (error.message.includes("401")) {
        errorMessage =
          "🔑 Invalid API key. Please check your Groq API credentials.";
        isDisabled = true;
        setChatbotDisabled(true);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
          isError: true,
          isDisabled: isDisabled,
        },
      ]);

      if (
        retryCount < MAX_RETRIES &&
        !error.name.includes("AbortError") &&
        !isDisabled
      ) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
        }, 2000 * (retryCount + 1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    // Clean up file previews
    attachedFiles.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setAttachedFiles([]);

    setMessages([
      {
        role: "assistant",
        content:
          "👋 Hi! I'm your TRYMI fashion assistant. Ask me for outfit recommendations, styling tips, or fashion advice!",
        timestamp: new Date(),
      },
    ]);
    setConversationId(
      `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );
  };

  const quickPrompts = [
    "Suggest a casual summer outfit",
    "What should I wear to a formal event?",
    "Help me style denim jeans",
    "Latest fashion trends for 2026",
  ];

  const handleQuickPrompt = (prompt) => {
    setInputMessage(prompt);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const handleDragStop = (e, data) => {
    setPosition({ x: data.x, y: data.y });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Get file icon
  const getFileIcon = (type) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type === "application/pdf") return "📄";
    if (type.startsWith("text/")) return "📝";
    return "📎";
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        className={`chat-toggle-btn ${isOpen ? "active" : ""}`}
        onClick={toggleChat}
        aria-label={isOpen ? "Close chat assistant" : "Open chat assistant"}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
        {!isOpen && (
          <span className="chat-badge" aria-label="AI powered">
            AI
          </span>
        )}
      </button>

      {/* Draggable Chat Window */}
      {isOpen && (
        <Draggable
          nodeRef={nodeRef}
          handle=".chat-header"
          defaultPosition={{ x: 0, y: 0 }}
          position={null}
          onStop={handleDragStop}
          bounds="body"
          cancel=".chat-icon-btn, .chat-input, .chat-send-btn, .quick-prompt-btn, .suggestion-chip, .attach-btn, .file-preview, .attach-menu"
        >
          <div
            ref={nodeRef}
            className="chat-container"
            role="dialog"
            aria-labelledby="chat-title"
            aria-modal="true"
          >
            {/* Header */}
            <div className="chat-header">
              <div className="chat-header-content">
                <div className="chat-avatar" aria-hidden="true">
                  AI
                </div>
                <div>
                  <h3 id="chat-title">TRYMI Style Assistant</h3>

                </div>
              </div>
              <div className="chat-header-actions">
                <button
                  onClick={clearChat}
                  className="chat-icon-btn"
                  title="Clear chat"
                  aria-label="Clear conversation history"
                  disabled={isLoading}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
                <button
                  onClick={toggleChat}
                  className="chat-icon-btn"
                  title="Close chat"
                  aria-label="Close chat window"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="chat-messages"
              role="log"
              aria-live="polite"
              aria-atomic="false"
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`chat-message ${msg.role === "user" ? "user-message" : "assistant-message"
                    } ${msg.isError ? "error-message" : ""} ${msg.isDisabled ? "disabled-message" : ""
                    }`}
                >
                  <div className="message-content">{msg.content}</div>

                  {/* Display attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="message-attachments">
                      {msg.attachments.map((attachment, idx) => (
                        <div key={idx} className="attachment-preview">
                          {attachment.preview ? (
                            <img
                              src={attachment.preview}
                              alt={attachment.name}
                              className="attachment-image"
                            />
                          ) : (
                            <div className="attachment-file">
                              <span className="file-icon">
                                {getFileIcon(attachment.type)}
                              </span>
                              <span className="file-name">
                                {attachment.name}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="message-suggestions">
                      {msg.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          className="suggestion-chip"
                          onClick={() => handleQuickPrompt(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="chat-message assistant-message">
                  <div
                    className="message-content typing-indicator"
                    aria-label="Assistant is typing"
                  >
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length <= 1 && !isLoading && !chatbotDisabled && (
              <div
                className="quick-prompts"
                role="list"
                aria-label="Quick prompt suggestions"
              >
                <p className="quick-prompts-label">Try asking:</p>
                <div className="quick-prompts-grid">
                  {quickPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      className="quick-prompt-btn"
                      onClick={() => handleQuickPrompt(prompt)}
                      role="listitem"
                    >
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Disabled Notice */}
            {chatbotDisabled && messages.length <= 1 && (
              <div className="chatbot-disabled-notice">
                <p>
                  🔐 <strong>AI Chatbot Disabled</strong>
                </p>
                <p>
                  To enable the chatbot, add your Groq API key to the backend
                  environment variables:
                </p>
                <code>GROQ_API_KEY=your_api_key_here</code>
                <p>
                  Get your free API key at{" "}
                  <a
                    href="https://console.groq.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    console.groq.com
                  </a>
                </p>
              </div>
            )}

            {/* File Attachments Preview */}
            {attachedFiles.length > 0 && (
              <div className="attached-files-container">
                {attachedFiles.map((fileObj) => (
                  <div key={fileObj.id} className="file-preview">
                    {fileObj.preview ? (
                      <img
                        src={fileObj.preview}
                        alt={fileObj.name}
                        className="file-preview-image"
                      />
                    ) : (
                      <div className="file-preview-icon">
                        {getFileIcon(fileObj.type)}
                      </div>
                    )}
                    <div className="file-preview-info">
                      <div className="file-preview-name">{fileObj.name}</div>
                      <div className="file-preview-size">
                        {formatFileSize(fileObj.size)}
                      </div>
                    </div>
                    <button
                      className="file-preview-remove"
                      onClick={() => removeFile(fileObj.id)}
                      aria-label={`Remove ${fileObj.name}`}
                      title="Remove file"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form className="chat-input-form" onSubmit={sendMessage}>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt"
                onChange={handleFileSelect}
                style={{ display: "none" }}
                aria-label="File upload input"
              />

              <div className="attach-btn-wrapper" ref={attachMenuRef}>
                {/* <button
                  type="button"
                  className="attach-btn"
                  onClick={toggleAttachMenu}
                  disabled={isLoading || chatbotDisabled}
                  aria-label="Attach options"
                  title="Add attachments"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {attachedFiles.length > 0 && (
                    <span className="attach-badge">
                      {attachedFiles.length}
                    </span>
                  )}
                </button> */}

                {/* Dropdown Menu */}
                {showAttachMenu && (
                  <div className="attach-menu">
                    <button
                      type="button"
                      className="attach-menu-item"
                      onClick={handleUploadFiles}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="attach-menu-icon"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      <span>Upload files</span>
                    </button>

                    <button
                      type="button"
                      className="attach-menu-item"
                      onClick={handleAddFromDrive}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="attach-menu-icon"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 15l3-3m0 0l3 3m-3-3v12M21 9l-3 3m0 0l-3-3m3 3V3"
                        />
                      </svg>
                      <span>Add from Drive</span>
                    </button>

                    <button
                      type="button"
                      className="attach-menu-item"
                      onClick={handlePhotos}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="attach-menu-icon"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Photos</span>
                    </button>
                  </div>
                )}
              </div>

              <input
                ref={inputRef}
                type="text"
                className="chat-input"
                placeholder={
                  chatbotDisabled
                    ? "Chatbot disabled - Add GROQ_API_KEY to enable"
                    : attachedFiles.length > 0
                      ? "Add a message (optional)..."
                      : "Ask me anything about fashion..."
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || chatbotDisabled}
                aria-label="Chat message input"
                maxLength={500}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={
                  (!inputMessage.trim() && attachedFiles.length === 0) ||
                  isLoading ||
                  chatbotDisabled
                }
                aria-label="Send message"
                title={
                  chatbotDisabled ? "Chatbot is disabled" : "Send message"
                }
              >
                {isLoading ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                    className="spin"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </Draggable>
      )}
    </>
  );
};

export default ChatBot;



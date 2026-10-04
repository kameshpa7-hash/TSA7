/**
 * SpeakText – Text to Speech Engine
 * College Text and Speech Analysis Lab (Experiment 07)
 * High-performance client-side speech synthesis using the Web Speech API.
 */

(() => {
  'use strict';

  // ==========================================================================
  // DOM Elements
  // ==========================================================================
  const textInput = document.getElementById('textInput');
  const speakBtn = document.getElementById('speakBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const stopBtn = document.getElementById('stopBtn');
  const clearBtn = document.getElementById('clearBtn');
  const clearTextBtn = document.getElementById('clearTextBtn');
  const copyTextBtn = document.getElementById('copyTextBtn');
  const runExampleBtn = document.getElementById('runExampleBtn');
  const resetControlsBtn = document.getElementById('resetControlsBtn');

  // Sliders & Selects
  const voiceSelect = document.getElementById('voiceSelect');
  const languageSelect = document.getElementById('languageSelect');
  const voiceSearchInput = document.getElementById('voiceSearchInput');
  const rateSlider = document.getElementById('rateSlider');
  const pitchSlider = document.getElementById('pitchSlider');
  const volumeSlider = document.getElementById('volumeSlider');

  // Badges & Labels
  const rateValueBadge = document.getElementById('rateValueBadge');
  const pitchValueBadge = document.getElementById('pitchValueBadge');
  const volumeValueBadge = document.getElementById('volumeValueBadge');
  const voiceCountBadge = document.getElementById('voiceCountBadge');
  const langCountBadge = document.getElementById('langCountBadge');
  const charCount = document.getElementById('charCount');
  const wordCount = document.getElementById('wordCount');
  const estDuration = document.getElementById('estDuration');

  // Status Display
  const statusBadge = document.getElementById('statusBadge');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const statusDescription = document.getElementById('statusDescription');
  const apiStatusBadge = document.getElementById('apiStatusBadge');
  const unsupportedBanner = document.getElementById('unsupportedBanner');
  const closeBannerBtn = document.getElementById('closeBannerBtn');

  // Voice Inspector
  const inspectorVoiceName = document.getElementById('inspectorVoiceName');
  const inspectorVoiceLang = document.getElementById('inspectorVoiceLang');
  const inspectorVoiceService = document.getElementById('inspectorVoiceService');
  const inspectorParams = document.getElementById('inspectorParams');
  const voiceTypeBadge = document.getElementById('voiceTypeBadge');

  // Visualizer & Teleprompter
  const equalizerContainer = document.getElementById('equalizerContainer');
  const visualizerDot = document.getElementById('visualizerDot');
  const visualizerText = document.getElementById('visualizerText');
  const activeWordDisplay = document.getElementById('activeWordDisplay');
  const teleprompterContainer = document.getElementById('teleprompterContainer');
  const teleprompterText = document.getElementById('teleprompterText');
  const closeTeleprompterBtn = document.getElementById('closeTeleprompterBtn');

  // Theme & Toast
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const toastContainer = document.getElementById('toastContainer');
  const presetChips = document.querySelectorAll('.preset-chip');

  // ==========================================================================
  // State Management
  // ==========================================================================
  const state = {
    voices: [],
    selectedVoice: null,
    status: 'Ready', // 'Ready' | 'Speaking' | 'Paused' | 'Finished'
    keepAliveInterval: null,
    currentUtterance: null,
    speechWords: [],
    spokenWordIndex: -1,
    isTeleprompterOpen: false,
    themeAccentIndex: 0,
    accentThemes: ['indigo-cyan', 'cyan-emerald', 'violet-fuchsia', 'amber-rose']
  };

  // Check browser API support
  const isSpeechSynthesisSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  // ==========================================================================
  // Initialization
  // ==========================================================================
  function init() {
    if (!isSpeechSynthesisSupported) {
      handleUnsupportedBrowser();
      return;
    }

    // Set online status badge
    if (apiStatusBadge) {
      apiStatusBadge.innerHTML = '<span class="status-indicator-dot online"></span> SpeechSynthesis API Ready';
    }

    // Load available voices
    loadVoices();

    // Chrome and Edge populate voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Fallback timer for browsers that lag on voiceschanged
    setTimeout(loadVoices, 300);
    setTimeout(loadVoices, 1000);

    // Initialize UI and Event Listeners
    setupEventListeners();
    updateMetrics();
    updateStatus('Ready');
    updateParamsDisplay();
  }

  function handleUnsupportedBrowser() {
    if (unsupportedBanner) unsupportedBanner.style.display = 'block';
    if (apiStatusBadge) {
      apiStatusBadge.className = 'badge api-status-pill';
      apiStatusBadge.style.borderColor = 'rgba(244, 63, 94, 0.4)';
      apiStatusBadge.style.color = '#fda4af';
      apiStatusBadge.innerHTML = '<span class="status-indicator-dot idle"></span> API Not Supported';
    }
    if (statusBadge) {
      statusBadge.className = 'status-badge status-paused';
      statusIcon.textContent = '❌';
      statusText.textContent = 'Unsupported';
    }
    if (statusDescription) {
      statusDescription.textContent = 'SpeechSynthesis API is not supported in this browser. Please use Chrome, Edge, or Safari.';
    }
    if (speakBtn) speakBtn.disabled = true;
    showToast('Web Speech API is not supported by your browser.', 'danger');
  }

  // ==========================================================================
  // Voice Population & Management
  // ==========================================================================
  function loadVoices() {
    if (!isSpeechSynthesisSupported) return;

    const availableVoices = window.speechSynthesis.getVoices();
    if (!availableVoices || availableVoices.length === 0) {
      return;
    }

    // Sort voices: Local/Default first, then alphabetically by language and name
    state.voices = [...availableVoices].sort((a, b) => {
      if (a.default && !b.default) return -1;
      if (!a.default && b.default) return 1;
      if (a.lang < b.lang) return -1;
      if (a.lang > b.lang) return 1;
      return a.name.localeCompare(b.name);
    });

    if (voiceCountBadge) {
      voiceCountBadge.textContent = `${state.voices.length} Voices Detected`;
    }

    populateLanguageDropdown();
    renderVoiceOptions();
  }

  function populateLanguageDropdown() {
    if (!languageSelect) return;

    const currentSelectedLang = languageSelect.value || 'ALL';
    const langMap = new Map();

    state.voices.forEach(voice => {
      const code = voice.lang || 'unknown';
      const cleanPrefix = code.split('-')[0].toLowerCase();
      const count = (langMap.get(cleanPrefix)?.count || 0) + 1;
      
      let friendlyName = cleanPrefix.toUpperCase();
      try {
        const intlName = new Intl.DisplayNames(['en'], { type: 'language' });
        friendlyName = intlName.of(cleanPrefix) || friendlyName;
      } catch (e) {
        // Fallback to code
      }

      langMap.set(cleanPrefix, { name: friendlyName, count, prefix: cleanPrefix });
    });

    // Populate dropdown
    languageSelect.innerHTML = `<option value="ALL">All Languages (${state.voices.length} voices)</option>`;
    
    // Sort languages alphabetically
    const sortedLangs = Array.from(langMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    sortedLangs.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.prefix;
      opt.textContent = `${item.name} (${item.count} voice${item.count > 1 ? 's' : ''})`;
      if (item.prefix === currentSelectedLang) {
        opt.selected = true;
      }
      languageSelect.appendChild(opt);
    });

    if (langCountBadge) {
      langCountBadge.textContent = `${sortedLangs.length} Language Groups`;
    }
  }

  function renderVoiceOptions() {
    if (!voiceSelect || state.voices.length === 0) return;

    const selectedLangFilter = languageSelect ? languageSelect.value : 'ALL';
    const searchQuery = voiceSearchInput ? voiceSearchInput.value.toLowerCase().trim() : '';
    
    const previousVoiceURI = state.selectedVoice ? state.selectedVoice.voiceURI : null;

    voiceSelect.innerHTML = '';

    // Filter voices
    const filteredVoices = state.voices.filter(voice => {
      const matchesLang = selectedLangFilter === 'ALL' || voice.lang.toLowerCase().startsWith(selectedLangFilter);
      const matchesSearch = !searchQuery || 
        voice.name.toLowerCase().includes(searchQuery) || 
        voice.lang.toLowerCase().includes(searchQuery);
      return matchesLang && matchesSearch;
    });

    if (filteredVoices.length === 0) {
      const noOpt = document.createElement('option');
      noOpt.disabled = true;
      noOpt.selected = true;
      noOpt.textContent = 'No matching voices found for criteria';
      voiceSelect.appendChild(noOpt);
      return;
    }

    let defaultToSelect = null;

    filteredVoices.forEach((voice, index) => {
      const opt = document.createElement('option');
      opt.value = voice.voiceURI;
      
      const isDefault = voice.default ? ' [Default]' : '';
      const isLocal = voice.localService ? ' (Local)' : ' (Network/HQ)';
      opt.textContent = `${voice.name} (${voice.lang})${isLocal}${isDefault}`;
      
      voiceSelect.appendChild(opt);

      // Preserve previously selected voice if still available
      if (previousVoiceURI && voice.voiceURI === previousVoiceURI) {
        defaultToSelect = voice;
        opt.selected = true;
      }
    });

    // If no previous match, select default or first English/available voice
    if (!defaultToSelect) {
      const preferred = filteredVoices.find(v => v.default) || 
                        filteredVoices.find(v => v.lang.startsWith('en')) || 
                        filteredVoices[0];
      if (preferred) {
        defaultToSelect = preferred;
        voiceSelect.value = preferred.voiceURI;
      }
    }

    state.selectedVoice = defaultToSelect;
    updateVoiceInspector(defaultToSelect);
  }

  function updateVoiceInspector(voice) {
    if (!voice) {
      if (inspectorVoiceName) inspectorVoiceName.textContent = 'No voice selected';
      if (inspectorVoiceLang) inspectorVoiceLang.textContent = '—';
      if (inspectorVoiceService) inspectorVoiceService.textContent = '—';
      return;
    }

    if (inspectorVoiceName) {
      inspectorVoiceName.textContent = voice.name;
      inspectorVoiceName.title = voice.name;
    }

    if (inspectorVoiceLang) {
      let langLabel = voice.lang;
      try {
        const langCode = voice.lang.split('-')[0];
        const intlName = new Intl.DisplayNames(['en'], { type: 'language' });
        const friendlyName = intlName.of(langCode);
        langLabel = `${voice.lang} (${friendlyName || 'International'})`;
      } catch (e) {
        // Fallback
      }
      inspectorVoiceLang.textContent = langLabel;
    }

    if (inspectorVoiceService) {
      inspectorVoiceService.textContent = voice.localService 
        ? 'Client Native Engine (Zero Latency)' 
        : 'Browser Cloud / Neural Provider';
    }

    if (voiceTypeBadge) {
      voiceTypeBadge.textContent = voice.default ? 'System Default' : (voice.localService ? 'Local Synthesizer' : 'Neural / Cloud');
    }

    updateParamsDisplay();
  }

  function updateParamsDisplay() {
    if (!inspectorParams) return;
    const rate = rateSlider ? parseFloat(rateSlider.value).toFixed(1) : '1.0';
    const pitch = pitchSlider ? parseFloat(pitchSlider.value).toFixed(1) : '1.0';
    const vol = volumeSlider ? Math.round(parseFloat(volumeSlider.value) * 100) : '100';
    inspectorParams.textContent = `Speed: ${rate}x | Pitch: ${pitch} | Vol: ${vol}%`;
  }

  // ==========================================================================
  // Speech Synthesis Control (Speak, Pause, Resume, Stop, Clear)
  // ==========================================================================
  function speak() {
    if (!isSpeechSynthesisSupported) {
      showToast('Speech synthesis is unsupported in this browser.', 'danger');
      return;
    }

    const text = textInput.value.trim();
    if (!text) {
      showToast('Please type something for the computer to speak!', 'warning');
      textInput.focus();
      return;
    }

    // Cancel any ongoing or pending speech
    stopSpeech(false);

    // Create Utterance
    const utterance = new SpeechSynthesisUtterance(text);
    state.currentUtterance = utterance;

    // Apply Voice
    if (state.selectedVoice) {
      utterance.voice = state.selectedVoice;
      utterance.lang = state.selectedVoice.lang;
    }

    // Apply Controls
    utterance.rate = rateSlider ? parseFloat(rateSlider.value) : 1.0;
    utterance.pitch = pitchSlider ? parseFloat(pitchSlider.value) : 1.0;
    utterance.volume = volumeSlider ? parseFloat(volumeSlider.value) : 1.0;

    // Prepare Teleprompter Words
    prepareTeleprompter(text);

    // Lifecycle Events
    utterance.onstart = () => {
      updateStatus('Speaking');
      startKeepAlive();
      if (activeWordDisplay) {
        activeWordDisplay.textContent = 'Synthesizing voice stream...';
      }
    };

    utterance.onpause = () => {
      updateStatus('Paused');
    };

    utterance.onresume = () => {
      updateStatus('Speaking');
    };

    utterance.onboundary = (event) => {
      handleSpeechBoundary(event, text);
    };

    utterance.onend = () => {
      stopKeepAlive();
      updateStatus('Finished');
      if (activeWordDisplay) {
        activeWordDisplay.textContent = '— Completed Utterance —';
      }
      setTimeout(() => {
        if (state.status === 'Finished') {
          updateStatus('Ready');
        }
      }, 2500);
    };

    utterance.onerror = (event) => {
      stopKeepAlive();
      // 'canceled' or 'interrupted' is expected when user clicks Stop or Clear
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        console.warn('SpeechSynthesisUtterance error:', event.error);
        showToast(`Speech error: ${event.error}`, 'warning');
      }
      updateStatus('Ready');
    };

    // Trigger Speech
    window.speechSynthesis.speak(utterance);
    updateStatus('Speaking');
  }

  function pauseSpeech() {
    if (!isSpeechSynthesisSupported) return;

    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      updateStatus('Paused');
      showToast('Speech paused', 'info');
    }
  }

  function resumeSpeech() {
    if (!isSpeechSynthesisSupported) return;

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      updateStatus('Speaking');
      showToast('Speech resumed', 'info');
    } else if (!window.speechSynthesis.speaking) {
      // If stopped or finished, start again
      speak();
    }
  }

  function stopSpeech(showFeedback = true) {
    if (!isSpeechSynthesisSupported) return;

    stopKeepAlive();

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending || window.speechSynthesis.paused) {
      window.speechSynthesis.cancel();
    }

    state.currentUtterance = null;
    resetTeleprompter();
    updateStatus('Ready');

    if (showFeedback) {
      showToast('Speech stopped', 'info');
    }
  }

  function clearAll() {
    stopSpeech(false);
    textInput.value = '';
    updateMetrics();
    resetTeleprompter();
    if (activeWordDisplay) {
      activeWordDisplay.textContent = '— None (Awaiting Speech) —';
    }
    showToast('Input cleared', 'info');
    textInput.focus();
  }

  // ==========================================================================
  // Chrome SpeechSynthesis Keep-Alive Fix
  // Fixes the Chromium bug where speech automatically hangs after ~14 seconds
  // ==========================================================================
  function startKeepAlive() {
    stopKeepAlive();
    state.keepAliveInterval = setInterval(() => {
      if (!isSpeechSynthesisSupported) return;
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }

  function stopKeepAlive() {
    if (state.keepAliveInterval) {
      clearInterval(state.keepAliveInterval);
      state.keepAliveInterval = null;
    }
  }

  // ==========================================================================
  // Status State Machine & UI Controls Sync
  // ==========================================================================
  function updateStatus(newStatus) {
    state.status = newStatus;

    if (!statusBadge || !statusIcon || !statusText || !statusDescription) return;

    // Remove all status classes
    statusBadge.classList.remove('status-ready', 'status-speaking', 'status-paused', 'status-finished');

    switch (newStatus) {
      case 'Speaking':
        statusBadge.classList.add('status-speaking');
        statusIcon.textContent = '🔊';
        statusText.textContent = 'Speaking';
        statusDescription.textContent = 'Acoustic synthesizer is actively generating vocal tract waveform output.';
        
        // Control buttons
        speakBtn.disabled = true;
        pauseBtn.disabled = false;
        resumeBtn.disabled = true;
        stopBtn.disabled = false;

        // Equalizer
        if (equalizerContainer) {
          equalizerContainer.className = 'equalizer-container speaking';
        }
        if (visualizerDot) visualizerDot.className = 'status-indicator-dot active';
        if (visualizerText) visualizerText.textContent = 'Acoustic Signal Active';
        break;

      case 'Paused':
        statusBadge.classList.add('status-paused');
        statusIcon.textContent = '⏸';
        statusText.textContent = 'Paused';
        statusDescription.textContent = 'Speech output temporarily halted. Click Resume to continue playback.';

        // Control buttons
        speakBtn.disabled = true;
        pauseBtn.disabled = true;
        resumeBtn.disabled = false;
        stopBtn.disabled = false;

        // Equalizer
        if (equalizerContainer) {
          equalizerContainer.className = 'equalizer-container paused';
        }
        if (visualizerDot) visualizerDot.className = 'status-indicator-dot idle';
        if (visualizerText) visualizerText.textContent = 'Playback Paused';
        break;

      case 'Finished':
        statusBadge.classList.add('status-finished');
        statusIcon.textContent = '✅';
        statusText.textContent = 'Finished';
        statusDescription.textContent = 'Utterance completed successfully. Engine returned to idle.';

        // Control buttons
        speakBtn.disabled = false;
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        stopBtn.disabled = true;

        // Equalizer
        if (equalizerContainer) {
          equalizerContainer.className = 'equalizer-container';
        }
        if (visualizerDot) visualizerDot.className = 'status-indicator-dot idle';
        if (visualizerText) visualizerText.textContent = 'Synthesis Complete';
        break;

      case 'Ready':
      default:
        statusBadge.classList.add('status-ready');
        statusIcon.textContent = '🟢';
        statusText.textContent = 'Ready';
        statusDescription.textContent = 'The speech engine is initialized and ready to synthesize input text.';

        // Control buttons
        speakBtn.disabled = false;
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        stopBtn.disabled = true;

        // Equalizer
        if (equalizerContainer) {
          equalizerContainer.className = 'equalizer-container';
        }
        if (visualizerDot) visualizerDot.className = 'status-indicator-dot online';
        if (visualizerText) visualizerText.textContent = 'Engine Idle (Ready)';
        break;
    }
  }

  // ==========================================================================
  // Real-Time Word Highlighting & Teleprompter
  // ==========================================================================
  function prepareTeleprompter(fullText) {
    if (!teleprompterText) return;

    // Tokenize words while preserving indices
    state.speechWords = [];
    teleprompterText.innerHTML = '';

    // Split text into tokens with char offsets
    const regex = /\S+/g;
    let match;
    let index = 0;

    const fragment = document.createDocumentFragment();

    while ((match = regex.exec(fullText)) !== null) {
      const span = document.createElement('span');
      span.className = 'teleprompter-word';
      span.textContent = match[0] + ' ';
      span.dataset.index = index;
      span.dataset.charIndex = match.index;
      span.dataset.word = match[0];

      fragment.appendChild(span);

      state.speechWords.push({
        word: match[0],
        charIndex: match.index,
        length: match[0].length,
        element: span
      });

      index++;
    }

    teleprompterText.appendChild(fragment);
  }

  function handleSpeechBoundary(event, originalText) {
    if (!event || event.name === 'sentence') return;

    const charIndex = event.charIndex;
    let currentWord = '';

    // Find closest word by char index
    if (state.speechWords.length > 0) {
      let matchedIndex = -1;
      for (let i = 0; i < state.speechWords.length; i++) {
        const item = state.speechWords[i];
        if (charIndex >= item.charIndex && charIndex < item.charIndex + item.length + 3) {
          matchedIndex = i;
          currentWord = item.word;
          break;
        }
      }

      if (matchedIndex === -1) {
        // Fallback: search backwards for nearest word start
        for (let i = state.speechWords.length - 1; i >= 0; i--) {
          if (state.speechWords[i].charIndex <= charIndex) {
            matchedIndex = i;
            currentWord = state.speechWords[i].word;
            break;
          }
        }
      }

      if (matchedIndex !== -1) {
        state.speechWords.forEach((item, idx) => {
          if (idx < matchedIndex) {
            item.element.className = 'teleprompter-word spoken-word';
          } else if (idx === matchedIndex) {
            item.element.className = 'teleprompter-word active-word';
            // Scroll into view if needed
            item.element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            item.element.className = 'teleprompter-word';
          }
        });
      }
    }

    // Fallback extraction if charIndex given directly
    if (!currentWord && typeof charIndex === 'number') {
      const remaining = originalText.substring(charIndex);
      const match = remaining.match(/^\S+/);
      if (match) currentWord = match[0];
    }

    if (activeWordDisplay && currentWord) {
      // Clean punctuation
      const cleanWord = currentWord.replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '');
      activeWordDisplay.textContent = `“${cleanWord || currentWord}”`;
    }
  }

  function resetTeleprompter() {
    if (!teleprompterText) return;
    const words = teleprompterText.querySelectorAll('.teleprompter-word');
    words.forEach(word => {
      word.className = 'teleprompter-word';
    });
  }

  // ==========================================================================
  // Text Metrics Calculation (Words, Chars, Est. Duration)
  // ==========================================================================
  function updateMetrics() {
    const text = textInput ? textInput.value : '';
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    if (charCount) charCount.textContent = chars.toLocaleString();
    if (wordCount) wordCount.textContent = words.toLocaleString();

    // Est. Duration: Average reading speed is ~150 words per minute at 1.0x rate
    const currentRate = rateSlider ? parseFloat(rateSlider.value) : 1.0;
    const effectiveWpm = 150 * currentRate;
    const seconds = words > 0 ? (words / effectiveWpm) * 60 : 0;

    if (estDuration) {
      if (seconds < 1 && words > 0) {
        estDuration.textContent = '< 1s';
      } else if (seconds < 60) {
        estDuration.textContent = `~${seconds.toFixed(1)}s`;
      } else {
        const mins = Math.floor(seconds / 60);
        const remSecs = Math.round(seconds % 60);
        estDuration.textContent = `~${mins}m ${remSecs}s`;
      }
    }
  }

  // ==========================================================================
  // Event Listeners & User Interactions
  // ==========================================================================
  function setupEventListeners() {
    // Buttons
    if (speakBtn) speakBtn.addEventListener('click', speak);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseSpeech);
    if (resumeBtn) resumeBtn.addEventListener('click', resumeSpeech);
    if (stopBtn) stopBtn.addEventListener('click', () => stopSpeech(true));
    if (clearBtn) clearBtn.addEventListener('click', clearAll);
    if (clearTextBtn) clearTextBtn.addEventListener('click', clearAll);

    // Text Input typing & paste
    if (textInput) {
      textInput.addEventListener('input', () => {
        updateMetrics();
      });

      // Keyboard Shortcut: Ctrl + Enter to Speak
      textInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          speak();
        }
      });
    }

    // Global Keybindings: Esc to Stop, Space to Pause/Resume if not typing
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && window.speechSynthesis.speaking) {
        stopSpeech(true);
      }
    });

    // Copy Text Button
    if (copyTextBtn) {
      copyTextBtn.addEventListener('click', () => {
        const text = textInput ? textInput.value : '';
        if (!text) {
          showToast('Text buffer is empty!', 'warning');
          return;
        }
        navigator.clipboard.writeText(text).then(() => {
          showToast('Copied text to clipboard!', 'success');
        }).catch(() => {
          showToast('Failed to copy to clipboard', 'warning');
        });
      });
    }

    // Run Required Example Button
    if (runExampleBtn) {
      runExampleBtn.addEventListener('click', () => {
        const examplePhrase = 'Welcome to our Text and Speech Analysis project.';
        if (textInput) textInput.value = examplePhrase;
        updateMetrics();
        speak();
        showToast('Loaded & speaking demonstration example!', 'success');
      });
    }

    // Presets
    presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        presetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const text = chip.getAttribute('data-text');
        if (text && textInput) {
          textInput.value = text;
          updateMetrics();
          showToast('Preset text loaded', 'info');
        }
      });
    });

    // Voice Selection Dropdown
    if (voiceSelect) {
      voiceSelect.addEventListener('change', () => {
        const selectedURI = voiceSelect.value;
        state.selectedVoice = state.voices.find(v => v.voiceURI === selectedURI) || null;
        updateVoiceInspector(state.selectedVoice);
        showToast(`Voice changed: ${state.selectedVoice ? state.selectedVoice.name : 'None'}`, 'info');
        
        // If speaking, restart with new voice
        if (window.speechSynthesis.speaking) {
          speak();
        }
      });
    }

    // Language Filter Dropdown
    if (languageSelect) {
      languageSelect.addEventListener('change', () => {
        renderVoiceOptions();
      });
    }

    // Voice Search Filter
    if (voiceSearchInput) {
      voiceSearchInput.addEventListener('input', () => {
        renderVoiceOptions();
      });
    }

    // Sliders
    if (rateSlider) {
      rateSlider.addEventListener('input', () => {
        const val = parseFloat(rateSlider.value).toFixed(1);
        if (rateValueBadge) rateValueBadge.textContent = `${val}x`;
        updateParamsDisplay();
        updateMetrics();
      });
    }

    if (pitchSlider) {
      pitchSlider.addEventListener('input', () => {
        const val = parseFloat(pitchSlider.value).toFixed(1);
        if (pitchValueBadge) pitchValueBadge.textContent = val;
        updateParamsDisplay();
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', () => {
        const val = Math.round(parseFloat(volumeSlider.value) * 100);
        if (volumeValueBadge) volumeValueBadge.textContent = `${val}%`;
        updateParamsDisplay();
      });
    }

    // Slider Tick Labels Clickable
    document.querySelectorAll('.tick-label').forEach(tick => {
      tick.addEventListener('click', () => {
        const targetVal = tick.getAttribute('data-val');
        const slider = tick.closest('.slider-container')?.querySelector('.custom-slider');
        if (slider && targetVal !== null) {
          slider.value = targetVal;
          slider.dispatchEvent(new Event('input'));
        }
      });
    });

    // Reset Controls Button
    if (resetControlsBtn) {
      resetControlsBtn.addEventListener('click', () => {
        if (rateSlider) rateSlider.value = 1.0;
        if (pitchSlider) pitchSlider.value = 1.0;
        if (volumeSlider) volumeSlider.value = 1.0;
        if (rateValueBadge) rateValueBadge.textContent = '1.0x';
        if (pitchValueBadge) pitchValueBadge.textContent = '1.0';
        if (volumeValueBadge) volumeValueBadge.textContent = '100%';
        updateParamsDisplay();
        updateMetrics();
        showToast('Acoustic controls reset to default (1.0x / 1.0 / 100%)', 'success');
      });
    }

    // Unsupported Banner Close
    if (closeBannerBtn && unsupportedBanner) {
      closeBannerBtn.addEventListener('click', () => {
        unsupportedBanner.style.display = 'none';
      });
    }

    // Teleprompter toggle
    if (closeTeleprompterBtn && teleprompterContainer) {
      closeTeleprompterBtn.addEventListener('click', () => {
        state.isTeleprompterOpen = !state.isTeleprompterOpen;
        teleprompterContainer.style.display = state.isTeleprompterOpen ? 'flex' : 'none';
        closeTeleprompterBtn.textContent = state.isTeleprompterOpen ? 'Hide Tracker' : 'Show Live Word Tracker';
      });
    }

    // Theme Accent Toggle
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        state.themeAccentIndex = (state.themeAccentIndex + 1) % state.accentThemes.length;
        const currentAccent = state.accentThemes[state.themeAccentIndex];
        applyThemeAccent(currentAccent);
        showToast(`Theme accent changed: ${currentAccent.replace('-', ' & ')}`, 'info');
      });
    }
  }

  function applyThemeAccent(accent) {
    const root = document.documentElement;
    if (accent === 'indigo-cyan') {
      root.style.setProperty('--primary', '#6366f1');
      root.style.setProperty('--accent-cyan', '#06b6d4');
    } else if (accent === 'cyan-emerald') {
      root.style.setProperty('--primary', '#06b6d4');
      root.style.setProperty('--accent-cyan', '#10b981');
    } else if (accent === 'violet-fuchsia') {
      root.style.setProperty('--primary', '#8b5cf6');
      root.style.setProperty('--accent-cyan', '#ec4899');
    } else if (accent === 'amber-rose') {
      root.style.setProperty('--primary', '#f59e0b');
      root.style.setProperty('--accent-cyan', '#f43f5e');
    }
  }

  // ==========================================================================
  // Toast Notification System
  // ==========================================================================
  function showToast(message, type = 'info') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'danger') icon = '🚫';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  // ==========================================================================
  // Kickstart on DOM Ready
  // ==========================================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

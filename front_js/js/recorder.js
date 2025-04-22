document.addEventListener("DOMContentLoaded", async () => {
  console.log("Recorder.js loaded with MP3 support")

  // Get elements
  const startRecordingBtn = document.getElementById("start-recording")
  const stopRecordingBtn = document.getElementById("stop-recording")
  const resetRecordingBtn = document.getElementById("reset-recording")
  const transcribeRecordingBtn = document.getElementById("transcribe-recording")
  const audioPreview = document.getElementById("audio-preview")
  const recordedAudio = document.getElementById("recorded-audio")
  const recorderTimer = document.getElementById("recorder-timer")

  // Set API base URL - Use relative URL since frontend and backend are on same origin
  const API_BASE_URL = "" // Empty string for same-origin requests

  // Check for lamejs
  const checkLameJs = () => {
    if (typeof lamejs !== 'undefined') {
      console.log("lamejs is loaded and available")
      return true
    }
    console.warn("lamejs is not loaded")
    return false
  }

  let mediaRecorder
  let audioContext
  let audioStream
  let audioProcessor
  let mp3Encoder
  let mp3Data = []
  let audioChunks = []
  let recordingStartTime
  let timerInterval
  let isRecording = false

  // Function to show alerts (success or error)
  function showAlert(type, message) {
    try {
      console.log(`Showing ${type} alert: ${message}`)

      // Create a new alert element
      const alertDiv = document.createElement("div")
      alertDiv.textContent = message
      alertDiv.style.position = "fixed"
      alertDiv.style.top = "20px"
      alertDiv.style.right = "20px"
      alertDiv.style.zIndex = "1000"
      alertDiv.style.marginBottom = "10px"
      alertDiv.style.padding = "10px 15px"
      alertDiv.style.borderRadius = "4px"
      alertDiv.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)"

      // Set background color based on alert type
      if (type === "success") {
        alertDiv.style.backgroundColor = "rgba(76, 175, 80, 0.9)"
        alertDiv.style.color = "white"
      } else if (type === "error") {
        alertDiv.style.backgroundColor = "rgba(244, 67, 54, 0.9)"
        alertDiv.style.color = "white"
      } else {
        alertDiv.style.backgroundColor = "rgba(33, 150, 243, 0.9)"
        alertDiv.style.color = "white"
      }

      // Add to document body directly
      document.body.appendChild(alertDiv)

      // Automatically remove after 5 seconds
      setTimeout(() => {
        if (alertDiv && alertDiv.parentNode) {
          alertDiv.parentNode.removeChild(alertDiv)
        }
      }, 5000)
    } catch (error) {
      console.error("Error showing alert:", error)
    }
  }

  // Function to update timer
  function updateTimer() {
    if (!recorderTimer) {
      console.error("Recorder timer element not found")
      return
    }

    const elapsedTime = Date.now() - recordingStartTime
    const seconds = Math.floor(elapsedTime / 1000) % 60
    const minutes = Math.floor(elapsedTime / 60000)

    recorderTimer.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Function to reset recorder UI
  function resetRecorderUI() {
    if (!startRecordingBtn || !stopRecordingBtn || !resetRecordingBtn || !audioPreview || !recorderTimer) {
      console.error("One or more recorder UI elements not found")
      return
    }

    startRecordingBtn.classList.remove("hidden")
    stopRecordingBtn.classList.add("hidden")
    resetRecordingBtn.classList.add("hidden")
    audioPreview.classList.add("hidden")
    recorderTimer.textContent = "00:00"

    if (timerInterval) {
      clearInterval(timerInterval)
    }
  }

  // Function to convert Float32Array to Int16Array (required for MP3 encoding)
  function convertToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Convert float to int
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  // Handle start recording
  if (startRecordingBtn) {
    startRecordingBtn.addEventListener("click", async () => {
      try {
        console.log("Starting audio recording...")

        // Request audio stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1, // Mono audio for better MP3 compatibility
            sampleRate: 44100, // 44.1kHz is good for MP3
            echoCancellation: true,
            noiseSuppression: true,
          },
        })

        // Store the stream
        audioStream = stream

        // Check if lamejs is available
        const lameJsAvailable = checkLameJs();
        
        if (!lameJsAvailable) {
          console.warn("MP3 encoder not available, falling back to WebM")
          showAlert("warning", "MP3 encoder not available. Falling back to WebM format.")
          
          // Fallback to WebM if MP3 encoder is not available
          const options = { mimeType: "audio/webm" }
          if (MediaRecorder.isTypeSupported("audio/webm")) {
            mediaRecorder = new MediaRecorder(stream, options)
            console.log("Using audio/webm format for recording")
          } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
            mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/ogg" })
            console.log("Using audio/ogg format for recording")
          } else {
            mediaRecorder = new MediaRecorder(stream)
            console.log("Using default recording format:", mediaRecorder.mimeType)
          }

          audioChunks = []

          mediaRecorder.addEventListener("dataavailable", (event) => {
            if (event.data.size > 0) {
              audioChunks.push(event.data)
            }
          })

          mediaRecorder.addEventListener("stop", () => {
            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType })
            const audioUrl = URL.createObjectURL(audioBlob)

            if (recordedAudio) {
              recordedAudio.src = audioUrl
            }

            if (audioPreview && resetRecordingBtn) {
              audioPreview.classList.remove("hidden")
              resetRecordingBtn.classList.remove("hidden")
            }

            // Stop all tracks
            stream.getTracks().forEach((track) => track.stop())
          })

          mediaRecorder.start(1000)
        } else {
          console.log("Using MP3 encoder for recording")
          
          // Use Web Audio API for MP3 recording
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const microphoneSource = audioContext.createMediaStreamSource(stream);
          
          // Create a processor node
          audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);
          
          // Initialize MP3 encoder (mono, 44.1kHz, 128kbps)
          mp3Encoder = new lamejs.Mp3Encoder(1, 44100, 128);
          mp3Data = [];
          
          // Process audio data
          audioProcessor.onaudioprocess = function(e) {
            if (!isRecording) return;
            
            // Get channel data
            const channelData = e.inputBuffer.getChannelData(0);
            
            // Convert to format suitable for MP3 encoding
            const samples = convertToInt16(channelData);
            
            // Encode MP3
            const mp3buf = mp3Encoder.encodeBuffer(samples);
            if (mp3buf.length > 0) {
              mp3Data.push(mp3buf);
            }
          };
          
          // Connect the nodes
          microphoneSource.connect(audioProcessor);
          audioProcessor.connect(audioContext.destination);
          
          // Set recording flag
          isRecording = true;
          
          showAlert("success", "Recording started in MP3 format. Speak now...")
        }

        recordingStartTime = Date.now()

        // Update UI
        if (startRecordingBtn && stopRecordingBtn) {
          startRecordingBtn.classList.add("hidden")
          stopRecordingBtn.classList.remove("hidden")
        }

        // Start timer
        timerInterval = setInterval(updateTimer, 1000)

        if (!lameJsAvailable) {
          showAlert("success", "Recording started. Speak now...")
        }
      } catch (error) {
        console.error("Microphone access error:", error)
        showAlert("error", `Could not access microphone: ${error.message}`)
      }
    })
  } else {
    console.error("Start recording button not found")
  }

  // Handle stop recording
  if (stopRecordingBtn) {
    stopRecordingBtn.addEventListener("click", () => {
      console.log("Stop recording button clicked")

      if (isRecording && audioProcessor) {
        // Stop MP3 recording
        isRecording = false;
        
        // Finalize MP3 encoding
        const mp3Final = mp3Encoder.flush();
        if (mp3Final.length > 0) {
          mp3Data.push(mp3Final);
        }
        
        // Create MP3 blob
        const blob = new Blob(mp3Data, { type: "audio/mp3" });
        const audioUrl = URL.createObjectURL(blob);
        
        // Store for transcription
        audioChunks = [blob];
        
        // Update audio player
        if (recordedAudio) {
          recordedAudio.src = audioUrl;
        }
        
        // Show audio player and reset button
        if (audioPreview && resetRecordingBtn) {
          audioPreview.classList.remove("hidden");
          resetRecordingBtn.classList.remove("hidden");
        }
        
        // Disconnect and close audio context
        if (audioProcessor) {
          audioProcessor.disconnect();
          audioProcessor = null;
        }
        
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
        }
        
        console.log("MP3 recording stopped successfully");
        
      } else if (mediaRecorder && mediaRecorder.state !== "inactive") {
        // Stop WebM/fallback recording
        mediaRecorder.stop();
        console.log("WebM recording stopped successfully");
      } else {
        console.error("No active recording to stop");
        return;
      }

      // Update UI
      stopRecordingBtn.classList.add("hidden")

      // Stop timer
      clearInterval(timerInterval)

      showAlert("success", "Recording stopped. You can now transcribe it.")
    })
  } else {
    console.error("Stop recording button not found")
  }

  // Handle reset recording
  if (resetRecordingBtn) {
    resetRecordingBtn.addEventListener("click", () => {
      console.log("Reset recording button clicked")
      resetRecorderUI()
      audioChunks = []
      mp3Data = []
    })
  } else {
    console.error("Reset recording button not found")
  }

  // Handle transcribe recording
  if (transcribeRecordingBtn) {
    transcribeRecordingBtn.addEventListener("click", async () => {
      console.log("Transcribe recording button clicked")

      if (audioChunks.length === 0) {
        showAlert("error", "No recording to transcribe.")
        return
      }

      try {
        // Show loading state
        document.body.style.cursor = "wait"
        showAlert("success", "Processing your recording. This may take a moment...")

        // Add a loading indicator to the transcription result
        const transcriptionResult = document.getElementById("transcription-result")
        const transcriptionContent = document.getElementById("transcription-content")

        if (transcriptionContent && transcriptionResult) {
          transcriptionContent.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <div class="spinner" style="margin: 0 auto;"></div>
            <p>Transcribing your recording...</p>
          </div>
        `
          transcriptionResult.classList.remove("hidden")
        }

        // Get the first audio chunk
        const audioBlob = audioChunks[0];
        console.log("Audio blob created for transcription, size:", audioBlob.size, "type:", audioBlob.type)

        // Determine the correct file extension based on the MIME type
        let fileName = "recorded-audio.webm";
        let fileType = audioBlob.type;
        
        if (fileType.includes("mp3")) {
          fileName = "recorded-audio.mp3";
        } else if (fileType.includes("ogg")) {
          fileName = "recorded-audio.ogg";
        } else if (fileType.includes("wav")) {
          fileName = "recorded-audio.wav";
        }
        
        const audioFile = new File([audioBlob], fileName, { type: fileType });
        console.log("Created audio file:", fileName, "type:", fileType);

        const formData = new FormData()
        formData.append("file", audioFile)

        const token = localStorage.getItem("token")
        if (!token) {
          showAlert("error", "You are not logged in. Please log in and try again.")
          window.location.href = "/pages/login.html"
          return
        }

        console.log("Sending recorded audio to /transcribe endpoint...")

        const response = await fetch(`/transcribe`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        })

        console.log("Response status:", response.status)
        console.log("Response headers:", response.headers)

        if (!response.ok) {
          let errorMessage = "Failed to transcribe recording"
          try {
            const errorData = await response.json()
            errorMessage = errorData.detail || errorMessage
          } catch (e) {
            // If response is not JSON, try to get text
            try {
              const errorText = await response.text()
              errorMessage = errorText || errorMessage
            } catch (e2) {
              // If we can't get text either, use the status
              errorMessage = `Error ${response.status}: ${errorMessage}`
            }
          }
          throw new Error(errorMessage)
        }

        const transcription = await response.text()
        console.log("Transcription received, length:", transcription.length)
        console.log("Transcription preview:", transcription.substring(0, 100) + "...")

        // Display transcription
        if (transcriptionResult && transcriptionContent) {
          transcriptionContent.textContent = transcription
          transcriptionResult.classList.remove("hidden")

          // Scroll to transcription
          transcriptionResult.scrollIntoView({ behavior: "smooth" })
        } else {
          console.error("Transcription result elements not found in the DOM.")
          showAlert("error", "Could not display transcription. Please try refreshing the page.")
        }

        // Reset recorder
        resetRecorderUI()
        audioChunks = []
        mp3Data = []

        showAlert("success", "Transcription completed successfully!")
      } catch (error) {
        console.error("Transcription error:", error)
        showAlert("error", error.message || "An error occurred during transcription.")

        // Show error in transcription area too
        const transcriptionResult = document.getElementById("transcription-result")
        const transcriptionContent = document.getElementById("transcription-content")

        if (transcriptionContent && transcriptionResult) {
          transcriptionContent.innerHTML = `
          <div class="alert alert-error" style="margin: 0;">
            <h3>Transcription Error</h3>
            <p>${error.message || "An error occurred during transcription."}</p>
            <p>Please try again with a different recording or check your connection.</p>
          </div>
        `
          transcriptionResult.classList.remove("hidden")
        }
      } finally {
        document.body.style.cursor = "default"
      }
    })
  } else {
    console.error("Transcribe recording button not found")
  }
})
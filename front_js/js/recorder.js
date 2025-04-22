document.addEventListener("DOMContentLoaded", () => {
  console.log("Recorder.js loaded")

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

  let mediaRecorder
  let audioChunks = []
  let recordingStartTime
  let timerInterval

  // Function to show alerts (success or error)
  function showAlert(type, message) {
    try {
      console.log(`Showing ${type} alert: ${message}`)

      // Create a new alert element
      const alertDiv = document.createElement("div")
      alertDiv.className = `alert alert-${type}`
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

  // Handle start recording
  if (startRecordingBtn) {
    startRecordingBtn.addEventListener("click", async () => {
      try {
        console.log("Starting audio recording")

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        mediaRecorder = new MediaRecorder(stream)
        audioChunks = []

        mediaRecorder.addEventListener("dataavailable", (event) => {
          audioChunks.push(event.data)
          console.log("Audio chunk received, size:", event.data.size)
        })

        mediaRecorder.addEventListener("stop", () => {
          console.log("Recording stopped, creating audio blob")

          const audioBlob = new Blob(audioChunks, { type: "audio/mp3" })
          console.log("Audio blob created, size:", audioBlob.size)

          const audioUrl = URL.createObjectURL(audioBlob)

          if (recordedAudio) {
            recordedAudio.src = audioUrl
          } else {
            console.error("Recorded audio element not found")
          }

          if (audioPreview && resetRecordingBtn) {
            audioPreview.classList.remove("hidden")
            resetRecordingBtn.classList.remove("hidden")
          } else {
            console.error("Audio preview or reset button not found")
          }

          // Stop all tracks
          stream.getTracks().forEach((track) => track.stop())
        })

        // Start recording
        mediaRecorder.start()
        recordingStartTime = Date.now()

        // Update UI
        if (startRecordingBtn && stopRecordingBtn) {
          startRecordingBtn.classList.add("hidden")
          stopRecordingBtn.classList.remove("hidden")
        } else {
          console.error("Start or stop recording button not found")
        }

        // Start timer
        timerInterval = setInterval(updateTimer, 1000)

        showAlert("success", "Recording started. Speak now...")
      } catch (error) {
        console.error("Microphone access error:", error)
        showAlert("error", "Could not access microphone. Please check permissions.")
      }
    })
  } else {
    console.error("Start recording button not found")
  }

  // Handle stop recording
  if (stopRecordingBtn) {
    stopRecordingBtn.addEventListener("click", () => {
      console.log("Stop recording button clicked")

      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop()

        // Update UI
        stopRecordingBtn.classList.add("hidden")

        // Stop timer
        clearInterval(timerInterval)

        showAlert("success", "Recording stopped. You can now transcribe it.")
      } else {
        console.error("MediaRecorder not found or already inactive")
      }
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

        if (transcriptionContent) {
          transcriptionContent.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <div class="spinner" style="margin: 0 auto;"></div>
              <p>Transcribing your recording...</p>
            </div>
          `
          transcriptionResult.classList.remove("hidden")
        }

        const audioBlob = new Blob(audioChunks, { type: "audio/mp3" })
        console.log("Audio blob created for transcription, size:", audioBlob.size)

        const audioFile = new File([audioBlob], "recorded-audio.mp3", { type: "audio/mp3" })

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
        if (!transcriptionResult || !transcriptionContent) {
          showAlert("error", "Transcription result elements not found in the DOM.")
          return
        }

        transcriptionContent.textContent = transcription
        transcriptionResult.classList.remove("hidden")

        // Scroll to transcription
        transcriptionResult.scrollIntoView({ behavior: "smooth" })

        // Reset recorder
        resetRecorderUI()
        audioChunks = []

        showAlert("success", "Transcription completed successfully!")
      } catch (error) {
        console.error("Transcription error:", error)
        showAlert("error", error.message || "An error occurred during transcription.")

        // Show error in transcription area too
        const transcriptionResult = document.getElementById("transcription-result")
        const transcriptionContent = document.getElementById("transcription-content")

        if (transcriptionContent) {
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

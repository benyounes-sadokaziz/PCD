// This is an addition to your existing transcription.js file
// Add this function to emit an event when transcription is complete

function handleTranscriptionComplete(transcriptionId) {
  // Create and dispatch a custom event
  const event = new CustomEvent("transcriptionComplete", {
    detail: { transcriptionId },
  })
  document.dispatchEvent(event)
}

// Modify your existing transcription success handler to call this function
// For example, if you have a function like this:

function handleTranscriptionSuccess(data) {
  // Your existing code to display transcription results
  const resultContainer = document.getElementById("transcription-result")
  resultContainer.innerHTML = `
        <h3>Transcription Complete</h3>
        <div class="transcription-text">
            <p>${data.text}</p>
        </div>
    `

  // Add this line to trigger the video loading
  handleTranscriptionComplete(data.id)
}

// This file contains any additional transcription-related functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("Transcription.js loaded")

  // Global variable to store the current transcription ID
  let currentTranscriptionId = null

  // Function to handle transcription response
  function handleTranscriptionResponse(data) {
    const transcriptionResult = document.getElementById("transcription-result")
    const transcriptionContent = document.getElementById("transcription-content")

    // Hide any loading indicators
    hideLoading()

    // Show the transcription result section
    transcriptionResult.classList.remove("hidden")

    if (data.error) {
      transcriptionContent.innerHTML = `<p class="error-text">${data.error}</p>`
      return
    }

    // Store the transcription ID
    currentTranscriptionId = data.id || generateTempId()

    // Display the transcription text
    const transcriptionText = typeof data === "string" ? data : data.text || "No text was transcribed."
    transcriptionContent.innerHTML = `<p>${transcriptionText}</p>`

    // Dispatch event that transcription is completed
    const event = new CustomEvent("transcriptionComplete", {
      detail: {
        transcriptionId: currentTranscriptionId,
        mediaFiles: data.media_files || [],
      },
    })
    document.dispatchEvent(event)

    // If we have a direct string response, we need to fetch video IDs separately
    if (typeof data === "string" && currentTranscriptionId) {
      // Fetch and display videos after a short delay to ensure the UI is updated
      setTimeout(() => {
        if (window.videoPlayer) {
          window.videoPlayer.fetchVideoIds(currentTranscriptionId)
        }
      }, 100)
    }
    // If we have media files in the response, use those directly
    else if (data.media_files && data.media_files.length > 0) {
      // Filter for video files
      const videoFiles = data.media_files.filter((file) => file.file_type && file.file_type.startsWith("video/"))

      if (videoFiles.length > 0) {
        const videoIds = videoFiles.map((file) => file.id)

        // If our video player is initialized, load the videos
        if (window.videoPlayer) {
          window.videoPlayer.setVideos(videoIds)
        }
      }
    }
    // If we have video_ids directly in the response, use those
    else if (data.video_ids && data.video_ids.length > 0) {
      // If our video player is initialized, load the videos
      if (window.videoPlayer) {
        window.videoPlayer.setVideos(data.video_ids)
      }
    }
  }

  // Function to show loading indicator
  function showLoading() {
    console.log("Show loading indicator")
    // Add your loading indicator logic here
    const loadingIndicator = document.getElementById("loading-indicator")
    if (loadingIndicator) {
      loadingIndicator.classList.remove("hidden")
    }
  }

  // Function to hide loading indicator
  function hideLoading() {
    console.log("Hide loading indicator")
    // Add your hide loading indicator logic here
    const loadingIndicator = document.getElementById("loading-indicator")
    if (loadingIndicator) {
      loadingIndicator.classList.add("hidden")
    }
  }

  // Function to fetch transcription
  async function fetchTranscription(transcriptionId) {
    try {
      showLoading()
      const response = await fetch(`/api/transcriptions/${transcriptionId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch transcription")
      }

      const data = await response.json()
      handleTranscriptionResponse(data)

      // After handling the transcription, fetch and display videos
      if (window.videoPlayer) {
        window.videoPlayer.fetchVideoIds(transcriptionId)
      }
    } catch (error) {
      hideLoading()
      console.error("Error fetching transcription:", error)
      const transcriptionResult = document.getElementById("transcription-result")
      const transcriptionContent = document.getElementById("transcription-content")

      transcriptionResult.classList.remove("hidden")
      transcriptionContent.innerHTML = `<p class="error-text">Error fetching transcription: ${error.message}</p>`
    }
  }

  // Generate a temporary ID for transcriptions if needed
  function generateTempId() {
    return "temp-" + Math.random().toString(36).substr(2, 9)
  }

  // Function to handle form submissions for transcription
  async function handleTranscriptionSubmit(formData, formType) {
    try {
      showLoading()

      // Clear any previous transcription results
      const transcriptionResult = document.getElementById("transcription-result")
      const transcriptionContent = document.getElementById("transcription-content")

      if (transcriptionContent) {
        transcriptionContent.innerHTML = ""
      }

      // Get the token from localStorage
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Not authenticated")
      }

      // Make the request to the transcribe endpoint
      const response = await fetch("/transcribe", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to transcribe")
      }

      // Get the response text
      const responseText = await response.text()

      // Handle the transcription response
      handleTranscriptionResponse(responseText)
    } catch (error) {
      hideLoading()
      console.error(`Error submitting ${formType} for transcription:`, error)
      showAlert("error", `Failed to transcribe ${formType}: ${error.message}`)
    }
  }

  // Function to show an alert message
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

  // Add event listener for copy button
  const copyTranscriptionBtn = document.getElementById("copy-transcription")
  if (copyTranscriptionBtn) {
    copyTranscriptionBtn.addEventListener("click", () => {
      const transcriptionContent = document.getElementById("transcription-content")
      if (!transcriptionContent) {
        console.error("Transcription content element not found")
        return
      }

      const text = transcriptionContent.textContent
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showAlert("success", "Transcription copied to clipboard")
        })
        .catch((err) => {
          console.error("Could not copy text: ", err)
          showAlert("error", "Failed to copy to clipboard")
        })
    })
  }

  // Handle form submissions
  // Video form submission
  const videoForm = document.getElementById("video-form")
  if (videoForm) {
    videoForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      const fileInput = document.getElementById("video-file")
      if (!fileInput.files || fileInput.files.length === 0) {
        showAlert("error", "Please select a video file")
        return
      }

      const formData = new FormData()
      formData.append("file", fileInput.files[0])

      await handleTranscriptionSubmit(formData, "video")
    })
  }

  // Audio form submission
  const audioForm = document.getElementById("audio-form")
  if (audioForm) {
    audioForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      const fileInput = document.getElementById("audio-file")
      if (!fileInput.files || fileInput.files.length === 0) {
        showAlert("error", "Please select an audio file")
        return
      }

      const formData = new FormData()
      formData.append("file", fileInput.files[0])

      await handleTranscriptionSubmit(formData, "audio")
    })
  }

  // Text form submission
  const textForm = document.getElementById("text-form")
  if (textForm) {
    textForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      const textInput = document.getElementById("text-input")
      if (!textInput.value.trim()) {
        showAlert("error", "Please enter some text")
        return
      }

      const formData = new FormData()
      const blob = new Blob([textInput.value], { type: "text/plain" })
      formData.append("file", blob, "text.txt")

      await handleTranscriptionSubmit(formData, "text")
    })
  }

  // Handle transcribe recording button
  const transcribeRecordingBtn = document.getElementById("transcribe-recording")
  if (transcribeRecordingBtn) {
    transcribeRecordingBtn.addEventListener("click", async () => {
      const audioPlayer = document.getElementById("recorded-audio")
      if (!audioPlayer || !audioPlayer.src) {
        showAlert("error", "No recording available")
        return
      }

      // Create a form data object
      const formData = new FormData()

      // Get the audio blob from the audio element
      const blob = await fetch(audioPlayer.src).then((r) => r.blob())
      formData.append("file", blob, "recording.mp3")

      await handleTranscriptionSubmit(formData, "recording")
    })
  }

  // Make functions available globally
  window.transcription = {
    handleTranscriptionResponse,
    fetchTranscription,
    showAlert,
  }
})

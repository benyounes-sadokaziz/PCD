document.addEventListener("DOMContentLoaded", () => {
  console.log("Upload.js loaded")

  // Get elements
  const uploadOptions = document.querySelectorAll(".upload-option")
  const uploadForms = document.querySelectorAll(".upload-form")
  const fileInputs = document.querySelectorAll(".file-input")
  const removeFileButtons = document.querySelectorAll(".remove-file")
  const copyTranscriptionBtn = document.getElementById("copy-transcription")

  // Set API base URL - Use relative URL since frontend and backend are on same origin
  const API_BASE_URL = "" // Empty string for same-origin requests

  // Function to show alerts
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

  // Handle upload option selection
  uploadOptions.forEach((option) => {
    option.addEventListener("click", () => {
      console.log("Upload option clicked:", option.getAttribute("data-option"))

      const targetForm = option.getAttribute("data-option") + "-form"

      // Hide all forms
      uploadForms.forEach((form) => {
        form.classList.add("hidden")
      })

      // Show selected form
      const selectedForm = document.getElementById(targetForm)
      if (selectedForm) {
        selectedForm.classList.remove("hidden")
      } else {
        console.error(`Form with ID ${targetForm} not found`)
      }

      // Hide transcription result
      const transcriptionResult = document.getElementById("transcription-result")
      if (transcriptionResult) {
        transcriptionResult.classList.add("hidden")
      }
    })
  })

  // Handle file selection
  fileInputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      console.log("File selected:", input.id)

      const fileInfo = document.getElementById(`${input.id}-info`)
      if (!fileInfo) {
        console.error(`File info element for ${input.id} not found`)
        return
      }

      const fileName = fileInfo.querySelector(".selected-file-name")
      if (!fileName) {
        console.error(`File name element for ${input.id} not found`)
        return
      }

      if (input.files.length > 0) {
        fileName.textContent = input.files[0].name
        fileInfo.classList.remove("hidden")
        console.log("File selected:", input.files[0].name)
      } else {
        fileInfo.classList.add("hidden")
      }
    })
  })

  // Handle file removal
  removeFileButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-target")
      console.log("Removing file:", targetId)

      const targetInput = document.getElementById(targetId)
      if (!targetInput) {
        console.error(`Target input ${targetId} not found`)
        return
      }

      targetInput.value = ""
      const fileInfo = document.getElementById(`${targetId}-info`)
      if (fileInfo) {
        fileInfo.classList.add("hidden")
      }
    })
  })

  // Handle video form submission
  const videoForm = document.getElementById("video-form")
  if (videoForm) {
    videoForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      console.log("Video form submitted")
      await handleFileUpload("video-file", "video")
    })
  } else {
    console.error("Video form not found")
  }

  // Handle audio form submission
  const audioForm = document.getElementById("audio-form")
  if (audioForm) {
    audioForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      console.log("Audio form submitted")
      await handleFileUpload("audio-file", "audio")
    })
  } else {
    console.error("Audio form not found")
  }

  // Handle text form submission
  const textForm = document.getElementById("text-form")
  if (textForm) {
    textForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      console.log("Text form submitted")

      const textInput = document.getElementById("text-input").value
      if (!textInput) {
        showAlert("error", "Please enter some text")
        return
      }

      // Create a text file from the input
      const textBlob = new Blob([textInput], { type: "text/plain" })
      const textFile = new File([textBlob], "text-input.txt", { type: "text/plain" })

      const formData = new FormData()
      formData.append("file", textFile)

      await uploadAndTranscribe(formData, "text")
    })
  } else {
    console.error("Text form not found")
  }

  // Copy transcription to clipboard
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

  // Function to handle file uploads
  async function handleFileUpload(inputId, fileType) {
    console.log(`Handling ${fileType} upload`)

    const fileInput = document.getElementById(inputId)
    if (!fileInput) {
      showAlert("error", `File input element with ID "${inputId}" not found.`)
      return
    }

    if (!fileInput.files.length) {
      showAlert("error", "Please select a file to upload.")
      return
    }

    const file = fileInput.files[0]
    console.log("File selected:", file.name, "Size:", file.size, "Type:", file.type)

    const formData = new FormData()
    formData.append("file", file)

    await uploadAndTranscribe(formData, fileType)
  }

  // Function to upload and transcribe files
  async function uploadAndTranscribe(formData, fileType) {
    try {
      console.log(`Starting transcription for ${fileType}`)

      // Show loading state
      document.body.style.cursor = "wait"
      showAlert("success", `Processing your ${fileType}. This may take a moment...`)

      // Add a loading indicator to the transcription result
      const transcriptionResult = document.getElementById("transcription-result")
      const transcriptionContent = document.getElementById("transcription-content")

      if (transcriptionContent) {
        transcriptionContent.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <div class="spinner" style="margin: 0 auto;"></div>
          <p>Transcribing your ${fileType}...</p>
        </div>
      `
        transcriptionResult.classList.remove("hidden")
      }

      const token = localStorage.getItem("token")
      if (!token) {
        showAlert("error", "You are not logged in. Please log in and try again.")
        window.location.href = "/pages/login.html"
        return
      }

      console.log("Sending request to /transcribe endpoint...")

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
        let errorMessage = "Failed to transcribe file"
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

      // Reset form
      if (fileType !== "text") {
        const fileInput = document.getElementById(`${fileType}-file`)
        if (fileInput) {
          fileInput.value = ""
          const fileInfo = document.getElementById(`${fileType}-file-info`)
          if (fileInfo) {
            fileInfo.classList.add("hidden")
          }
        }
      } else {
        const textInput = document.getElementById("text-input")
        if (textInput) {
          textInput.value = ""
        }
      }

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
          <p>Please try again with a different file or check your connection.</p>
        </div>
      `
        transcriptionResult.classList.remove("hidden")
      }
    } finally {
      document.body.style.cursor = "default"
    }
  }

  // Function to load videos
  async function loadVideos() {
    try {
      const videoGrid = document.getElementById("video-grid")
      if (!videoGrid) {
        console.log("Video grid element not found, skipping video loading.")
        return
      }

      const token = localStorage.getItem("token")
      if (!token) {
        console.log("No token found, skipping video loading.")
        return
      }

      // This endpoint would need to be implemented in your backend
      const response = await fetch(`/api/videos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to load videos")
      }

      const videos = await response.json()

      if (videos.length === 0) {
        videoGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fas fa-film"></i>
            </div>
            <h3 class="empty-state-text">No videos yet</h3>
            <p class="empty-state-subtext">Upload a video to see it here</p>
          </div>
        `
        return
      }

      videoGrid.innerHTML = ""

      videos.forEach((video) => {
        const videoItem = document.createElement("div")
        videoItem.className = "video-item"
        videoItem.innerHTML = `
          <video class="video-thumbnail" src="/api/videos/${video.id}" controls></video>
          <div class="video-info">
            <h3 class="video-title">${video.filename}</h3>
            <p class="video-date">${new Date(video.created_at).toLocaleDateString()}</p>
          </div>
        `
        videoGrid.appendChild(videoItem)
      })
    } catch (error) {
      console.error("Error loading videos:", error)
      // Don't show an alert for this to avoid cluttering the UI
    }
  }

  // Load videos on page load
  if (document.getElementById("video-grid")) {
    loadVideos()
  }
})

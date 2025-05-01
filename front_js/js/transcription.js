// This file contains any additional transcription-related functionality
document.addEventListener("DOMContentLoaded", () => {
  console.log("Transcription.js loaded")

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

  // Add event listener for copy button if not already added in upload.js
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
})
  // Function to check if the transcription endpoint is available
  

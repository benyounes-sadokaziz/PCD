document.addEventListener("DOMContentLoaded", () => {
  // Set API base URL - Use relative URL since frontend and backend are on same origin
  const API_BASE_URL = "" // Empty string for same-origin requests

  // Function to display alerts
  function showAlert(type, message) {
    try {
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

      console.log("Alert shown:", message)
    } catch (error) {
      console.error("Error showing alert:", error)
    }
  }

  // Load user's transcription history
  async function loadHistory() {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        showAlert("error", "You are not logged in. Please log in and try again.")
        window.location.href = "/pages/login.html"
        return
      }

      const historyList = document.getElementById("history-list")
      const emptyHistory = document.getElementById("empty-history")

      if (!historyList) {
        console.error("History list element not found.")
        return
      }

      // This endpoint would need to be implemented in your backend
      const response = await fetch(`/api/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to load history")
      }

      const history = await response.json()

      if (history.length === 0) {
        if (emptyHistory) {
          emptyHistory.classList.remove("hidden")
        }
        return
      }

      if (emptyHistory) {
        emptyHistory.classList.add("hidden")
      }

      // Clear existing items except the empty state
      const existingItems = historyList.querySelectorAll(".history-item")
      existingItems.forEach((item) => item.remove())

      // Add history items
      history.forEach((item) => {
        const historyItem = document.createElement("div")
        historyItem.className = "history-item"

        // Determine file type class
        let typeClass = "type-text"
        if (item.filename.match(/\.(mp4|mov|avi|mkv)$/i)) {
          typeClass = "type-video"
        } else if (item.filename.match(/\.(mp3|wav|ogg)$/i)) {
          typeClass = "type-audio"
        }

        historyItem.innerHTML = `
          <div class="history-item-header">
            <h3 class="history-item-title">${item.filename}</h3>
            <span class="history-item-date">${new Date(item.created_at).toLocaleString()}</span>
          </div>
          <span class="history-item-type ${typeClass}">${typeClass.replace("type-", "")}</span>
          <div class="history-item-transcription">${item.transcription}</div>
          <div class="history-item-actions">
            <button class="btn btn-secondary btn-download" data-id="${item.id}">
              <i class="fas fa-download"></i> Download
            </button>
            <button class="btn btn-danger btn-delete" data-id="${item.id}">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        `

        historyList.appendChild(historyItem)
      })

      // Add event listeners to download buttons
      const downloadButtons = document.querySelectorAll(".btn-download")
      downloadButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const itemId = button.getAttribute("data-id")
          downloadTranscription(itemId)
        })
      })

      // Add event listeners to delete buttons
      const deleteButtons = document.querySelectorAll(".btn-delete")
      deleteButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const itemId = button.getAttribute("data-id")
          deleteHistoryItem(itemId)
        })
      })
    } catch (error) {
      showAlert("error", "Failed to load history. Please try again later.")
      console.error("History loading error:", error)
    }
  }

  // Function to download transcription
  async function downloadTranscription(itemId) {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        showAlert("error", "You are not logged in. Please log in and try again.")
        window.location.href = "/pages/login.html"
        return
      }

      // This endpoint would need to be implemented in your backend
      const response = await fetch(`/api/transcriptions/${itemId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to download transcription")
      }

      const transcription = await response.text()

      // Create a download link
      const blob = new Blob([transcription], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `transcription-${itemId}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showAlert("success", "Transcription downloaded successfully.")
    } catch (error) {
      showAlert("error", "Failed to download transcription.")
      console.error("Download error:", error)
    }
  }

  // Function to delete history item
  async function deleteHistoryItem(itemId) {
    if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        showAlert("error", "You are not logged in. Please log in and try again.")
        window.location.href = "/pages/login.html"
        return
      }

      // This endpoint would need to be implemented in your backend
      const response = await fetch(`/api/history/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to delete item")
      }

      showAlert("success", "Item deleted successfully.")

      // Reload history
      loadHistory()
    } catch (error) {
      showAlert("error", "Failed to delete item.")
      console.error("Delete error:", error)
    }
  }

  // Load history on page load
  if (document.getElementById("history-list")) {
    loadHistory()
  }
})

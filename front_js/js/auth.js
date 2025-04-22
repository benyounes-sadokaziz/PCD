document.addEventListener("DOMContentLoaded", () => {
  console.log("Auth.js loaded")

  // Check if user is logged in
  const token = localStorage.getItem("token")
  const username = localStorage.getItem("username")

  // Update username display if available
  const usernameDisplay = document.getElementById("username-display")
  if (usernameDisplay && username) {
    usernameDisplay.textContent = username
  }

  // Helper function to show alerts
  function showAlert(type, message) {
    try {
      console.log(`Showing ${type} alert: ${message}`)

      // Create a new alert element
      const alertElement = document.createElement("div")
      alertElement.className = `alert alert-${type}`
      alertElement.textContent = message
      alertElement.style.position = "fixed"
      alertElement.style.top = "20px"
      alertElement.style.right = "20px"
      alertElement.style.zIndex = "1000"
      alertElement.style.marginBottom = "10px"
      alertElement.style.padding = "10px 15px"
      alertElement.style.borderRadius = "4px"
      alertElement.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)"

      // Set background color based on alert type
      if (type === "success") {
        alertElement.style.backgroundColor = "rgba(76, 175, 80, 0.9)"
        alertElement.style.color = "white"
      } else if (type === "error") {
        alertElement.style.backgroundColor = "rgba(244, 67, 54, 0.9)"
        alertElement.style.color = "white"
      } else {
        alertElement.style.backgroundColor = "rgba(33, 150, 243, 0.9)"
        alertElement.style.color = "white"
      }

      // Add to document body directly
      document.body.appendChild(alertElement)

      // Automatically remove after 5 seconds
      setTimeout(() => {
        if (alertElement && alertElement.parentNode) {
          alertElement.parentNode.removeChild(alertElement)
        }
      }, 5000)

      console.log("Alert shown:", message)
    } catch (error) {
      console.error("Error showing alert:", error)
    }
  }

  // Make showAlert available globally
  window.showAlert = showAlert

  // Handle logout
  const logoutBtn = document.getElementById("logout-btn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault()
      localStorage.removeItem("token")
      localStorage.removeItem("username")
      window.location.href = "/pages/login.html"
    })
  }

  // Handle login form
  const loginForm = document.getElementById("login-form")
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      console.log("Login form submitted")

      const username = document.getElementById("username").value
      const password = document.getElementById("password").value

      try {
        const response = await fetch(`/api/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        })

        console.log("Login response status:", response.status)

        const data = await response.json()

        if (response.ok) {
          localStorage.setItem("token", data.access_token)
          localStorage.setItem("username", data.username)
          window.location.href = "/pages/home.html"
        } else {
          showAlert("error", data.detail || "Login failed. Please check your credentials.")
        }
      } catch (error) {
        console.error("Login error:", error)
        showAlert("error", "An error occurred. Please try again later.")
      }
    })
  }

  // Handle register form
  const registerForm = document.getElementById("register-form")
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      console.log("Register form submitted")

      const username = document.getElementById("username").value
      const email = document.getElementById("email").value
      const password = document.getElementById("password").value

      try {
        const response = await fetch(`/api/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, email, password }),
        })

        console.log("Register response status:", response.status)

        const data = await response.json()

        if (response.ok) {
          showAlert("success", "Registration successful! You can now log in.")
          setTimeout(() => {
            window.location.href = "/pages/login.html"
          }, 2000)
        } else {
          showAlert("error", data.detail || "Registration failed. Please try again.")
        }
      } catch (error) {
        console.error("Registration error:", error)
        showAlert("error", "An error occurred. Please try again later.")
      }
    })
  }

  // Redirect if not logged in (for protected pages)
  if (
    (!token && window.location.pathname.includes("home.html")) ||
    (!token && window.location.pathname.includes("history.html"))
  ) {
    window.location.href = "/pages/login.html"
  }
})

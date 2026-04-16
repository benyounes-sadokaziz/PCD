🤟 PCD — NLP to Sign Language Video Translator
PCD is a full-stack application that enables users to input text, audio, or video, and receive a corresponding sign language translation in video format. It leverages speech-to-text, natural language processing (NLP), and sign video matching to provide accessible communication tools, especially for the deaf and hard-of-hearing community.

Here is a demo link : 
https://drive.google.com/drive/folders/1OPiwIZN7ZwoP-Q2UCeSOsgEzuW3nfXAi?usp=drive_link


🧠 Core Features
🔐 Authentication: Secure user registration and login

🧾 About Page: Overview of the project and its purpose

🕓 History Page: View your transcription and translation history

🗣️ Multimodal Input:

Upload an audio or video file

Record live speech in the browser

Directly input a sentence in text form

🧠 NLP Processing:

Converts speech to text using a speech recognition model

Cleans and analyzes text with a custom NLP pipeline

🤟 Sign Language Video Output:

Matches phrases to corresponding sign language videos

Displays result via an embedded video player

🧩 PostgreSQL Database: Stores user data, uploads, and history

🧭 How It Works
text
Copy
Edit
User → [Text | Audio | Video] Input
    → [Speech-to-Text if needed]
    → NLP Pipeline processes the text
    → Phrase matching + video retrieval
    → Video of corresponding sign language is displayed
📁 Project Structure
bash
Copy
Edit
/
├── app/             # FastAPI backend: routes, models, processing
├── front_js/        # Frontend: HTML/JS interface
├── static/videos/   # Pre-rendered sign language video clips
├── uploads/         # Temporarily stores uploaded media
├── docs/            # Project documentation
├── scripts/         # Helper scripts (optional)
├── pyproject.toml   # Project setup (PDM)
├── requirements.txt # Python dependencies
└── README.md        # You are here!
⚙️ Tech Stack
Layer	Tech
🧠 NLP	Custom matching, Whisper (for STT)
🧾 Backend	FastAPI
🎛 Frontend	JavaScript / HTML
🗄 Database	PostgreSQL
🎥 Sign Output	Pre-rendered avatar videos (Unity/Mixamo or similar)

🚀 Getting Started
🔧 Requirements
Python 3.9+

PostgreSQL (running locally or in Docker)

PDM or pip for dependency management

🐍 Backend Setup
bash
Copy
Edit
git clone https://github.com/benyounes-sadokaziz/PCD.git
cd PCD

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt

# Set up .env for DB connection (example below)
⚙️ .env Example
ini
Copy
Edit
DATABASE_URL=postgresql://user:password@localhost:5432/pcd
SECRET_KEY=your_secret_key
Then run:

bash
Copy
Edit
uvicorn app.main:app --reload
Visit:

Swagger UI: http://127.0.0.1:8000/docs

Main frontend: Open index.html in the browser (in front_js/)

🧾 Pages Overview
/ → Home page (Input UI: text/audio/video)

/about → About the project and its purpose

/history → View your previous transcriptions & translations

/docs → Interactive API documentation (Swagger UI)

📌 Future Improvements
Real-time avatar signing with Unity or WebGL

Support for multiple sign languages (LSF, ASL, etc.)

Enhanced semantic matching using transformer models

User feedback collection & rating for translations

📄 License
This project is open-source under the MIT License. See LICENSE for full details.

🤝 Contributing
We welcome contributions! Feel free to:

Fork the repository

Create a branch (feature/your-feature)

Submit a pull request



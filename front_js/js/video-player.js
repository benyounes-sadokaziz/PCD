class VideoPlayer {
    constructor(containerId) {
        console.log('Initializing VideoPlayer');
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with ID "${containerId}" not found`);
            return;
        }
  
        this.videoIds = [];
        this.currentIndex = 0;
        this.videoBasePath = "/static/videos/";
        
        console.log('Creating player elements');
        this.createPlayerElements();
        this.addEventListeners();
    }
  
    createPlayerElements() {
        // Video element
        this.videoElement = document.createElement('video');
        this.videoElement.id = 'video-player';
        this.videoElement.controls = true; // This enables default controls (play/pause)
        this.videoElement.width = 640;
        this.videoElement.height = 360;
        
        // Status display
        this.statusDisplay = document.createElement('div');
        this.statusDisplay.id = 'video-status';
        this.statusDisplay.textContent = 'Initializing player...';
        
        this.container.appendChild(this.statusDisplay);
        this.container.appendChild(this.videoElement);
        
        console.log('Player elements created');
    }
  
    addEventListeners() {
        // Listen for when the current video ends to play the next one
        this.videoElement.addEventListener('ended', () => {
            console.log('Video ended, playing next');
            this.playNext();
        });
    }
  
    async fetchVideoIds() {
        console.log('Starting fetch for video IDs');
        this.updateStatus('Fetching videos...');
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found in localStorage');
                this.updateStatus('Please log in to view videos');
                return [];
            }
  
            console.log('Making request to /api/get_video_ids');
            const response = await fetch(`/api/get_video_ids`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });
  
            console.log(`Received response status: ${response.status}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API error: ${errorText}`);
                this.updateStatus('Error loading videos');
                return [];
            }
  
            const data = await response.json();
            console.log('API response data:', data);
            
            const videoIds = Array.isArray(data) ? data : (data.video_ids || []);
            
            if (videoIds.length === 0) {
                console.log('No videos found in response');
                this.updateStatus('No videos available');
                return [];
            }
  
            console.log(`Received ${videoIds.length} video IDs`);
            this.setVideos(videoIds);
            return videoIds;
  
        } catch (error) {
            console.error('Fetch error:', error);
            this.updateStatus('Connection error');
            return [];
        }
    }
  
    setVideos(videoIds) {
        console.log(`Setting videos: ${videoIds.join(', ')}`);
        this.videoIds = videoIds;
        this.currentIndex = 0;
        
        if (this.videoIds.length > 0) {
            this.loadVideo(0);
        } else {
            this.updateStatus('No videos available');
        }
    }
  
    loadVideo(index) {
        console.log(`Loading video at index ${index}`);
        if (index < 0 || index >= this.videoIds.length) {
            console.error('Invalid video index');
            return;
        }
  
        const videoId = this.videoIds[index];
        const videoPath = videoId.startsWith('http') || videoId.startsWith('/') 
            ? videoId 
            : `${this.videoBasePath}${videoId}.mp4`;
  
        console.log(`Setting video source: ${videoPath}`);
        this.updateStatus(`Loading video ${index + 1}/${this.videoIds.length}...`);
        
        this.videoElement.src = videoPath;
        this.currentIndex = index;
        
        this.videoElement.onloadeddata = () => {
            console.log('Video loaded successfully');
            this.updateStatus('');
            this.videoElement.play().catch(err => {
                console.log('Autoplay prevented:', err);
                this.updateStatus('Click play to start video');
            });
        };
        
        this.videoElement.onerror = () => {
            console.error('Video loading failed');
            this.updateStatus('Failed to load video');
            // Try playing next video if current one fails
            this.playNext();
        };
    }
  
    updateStatus(message) {
        console.log(`Updating status: ${message}`);
        this.statusDisplay.textContent = message;
    }
  
    playNext() {
        if (this.currentIndex < this.videoIds.length - 1) {
            this.loadVideo(this.currentIndex + 1);
        } else {
            console.log('Reached end of playlist');
            this.updateStatus('Playback complete');
        }
    }
  }
  
  window.VideoPlayer = VideoPlayer;
from ibm_watson import SpeechToTextV1
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator

# Initialize Watson Speech to Text
authenticator = IAMAuthenticator('jShe-jO7ss8tqSOoz2AiLw2I6LZRFJ4cfG3hjfyrYwym')  # Replace with your API key
speech_to_text = SpeechToTextV1(authenticator=authenticator)
speech_to_text.set_service_url('https://api.au-syd.speech-to-text.watson.cloud.ibm.com/instances/65ba7de0-49e5-45c8-8889-1aaad8a468ad')  # Replace with your service URL

def transcribe_audio_with_watson(audio_path: str) -> str:
    try:
        with open(audio_path, 'rb') as audio_file:
            response = speech_to_text.recognize(
                audio=audio_file,
                content_type='audio/mp3',  # Use 'audio/wav' for WAV files
                model='en-US_BroadbandModel',  # Adjust language model as needed
            ).get_result()

        # Extract the transcription text
        if 'results' in response and len(response['results']) > 0:
            transcript = response['results'][0]['alternatives'][0]['transcript']
            return transcript
        else:
            return "No transcription results returned."
    
    except Exception as e:
        return f"Transcription failed: {str(e)}"


text = transcribe_audio_with_watson("app/core/file.mp3")
print(text)
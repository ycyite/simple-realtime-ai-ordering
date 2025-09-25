#!/usr/bin/env python3
"""
Simple Audio-to-Text Module that works around compatibility issues
"""

import os
import datetime
import requests
from pathlib import Path
from typing import Dict, Optional
from dotenv import load_dotenv

load_dotenv()

class SimpleAudioToText:
    """
    Simple audio-to-text module using OpenAI API directly via HTTP requests
    """

    def __init__(self, api_key: Optional[str] = None):
        """Initialize with API key"""
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.base_url = "https://api.openai.com/v1"
        self.max_file_size = 25 * 1024 * 1024  # 25MB

        if not self.api_key:
            raise ValueError("OpenAI API key is required")

        print(f"Initialized with API key: {self.api_key[:20]}...")

    def transcribe_audio(self, audio_file_path: str, language: Optional[str] = None) -> Dict:
        """
        Transcribe audio file to text using direct HTTP request
        """
        try:
            # Validate file
            file_path = Path(audio_file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"Audio file not found: {audio_file_path}")

            # Check file size
            file_size = file_path.stat().st_size
            if file_size > self.max_file_size:
                raise ValueError(f"File too large: {file_size} bytes")

            print(f"Transcribing: {audio_file_path}")

            # Prepare the request
            headers = {
                'Authorization': f'Bearer {self.api_key}'
            }

            data = {
                'model': 'whisper-1',
                'response_format': 'json'
            }

            if language:
                data['language'] = language

            # Open file and send request
            with open(audio_file_path, 'rb') as audio_file:
                files = {
                    'file': (file_path.name, audio_file, 'audio/mpeg')
                }

                response = requests.post(
                    f"{self.base_url}/audio/transcriptions",
                    headers=headers,
                    data=data,
                    files=files,
                    timeout=60
                )

            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'text': result.get('text', ''),
                    'language': language or 'auto-detected',
                    'file_path': str(audio_file_path),
                    'timestamp': datetime.datetime.now().isoformat()
                }
            else:
                error_msg = f"API Error {response.status_code}: {response.text}"
                return {
                    'success': False,
                    'error': error_msg,
                    'file_path': str(audio_file_path),
                    'timestamp': datetime.datetime.now().isoformat()
                }

        except Exception as error:
            return {
                'success': False,
                'error': str(error),
                'file_path': str(audio_file_path),
                'timestamp': datetime.datetime.now().isoformat()
            }

    def translate_audio(self, audio_file_path: str) -> Dict:
        """
        Transcribe and translate audio to English
        """
        try:
            file_path = Path(audio_file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"Audio file not found: {audio_file_path}")

            print(f"Transcribing and translating: {audio_file_path}")

            headers = {
                'Authorization': f'Bearer {self.api_key}'
            }

            data = {
                'model': 'whisper-1',
                'response_format': 'json'
            }

            with open(audio_file_path, 'rb') as audio_file:
                files = {
                    'file': (file_path.name, audio_file, 'audio/mpeg')
                }

                response = requests.post(
                    f"{self.base_url}/audio/translations",
                    headers=headers,
                    data=data,
                    files=files,
                    timeout=60
                )

            if response.status_code == 200:
                result = response.json()
                return {
                    'success': True,
                    'text': result.get('text', ''),
                    'translated_to_english': True,
                    'file_path': str(audio_file_path),
                    'timestamp': datetime.datetime.now().isoformat()
                }
            else:
                error_msg = f"API Error {response.status_code}: {response.text}"
                return {
                    'success': False,
                    'error': error_msg,
                    'file_path': str(audio_file_path),
                    'timestamp': datetime.datetime.now().isoformat()
                }

        except Exception as error:
            return {
                'success': False,
                'error': str(error),
                'file_path': str(audio_file_path),
                'timestamp': datetime.datetime.now().isoformat()
            }

    @staticmethod
    def get_supported_formats():
        """Get supported audio formats"""
        return ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm']

    def is_valid_audio_format(self, file_path: str) -> bool:
        """Check if file format is supported"""
        extension = Path(file_path).suffix.lower().lstrip('.')
        return extension in self.get_supported_formats()


# Example usage
if __name__ == "__main__":
    print("Simple Audio-to-Text Module Test")
    print("=" * 32)

    try:
        # Initialize
        audio_to_text = SimpleAudioToText()

        # Show supported formats
        print(f"Supported formats: {', '.join(audio_to_text.get_supported_formats())}")

        # Test format validation
        print(f"audio.mp3 is valid: {audio_to_text.is_valid_audio_format('audio.mp3')}")
        print(f"audio.txt is valid: {audio_to_text.is_valid_audio_format('audio.txt')}")

        print("\nTo test transcription:")
        print("1. Add an audio file (mp3, wav, etc.) to this directory")
        print("2. Run:")
        print("   result = audio_to_text.transcribe_audio('your_audio.mp3')")
        print("   print(result['text'])")

    except Exception as e:
        print(f"Error: {e}")
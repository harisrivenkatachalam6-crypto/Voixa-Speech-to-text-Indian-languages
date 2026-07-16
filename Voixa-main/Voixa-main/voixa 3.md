# Swar - Indic Speech-to-Text & Translation App

A premium, modern web application built with Vanilla JS, HTML, and CSS that allows real-time dictation and automatic translation exclusively between Indian Languages. 

## Features
- **Speech-to-Text:** Leverage native browser `SpeechRecognition` to dictate text directly into native Indian scripts (Devanagari, Tamil, Telugu, etc.)
- **Instant Translation:** Seamlessly translates recorded/typed text to a target Indian language using the Google Translate API.
- **Text-to-Speech:** Plays back the translated text audibly using browser synthetic voices.
- **Word Error Rate (WER) Analysis:** Built-in standard Levenshtein minimum edit distance calculator to measure the accuracy of the transcription against a ground-truth reference.
- **Modern UI:** Features glassmorphism panels, CSS variables, and fluid animations for a stunning visual experience.

## Languages Supported
- Hindi (hi-IN)
- Tamil (ta-IN)
- Telugu (te-IN)
- Malayalam (ml-IN)
- Kannada (kn-IN)
- Bengali (bn-IN)
- Marathi (mr-IN)
- Gujarati (gu-IN)
- Punjabi (pa-IN)

## How to use
As this project is entirely built with Vanilla web technologies with no dependencies, no installation or build commands are required.

1. Clone or download this repository.
2. Double-click on `index.html` to open it in your browser (Chrome or Edge recommended for maximum Speech Recognition support).
3. If your browser blocks microphone permissions on local `file://` URLs, simply serve the directory via any local server (e.g. `python -m http.server 8000`) and navigate to `http://localhost:8000`.

## Tech Stack
- HTML5
- Vanilla JavaScript
- Plain CSS (Custom props, flex/grid layouts, animations)
- Phosphor Icons (via CDN)
- Google Fonts (Outfit)

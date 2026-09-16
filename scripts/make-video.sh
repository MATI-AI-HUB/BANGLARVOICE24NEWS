#!/data/data/com.termux/files/usr/bin/bash
SCRIPT_FILE="${1:-~/script.txt}"
IMAGE_FILE="${2:-~/bg.jpg}"
OUTPUT_FILE="${3:-~/news-video.mp4}"
TEMP_VOICE="/data/data/com.termux/files/home/_temp_voice.mp3"
echo "🎙️ Generating Bengali voice..."
edge-tts --voice bn-BD-PradeepNeural --rate=+5% --text "$(cat $SCRIPT_FILE)" --write-media "$TEMP_VOICE"
echo "🎬 Composing video..."
ffmpeg -loop 1 -i "$IMAGE_FILE" -i "$TEMP_VOICE" -c:v mpeg4 -q:v 3 -threads 1 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "$OUTPUT_FILE" -y 2>&1 | tail -3
echo ""
echo "✅ Video: $OUTPUT_FILE"
ls -la "$OUTPUT_FILE"

const axios = require('axios');

/**
 * STT 备选服务
 * 由于 Elevenlab 主要提供 TTS，这里提供其他 STT 服务的备选方案
 */

class STTFallbackService {
  /**
   * 使用 OpenAI Whisper API（需要 OpenAI API Key）
   */
  async transcribeWithWhisper(audioBuffer) {
    try {
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm'
      });
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // 或 'zh' 中文

      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            ...formData.getHeaders()
          }
        }
      );

      return response.data.text;
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw error;
    }
  }

  /**
   * 使用 Deepgram API（需要 Deepgram API Key）
   */
  async transcribeWithDeepgram(audioBuffer) {
    try {
      const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
      if (!DEEPGRAM_API_KEY) {
        throw new Error('DEEPGRAM_API_KEY not configured');
      }

      const response = await axios.post(
        'https://api.deepgram.com/v1/listen',
        audioBuffer,
        {
          headers: {
            'Authorization': `Token ${DEEPGRAM_API_KEY}`,
            'Content-Type': 'audio/webm'
          },
          params: {
            model: 'nova-2',
            language: 'en-US', // 或 'zh-CN'
            punctuate: true,
            diarize: false
          }
        }
      );

      return response.data.results.channels[0].alternatives[0].transcript;
    } catch (error) {
      console.error('Deepgram transcription error:', error);
      throw error;
    }
  }

  /**
   * 使用 Google Speech-to-Text API（需要 Google Cloud 凭证）
   */
  async transcribeWithGoogle(audioBuffer) {
    try {
      const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
      if (!GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY not configured');
      }

      // 将音频转换为 base64
      const base64Audio = audioBuffer.toString('base64');

      const response = await axios.post(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`,
        {
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US', // 或 'zh-CN'
            enableAutomaticPunctuation: true
          },
          audio: {
            content: base64Audio
          }
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].alternatives[0].transcript;
      }
      
      throw new Error('No transcription results');
    } catch (error) {
      console.error('Google STT error:', error);
      throw error;
    }
  }
}

module.exports = new STTFallbackService();

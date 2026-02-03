const axios = require('axios');
const FormData = require('form-data');
const sttFallback = require('./sttFallbackService');

const ELEVENLAB_API_KEY = process.env.ELEVENLAB_API_KEY;
const ELEVENLAB_AGENT_ID = process.env.ELEVENLAB_AGENT_ID;
const ELEVENLAB_BASE_URL = 'https://api.elevenlabs.io/v1';

/**
 * 使用Elevenlab API将音频转换为文本
 * 注意：Elevenlab Agents API主要用于对话式AI，这里我们使用标准的STT功能
 * 如果Elevenlab不支持直接STT，会尝试使用备选服务（如Whisper、Deepgram等）
 */
class VoiceService {
  /**
   * 转录音频为文本
   * @param {Buffer} audioBuffer - 音频文件缓冲区
   * @returns {Promise<string>} 转录的文本
   */
  async transcribeAudio(audioBuffer) {
    try {
      // 优先尝试使用 Elevenlab Agent API（如果配置了）
      if (ELEVENLAB_AGENT_ID) {
        try {
          return await this.transcribeWithAgent(audioBuffer);
        } catch (error) {
          console.warn('Elevenlab Agent transcription failed, trying fallback:', error.message);
        }
      }
      
      // 备选方案1：尝试使用 OpenAI Whisper
      if (process.env.OPENAI_API_KEY) {
        try {
          return await sttFallback.transcribeWithWhisper(audioBuffer);
        } catch (error) {
          console.warn('Whisper transcription failed, trying next fallback:', error.message);
        }
      }
      
      // 备选方案2：尝试使用 Deepgram
      if (process.env.DEEPGRAM_API_KEY) {
        try {
          return await sttFallback.transcribeWithDeepgram(audioBuffer);
        } catch (error) {
          console.warn('Deepgram transcription failed, trying next fallback:', error.message);
        }
      }
      
      // 备选方案3：尝试使用 Google Speech-to-Text
      if (process.env.GOOGLE_API_KEY) {
        try {
          return await sttFallback.transcribeWithGoogle(audioBuffer);
        } catch (error) {
          console.warn('Google STT failed:', error.message);
        }
      }
      
      // 如果所有服务都不可用，返回提示信息（不抛出错误，让前端处理）
      console.warn('No STT service available. Please configure at least one STT service.');
      throw new Error('No STT service available. Please configure at least one: ELEVENLAB_AGENT_ID, OPENAI_API_KEY, DEEPGRAM_API_KEY, or GOOGLE_API_KEY. You can also use browser Web Speech API by enabling it in the frontend.');
      
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * 使用Elevenlab Agent API进行转录（如果可用）
   */
  async transcribeWithAgent(audioBuffer) {
    try {
      // Elevenlab Agent API通常用于对话式交互
      // 这里需要根据实际API文档调整
      const formData = new FormData();
      formData.append('audio', audioBuffer, {
        filename: 'audio.webm',
        contentType: 'audio/webm'
      });

      const response = await axios.post(
        `${ELEVENLAB_BASE_URL}/agents/${ELEVENLAB_AGENT_ID}/transcribe`,
        formData,
        {
          headers: {
            'xi-api-key': ELEVENLAB_API_KEY,
            ...formData.getHeaders()
          }
        }
      );

      return response.data.text || response.data.transcript;
    } catch (error) {
      // 如果Agent API不可用，尝试使用Web Speech API或其他STT服务
      console.warn('Elevenlab Agent transcription failed, using fallback');
      throw error;
    }
  }

  /**
   * 文本转语音（用于确认和反馈）
   * @param {string} text - 要转换的文本
   * @returns {Promise<Buffer>} 音频缓冲区
   */
  async textToSpeech(text) {
    try {
      // 使用Elevenlab TTS API
      const response = await axios.post(
        `${ELEVENLAB_BASE_URL}/text-to-speech/21m00Tcm4TlvDq8ikWAM`, // 默认voice ID
        {
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        },
        {
          headers: {
            'xi-api-key': ELEVENLAB_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('TTS error:', error);
      throw new Error(`Failed to generate speech: ${error.message}`);
    }
  }

  /**
   * 使用Web Speech API作为备选方案（浏览器端）
   * 这个方法应该在客户端调用，而不是服务端
   */
  static async transcribeWithWebSpeechAPI(audioBlob) {
    // 这是一个客户端方法，应该在浏览器中使用
    // 服务端无法直接使用Web Speech API
    throw new Error('Web Speech API is only available in browser environment');
  }
}

module.exports = new VoiceService();

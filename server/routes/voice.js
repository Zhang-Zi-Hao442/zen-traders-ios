const express = require('express');
const router = express.Router();
const multer = require('multer');
const voiceService = require('../services/voiceService');
const nluService = require('../services/nluService');
const orderValidator = require('../services/orderValidator');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/voice/transcribe
 * 接收音频文件并转换为文本
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioBuffer = req.file.buffer;
    const transcript = await voiceService.transcribeAudio(audioBuffer);
    
    res.json({
      success: true,
      transcript,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      message: error.message 
    });
  }
});

/**
 * POST /api/voice/process
 * 处理语音命令：转录 + 意图解析 + 验证
 */
router.post('/process', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Step 1: Transcribe audio
    const audioBuffer = req.file.buffer;
    const transcript = await voiceService.transcribeAudio(audioBuffer);
    
    // Step 2: Parse intent using NLU
    const intent = await nluService.parseIntent(transcript);
    
    // Step 3: Validate order
    const validation = await orderValidator.validateOrder(intent);
    
    res.json({
      success: true,
      transcript,
      intent,
      validation,
      requiresConfirmation: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Voice processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process voice command',
      message: error.message 
    });
  }
});

/**
 * POST /api/voice/parse
 * 解析文本意图（用于浏览器 Web Speech API 转录后的处理）
 */
router.post('/parse', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('Parsing text intent:', text);

    // Step 1: Parse intent using NLU
    const intent = await nluService.parseIntent(text);
    
    // Step 2: Validate order
    const validation = await orderValidator.validateOrder(intent);
    
    res.json({
      success: true,
      transcript: text,
      intent,
      validation,
      requiresConfirmation: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Text parsing error:', error);
    res.status(500).json({ 
      error: 'Failed to parse text',
      message: error.message 
    });
  }
});

/**
 * POST /api/voice/text-to-speech
 * 文本转语音（用于确认和反馈）
 */
router.post('/text-to-speech', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioBuffer = await voiceService.textToSpeech(text);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ 
      error: 'Failed to generate speech',
      message: error.message 
    });
  }
});

module.exports = router;

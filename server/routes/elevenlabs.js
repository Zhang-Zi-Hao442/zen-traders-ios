const express = require('express');
const router = express.Router();
const axios = require('axios');

const ELEVENLABS_API_KEY = process.env.ELEVENLAB_API_KEY;
const ELEVENLABS_AGENT_ID = process.env.ELEVENLAB_AGENT_ID;

/**
 * GET /api/elevenlabs/signed-url
 * 获取 Elevenlab Conversational AI 的签名 URL
 */
router.get('/signed-url', async (req, res) => {
  try {
    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'Elevenlab API Key not configured' });
    }

    if (!ELEVENLABS_AGENT_ID || ELEVENLABS_AGENT_ID === 'your_agent_id_here') {
      return res.status(500).json({ 
        error: 'Elevenlab Agent ID not configured',
        message: 'Please create an Agent at https://elevenlabs.io/app/conversational-ai and add the Agent ID to .env'
      });
    }

    const response = await axios.get(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }
    );

    res.json({ signed_url: response.data.signed_url });
  } catch (error) {
    console.error('Elevenlab signed URL error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get signed URL',
      message: error.response?.data?.detail || error.message
    });
  }
});

/**
 * GET /api/elevenlabs/status
 * 检查 Elevenlab 配置状态
 */
router.get('/status', (req, res) => {
  res.json({
    apiKeyConfigured: !!ELEVENLABS_API_KEY,
    agentIdConfigured: !!ELEVENLABS_AGENT_ID && ELEVENLABS_AGENT_ID !== 'your_agent_id_here',
    agentId: ELEVENLABS_AGENT_ID === 'your_agent_id_here' ? null : ELEVENLABS_AGENT_ID
  });
});

module.exports = router;

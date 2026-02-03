const WebSocket = require('ws');
const voiceService = require('../services/voiceService');
const nluService = require('../services/nluService');
const orderValidator = require('../services/orderValidator');
const alpacaService = require('../services/alpacaService');

/**
 * WebSocket服务器设置
 * 用于实时语音流处理和双向通信
 */
function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    let audioChunks = [];
    let isRecording = false;

    // 发送状态更新
    const sendStatus = (state, data = {}) => {
      ws.send(JSON.stringify({
        type: 'status',
        state,
        ...data,
        timestamp: new Date().toISOString()
      }));
    };

    // 发送错误
    const sendError = (error) => {
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message || error,
        timestamp: new Date().toISOString()
      }));
    };

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'start_recording':
            isRecording = true;
            audioChunks = [];
            sendStatus('listening', { message: 'Recording started' });
            break;

          case 'audio_chunk':
            if (isRecording) {
              // 接收音频数据块（base64编码）
              audioChunks.push(data.chunk);
            }
            break;

          case 'stop_recording':
            if (!isRecording) {
              sendError('Not currently recording');
              return;
            }

            isRecording = false;
            sendStatus('processing', { message: 'Processing audio...' });

            try {
              // 合并音频块并转码
              const audioBuffer = Buffer.from(audioChunks.join(''), 'base64');
              
              // Step 1: 转录音频
              sendStatus('transcribing', { message: 'Transcribing audio...' });
              const transcript = await voiceService.transcribeAudio(audioBuffer);
              
              ws.send(JSON.stringify({
                type: 'transcript',
                transcript,
                timestamp: new Date().toISOString()
              }));

              // Step 2: 解析意图
              sendStatus('parsing', { message: 'Parsing intent...' });
              const intent = await nluService.parseIntent(transcript);
              
              ws.send(JSON.stringify({
                type: 'intent',
                intent,
                timestamp: new Date().toISOString()
              }));

              // Step 3: 验证订单
              sendStatus('validating', { message: 'Validating order...' });
              const validation = await orderValidator.validateOrder(intent);
              
              ws.send(JSON.stringify({
                type: 'validation',
                validation,
                intent,
                requiresConfirmation: true,
                timestamp: new Date().toISOString()
              }));

              // 如果验证通过，等待确认
              if (validation.isValid) {
                sendStatus('awaiting_confirmation', {
                  message: 'Order validated. Awaiting confirmation.',
                  intent,
                  validation
                });
              } else {
                sendStatus('validation_failed', {
                  message: 'Order validation failed',
                  errors: validation.errors
                });
              }

            } catch (error) {
              console.error('Processing error:', error);
              sendError(error);
              sendStatus('error', { message: error.message });
            }
            break;

          case 'confirm_order':
            try {
              const { intent } = data;
              
              if (!intent) {
                sendError('Intent is required for order confirmation');
                return;
              }

              sendStatus('executing', { message: 'Executing order...' });

              // 最终验证
              const finalValidation = await orderValidator.validateOrder(intent);
              
              if (!finalValidation.isValid) {
                sendStatus('execution_failed', {
                  message: 'Order validation failed',
                  errors: finalValidation.errors
                });
                return;
              }

              // 执行订单
              const orderResult = await alpacaService.createOrder(intent);
              
              ws.send(JSON.stringify({
                type: 'order_executed',
                order: orderResult,
                intent,
                message: `Order executed: ${intent.side} ${intent.quantity} ${intent.symbol}`,
                timestamp: new Date().toISOString()
              }));

              sendStatus('idle', { message: 'Order executed successfully' });

            } catch (error) {
              console.error('Order execution error:', error);
              sendError(error);
              sendStatus('execution_failed', { message: error.message });
            }
            break;

          case 'cancel_order':
            sendStatus('idle', { message: 'Order cancelled' });
            break;

          case 'process_text':
            // 处理前端已经转录好的文本（使用浏览器 Web Speech API）
            try {
              const { text } = data;
              
              if (!text || !text.trim()) {
                sendError('No text provided');
                return;
              }

              console.log('Processing text from Web Speech API:', text);
              sendStatus('parsing', { message: 'Parsing intent...' });

              // Step 1: 解析意图
              console.log('Step 1: Parsing intent...');
              const intent = await nluService.parseIntent(text);
              console.log('Intent parsed successfully');
              
              console.log('Sending intent to client...');
              ws.send(JSON.stringify({
                type: 'intent',
                intent,
                transcript: text,
                timestamp: new Date().toISOString()
              }));
              console.log('Intent sent');

              // Step 2: 验证订单
              console.log('Step 2: Validating order...');
              sendStatus('validating', { message: 'Validating order...' });
              const validation = await orderValidator.validateOrder(intent);
              console.log('Validation result:', validation);
              
              console.log('Sending validation to client...');
              ws.send(JSON.stringify({
                type: 'validation',
                validation,
                intent,
                transcript: text,
                requiresConfirmation: true,
                timestamp: new Date().toISOString()
              }));
              console.log('Validation sent');

              // 如果验证通过，等待确认
              if (validation.isValid) {
                console.log('Order is valid, awaiting confirmation');
                sendStatus('awaiting_confirmation', {
                  message: 'Order validated. Awaiting confirmation.',
                  intent,
                  validation
                });
              } else {
                console.log('Validation failed:', validation.errors);
                sendStatus('validation_failed', {
                  message: 'Order validation failed',
                  errors: validation.errors
                });
              }

            } catch (error) {
              console.error('Text processing error:', error);
              sendError(error);
              sendStatus('error', { message: error.message });
            }
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            sendError(`Unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        sendError(error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      isRecording = false;
      audioChunks = [];
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // 发送初始状态
    sendStatus('idle', { message: 'Connected. Ready to receive voice commands.' });
  });

  console.log('WebSocket server initialized');
}

module.exports = { setupWebSocket };

const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';

/**
 * 自然语言理解服务（使用Deepseek进行意图解析）
 */
class NLUService {
  /**
   * 解析语音命令的意图
   * @param {string} transcript - 转录的文本
   * @returns {Promise<Object>} 解析后的意图对象
   */
  async parseIntent(transcript) {
    try {
      // 如果有 Deepseek API Key，优先使用
      if (DEEPSEEK_API_KEY && DEEPSEEK_API_KEY !== 'your_deepseek_api_key') {
        try {
          const prompt = this.buildPrompt(transcript);
          const response = await this.callDeepseek(prompt);
          const intent = this.parseResponse(response);
          return intent;
        } catch (error) {
          console.warn('Deepseek API failed, using rule-based parser:', error.message);
          // 如果 Deepseek 失败，降级到规则解析
          return this.parseWithRules(transcript);
        }
      } else {
        // 没有 Deepseek API Key，使用规则解析
        console.log('No Deepseek API Key configured, using rule-based parser');
        return this.parseWithRules(transcript);
      }
    } catch (error) {
      console.error('NLU parsing error:', error);
      // 最后的备选方案：使用规则解析
      return this.parseWithRules(transcript);
    }
  }

  /**
   * 基于规则的简单解析器（备选方案）
   * @param {string} transcript - 转录的文本
   * @returns {Object} 解析后的意图对象
   */
  parseWithRules(transcript) {
    const originalText = transcript.trim();
    const text = transcript.toLowerCase().trim();
    const intent = {
      action: 'unknown',
      symbol: null,
      quantity: null,
      orderType: 'market',
      limitPrice: null,
      stopPrice: null,
      timeInForce: 'day',
      side: null,
      type: 'market'
    };

    console.log('Parsing with rules:', originalText);

    // 检测动作：buy/sell/cancel/check
    if (text.match(/\b(buy|purchase|买入|购买)\b/)) {
      intent.action = 'buy';
      intent.side = 'buy';
    } else if (text.match(/\b(sell|卖出|出售)\b/)) {
      intent.action = 'sell';
      intent.side = 'sell';
    } else if (text.match(/\b(cancel|取消)\b/)) {
      intent.action = 'cancel';
    } else if (text.match(/\b(check|查看|检查|position|持仓)\b/)) {
      intent.action = 'check';
    }

    // 提取数量
    const quantityMatch = text.match(/\b(\d+)\s*(shares?|股|shares|share)?\b/i);
    if (quantityMatch) {
      intent.quantity = parseInt(quantityMatch[1]);
    }

    // 提取股票代码（常见股票）
    const stockSymbols = {
      'apple': 'AAPL', 'aapl': 'AAPL',
      'nvidia': 'NVDA', 'nvda': 'NVDA', '英伟达': 'NVDA',
      'microsoft': 'MSFT', 'msft': 'MSFT', '微软': 'MSFT',
      'tesla': 'TSLA', 'tsla': 'TSLA', '特斯拉': 'TSLA',
      'amazon': 'AMZN', 'amzn': 'AMZN', '亚马逊': 'AMZN',
      'google': 'GOOGL', 'googl': 'GOOGL', '谷歌': 'GOOGL',
      'meta': 'META', 'meta': 'META', 'facebook': 'META', '脸书': 'META',
      'netflix': 'NFLX', 'nflx': 'NFLX', '奈飞': 'NFLX',
      'amd': 'AMD', 'amd': 'AMD',
      'intel': 'INTC', 'intc': 'INTC', '英特尔': 'INTC'
    };

    for (const [key, symbol] of Object.entries(stockSymbols)) {
      if (text.includes(key)) {
        intent.symbol = symbol;
        break;
      }
    }

    // 如果没有找到，尝试从原始文本提取大写字母代码（如 NVDA, AAPL）
    if (!intent.symbol) {
      const symbolMatch = originalText.match(/\b([A-Z]{2,5})\b/);
      if (symbolMatch) {
        intent.symbol = symbolMatch[1];
      }
    }

    console.log('Parsed intent:', intent);

    // 检测订单类型
    if (text.match(/\b(market|市价|at market)\b/)) {
      intent.orderType = 'market';
      intent.type = 'market';
    } else if (text.match(/\b(limit|限价|if it hits|when it reaches|at)\b/)) {
      intent.orderType = 'limit';
      intent.type = 'limit';
      
      // 提取限价
      const priceMatch = text.match(/\$?(\d+\.?\d*)/);
      if (priceMatch) {
        intent.limitPrice = parseFloat(priceMatch[1]);
      }
    } else if (text.match(/\b(stop|止损)\b/)) {
      intent.orderType = 'stop';
      intent.type = 'stop';
    }

    // 标准化
    return this.normalizeIntent(intent);
  }

  /**
   * 构建提示词
   */
  buildPrompt(transcript) {
    return `你是一个专业的交易订单解析系统。请将用户的语音命令解析为结构化的订单信息。

用户命令: "${transcript}"

请返回一个JSON对象，包含以下字段：
- action: "buy" | "sell" | "cancel" | "check" | "unknown"
- symbol: 股票代码（如 "AAPL", "NVDA"）
- quantity: 数量（数字）
- orderType: "market" | "limit" | "stop"
- limitPrice: 限价（如果是限价单，数字）
- stopPrice: 止损价（如果是止损单，数字）
- timeInForce: "day" | "gtc" | "opg" | "cls" | "ioc" | "fok"（默认"day"）

示例：
用户说："Buy 100 shares of NVDA at market"
返回: {"action": "buy", "symbol": "NVDA", "quantity": 100, "orderType": "market", "timeInForce": "day"}

用户说："Sell 50 AAPL if it hits 230"
返回: {"action": "sell", "symbol": "AAPL", "quantity": 50, "orderType": "limit", "limitPrice": 230, "timeInForce": "day"}

用户说："Cancel all open orders for Microsoft"
返回: {"action": "cancel", "symbol": "MSFT"}

用户说："Check my position in Tesla"
返回: {"action": "check", "symbol": "TSLA"}

如果无法确定，将action设为"unknown"。

只返回JSON，不要其他文字：`;
  }

  /**
   * 调用Deepseek API
   */
  async callDeepseek(prompt) {
    try {
      const response = await axios.post(
        `${DEEPSEEK_API_URL}/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a trading order parser. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content.trim();
      
      // 尝试提取JSON（可能包含markdown代码块）
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       [null, content];
      
      return jsonMatch[1] || content;
    } catch (error) {
      console.error('Deepseek API error:', error.response?.data || error.message);
      throw new Error(`Deepseek API call failed: ${error.message}`);
    }
  }

  /**
   * 解析Deepseek响应
   */
  parseResponse(responseText) {
    try {
      // 清理响应文本
      let cleaned = responseText.trim();
      
      // 移除可能的markdown代码块标记
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const intent = JSON.parse(cleaned);
      
      // 验证和标准化
      return this.normalizeIntent(intent);
    } catch (error) {
      console.error('Failed to parse NLU response:', error);
      console.error('Response text:', responseText);
      
      // 返回默认的unknown意图
      return {
        action: 'unknown',
        symbol: null,
        quantity: null,
        orderType: 'market',
        timeInForce: 'day'
      };
    }
  }

  /**
   * 标准化意图对象
   */
  normalizeIntent(intent) {
    const normalized = {
      action: intent.action || 'unknown',
      symbol: intent.symbol ? intent.symbol.toUpperCase() : null,
      quantity: intent.quantity ? parseInt(intent.quantity) : null,
      orderType: intent.orderType || 'market',
      limitPrice: intent.limitPrice ? parseFloat(intent.limitPrice) : null,
      stopPrice: intent.stopPrice ? parseFloat(intent.stopPrice) : null,
      timeInForce: intent.timeInForce || 'day'
    };

    // 映射action到side（用于订单）
    if (normalized.action === 'buy') {
      normalized.side = 'buy';
    } else if (normalized.action === 'sell') {
      normalized.side = 'sell';
    }

    // 映射orderType到type
    normalized.type = normalized.orderType;

    return normalized;
  }

  /**
   * 计算买入/卖出价格水平（如果需要）
   * @param {Object} intent - 意图对象
   * @param {Object} marketData - 市场数据
   * @returns {Promise<Object>} 计算后的价格建议
   */
  async calculatePriceLevels(intent, marketData) {
    // 如果用户没有指定价格，可以使用Deepseek分析市场数据并建议价格
    // 这里提供一个基础实现
    if (intent.orderType === 'limit' && !intent.limitPrice) {
      // 可以调用Deepseek分析当前价格并建议限价
      const prompt = `Based on the following market data, suggest a reasonable limit price for ${intent.side}ing ${intent.quantity} shares of ${intent.symbol}:
      
Current Price: ${marketData.currentPrice}
Bid: ${marketData.bid}
Ask: ${marketData.ask}
Volume: ${marketData.volume}

Return only a JSON object with suggestedLimitPrice as a number.`;

      try {
        const response = await this.callDeepseek(prompt);
        const suggestion = JSON.parse(response);
        intent.limitPrice = suggestion.suggestedLimitPrice;
      } catch (error) {
        console.warn('Price calculation failed, using market price');
      }
    }

    return intent;
  }
}

module.exports = new NLUService();

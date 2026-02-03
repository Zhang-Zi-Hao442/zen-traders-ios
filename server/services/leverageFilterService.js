/**
 * 杠杆标的筛选服务
 * 用于识别和筛选带杠杆的 ETF 持仓
 */

// 常见杠杆 ETF 列表（3x 和 2x）
const LEVERAGED_ETFS = {
  // 3x 杠杆 ETF
  'TQQQ': { name: 'ProShares UltraPro QQQ', leverage: '3x', type: 'Bull', underlying: 'NASDAQ-100' },
  'SQQQ': { name: 'ProShares UltraPro Short QQQ', leverage: '-3x', type: 'Bear', underlying: 'NASDAQ-100' },
  'UPRO': { name: 'ProShares UltraPro S&P500', leverage: '3x', type: 'Bull', underlying: 'S&P 500' },
  'SPXU': { name: 'ProShares UltraPro Short S&P500', leverage: '-3x', type: 'Bear', underlying: 'S&P 500' },
  'SOXL': { name: 'Direxion Semiconductor Bull 3X', leverage: '3x', type: 'Bull', underlying: 'Semiconductor' },
  'SOXS': { name: 'Direxion Semiconductor Bear 3X', leverage: '-3x', type: 'Bear', underlying: 'Semiconductor' },
  'LABU': { name: 'Direxion Biotech Bull 3X', leverage: '3x', type: 'Bull', underlying: 'Biotech' },
  'LABD': { name: 'Direxion Biotech Bear 3X', leverage: '-3x', type: 'Bear', underlying: 'Biotech' },
  'FNGU': { name: 'MicroSectors FANG+ Bull 3X', leverage: '3x', type: 'Bull', underlying: 'FANG+' },
  'FNGD': { name: 'MicroSectors FANG+ Bear 3X', leverage: '-3x', type: 'Bear', underlying: 'FANG+' },
  'TNA': { name: 'Direxion Small Cap Bull 3X', leverage: '3x', type: 'Bull', underlying: 'Russell 2000' },
  'TZA': { name: 'Direxion Small Cap Bear 3X', leverage: '-3x', type: 'Bear', underlying: 'Russell 2000' },
  'TECL': { name: 'Direxion Technology Bull 3X', leverage: '3x', type: 'Bull', underlying: 'Technology' },
  'TECS': { name: 'Direxion Technology Bear 3X', leverage: '-3x', type: 'Bear', underlying: 'Technology' },
  'FAS': { name: 'Direxion Financial Bull 3X', leverage: '3x', type: 'Bull', underlying: 'Financial' },
  'FAZ': { name: 'Direxion Financial Bear 3X', leverage: '-3x', type: 'Bear', underlying: 'Financial' },
  'NUGT': { name: 'Direxion Gold Miners Bull 2X', leverage: '2x', type: 'Bull', underlying: 'Gold Miners' },
  'DUST': { name: 'Direxion Gold Miners Bear 2X', leverage: '-2x', type: 'Bear', underlying: 'Gold Miners' },
  'JNUG': { name: 'Direxion Junior Gold Miners Bull 2X', leverage: '2x', type: 'Bull', underlying: 'Jr Gold Miners' },
  'JDST': { name: 'Direxion Junior Gold Miners Bear 2X', leverage: '-2x', type: 'Bear', underlying: 'Jr Gold Miners' },
  'ERX': { name: 'Direxion Energy Bull 2X', leverage: '2x', type: 'Bull', underlying: 'Energy' },
  'ERY': { name: 'Direxion Energy Bear 2X', leverage: '-2x', type: 'Bear', underlying: 'Energy' },
  'CURE': { name: 'Direxion Healthcare Bull 3X', leverage: '3x', type: 'Bull', underlying: 'Healthcare' },
  'NAIL': { name: 'Direxion Homebuilders Bull 3X', leverage: '3x', type: 'Bull', underlying: 'Homebuilders' },
  'WEBL': { name: 'Direxion Internet Bull 3X', leverage: '3x', type: 'Bull', underlying: 'Internet' },
  'WEBS': { name: 'Direxion Internet Bear 3X', leverage: '-3x', type: 'Bear', underlying: 'Internet' },
  'DPST': { name: 'Direxion Regional Banks Bull 3X', leverage: '3x', type: 'Bull', underlying: 'Regional Banks' },
  'WEAT': { name: 'Teucrium Wheat Fund', leverage: '1x', type: 'Commodity', underlying: 'Wheat' },
  'BOIL': { name: 'ProShares Ultra Bloomberg Natural Gas', leverage: '2x', type: 'Bull', underlying: 'Natural Gas' },
  'KOLD': { name: 'ProShares UltraShort Bloomberg Natural Gas', leverage: '-2x', type: 'Bear', underlying: 'Natural Gas' },
  'UVXY': { name: 'ProShares Ultra VIX Short-Term', leverage: '1.5x', type: 'Volatility', underlying: 'VIX' },
  'SVXY': { name: 'ProShares Short VIX Short-Term', leverage: '-0.5x', type: 'Inverse Vol', underlying: 'VIX' },
  'SPXL': { name: 'Direxion S&P 500 Bull 3X', leverage: '3x', type: 'Bull', underlying: 'S&P 500' },
  'SPXS': { name: 'Direxion S&P 500 Bear 3X', leverage: '-3x', type: 'Bear', underlying: 'S&P 500' },
  
  // 2x 杠杆 ETF
  'QLD': { name: 'ProShares Ultra QQQ', leverage: '2x', type: 'Bull', underlying: 'NASDAQ-100' },
  'QID': { name: 'ProShares UltraShort QQQ', leverage: '-2x', type: 'Bear', underlying: 'NASDAQ-100' },
  'SSO': { name: 'ProShares Ultra S&P500', leverage: '2x', type: 'Bull', underlying: 'S&P 500' },
  'SDS': { name: 'ProShares UltraShort S&P500', leverage: '-2x', type: 'Bear', underlying: 'S&P 500' },
  'UCO': { name: 'ProShares Ultra Bloomberg Crude Oil', leverage: '2x', type: 'Bull', underlying: 'Crude Oil' },
  'SCO': { name: 'ProShares UltraShort Bloomberg Crude Oil', leverage: '-2x', type: 'Bear', underlying: 'Crude Oil' },
  'UGL': { name: 'ProShares Ultra Gold', leverage: '2x', type: 'Bull', underlying: 'Gold' },
  'GLL': { name: 'ProShares UltraShort Gold', leverage: '-2x', type: 'Bear', underlying: 'Gold' },
  'AGQ': { name: 'ProShares Ultra Silver', leverage: '2x', type: 'Bull', underlying: 'Silver' },
  'ZSL': { name: 'ProShares UltraShort Silver', leverage: '-2x', type: 'Bear', underlying: 'Silver' },
  'UWM': { name: 'ProShares Ultra Russell2000', leverage: '2x', type: 'Bull', underlying: 'Russell 2000' },
  'TWM': { name: 'ProShares UltraShort Russell2000', leverage: '-2x', type: 'Bear', underlying: 'Russell 2000' },
  'ROM': { name: 'ProShares Ultra Technology', leverage: '2x', type: 'Bull', underlying: 'Technology' },
  'REW': { name: 'ProShares UltraShort Technology', leverage: '-2x', type: 'Bear', underlying: 'Technology' },
  'UYG': { name: 'ProShares Ultra Financials', leverage: '2x', type: 'Bull', underlying: 'Financials' },
  'SKF': { name: 'ProShares UltraShort Financials', leverage: '-2x', type: 'Bear', underlying: 'Financials' },
  'DIG': { name: 'ProShares Ultra Energy', leverage: '2x', type: 'Bull', underlying: 'Energy' },
  'DUG': { name: 'ProShares UltraShort Energy', leverage: '-2x', type: 'Bear', underlying: 'Energy' },
  'USD': { name: 'ProShares Ultra Semiconductors', leverage: '2x', type: 'Bull', underlying: 'Semiconductors' },
  'SSG': { name: 'ProShares UltraShort Semiconductors', leverage: '-2x', type: 'Bear', underlying: 'Semiconductors' },
  
  // 中国相关杠杆 ETF
  'YINN': { name: 'Direxion China Bull 3X', leverage: '3x', type: 'Bull', underlying: 'China Large Cap' },
  'YANG': { name: 'Direxion China Bear 3X', leverage: '-3x', type: 'Bear', underlying: 'China Large Cap' },
  'XPP': { name: 'ProShares Ultra FTSE China 50', leverage: '2x', type: 'Bull', underlying: 'China 50' },
  'FXP': { name: 'ProShares UltraShort FTSE China 50', leverage: '-2x', type: 'Bear', underlying: 'China 50' },
  'CWEB': { name: 'Direxion China Internet Bull 2X', leverage: '2x', type: 'Bull', underlying: 'China Internet' },
};

// 杠杆 ETF 名称关键词（用于 LLM 或模糊匹配）
const LEVERAGE_KEYWORDS = ['Ultra', 'UltraPro', 'UltraShort', '2X', '3X', '2x', '3x', 'Bull', 'Bear', 'Leveraged', 'Inverse'];

class LeverageFilterService {
  /**
   * 检查单个标的是否为杠杆 ETF
   * @param {string} symbol - 股票代码
   * @returns {Object|null} 杠杆信息或 null
   */
  isLeveraged(symbol) {
    const upperSymbol = symbol.toUpperCase();
    if (LEVERAGED_ETFS[upperSymbol]) {
      return {
        symbol: upperSymbol,
        isLeveraged: true,
        ...LEVERAGED_ETFS[upperSymbol]
      };
    }
    return null;
  }

  /**
   * 从持仓列表中筛选杠杆标的（优先使用 LLM）
   * @param {Array} positions - Alpaca 持仓列表
   * @returns {Promise<Array>} 带杠杆信息的持仓列表
   */
  async filterLeveragedPositions(positions) {
    const leveragedPositions = [];
    
    // 检查是否配置了 Deepseek API
    const useLLM = process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'your_deepseek_api_key';
    
    if (useLLM) {
      // 使用 LLM 批量判断所有持仓
      const symbols = positions.map(p => p.symbol);
      const llmResults = await this.batchCheckWithLLM(symbols);
      
      for (const position of positions) {
        const leverageInfo = llmResults[position.symbol];
        if (leverageInfo && leverageInfo.isLeveraged) {
          leveragedPositions.push({
            ...position,
            leverageInfo: leverageInfo
          });
        }
      }
    } else {
      // 备用：使用本地规则列表
      for (const position of positions) {
        const leverageInfo = this.isLeveraged(position.symbol);
        if (leverageInfo) {
          leveragedPositions.push({
            ...position,
            leverageInfo: leverageInfo
          });
        }
      }
    }
    
    return leveragedPositions;
  }

  /**
   * 使用 LLM 批量判断多个标的是否为杠杆 ETF
   * @param {Array<string>} symbols - 股票代码列表
   * @returns {Promise<Object>} 每个标的的杠杆信息
   */
  async batchCheckWithLLM(symbols) {
    const results = {};
    
    try {
      const response = await fetch(`${process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `You are a financial analyst expert in ETFs. For each stock symbol provided, determine if it is a leveraged or inverse ETF.

Reply ONLY with a valid JSON object (no markdown, no explanation), where each key is the symbol and value is an object with these fields:
- isLeveraged: boolean (true if leveraged/inverse ETF, false otherwise)
- leverage: string (e.g. "2x", "3x", "-2x", "-3x", or null if not leveraged)
- type: string ("Bull", "Bear", "Volatility", or null)
- name: string (full ETF name or null)
- underlying: string (what index/sector it tracks, or null)

Example response format:
{"TQQQ":{"isLeveraged":true,"leverage":"3x","type":"Bull","name":"ProShares UltraPro QQQ","underlying":"NASDAQ-100"},"AAPL":{"isLeveraged":false,"leverage":null,"type":null,"name":null,"underlying":null}}`
            },
            {
              role: 'user',
              content: `Analyze these symbols: ${symbols.join(', ')}`
            }
          ],
          temperature: 0.1
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        const content = data.choices[0].message.content.trim();
        // 尝试解析 JSON
        try {
          const parsed = JSON.parse(content);
          for (const symbol of symbols) {
            if (parsed[symbol]) {
              results[symbol] = {
                symbol: symbol,
                ...parsed[symbol],
                source: 'llm'
              };
            } else {
              results[symbol] = { isLeveraged: false };
            }
          }
          console.log('LLM batch analysis completed for', symbols.length, 'symbols');
        } catch (e) {
          console.error('LLM response parse error:', e, 'Content:', content);
          // 解析失败，回退到本地规则
          for (const symbol of symbols) {
            results[symbol] = this.isLeveraged(symbol) || { isLeveraged: false };
          }
        }
      }
    } catch (error) {
      console.error('LLM batch check error:', error);
      // 出错时回退到本地规则
      for (const symbol of symbols) {
        results[symbol] = this.isLeveraged(symbol) || { isLeveraged: false };
      }
    }
    
    return results;
  }

  /**
   * 使用 LLM 判断是否为杠杆标的（增强版）
   * @param {string} symbol - 股票代码
   * @param {string} name - 股票名称（如果有）
   * @returns {Promise<Object|null>} 杠杆信息
   */
  async checkWithLLM(symbol, name = '') {
    // 先用本地列表检查
    const localResult = this.isLeveraged(symbol);
    if (localResult) {
      return localResult;
    }

    // 如果配置了 Deepseek API，使用 LLM 判断
    if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'your_deepseek_api_key') {
      try {
        const response = await fetch(`${process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1'}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: 'You are a financial analyst. Determine if the given stock symbol is a leveraged ETF. Reply in JSON format: {"isLeveraged": boolean, "leverage": "2x/3x/-2x/-3x/null", "type": "Bull/Bear/null", "underlying": "description or null"}'
              },
              {
                role: 'user',
                content: `Is "${symbol}"${name ? ` (${name})` : ''} a leveraged ETF?`
              }
            ],
            temperature: 0.1
          })
        });

        const data = await response.json();
        if (data.choices && data.choices[0]) {
          const content = data.choices[0].message.content;
          try {
            const result = JSON.parse(content);
            if (result.isLeveraged) {
              return {
                symbol: symbol.toUpperCase(),
                isLeveraged: true,
                name: name || 'Unknown',
                leverage: result.leverage,
                type: result.type,
                underlying: result.underlying,
                source: 'llm'
              };
            }
          } catch (e) {
            console.log('LLM response parse error:', e);
          }
        }
      } catch (error) {
        console.error('LLM check error:', error);
      }
    }

    return null;
  }

  /**
   * 获取所有已知的杠杆 ETF 列表
   * @returns {Object} 杠杆 ETF 字典
   */
  getAllLeveragedETFs() {
    return LEVERAGED_ETFS;
  }

  /**
   * 按杠杆倍数分组
   * @param {Array} positions - 杠杆持仓列表
   * @returns {Object} 分组后的持仓
   */
  groupByLeverage(positions) {
    const groups = {
      '3x': [],
      '2x': [],
      '-3x': [],
      '-2x': [],
      'other': []
    };

    for (const pos of positions) {
      const leverage = pos.leverageInfo?.leverage || 'other';
      if (groups[leverage]) {
        groups[leverage].push(pos);
      } else {
        groups['other'].push(pos);
      }
    }

    return groups;
  }
}

module.exports = new LeverageFilterService();

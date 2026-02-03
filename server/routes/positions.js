const express = require('express');
const router = express.Router();
const alpacaService = require('../services/alpacaService');
const leverageFilterService = require('../services/leverageFilterService');

/**
 * GET /api/positions
 * 获取所有持仓
 */
router.get('/', async (req, res) => {
  try {
    const positions = await alpacaService.getPositions();
    res.json({ success: true, positions });
  } catch (error) {
    console.error('Get positions error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch positions',
      message: error.message 
    });
  }
});

/**
 * GET /api/positions/leveraged
 * 获取杠杆仓位（从全量仓位中筛选）
 */
router.get('/leveraged', async (req, res) => {
  try {
    // 1. 从 Alpaca 获取全量仓位
    const allPositions = await alpacaService.getPositions();
    
    // 2. 使用 LLM/规则筛选杠杆标的（优先 LLM）
    const leveragedPositions = await leverageFilterService.filterLeveragedPositions(allPositions);
    
    // 3. 按杠杆倍数分组
    const grouped = leverageFilterService.groupByLeverage(leveragedPositions);
    
    res.json({ 
      success: true, 
      total: allPositions.length,
      leveragedCount: leveragedPositions.length,
      positions: leveragedPositions,
      grouped: grouped
    });
  } catch (error) {
    console.error('Get leveraged positions error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leveraged positions',
      message: error.message 
    });
  }
});

/**
 * GET /api/positions/leveraged/etfs
 * 获取所有已知杠杆 ETF 列表
 */
router.get('/leveraged/etfs', async (req, res) => {
  try {
    const etfs = leverageFilterService.getAllLeveragedETFs();
    res.json({ success: true, etfs });
  } catch (error) {
    console.error('Get leveraged ETFs error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leveraged ETFs list',
      message: error.message 
    });
  }
});

/**
 * GET /api/positions/account/info
 * 获取账户信息（购买力等）
 * 注意：必须放在 /:symbol 之前，否则 "account" 会被当作 symbol
 */
router.get('/account/info', async (req, res) => {
  try {
    const account = await alpacaService.getAccount();
    res.json({ success: true, account });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch account info',
      message: error.message 
    });
  }
});

/**
 * GET /api/positions/:symbol
 * 获取特定股票的持仓
 * 注意：动态路由必须放在最后
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const position = await alpacaService.getPosition(symbol);
    
    if (!position) {
      return res.status(404).json({ 
        error: 'Position not found',
        symbol 
      });
    }
    
    res.json({ success: true, position });
  } catch (error) {
    console.error('Get position error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch position',
      message: error.message 
    });
  }
});

module.exports = router;

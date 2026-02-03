const express = require('express');
const router = express.Router();
const alpacaService = require('../services/alpacaService');
const orderValidator = require('../services/orderValidator');

/**
 * POST /api/orders/execute
 * 执行订单（需要确认）
 */
router.post('/execute', async (req, res) => {
  try {
    const { intent, confirmation } = req.body;
    
    if (!confirmation || confirmation !== 'confirmed') {
      return res.status(400).json({ 
        error: 'Order requires confirmation',
        requiresConfirmation: true 
      });
    }

    // Final validation
    const validation = await orderValidator.validateOrder(intent);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Order validation failed',
        validation
      });
    }

    // Execute order via Alpaca
    const orderResult = await alpacaService.createOrder(intent);
    
    res.json({
      success: true,
      order: orderResult,
      message: `Order executed: ${intent.side} ${intent.quantity} ${intent.symbol}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Order execution error:', error);
    res.status(500).json({ 
      error: 'Failed to execute order',
      message: error.message 
    });
  }
});

/**
 * GET /api/orders
 * 获取所有订单（包括已完成的）
 */
router.get('/', async (req, res) => {
  try {
    const { status = 'all', limit = 50 } = req.query;
    let orders;
    
    if (status === 'open') {
      orders = await alpacaService.getOpenOrders();
    } else {
      orders = await alpacaService.getAllOrders(parseInt(limit));
    }
    
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/orders/:orderId
 * 取消订单
 */
router.delete('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await alpacaService.cancelOrder(orderId);
    
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      orderId
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel order',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/orders/symbol/:symbol
 * 取消特定股票的所有订单
 */
router.delete('/symbol/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const result = await alpacaService.cancelOrdersBySymbol(symbol);
    
    res.json({
      success: true,
      message: `Cancelled all orders for ${symbol}`,
      cancelledCount: result.length
    });
  } catch (error) {
    console.error('Cancel orders by symbol error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel orders',
      message: error.message 
    });
  }
});

module.exports = router;

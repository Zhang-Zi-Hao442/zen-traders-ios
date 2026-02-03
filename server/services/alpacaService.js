const Alpaca = require('@alpacahq/alpaca-trade-api');

// 暂时使用模拟模式，因为 API 密钥可能无效
// 如果需要真实交易，请确保 .env 中的 Alpaca API 密钥是有效的
let alpaca = null;
const useMockMode = false; // 使用真实 Alpaca API 获取数据

if (!useMockMode && process.env.ALPACA_API_KEY && process.env.ALPACA_SECRET_KEY) {
  try {
    alpaca = new Alpaca({
      keyId: process.env.ALPACA_API_KEY,
      secretKey: process.env.ALPACA_SECRET_KEY,
      paper: true,
      baseUrl: process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets'
    });
    console.log('Alpaca API configured');
  } catch (e) {
    console.warn('Failed to initialize Alpaca:', e.message);
  }
}

if (!alpaca) {
  console.log('Using MOCK mode for trading (no real orders will be placed)');
}

/**
 * Alpaca交易服务
 */
class AlpacaService {
  /**
   * 创建订单
   * @param {Object} intent - 订单意图对象
   * @param {string} intent.symbol - 股票代码
   * @param {number} intent.quantity - 数量
   * @param {string} intent.side - 'buy' 或 'sell'
   * @param {string} intent.type - 'market' 或 'limit'
   * @param {number} intent.limitPrice - 限价（如果是limit订单）
   * @param {string} intent.timeInForce - 'day', 'gtc', 'opg', 'cls', 'ioc', 'fok'
   * @returns {Promise<Object>} 订单结果
   */
  async createOrder(intent) {
    // 模拟模式
    if (!alpaca) {
      console.log('Mock mode: simulating order creation');
      return {
        id: 'mock-' + Date.now(),
        symbol: intent.symbol.toUpperCase(),
        qty: intent.quantity,
        side: intent.side,
        type: intent.type,
        status: 'accepted',
        created_at: new Date().toISOString(),
        mock: true
      };
    }

    try {
      const orderParams = {
        symbol: intent.symbol.toUpperCase(),
        qty: intent.quantity,
        side: intent.side.toLowerCase(),
        type: intent.type.toLowerCase(),
        time_in_force: intent.timeInForce || 'day'
      };

      // 如果是限价单，添加限价
      if (intent.type === 'limit' && intent.limitPrice) {
        orderParams.limit_price = intent.limitPrice;
      }

      // 如果是止损单
      if (intent.type === 'stop' && intent.stopPrice) {
        orderParams.stop_price = intent.stopPrice;
      }

      const order = await alpaca.createOrder(orderParams);
      return order;
    } catch (error) {
      console.error('Alpaca create order error:', error);
      // 返回模拟订单而不是抛出错误
      return {
        id: 'mock-' + Date.now(),
        symbol: intent.symbol.toUpperCase(),
        qty: intent.quantity,
        side: intent.side,
        type: intent.type,
        status: 'simulated',
        error: error.message,
        created_at: new Date().toISOString(),
        mock: true
      };
    }
  }

  /**
   * 获取所有开放订单
   * @returns {Promise<Array>} 订单列表
   */
  async getOpenOrders() {
    if (!alpaca) {
      return []; // 模拟模式返回空数组
    }
    try {
      const orders = await alpaca.getOrders({
        status: 'open'
      });
      return orders;
    } catch (error) {
      console.error('Get open orders error:', error);
      return []; // 出错时返回空数组
    }
  }

  /**
   * 获取所有订单（包括已完成的）
   * @param {number} limit - 返回数量限制
   * @returns {Promise<Array>} 订单列表
   */
  async getAllOrders(limit = 50) {
    if (!alpaca) {
      return []; // 模拟模式返回空数组
    }
    try {
      const orders = await alpaca.getOrders({
        status: 'all',
        limit: limit,
        direction: 'desc' // 最新的在前
      });
      return orders;
    } catch (error) {
      console.error('Get all orders error:', error);
      return []; // 出错时返回空数组
    }
  }

  /**
   * 取消订单
   * @param {string} orderId - 订单ID
   * @returns {Promise<Object>} 取消结果
   */
  async cancelOrder(orderId) {
    try {
      await alpaca.cancelOrder(orderId);
      return { success: true, orderId };
    } catch (error) {
      console.error('Cancel order error:', error);
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  /**
   * 取消特定股票的所有订单
   * @param {string} symbol - 股票代码
   * @returns {Promise<Array>} 取消的订单列表
   */
  async cancelOrdersBySymbol(symbol) {
    try {
      const orders = await alpaca.getOrders({
        status: 'open'
      });
      
      const symbolOrders = orders.filter(order => 
        order.symbol.toUpperCase() === symbol.toUpperCase()
      );
      
      const cancelPromises = symbolOrders.map(order => 
        this.cancelOrder(order.id)
      );
      
      await Promise.all(cancelPromises);
      return symbolOrders;
    } catch (error) {
      console.error('Cancel orders by symbol error:', error);
      throw new Error(`Failed to cancel orders for ${symbol}: ${error.message}`);
    }
  }

  /**
   * 获取所有持仓
   * @returns {Promise<Array>} 持仓列表
   */
  async getPositions() {
    if (!alpaca) {
      // 模拟模式返回模拟持仓数据（包含杠杆 ETF）
      return [
        {
          symbol: 'TQQQ',
          qty: '50',
          avg_entry_price: '45.20',
          current_price: '48.75',
          market_value: '2437.50',
          unrealized_pl: '177.50',
          unrealized_plpc: '0.0785',
          side: 'long'
        },
        {
          symbol: 'SOXL',
          qty: '30',
          avg_entry_price: '22.80',
          current_price: '25.40',
          market_value: '762.00',
          unrealized_pl: '78.00',
          unrealized_plpc: '0.1140',
          side: 'long'
        },
        {
          symbol: 'AAPL',
          qty: '20',
          avg_entry_price: '178.50',
          current_price: '182.30',
          market_value: '3646.00',
          unrealized_pl: '76.00',
          unrealized_plpc: '0.0213',
          side: 'long'
        },
        {
          symbol: 'UVXY',
          qty: '100',
          avg_entry_price: '28.50',
          current_price: '26.20',
          market_value: '2620.00',
          unrealized_pl: '-230.00',
          unrealized_plpc: '-0.0807',
          side: 'long'
        },
        {
          symbol: 'YINN',
          qty: '40',
          avg_entry_price: '8.20',
          current_price: '9.15',
          market_value: '366.00',
          unrealized_pl: '38.00',
          unrealized_plpc: '0.1159',
          side: 'long'
        },
        {
          symbol: 'NVDA',
          qty: '15',
          avg_entry_price: '485.00',
          current_price: '520.00',
          market_value: '7800.00',
          unrealized_pl: '525.00',
          unrealized_plpc: '0.0722',
          side: 'long'
        }
      ];
    }
    try {
      const positions = await alpaca.getPositions();
      return positions;
    } catch (error) {
      console.error('Get positions error:', error);
      return []; // 出错时返回空数组
    }
  }

  /**
   * 获取特定股票的持仓
   * @param {string} symbol - 股票代码
   * @returns {Promise<Object|null>} 持仓信息
   */
  async getPosition(symbol) {
    if (!alpaca) {
      return null; // 模拟模式返回 null
    }
    try {
      const position = await alpaca.getPosition(symbol.toUpperCase());
      return position;
    } catch (error) {
      if (error.statusCode === 404) {
        return null; // 没有持仓
      }
      console.error('Get position error:', error);
      return null; // 出错时返回 null
    }
  }

  /**
   * 获取账户信息
   * @returns {Promise<Object>} 账户信息
   */
  async getAccount() {
    if (!alpaca) {
      // 模拟账户信息
      return {
        buying_power: '100000',
        cash: '100000',
        portfolio_value: '100000',
        status: 'ACTIVE',
        mock: true
      };
    }
    try {
      const account = await alpaca.getAccount();
      return account;
    } catch (error) {
      console.error('Get account error:', error);
      // 返回模拟数据而不是抛出错误
      return {
        buying_power: '100000',
        cash: '100000',
        portfolio_value: '100000',
        status: 'UNKNOWN',
        mock: true
      };
    }
  }

  /**
   * 获取账户购买力
   * @returns {Promise<number>} 可用购买力
   */
  async getBuyingPower() {
    const account = await this.getAccount();
    return parseFloat(account.buying_power) || 100000;
  }
}

module.exports = new AlpacaService();

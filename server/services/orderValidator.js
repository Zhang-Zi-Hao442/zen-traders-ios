const alpacaService = require('./alpacaService');

/**
 * 订单验证服务
 */
class OrderValidator {
  /**
   * 验证订单
   * @param {Object} intent - 订单意图
   * @returns {Promise<Object>} 验证结果
   */
  async validateOrder(intent) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      estimatedTotal: null,
      estimatedPrice: null
    };

    try {
      // 1. 基本字段验证
      if (!intent.symbol) {
        validation.isValid = false;
        validation.errors.push('Symbol is required');
        return validation;
      }

      if (!intent.quantity || intent.quantity <= 0) {
        validation.isValid = false;
        validation.errors.push('Quantity must be greater than 0');
        return validation;
      }

      if (!intent.side || !['buy', 'sell'].includes(intent.side.toLowerCase())) {
        validation.isValid = false;
        validation.errors.push('Side must be "buy" or "sell"');
        return validation;
      }

      // 2. 检查账户购买力（仅买入订单）
      if (intent.side.toLowerCase() === 'buy') {
        try {
          const buyingPower = await alpacaService.getBuyingPower();
          
          // 估算订单总价（如果是市价单，使用当前价格估算）
          if (intent.type === 'market') {
            // 获取当前价格（这里简化处理，实际应该获取实时报价）
            validation.warnings.push('Market order - price will be determined at execution');
            // 可以调用Alpaca获取当前报价来估算
          } else if (intent.type === 'limit' && intent.limitPrice) {
            validation.estimatedTotal = intent.quantity * intent.limitPrice;
            validation.estimatedPrice = intent.limitPrice;
            
            if (validation.estimatedTotal > buyingPower) {
              validation.isValid = false;
              validation.errors.push(
                `Insufficient buying power. Required: $${validation.estimatedTotal.toFixed(2)}, Available: $${buyingPower.toFixed(2)}`
              );
              return validation;
            }
          }
        } catch (apiError) {
          console.warn('Could not verify buying power (API error):', apiError.message);
          validation.warnings.push('Unable to verify buying power - API unavailable');
          // 继续验证流程，不阻止订单
        }
      }

      // 3. 检查持仓（仅卖出订单）
      if (intent.side.toLowerCase() === 'sell') {
        try {
          const position = await alpacaService.getPosition(intent.symbol);
          
          if (!position) {
            validation.warnings.push(`No position found for ${intent.symbol} - sell order may fail`);
            // 不阻止，让用户自己决定
          } else {
            const availableQty = parseFloat(position.qty);
            if (intent.quantity > Math.abs(availableQty)) {
              validation.warnings.push(
                `May have insufficient shares. Requested: ${intent.quantity}, Available: ${Math.abs(availableQty)}`
              );
            }
          }
        } catch (apiError) {
          console.warn('Could not verify position (API error):', apiError.message);
          validation.warnings.push('Unable to verify position - API unavailable');
        }
      }

      // 4. 检查大额订单（可能需要额外确认）
      const criticalThreshold = parseFloat(process.env.CRITICAL_ACTION_THRESHOLD) || 10000;
      if (validation.estimatedTotal && validation.estimatedTotal > criticalThreshold) {
        validation.warnings.push(
          `Large order detected ($${validation.estimatedTotal.toFixed(2)}). Additional confirmation may be required.`
        );
      }

      // 5. 验证限价单价格合理性
      if (intent.type === 'limit' && intent.limitPrice) {
        // 可以添加价格合理性检查（例如：限价不应偏离当前价格超过X%）
        validation.warnings.push(`Limit order at $${intent.limitPrice}`);
      }

      return validation;
    } catch (error) {
      console.error('Order validation error:', error);
      validation.isValid = false;
      validation.errors.push(`Validation failed: ${error.message}`);
      return validation;
    }
  }

  /**
   * 检查是否需要生物识别验证
   * @param {Object} intent - 订单意图
   * @returns {boolean}
   */
  requiresBiometricAuth(intent) {
    const criticalThreshold = parseFloat(process.env.CRITICAL_ACTION_THRESHOLD) || 10000;
    
    // 估算订单价值
    let estimatedValue = 0;
    if (intent.limitPrice) {
      estimatedValue = intent.quantity * intent.limitPrice;
    }
    
    return estimatedValue > criticalThreshold;
  }
}

module.exports = new OrderValidator();

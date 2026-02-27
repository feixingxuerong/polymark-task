/**
 * Weather Alerts Schema
 * 
 * Output schema for weather market alerts
 * Designed for low-disturbance notifications (Top3 action=考虑)
 */

export const weatherAlertSchema = {
  // Top-level structure
  generated_at: "ISO8601 timestamp",
  date: "YYYY-MM-DD",
  version: "1.0.0",
  
  // Alert summary
  summary: {
    total_alerts: 0,          // Number of alerts generated
    trigger_types: {
      t_minus_24h: 0,          // 24 hours to event
      t_minus_6h: 0,           // 6 hours to event
      source_updated: 0,       // Data source updated
      near_settlement: 0       // Near settlement (no end date)
    },
    markets_filtered: 0,       // Total action=考虑 markets checked
    alerts_sent: 0             // Actual alerts (after deduplication)
  },
  
  // Alert entries
  alerts: [
    {
      // Market identification
      rank: 1,
      market_id: "123456",
      slug: "weather-xxx-2026-02-28",
      question: "Will it rain in NYC on Feb 28?",
      url: "https://polymarket.com/market/...",
      category: "weather",
      
      // Trigger reason
      trigger: {
        type: "t_minus_24h" | "t_minus_6h" | "source_updated" | "near_settlement",
        reason: "24小时倒计时",
        timestamp: "2026-02-27T12:00:00Z",
        details: "endDate: 2026-02-28T12:00:00Z"
      },
      
      // Market data
      market_data: {
        end_date: "2026-02-28T12:00:00Z",  // ISO8601 or null
        days_to_event: 1.0,                 // Calculated days
        hours_to_event: 24,                 // Calculated hours
        liquidity: 1500.00,
        action: "考虑",
        entry_plan: "若天气预报有雨且流动性>1000，可小额买入Yes",
        stations: ["KNYC", "KJFK"]          // Related weather stations
      },
      
      // Next steps
      next_steps: [
        "检查NOAA最新预报",
        "确认流动性充足",
        "设置价格警报"
      ],
      
      // Knowledge base link
      kb_link: "/weather/today"
    }
  ],
  
  // Data sources used
  sources: {
    watchlist: "watchlist-2026-02-28.json",
    watchlist_diff: "watchlist-diff-2026-02-28.json",
    weather_sources: "weather-aviation-sources-2026-02-28.json"
  },
  
  // Configuration
  config: {
    top_n: 5,                  // Top N markets to consider
    trigger_lookahead_hours: 48,  // Look ahead window
    min_liquidity: 500         // Minimum liquidity threshold
  }
};

/**
 * Alert Trigger Types
 */
export const TRIGGER_TYPES = {
  T_MINUS_24H: 't_minus_24h',
  T_MINUS_6H: 't_minus_6h',
  SOURCE_UPDATED: 'source_updated',
  NEAR_SETTLEMENT: 'near_settlement'
};

/**
 * Action types to filter
 */
export const ACTION_FILTER = ['考虑', '观察 - 等待价格信号', '观察 - 等待比赛结果'];

import { motion } from 'framer-motion';

export default function StatsCard({ title, value, icon, trend, color, delay = 0 }) {
  return (
    <motion.div
      className="stats-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="stats-card-header">
        <div className="stats-card-icon" style={{ background: color + '18', color }}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`stats-card-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stats-card-value">{value}</div>
      <div className="stats-card-title">{title}</div>
    </motion.div>
  );
}

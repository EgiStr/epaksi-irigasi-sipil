import React from 'react';

const StatsCard = React.memo(({ stat }) => {
  const IconComponent = stat.icon;
  
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ backgroundColor: stat.bgColor }}>
        <IconComponent size={24} color={stat.color} />
      </div>
      <div className="stat-content">
        <div className="stat-value">{stat.value}</div>
        <div className="stat-title">{stat.title}</div>
        <div className="stat-subtitle">{stat.subtitle}</div>
      </div>
    </div>
  );
});

StatsCard.displayName = 'StatsCard';

export default StatsCard;

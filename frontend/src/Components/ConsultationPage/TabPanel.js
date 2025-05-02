import React from 'react';
// Loại bỏ import từ MUI
// import { Box } from '@mui/material';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`counseling-tabpanel-${index}`}
      aria-labelledby={`counseling-tab-${index}`}
      {...other}
    >
      {value === index && (
        <div className="tab-panel-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default TabPanel; 
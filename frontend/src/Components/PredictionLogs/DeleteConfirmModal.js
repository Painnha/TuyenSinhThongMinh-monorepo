import React from 'react';
import './DeleteConfirmModal.css';

const DeleteConfirmModal = ({ 
  showDeleteConfirmModal, 
  setShowDeleteConfirmModal, 
  selectedLogIds,
  deleteSelectedLogs
}) => {
  if (!showDeleteConfirmModal) {
    return null;
  }
  
  return (
    <div className="custom-modal show">
      <div className="modal-backdrop" onClick={() => setShowDeleteConfirmModal(false)}></div>
      <div className="modal-dialog confirm-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Xác nhận xóa</h3>
            <button 
              type="button" 
              className="close-button"
              onClick={() => setShowDeleteConfirmModal(false)}
            >
              ❌
            </button>
          </div>
          
          <div className="modal-body">
            <div className="confirm-message">
              <div className="confirm-icon">
                🗑️
              </div>
              <p>
                Bạn có chắc chắn muốn xóa {selectedLogIds.length > 1 
                  ? `${selectedLogIds.length} logs` 
                  : 'log này'} không?
              </p>
              <p className="warning-text">Hành động này không thể hoàn tác.</p>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="custom-button secondary-button"
              onClick={() => setShowDeleteConfirmModal(false)}
            >
              Hủy
            </button>
            <button 
              type="button" 
              className="custom-button danger-button"
              onClick={deleteSelectedLogs}
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal; 
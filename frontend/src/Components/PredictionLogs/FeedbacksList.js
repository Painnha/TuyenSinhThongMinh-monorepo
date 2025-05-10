import React from 'react';
import { 
  Card, Table, Button, Form, Row, Col, Badge, 
  Spinner, Pagination, Alert
} from 'react-bootstrap';

const FeedbacksList = ({ 
  feedbacks,
  feedbacksLoading,
  feedbacksPagination,
  setFeedbacksPagination,
  feedbackFilters,
  setFeedbackFilters,
  fetchFeedbacks,
  fetchLogDetail,
  error
}) => {
  return (
    <div>
      <Card className="mb-4">
        <Card.Header>
          <h5>Bộ lọc phản hồi</h5>
        </Card.Header>
        <Card.Body>
          <Form>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Đánh giá</Form.Label>
                  <Form.Select
                    name="isUseful"
                    value={feedbackFilters.isUseful}
                    onChange={(e) => setFeedbackFilters({
                      ...feedbackFilters,
                      isUseful: e.target.value
                    })}
                  >
                    <option value="">Tất cả</option>
                    <option value="true">Hài lòng</option>
                    <option value="false">Không hài lòng</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Từ ngày</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={feedbackFilters.startDate}
                    onChange={(e) => setFeedbackFilters({
                      ...feedbackFilters,
                      startDate: e.target.value
                    })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Đến ngày</Form.Label>
                  <Form.Control
                    type="date"
                    name="endDate"
                    value={feedbackFilters.endDate}
                    onChange={(e) => setFeedbackFilters({
                      ...feedbackFilters,
                      endDate: e.target.value
                    })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col className="d-flex justify-content-end">
                <Button 
                  variant="secondary" 
                  className="me-2"
                  onClick={() => {
                    setFeedbackFilters({
                      isUseful: '',
                      startDate: '',
                      endDate: ''
                    });
                    setFeedbacksPagination({
                      ...feedbacksPagination,
                      page: 1
                    });
                  }}
                >
                  🔄 Đặt lại
                </Button>
                <Button 
                  variant="primary"
                  onClick={fetchFeedbacks}
                >
                  🔍 Lọc
                </Button>
                <Button 
                  variant="success" 
                  className="ms-2"
                  onClick={() => {
                    // Export to CSV logic here
                    alert('Chức năng xuất file CSV sẽ được phát triển trong tương lai');
                  }}
                >
                  📊 Xuất CSV
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
      
      <Card>
        <Card.Header>
          <h5>Danh sách phản hồi</h5>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          {feedbacksLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : (
            <div>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Mã người dùng</th>
                    <th>Loại mô hình</th>
                    <th>Thời gian</th>
                    <th>Đánh giá</th>
                    <th>Nội dung phản hồi</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.length > 0 ? (
                    feedbacks.map((feedback) => (
                      <tr key={feedback._id}>
                        <td>{feedback.userId}</td>
                        <td>
                          <Badge bg={feedback.modelType === 'admission_prediction' ? 'info' : 'success'}>
                            {feedback.modelType === 'admission_prediction' ? 'Dự đoán tỷ lệ' : 'Gợi ý ngành'}
                          </Badge>
                        </td>
                        <td>{new Date(feedback.feedbackDate).toLocaleString()}</td>
                        <td>
                          {feedback.isUseful ? (
                            <Badge bg="success">
                              ✅ Hài lòng
                            </Badge>
                          ) : (
                            <Badge bg="danger">
                              ❌ Không hài lòng
                            </Badge>
                          )}
                        </td>
                        <td>{feedback.feedback}</td>
                        <td>
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => fetchLogDetail(feedback._id)}
                          >
                            👁️
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center">
                        Không có dữ liệu phản hồi
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              
              {feedbacksPagination.pages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div>
                    Hiển thị {feedbacks.length} trên tổng số {feedbacksPagination.total} phản hồi
                  </div>
                  <Pagination>
                    <Pagination.First 
                      onClick={() => setFeedbacksPagination({...feedbacksPagination, page: 1})}
                      disabled={feedbacksPagination.page === 1}
                    />
                    <Pagination.Prev 
                      onClick={() => setFeedbacksPagination({...feedbacksPagination, page: feedbacksPagination.page - 1})}
                      disabled={feedbacksPagination.page === 1}
                    />
                    
                    {[...Array(feedbacksPagination.pages).keys()].map(x => (
                      <Pagination.Item
                        key={x + 1}
                        active={x + 1 === feedbacksPagination.page}
                        onClick={() => setFeedbacksPagination({...feedbacksPagination, page: x + 1})}
                      >
                        {x + 1}
                      </Pagination.Item>
                    ))}
                    
                    <Pagination.Next 
                      onClick={() => setFeedbacksPagination({...feedbacksPagination, page: feedbacksPagination.page + 1})}
                      disabled={feedbacksPagination.page === feedbacksPagination.pages}
                    />
                    <Pagination.Last 
                      onClick={() => setFeedbacksPagination({...feedbacksPagination, page: feedbacksPagination.pages})}
                      disabled={feedbacksPagination.page === feedbacksPagination.pages}
                    />
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default FeedbacksList; 
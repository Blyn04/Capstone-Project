import React, { useState, useEffect } from "react";
import {
  Layout,
  Input,
  Table,
  Typography,
  Modal,
  Descriptions,
  Select,
  Button,
  Spin,
  Tabs,
  theme
} from "antd";
import { CloseOutlined, SearchOutlined } from "@ant-design/icons";
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "../../backend/firebase/FirebaseConfig";
import "../styles/usersStyle/ActivityLog.css";
import { getAuth } from "firebase/auth";
import { ClockCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";
import StickyBox from 'react-sticky-box';

const { Option } = Select;
const { Content } = Layout;
const { Title } = Typography;
const { TabPane } = Tabs;

const columns2 = [
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    className: "table-header",
    align: "center",
  },
  {
    title: "Action",
    dataIndex: "action",
    key: "action",
    className: "table-header",
    align: "center",
  },
  {
    title: "By",
    dataIndex: "by",
    key: "by",
    className: "table-header",
    align: "center",
  },
];

const HistoryLog = () => {
  const [activityData, setActivityData] = useState([]);
  const [activeTabKey, setActiveTabKey] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isCancelVisible, setIsCancelVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewDetailsModalVisible, setViewDetailsModalVisible] = useState(false);
  const [userName, setUserName] = useState("User");
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [selectedActivityLog, setSelectedActivityLog] = useState(null);

const sanitizeInput = (input) =>
  input.replace(/\s+/g, " ")           // convert multiple spaces to one                    // remove leading/trailing spaces
      .replace(/[^a-zA-Z0-9\s\-.,()]/g, ""); // remove unwanted characters

  const fetchUserName = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || "Unknown User");
    }
  };
  


  const fetchRequests = () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found in localStorage.");
  
      const userRequestsRef = collection(db, `accounts/${userId}/userRequests`);
  
      // Real-time listener
      const unsubscribe = onSnapshot(userRequestsRef, async (querySnapshot) => {
        const fetched = [];
  
        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          
          const enrichedItems = await Promise.all(
            (data.filteredMergedData || []).map(async (item) => {
              const inventoryId = item.selectedItemId || item.selectedItem?.value;
              let itemId = "N/A";
  
              if (inventoryId) {
                try {
                  const invDoc = await getDoc(doc(db, `inventory/${inventoryId}`));
                  if (invDoc.exists()) {
                    itemId = invDoc.data().itemId || "N/A";
                  }
  
                } catch (err) {
                 
                }
              }
  
              return {
                ...item,
                itemIdFromInventory: itemId,
                volume: item.volume ?? "N/A", 
              };
            })
          );
  
          fetched.push({
            id: docSnap.id,
            dateRequested: data.timestamp
              ? new Date(data.timestamp.seconds * 1000).toLocaleDateString()
              : "N/A",
            dateRequired: data.dateRequired || "N/A",
            requester: data.userName || "Unknown",
            room: data.room || "N/A",
            timeNeeded: `${data.timeFrom || "N/A"} - ${data.timeTo || "N/A"}`,
            courseCode: data.program || "N/A",
            courseDescription: data.reason || "N/A",
            items: enrichedItems,
            status: "PENDING",
            message: data.reason || "",
            usageType: data.usageType || "",
          });
        }
  
        // Sort fetched data by request date
        const sortedByDate = fetched.sort((a, b) => {
          const dateA = new Date(a.dateRequested);
          const dateB = new Date(b.dateRequested);
          return dateB - dateA;
        });
  
        setRequests(sortedByDate);
  
      }, (error) => {
        
        setNotificationMessage("Failed to fetch user requests.");
        setNotificationVisible(true);
      });
  
      // Cleanup listener on unmount
      return () => unsubscribe();

    } catch (err) {
      
      setNotificationMessage("Failed to fetch user requests.");
      setNotificationVisible(true);
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchUserName();
  }, []);

  const handleCancelRequest = async () => {
    try {
      const userId = localStorage.getItem("userId");
  
      if (!userId || !selectedRequest?.id) {
        throw new Error("Missing user ID or selected request ID.");
      }
  
      const userRequestRef = doc(db, `accounts/${userId}/userRequests`, selectedRequest.id);
      const activityLogRef = doc(db, `accounts/${userId}/historylog`, selectedRequest.id);
  
      // Fetch request data before deleting
      const requestSnap = await getDoc(userRequestRef);
      if (!requestSnap.exists()) throw new Error("Request not found.");
  
      const requestData = requestSnap.data();
  
      // Write to activity log
      await setDoc(activityLogRef, {
        ...requestData,
        status: "CANCELLED",
        cancelledAt: new Date(),
      });
  
      // Delete from userRequests subcollection
      await deleteDoc(userRequestRef);
  
      // Find and delete from root userrequests collection
      const rootQuery = query(
        collection(db, "userrequests"),
        where("accountId", "==", userId),
        where("timestamp", "==", requestData.timestamp) // Assumes timestamp is unique for each request
      );
  
      const rootSnap = await getDocs(rootQuery);
      const batchDeletes = [];
  
      rootSnap.forEach((docSnap) => {
        batchDeletes.push(deleteDoc(doc(db, "userrequests", docSnap.id)));
      });
  
      await Promise.all(batchDeletes);
      setIsCancelVisible(false);

      setNotificationMessage("Request successfully canceled and logged.");
      setNotificationVisible(true);
      setSelectedRequest(null);
      setViewDetailsModalVisible(false);
      fetchRequests();

    } catch (err) {
    
      setNotificationMessage("Failed to cancel the request.");
      setNotificationVisible(true);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setViewDetailsModalVisible(true);
  };

  const handleModalClose = () => {
    setViewDetailsModalVisible(false);
    setSelectedRequest(null);
  };

  const columns = [
    // {
    //   title: "Request ID",
    //   dataIndex: "id",
    //   key: "id",
    // },
    {
      title: "Requisition Date",
      dataIndex: "dateRequested",
      key: "dateRequested",
    },
    {
      title: "Date Required",
      dataIndex: "dateRequired",
      key: "dateRequired",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Button type="text" className="status-btn">
          {status}
        </Button>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button onClick={() => handleViewDetails(record)} type="primary">
          View Details
        </Button>
      ),
    },
  ];

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
  
    const activityRef = collection(db, `accounts/${userId}/historylog`);
  
    const unsubscribe = onSnapshot(
      activityRef,
      (querySnapshot) => {
        const logs = querySnapshot.docs.map((doc, index) => {
          const data = doc.data();
          const logDate =
            data.cancelledAt?.toDate?.() ||
            data.timestamp?.toDate?.() ||
            new Date();
  
          const isCancelled = data.status === "CANCELLED";
          const action = isCancelled
            ? "Cancelled a request"
            : data.action || "Modified a request";
            
          const by = 
            action === "Request Approved"
              ? data.approvedBy
              : action === "Request Rejected"
              ? data.rejectedBy
              : action === "Deployed"
              ? data.approvedBy
              : data.userName || "Unknown User";
  
          return {
            key: doc.id || index.toString(),
            date: logDate.toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
            rawDate: logDate,
            action: action,
            by: by,
            fullData: data,
          };
        });
  
        const sortedLogs = logs.sort((a, b) => b.rawDate - a.rawDate);
        setActivityData(sortedLogs);
      },
      (error) => {
     
      }
    );
  
    // Cleanup the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // const filteredData = activityData
  // .filter((item) => {
  //   // Filter by action type
  //   if (actionFilter !== "ALL" && item.action !== actionFilter) {
  //     return false;
  //   }
  //   // Filter by search

  //   return (
  //     item.date.includes(searchQuery) ||
  //     item.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //     item.by.toLowerCase().includes(searchQuery.toLowerCase())
  //   );
  // });

  const filteredData = activityData.filter((item) => {
    // Filter by action type
    if (actionFilter !== "ALL" && item.action !== actionFilter) {
      return false;
    }

    const search = searchQuery?.toLowerCase?.() || "";
    const date = item.date || "";
    const action = item.action?.toLowerCase?.() || "";
    const by = item.by?.toLowerCase?.() || "";

    // Filter by search
    return (
      date.includes(search) ||
      action.includes(search) ||
      by.includes(search)
    );
  });

  const handleRowClick = (record) => {
    setSelectedLog(record.fullData);
    setModalVisible(true);
  };

    const hasGlassware = Array.isArray(selectedRequest?.items)
    ? selectedRequest.items.some(
        (item) => item.category?.toLowerCase() === "glasswares"
      )
    : false;


  const itemColumns = [
    {
      title: "Item #",
      key: "index",
      render: (_, __, index) => <span>{index + 1}</span>,
    },
    {
      title: "Item Name",
      dataIndex: "itemName",
      key: "itemName",
    },
    {
      title: "Item ID",
      dataIndex: "itemIdFromInventory",
      key: "itemIdFromInventory",
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      render: (department) => (
        <span
          style={{
            color: department === "MEDTECH" ? "magenta" : "orange",
            fontWeight: "bold",
          }}
        >
          {department}
        </span>
      ),
    },
    
    
  ];

    const renderPendingTab = () => (
    <Content className="pending-content">
            <div className="activity-header">
      </div>
 
        {/* <Input
          placeholder="Search requests..."
          prefix={<SearchOutlined />}
          className="pending-search"
          allowClear
          value={searchQuery}
          onInput={(e) => {
            const sanitized = sanitizeInput(e.target.value);
            e.target.value = sanitized;
            setSearchQuery(sanitized);
          }}
        /> */}
      
        {loading ? (
          <Spin size="large" />
        ) : (
          <Table
  columns={columns}
  dataSource={requests.filter((item) =>
    item.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.usageType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.courseDescription?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  )}
  pagination={{ pageSize: 10 }}
  rowKey="id"
  className="pending-table"
          />
        )}
      
      <Modal
        className="request-list-modal"
        open={viewDetailsModalVisible}
        onCancel={handleModalClose}
        width={800}
        zIndex={1008}
        closable={false}
        footer={[
          <Button key="close" onClick={handleModalClose}>Close</Button>,
          <Button key="cancel" danger onClick={() => setIsCancelVisible(true)} icon={<CloseOutlined />}>Cancel Request</Button>,
        ]}
      >
        {selectedRequest && (
          <>
            <div className="request-details-container" style={{ justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '18px', color: 'white' }}>Request Details</strong>
              {/* <span style={{ fontSize: 12, color: 'white' }}>{selectedRequest?.id}</span> */}
            </div>
            <div className="request-details-whole">
              <div className="request-details-left">
                <div><p><strong>Requester:</strong></p><p>{selectedRequest.requester}</p></div>
                <div><p><strong>Requisition Date:</strong></p><p>{selectedRequest.dateRequested}</p></div>
                <div><p><strong>Date Required:</strong></p><p>{selectedRequest.dateRequired}</p></div>
                <div><p><strong>Time Needed:</strong></p><p>{selectedRequest.timeNeeded}</p></div>
              </div>
              <div className="request-details-right">
                <div><p><strong>Course Code:</strong></p><p>{selectedRequest.courseCode}</p></div>
                <div><p><strong>Course Description:</strong></p><p>{selectedRequest.requester}</p></div>
                <div><p><strong>Room:</strong></p><p>{selectedRequest.room}</p></div>
                <div><p><strong>Usage Type:</strong></p><p>{selectedRequest.usageType}</p></div>
              </div>
            </div>
            <div className="details-table">
              <Title level={5}>Requested Items:</Title>
              <Table
                columns={itemColumns}
                dataSource={selectedRequest.items}
                rowKey={(_, index) => index}
                size="small"
                pagination={false}
              />
              <br />
              <p style={{ marginBottom: '30px' }}><strong>Note:</strong> {selectedRequest.message || "No message provided."}</p>
            </div>
          </>
        )}
      </Modal>

      <Modal
        title="Confirm Cancellation"
        open={isCancelVisible}
        onCancel={() => setIsCancelVisible(false)}
        onOk={handleCancelRequest}
        zIndex={1009}
        okText="Yes, Cancel"
        cancelText="No"
      >
        <p>Are you sure you want to cancel this request?</p>
      </Modal>
    </Content>
  );

const ProcessedTab = () => {
  const [activeTab, setActiveTab] = useState('APPROVED');

  const getTabData = (type) => {
    return filteredData.filter((item) => {
      if (type === 'APPROVED') return item.action === 'Request Approved';
      if (type === 'REJECTED') return item.action === 'Request Rejected';
      if (type === 'CANCELLED') return item.action === 'Cancelled a request';
      if (type === 'DEPLOYED') return item.action === 'Deployed';
      return true;
    });
  };

  const tabData = getTabData(activeTab);

  return (
    <Content className="activity-content">
      <div className="activity-controls">
        {/* <Select
          value={actionFilter}
          onChange={(value) => setActionFilter(value)}
          className="activity-filter"
          allowClear
          placeholder="Filter by Action"
        >
          <Option value="ALL">All</Option>
          <Option value="Request Approved">Request Approved</Option>
          <Option value="Request Rejected">Request Rejected</Option>
          <Option value="Cancelled a request">Request Cancelled</Option>
          <Option value="Deployed">Deployed</Option>
        </Select>

        <Input
          placeholder="Search"
          prefix={<SearchOutlined />}
          className="activity-search"
          allowClear
          onInput={(e) => {
            const sanitized = sanitizeInput(e.target.value);
            e.target.value = sanitized;
            setSearchQuery(sanitized);
          }}
        /> */}
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={`Approved (${getTabData('APPROVED').length})`} key="APPROVED" />
        <TabPane tab={`Deployed (${getTabData('DEPLOYED').length})`} key="DEPLOYED" />
        <TabPane tab={`Rejected (${getTabData('REJECTED').length})`} key="REJECTED" />
        <TabPane tab={`Cancelled (${getTabData('CANCELLED').length})`} key="CANCELLED" />
      </Tabs>

      <Table
        columns={columns2}
        dataSource={tabData}
        pagination={{ pageSize: 10 }}
        bordered
        className="activity-table"
        rowClassName="activity-row"
        onRow={(record) => ({ onClick: () => handleRowClick(record) })}
        locale={{
          emptyText: (
            <div className="empty-row">
              <span>No activity found.</span>
            </div>
          ),
        }}
      />

      <Modal
        title="Activity Details"
        visible={modalVisible}
        zIndex={1015}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        {selectedLog && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Action">
              {selectedLog.status === 'CANCELLED'
                ? 'Cancelled a request'
                : selectedLog.action || 'Modified a request'}
            </Descriptions.Item>

            <Descriptions.Item label="By">
              {selectedLog.userName || 'Unknown User'}
            </Descriptions.Item>

            <Descriptions.Item label="Program">
              {selectedLog.program || 'N/A'}
            </Descriptions.Item>

            <Descriptions.Item label="Items Requested">
              {(selectedLog.filteredMergedData || selectedLog.requestList)?.length > 0 ? (
                <ul style={{ paddingLeft: 20 }}>
                  {(selectedLog.filteredMergedData || selectedLog.requestList).map((item, index) => (
                    <li key={index} style={{ marginBottom: 10 }}>
                      <strong>{item.itemName}</strong>
                      <ul style={{ marginLeft: 20 }}>
                        <li>Quantity: {item.quantity}</li>
                        {(item.category === 'Chemical' || item.category === 'Reagent') && item.unit && (
                          <li>Unit: {item.unit}</li>
                        )}
                        {item.category && <li>Category: {item.category}</li>}
                        {item.category === 'Glasswares' && item.volume && (
                          <li>Volume: {item.volume}</li>
                        )}
                        {item.labRoom && <li>Lab Room: {item.labRoom}</li>}
                        {item.usageType && <li>Usage Type: {item.usageType}</li>}
                        {item.itemType && <li>Item Type: {item.itemType}</li>}
                        {item.department && <li>Department: {item.department}</li>}
                        {selectedLog.action === 'Request Rejected' && (item.reason || item.rejectionReason) && (
                          <>
                            {item.reason && <li><strong>Reason:</strong> {item.reason}</li>}
                            {item.rejectionReason && <li><strong>Rejection Reason:</strong> {item.rejectionReason}</li>}
                          </>
                        )}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : 'None'}
            </Descriptions.Item>
            {selectedLog.action !== 'Request Rejected' && (
              <Descriptions.Item label="Reason">
                {selectedLog.reason || 'N/A'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Room">
              {selectedLog.room || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Time">
              {selectedLog.timeFrom && selectedLog.timeTo
                ? `${selectedLog.timeFrom} - ${selectedLog.timeTo}`
                : 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Date Required">
              {selectedLog.dateRequired || 'N/A'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Content>
  );
};

  return (
    <Layout style={{ minHeight: "100vh"}}>
<Tabs
  activeKey={activeTabKey}
  onChange={(key) => setActiveTabKey(key)}
  className="two-step-tabs"
  items={[
    {
      key: "pending",
      label: (
        <>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          Step 1: Pending
        </>
      ),
      children: renderPendingTab(),
    },
    {
      key: "processed",
      label: (
        <>
          <CheckCircleOutlined style={{ marginRight: 8 }} />
          Step 2: Processed
        </>
      ),
      children: <ProcessedTab />,
    },
  ]}
/>
    </Layout>
  );
};

export default HistoryLog;

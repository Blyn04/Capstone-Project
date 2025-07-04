import React, { useEffect, useState } from "react";
import { Calendar, Badge, Modal, List, Descriptions, Select } from "antd";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../backend/firebase/FirebaseConfig";
import "../styles/customsStyle/CalendarModal.css";

const { Option } = Select;

const CustomCalendar = ({ onSelectDate }) => {
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [selectedDateRequests, setSelectedDateRequests] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProgram, setFilterProgram] = useState("all");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "borrowcatalog"),
      (querySnapshot) => {
        const groupedRequests = {};

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const key = `${data.userName}-${data.dateRequired}`;

          if (!groupedRequests[key]) {
            groupedRequests[key] = {
              date: data.dateRequired,
              userName: data.userName || "N/A",
              room: data.room || "N/A",
              status: data.status || "N/A",
              approvedBy: data.approvedBy || "N/A",
              program: data.program || "N/A",
              requestList: [], // holds all items requested by this user on this date
            };
          }

          if (Array.isArray(data.requestList)) {
            groupedRequests[key].requestList.push(...data.requestList);
          }
        });

        setApprovedRequests(Object.values(groupedRequests));
      },
      (error) => {
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {

  }, [filterStatus, filterProgram, approvedRequests]);


  const filteredApprovedRequests = approvedRequests.filter((item) => {
    const statusMatches =
      filterStatus === "all" || item.status.toLowerCase() === filterStatus;

    const programMatches =
      filterProgram === "all" ||
      item.program?.toLowerCase().trim() === filterProgram.toLowerCase().trim();

    return statusMatches && programMatches;
  });

  // const getListData = (value) => {
  //   const dateStr = value.format("YYYY-MM-DD");
  //   return filteredApprovedRequests
  //     .filter((item) => item.date === dateStr)
  //     .map((item) => {
  //       const status = item.status?.toLowerCase().trim();
  //       let type = "default";

  //       if (status === "borrowed") type = "warning";
  //       else if (status === "deployed") type = "processing";
  //       else if (status === "returned") type = "error";
  //       else if (status === "approved") type = "success";

  //       return {
  //         type,
  //         content: `${item.title}`,
  //       };
  //     });
  // };

  const getListData = (value) => {
    const dateStr = value.format("YYYY-MM-DD");
    return filteredApprovedRequests
      .filter((item) => item.date === dateStr)
      .map((item) => {
        const status = item.status?.toLowerCase().trim();
        let type = "default";

        if (status === "borrowed") type = "warning";
        else if (status === "deployed") type = "processing";
        else if (status === "returned") type = "error";
        else if (status === "return approved") type = "success";

        return {
          type,
          content: `${item.userName}`,
        };
      });
  };

  const dateCellRender = (value) => {
    const listData = getListData(value);
    return (
      <ul className="events">
        {listData.map((item, index) => (
          <li key={index}>
            <Badge status={item.type} text={item.content} />
          </li>
        ))}
      </ul>
    );
  };

  const handleDateSelect = (date) => {
    const dateStr = date.format("YYYY-MM-DD");
    const matchedRequests = filteredApprovedRequests.filter((item) => item.date === dateStr);
    setSelectedDateRequests(matchedRequests);
    setIsModalVisible(true);
    onSelectDate(date);
  };

  return (
    <div style={{borderRadius: '10px', overflow: 'hidden', border: '1px solid #dfdfdf', padding: 25,  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',backgroundColor: '#e9f5f9'}}>
      <div   className="calendar-filters">
        <div>
          <span style={{ marginRight: 8, fontWeight: "bold" }}>Filter by status:</span>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 160 }}
          >
            <Option value="all">All</Option>
            <Option value="return approved">Return Approved</Option>
            <Option value="borrowed">Borrowed</Option>
            <Option value="deployed">Deployed</Option>
            <Option value="returned">Returned</Option>
          </Select>
        </div>

        <div>
          <span style={{ marginRight: 8, fontWeight: "bold" }}>Filter by program:</span>
          <Select
            value={filterProgram}
            onChange={setFilterProgram}
            style={{ width: 200 }}
          >
            <Option value="all">All</Option>
            <Option value="SAM - BSMT">SAM - BSMT</Option>
            <Option value="SAH - BSN">SAH - BSN</Option>
            <Option value="SHS">SHS</Option>
          </Select>
        </div>
      </div>

      <Calendar dateCellRender={dateCellRender} onSelect={handleDateSelect} style={{width: '100%', borderRadius: 10, padding: 10}} className="custom-calendar"/>

      <Modal
        title="Approved Requests"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
        zIndex={1027}
      >
        {selectedDateRequests.length === 0 ? (
          <p>No approved requests for this date.</p>
        ) : (
          <List
            itemLayout="vertical"
            dataSource={selectedDateRequests}
            renderItem={(item, index) => (
              <List.Item key={index}>
                <div style={{ marginBottom: 8, fontWeight: "bold", color: "#1890ff" }}>
                  Requested By: {item.userName} | Status: {item.status}
                </div>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="Room">{item.room}</Descriptions.Item>
                  <Descriptions.Item label="Department">
                    {item.requestList[0]?.department || "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Approved By">{item.approvedBy}</Descriptions.Item>
                  <Descriptions.Item label="Program">{item.program}</Descriptions.Item>
                </Descriptions>
                <div style={{ marginTop: 12 }}>
                  <b>Requested Items:</b>
                  <List
                    dataSource={item.requestList}
                    renderItem={(reqItem, reqIdx) => (
                      <List.Item key={reqIdx}>
                        <Descriptions column={3} size="small" bordered>
                          <Descriptions.Item label="Item Name">{reqItem.itemName}</Descriptions.Item>
                          {/* <Descriptions.Item label="Quantity">
                            {reqItem.quantity}
                            {["Chemical", "Reagent"].includes(reqItem.category) && reqItem.unit ? ` ${reqItem.unit}` : ""}
                            {reqItem.category === "Glasswares" && reqItem.volume ? ` / ${reqItem.volume} ML` : ""}
                          </Descriptions.Item> */}
                          <Descriptions.Item label="Quantity">{reqItem.quantity}</Descriptions.Item>
                          {/* <Descriptions.Item label="Condition">{reqItem.condition}</Descriptions.Item> */}
                        </Descriptions>
                      </List.Item>
                    )}
                  />
                </div>
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
};

export default CustomCalendar;

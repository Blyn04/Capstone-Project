import React, { useState, useEffect, useRef } from "react";
import { Layout, Row, Col, Card, Button, Typography, Space, Modal, Table, notification, Input, Select, Spin } from "antd";
import Sidebar from "../Sidebar";
import AppHeader from "../Header";
import "../styles/adminStyle/PendingRequest.css";
import { db } from "../../backend/firebase/FirebaseConfig"; 
import { collection, getDocs, getDoc, doc, addDoc, query, where, deleteDoc, serverTimestamp, onSnapshot, updateDoc, orderBy } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import RequisitionRequestModal from "../customs/RequisitionRequestModal";
import ApprovedRequestModal from "../customs/ApprovedRequestModal";
import NotificationModal from "../customs/NotificationModal";
import { ArrowDownOutlined, ArrowUpOutlined, DownOutlined, UploadOutlined } from '@ant-design/icons';
const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const PendingRequest = () => {
  const [pageTitle, setPageTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState('');
  const [checkedItems, setCheckedItems] = useState({});
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [requests, setRequests] = useState([]);
  const [selectedApprovedRequest, setSelectedApprovedRequest] = useState(null);
  const [isApprovedModalVisible, setIsApprovedModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [uncheckedItems, setUncheckedItems] = useState([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pendingApprovalData, setPendingApprovalData] = useState(null); 
  const [isMultiRejectModalVisible, setIsMultiRejectModalVisible] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [isFinalizeModalVisible, setIsFinalizeModalVisible] = useState(false);
  const [firstRequestMap, setFirstRequestMap] = useState({});
  const [pRequests, setPRequests] = useState([]);
  const [loading, setLoading] = useState(true);

// const filteredRequests = requests.filter((request) => {
//   const searchLower = searchTerm.toLowerCase();
//   return (
//     request.userName?.toLowerCase().includes(searchLower) ||
//     request.room?.toLowerCase().includes(searchLower) ||
//     request.course?.toLowerCase().includes(searchLower) ||
//     request.courseDescription?.toLowerCase().includes(searchLower)
//   );
// });
 const [selectedFilter, setSelectedFilter] = useState('All');
const filteredRequests = requests.filter((request) => {
  // Filter by usage type
  const matchesFilter =
    selectedFilter === 'All' || request.usageType === selectedFilter;

  // Filter by search term
  const searchLower = searchTerm.toLowerCase();
  const matchesSearch =
    request.userName?.toLowerCase().includes(searchLower) ||
    request.room?.toLowerCase().includes(searchLower) ||
    request.course?.toLowerCase().includes(searchLower) ||
    request.courseDescription?.toLowerCase().includes(searchLower);

  return matchesFilter && matchesSearch;
});

// useEffect(() => {
//   const userRequestRef = collection(db, "userrequests");
//   const q = query(userRequestRef, orderBy("timestamp", "desc"));

//   const unsubscribe = onSnapshot(
//     q,
//     async (querySnapshot) => {
//       setLoading(true); // Start loading

//       const fetched = [];

//       for (const docSnap of querySnapshot.docs) {
//         const data = docSnap.data();

//         const enrichedItems = await Promise.all(
//           (data.filteredMergedData || []).map(async (item) => {
//             const inventoryId = item.selectedItemId || item.selectedItem?.value;
//             let itemId = "N/A";

//             if (inventoryId) {
//               try {
//                 const invDoc = await getDoc(doc(db, `inventory/${inventoryId}`));
//                 if (invDoc.exists()) {
//                   itemId = invDoc.data().itemId || "N/A";
//                 }
//               } catch (err) {
              
//               }
//             }

//             return {
//               ...item,
//               itemIdFromInventory: itemId,
//             };
//           })
//         );

//         fetched.push({
//           id: docSnap.id,
//           ...data,
//           requestList: enrichedItems,
//           timeFrom: data.timeFrom || "N/A",
//           timeTo: data.timeTo || "N/A",
//         });
//       }

//       setRequests(fetched);
//       setLoading(false); // End loading
//     },
//     (error) => {
     
//       setLoading(false);
//     }
//   );

//   return () => unsubscribe();
// }, []);

useEffect(() => {
  const userRequestRef = collection(db, "userrequests");
  const q = query(userRequestRef, orderBy("timestamp", "desc"));

  const unsubscribe = onSnapshot(
    q,
    async (querySnapshot) => {
      setLoading(true); // Start loading

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
            };
          })
        );

        fetched.push({
          id: docSnap.id,
          ...data,
          requestList: enrichedItems,
          timeFrom: data.timeFrom || "N/A",
          timeTo: data.timeTo || "N/A",
        });
      }

      // setRequests(fetched);

      // Determine first requests per item per date
      const firstRequestsMap = {};

      fetched.forEach((req) => {
        const date = req.dateRequired;
        const timestamp = req.timestamp?.toDate?.() || new Date(); // make sure it's a Date object

        (req.requestList || []).forEach((item) => {
          const key = `${item.selectedItemId}_${date}`;
          
          // If key is not set or current request is earlier, update it
          if (!firstRequestsMap[key] || timestamp < firstRequestsMap[key].timestamp) {
            firstRequestsMap[key] = {
              requestId: req.id,
              timestamp,
            };
          }
        });
      });

      const simpleFirstRequestMap = {};
      for (const key in firstRequestsMap) {
        simpleFirstRequestMap[key] = firstRequestsMap[key].requestId;
      }

      setRequests(fetched);
      setFirstRequestMap(simpleFirstRequestMap);

      setLoading(false); // End loading
    },
    (error) => {
     
      setLoading(false);
    }
  );

  return () => unsubscribe();
}, []);


  
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setCheckedItems({});
    setIsModalVisible(false);
    setSelectedRequest(null);
  };

  const handleOpenFinalizeModal = () => {
    setIsMultiRejectModalVisible(false);
    setIsFinalizeModalVisible(true);
  };



   const handleMultiRejectConfirm = async () => {
 
    setIsMultiRejectModalVisible(false);
  
    const { enrichedItems, uncheckedItems, selectedRequest } = pendingApprovalData;

    try {
      const accountRef = doc(db, "accounts", selectedRequest.accountId);
      const accountSnap = await getDoc(accountRef);

      if (accountSnap.exists()) {
        const accountData = accountSnap.data();
        const isDisabled = accountData.disabled || false; // Adjust field name if different

        if (isDisabled) {
          setNotificationMessage("Cannot approve: The user's account is disabled.");
          setIsNotificationVisible(true);
          return;
        }
        
      } else {
      
      }

    } catch (error) {

      setNotificationMessage("Error verifying account status. Please try again.");
      setIsNotificationVisible(true);
      return;
    }
  
    try {
      const rejectedItems = await Promise.all(
        uncheckedItems.map(async (item, index) => {
          const selectedItemId = item.selectedItemId || item.selectedItem?.value;
          const itemKey = `${selectedItemId}-${index}`;
          let itemType = "Unknown";
  
          if (selectedItemId) {
            try {
              const inventoryDoc = await getDoc(doc(db, "inventory", selectedItemId));
              if (inventoryDoc.exists()) {
                itemType = inventoryDoc.data().type || "Unknown";
              }

            } catch (err) {
    
            }
          }
  
          return {
            ...item,
            selectedItemId,
            itemType,
            reason: rejectionReasons[itemKey] || "No reason provided",
          };
        })
      );
  
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userEmail = currentUser.email;
  
      // Fetch the user name from Firestore
      let userName = "Unknown";
      try {
        const userQuery = query(collection(db, "accounts"), where("email", "==", userEmail));
        const userSnapshot = await getDocs(userQuery);
  
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          userName = userData.name || "Unknown";
        }

      } catch (error) {

      }
  
      const requestLogEntry = {
        accountId: selectedRequest.accountId || "N/A",
        userName: selectedRequest.userName || "N/A",
        room: selectedRequest.room || "N/A",
        course: selectedRequest.course || "N/A",
        courseDescription: selectedRequest.courseDescription || "N/A",
        dateRequired: selectedRequest.dateRequired || "N/A",
        timeFrom: selectedRequest.timeFrom || "N/A",
        timeTo: selectedRequest.timeTo || "N/A",
        timestamp: selectedRequest.timestamp || "N/A",
        rawTimestamp: new Date(),
        requestList: enrichedItems,
        status: "Approved",
        approvedBy: userName,
        reason: selectedRequest.reason || "No reason provided",
        program: selectedRequest.program,
      };
  
      const rejectLogEntry = {
        accountId: selectedRequest.accountId || "N/A",
        userName: selectedRequest.userName || "N/A",
        room: selectedRequest.room || "N/A",
        course: selectedRequest.course || "N/A",
        courseDescription: selectedRequest.courseDescription || "N/A",
        dateRequired: selectedRequest.dateRequired || "N/A",
        timeFrom: selectedRequest.timeFrom || "N/A",
        timeTo: selectedRequest.timeTo || "N/A",
        timestamp: selectedRequest.timestamp || "N/A",
        rawTimestamp: new Date(),
        requestList: rejectedItems,
        status: "Rejected",
        rejectedBy: userName,
        reason: rejectionReason || "No reason provided",
        program: selectedRequest.program,
      };
  
      const logRequestOrReturn = async (
        userId,
        userName,
        action,
        requestDetails,
        extraInfo = {}
      ) => {
        await addDoc(collection(db, `accounts/${userId}/historylog`), {
          action,
          userName,
          timestamp: serverTimestamp(),
          requestList: requestDetails,
          ...extraInfo,
        });
      };
  
      // Log approved items
      await logRequestOrReturn(
        selectedRequest.accountId,
        selectedRequest.userName,
        "Request Approved",
        enrichedItems,
        {
          approvedBy: userName,
          course: selectedRequest.course || "N/A",
          courseDescription: selectedRequest.courseDescription || "N/A",
          dateRequired: selectedRequest.dateRequired,
          reason: selectedRequest.reason,
          room: selectedRequest.room,
          program: selectedRequest.program,
          timeFrom: selectedRequest.timeFrom || "N/A",
          timeTo: selectedRequest.timeTo || "N/A",
          timestamp: selectedRequest.timestamp || "N/A",
          rawTimestamp: new Date(),
        }
      );
  
      // Log rejected items
      if (rejectedItems.length > 0) {
        await logRequestOrReturn(
          selectedRequest.accountId,
          selectedRequest.userName,
          "Request Rejected",
          rejectedItems,
          {
            rejectedBy: userName,
            course: selectedRequest.course || "N/A",
            courseDescription: selectedRequest.courseDescription || "N/A",
            dateRequired: selectedRequest.dateRequired,
            reason: rejectedItems.map(item => item.reason).join(", ") || "No reason provided",
            room: selectedRequest.room,
            program: selectedRequest.program,
            timeFrom: selectedRequest.timeFrom || "N/A",
            timeTo: selectedRequest.timeTo || "N/A",
            timestamp: selectedRequest.timestamp || "N/A",
            rawTimestamp: new Date(),
          }
        );
      }




try {
        for (const item of enrichedItems) {
          const inventoryId = item.selectedItemId;
          const requestedQty = Number(item.quantity);
          const labRoomId = item.labRoom;

          if (!inventoryId || isNaN(requestedQty) || requestedQty <= 0) {
           
            continue;
          }

          if (!labRoomId) {
         
            continue;
          }

          const inventoryRef = doc(db, "inventory", inventoryId);
          const inventorySnap = await getDoc(inventoryRef);
          if (!inventorySnap.exists()) {
           
            continue;
          }

          const data = inventorySnap.data();
          const currentQty = Number(data.quantity || 0);
          const newQty = Math.max(currentQty - requestedQty, 0);
          await updateDoc(inventoryRef, { quantity: newQty });
         

          // ⚙️ Update inventory condition breakdown
          let remaining = requestedQty;
          const good = data.condition?.Good ?? 0;
          const damage = data.condition?.Damage ?? 0;
          const defect = data.condition?.Defect ?? 0;

          let newGood = good;
          let newDamage = damage;
          let newDefect = defect;

          if (remaining > 0) {
            const deductFromGood = Math.min(newGood, remaining);
            newGood -= deductFromGood;
            remaining -= deductFromGood;
          }

          if (remaining > 0) {
            const deductFromDamage = Math.min(newDamage, remaining);
            newDamage -= deductFromDamage;
            remaining -= deductFromDamage;
          }

          if (remaining > 0) {
            const deductFromDefect = Math.min(newDefect, remaining);
            newDefect -= deductFromDefect;
            remaining -= deductFromDefect;
          }

          await updateDoc(inventoryRef, {
            'condition.Good': newGood,
            'condition.Damage': newDamage,
            'condition.Defect': newDefect
          });

         


          // 🔁 Update labRoom item quantity
          const roomNumber = item.labRoom; // e.g. "0930"
          const labRoomCollectionRef = collection(db, "labRoom");
          const q = query(labRoomCollectionRef, where("roomNumber", "==", roomNumber));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
           
            return;
          }

          // 2. Get Firestore doc ID of the labRoom
          const labRoomDoc = querySnapshot.docs[0];
          const labRoomDocId = labRoomDoc.id;

          // 3. Query items subcollection for item with matching itemId
          const itemId = data.itemId; // e.g. "DENT02"
          const itemsCollectionRef = collection(db, "labRoom", labRoomDocId, "items");
          const itemQuery = query(itemsCollectionRef, where("itemId", "==", itemId));
          const itemSnapshot = await getDocs(itemQuery);

          if (itemSnapshot.empty) {
          
            return;
          }

          // 4. Get the Firestore doc ID of the item document
          const itemDoc = itemSnapshot.docs[0];
          const itemDocId = itemDoc.id;
          const labRoomItemRef = doc(db, "labRoom", labRoomDocId, "items", itemDocId);
          const labData = itemDoc.data();

          const currentLabQty = Number(labData.quantity || 0);
          const newLabQty = Math.max(currentLabQty - requestedQty, 0);
          await updateDoc(labRoomItemRef, { quantity: newLabQty });
        

          // Update condition breakdown
          let labGood = labData.condition?.Good ?? 0;
          let labDamage = labData.condition?.Damage ?? 0;
          let labDefect = labData.condition?.Defect ?? 0;

          let remainingLab = requestedQty;

          if (remainingLab > 0) {
            const deductFromLabGood = Math.min(labGood, remainingLab);
            labGood -= deductFromLabGood;
            remainingLab -= deductFromLabGood;
          }

          if (remainingLab > 0) {
            const deductFromLabDamage = Math.min(labDamage, remainingLab);
            labDamage -= deductFromLabDamage;
            remainingLab -= deductFromLabDamage;
          }

          if (remainingLab > 0) {
            const deductFromLabDefect = Math.min(labDefect, remainingLab);
            labDefect -= deductFromLabDefect;
            remainingLab -= deductFromLabDefect;
          }

          await updateDoc(labRoomItemRef, {
            'condition.Good': labGood,
            'condition.Damage': labDamage,
            'condition.Defect': labDefect
          });

        
        }
        
      } catch (err) {
       
      }
    
      await addDoc(collection(db, "requestlog"), requestLogEntry);
  
      if (rejectedItems.length > 0) {
        await addDoc(collection(db, "requestlog"), rejectLogEntry);
      }
  
      const fixedItems = enrichedItems.filter(item => item.itemType === "Fixed");
  
      if (fixedItems.length > 0) {
        const formattedItems = fixedItems.map(item => ({
          category: item.category || "N/A",
          condition: item.condition || "N/A",
          department: item.department || "N/A",
          itemName: item.itemName || "N/A",
          itemDetails: item.itemDetails || "N/A",
          itemId: item.itemIdFromInventory,
          quantity: item.quantity || "1",
          selectedItemId: item.selectedItemId || "N/A",
          status: item.status || "Available",
          program: item.program || "N/A",
          course: item.course || "N/A",
          courseDescription: item.courseDescription || "N/A",
          reason: item.reason || "No reason provided",
          labRoom: item.labRoom || "N/A",
          timeFrom: item.timeFrom || "N/A",
          timeTo: item.timeTo || "N/A",
          usageType: item.usageType || "N/A",
          scannedCount: 0,
        }));
  
        const borrowCatalogEntry = {
          accountId: selectedRequest.accountId || "N/A",
          userName: selectedRequest.userName || "N/A",
          room: selectedRequest.room || "N/A",
          course: selectedRequest.course || "N/A",
          courseDescription: selectedRequest.courseDescription || "N/A",
          dateRequired: selectedRequest.dateRequired || "N/A",
          timeFrom: selectedRequest.timeFrom || "N/A",
          timeTo: selectedRequest.timeTo || "N/A",
          timestamp: selectedRequest.timestamp || "N/A",
          rawTimestamp: new Date(),
          requestList: formattedItems,
          status: "Borrowed",
          approvedBy: userName,
          reason: selectedRequest.reason || "No reason provided",
          program: selectedRequest.program,
        };
  
        const userRequestLogEntry = {
          ...requestLogEntry,
          status: "Approved",
          approvedBy: userName,
          timestamp: selectedRequest.timestamp || "N/A",
          rawTimestamp: new Date(),
        };
  
        await addDoc(collection(db, "borrowcatalog"), borrowCatalogEntry);
  
        await addDoc(collection(db, "accounts", selectedRequest.accountId, "userrequestlog"), userRequestLogEntry);
      }
  
      await deleteDoc(doc(db, "userrequests", selectedRequest.id));
  
      // Delete matching user request subcollection doc
      const subCollectionRef = collection(db, "accounts", selectedRequest.accountId, "userRequests");
      const subDocsSnap = await getDocs(subCollectionRef);
  
      subDocsSnap.forEach(async (docSnap) => {
        const data = docSnap.data();
        const match = (
          data.timestamp?.seconds === selectedRequest.timestamp?.seconds &&
          data.filteredMergedData?.[0]?.selectedItemId === selectedRequest.filteredMergedData?.[0]?.selectedItemId
        );
  
        if (match) {
        
          await deleteDoc(doc(db, "accounts", selectedRequest.accountId, "userRequests", docSnap.id));
        }
      });
  
      setApprovedRequests(prev => [...prev, requestLogEntry]);
      setRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
      setCheckedItems({});
      setIsModalVisible(false);
      setSelectedRequest(null);
      setIsFinalizeModalVisible(false)
  
      notification.success({
        message: "Request Processed",
        description: "Approval and rejection have been logged successfully.",
      });
  
    } catch (error) {
      
      notification.error({
        message: "Error",
        description: "Failed to process the request after rejection confirmation.",
      });
    }
  };

 

   const handleRejectConfirm = async () => {  
    setIsMultiRejectModalVisible(false);
  
    const { enrichedItems, uncheckedItems, selectedRequest } = pendingApprovalData;

    try {
      const accountRef = doc(db, "accounts", selectedRequest.accountId);
      const accountSnap = await getDoc(accountRef);

      if (accountSnap.exists()) {
        const accountData = accountSnap.data();
        const isDisabled = accountData.disabled || false; // Adjust field name if different

        if (isDisabled) {
          setNotificationMessage("Cannot approve: The user's account is disabled.");
          setIsNotificationVisible(true);
          return;
        }
        
      } else {
      
      }

    } catch (error) {
     
      setNotificationMessage("Error verifying account status. Please try again.");
      setIsNotificationVisible(true);
      return;
    }
  
    try {
      const rejectedItems = await Promise.all(
        uncheckedItems.map(async (item, index) => {
          const selectedItemId = item.selectedItemId || item.selectedItem?.value;
          let itemType = "Unknown";
      
          if (selectedItemId) {
            try {
              const inventoryDoc = await getDoc(doc(db, "inventory", selectedItemId));
              if (inventoryDoc.exists()) {
                itemType = inventoryDoc.data().type || "Unknown";
              }
            } catch (err) {
            
            }
          }
      
          const itemKey = `${selectedItemId}-${index}`;
          const rejectionReason = rejectionReasons[itemKey] || "No reason provided";
      
          return {
            ...item,
            selectedItemId,
            itemType,
            rejectionReason,
          };
        })
      );
  
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userEmail = currentUser.email;
  
      // Fetch the user name from Firestore
      let userName = "Unknown";
      try {
        const userQuery = query(collection(db, "accounts"), where("email", "==", userEmail));
        const userSnapshot = await getDocs(userQuery);
  
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          userName = userData.name || "Unknown";
        }

      } catch (error) {
       
      }
  
      const requestLogEntry = {
        accountId: selectedRequest.accountId || "N/A",
        userName: selectedRequest.userName || "N/A",
        room: selectedRequest.room || "N/A",
        course: selectedRequest.course || "N/A",
        courseDescription: selectedRequest.courseDescription || "N/A",
        dateRequired: selectedRequest.dateRequired || "N/A",
        timeFrom: selectedRequest.timeFrom || "N/A",
        timeTo: selectedRequest.timeTo || "N/A",
        timestamp: selectedRequest.timestamp || "N/A",
        rawTimestamp: new Date(),
        requestList: enrichedItems,
        status: "Approved",
        approvedBy: userName,
        reason: selectedRequest.reason || "No reason provided",
        program: selectedRequest.program,
      };
  
      const rejectLogEntry = {
        accountId: selectedRequest.accountId || "N/A",
        userName: selectedRequest.userName || "N/A",
        room: selectedRequest.room || "N/A",
        course: selectedRequest.course || "N/A",
        courseDescription: selectedRequest.courseDescription || "N/A",
        dateRequired: selectedRequest.dateRequired || "N/A",
        timeFrom: selectedRequest.timeFrom || "N/A",
        timeTo: selectedRequest.timeTo || "N/A",
        timestamp: selectedRequest.timestamp || "N/A",
        rawTimestamp: new Date(),
        requestList: rejectedItems,
        status: "Rejected",
        rejectedBy: userName,
        program: selectedRequest.program,
      };
  
      const logRequestOrReturn = async (
        userId,
        userName,
        action,
        requestDetails,
        extraInfo = {}
      ) => {
        await addDoc(collection(db, `accounts/${userId}/historylog`), {
          action,
          userName,
          timestamp: serverTimestamp(),
          requestList: requestDetails,
          ...extraInfo,
        });
      };
  

      if (enrichedItems.length > 0) {
        await addDoc(collection(db, "requestlog"), requestLogEntry);

        await logRequestOrReturn(
          selectedRequest.accountId,
          selectedRequest.userName,
          "Request Approved",
          enrichedItems,
          {
            approvedBy: userName,
            course: selectedRequest.course || "N/A",
            courseDescription: selectedRequest.courseDescription || "N/A",
            dateRequired: selectedRequest.dateRequired,
            reason: selectedRequest.reason,
            room: selectedRequest.room,
            program: selectedRequest.program,
            timeFrom: selectedRequest.timeFrom || "N/A",
            timeTo: selectedRequest.timeTo || "N/A",
            timestamp: selectedRequest.timestamp || "N/A",
            rawTimestamp: new Date(),
          }
        );
      }
  
      // Log rejected items
      if (rejectedItems.length > 0) {
        await logRequestOrReturn(
          selectedRequest.accountId,
          selectedRequest.userName,
          "Request Rejected",
          rejectedItems,
          {
            rejectedBy: userName,
            course: selectedRequest.course || "N/A",
            courseDescription: selectedRequest.courseDescription || "N/A",
            dateRequired: selectedRequest.dateRequired,
            reason: rejectionReason || "No reason provided",
            room: selectedRequest.room,
            program: selectedRequest.program,
            timeFrom: selectedRequest.timeFrom || "N/A",
            timeTo: selectedRequest.timeTo || "N/A",
            timestamp: selectedRequest.timestamp || "N/A",
            rawTimestamp: new Date(),
          }
        );
      }

   
   
try {
        for (const item of enrichedItems) {
          const inventoryId = item.selectedItemId;
          const requestedQty = Number(item.quantity);
          const labRoomId = item.labRoom;

          if (!inventoryId || isNaN(requestedQty) || requestedQty <= 0) {
           
            continue;
          }

          if (!labRoomId) {
           
            continue;
          }

          const inventoryRef = doc(db, "inventory", inventoryId);
          const inventorySnap = await getDoc(inventoryRef);
          if (!inventorySnap.exists()) {
           
            continue;
          }

          const data = inventorySnap.data();
          const currentQty = Number(data.quantity || 0);
          const newQty = Math.max(currentQty - requestedQty, 0);
          await updateDoc(inventoryRef, { quantity: newQty });
      

          // ⚙️ Update inventory condition breakdown
          let remaining = requestedQty;
          const good = data.condition?.Good ?? 0;
          const damage = data.condition?.Damage ?? 0;
          const defect = data.condition?.Defect ?? 0;

          let newGood = good;
          let newDamage = damage;
          let newDefect = defect;

          if (remaining > 0) {
            const deductFromGood = Math.min(newGood, remaining);
            newGood -= deductFromGood;
            remaining -= deductFromGood;
          }

          if (remaining > 0) {
            const deductFromDamage = Math.min(newDamage, remaining);
            newDamage -= deductFromDamage;
            remaining -= deductFromDamage;
          }

          if (remaining > 0) {
            const deductFromDefect = Math.min(newDefect, remaining);
            newDefect -= deductFromDefect;
            remaining -= deductFromDefect;
          }

          await updateDoc(inventoryRef, {
            'condition.Good': newGood,
            'condition.Damage': newDamage,
            'condition.Defect': newDefect
          });

      
          
          // 🔁 Update labRoom item quantity
          const roomNumber = item.labRoom; // e.g. "0930"
          const labRoomCollectionRef = collection(db, "labRoom");
          const q = query(labRoomCollectionRef, where("roomNumber", "==", roomNumber));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
          
            return;
          }

          // 2. Get Firestore doc ID of the labRoom
          const labRoomDoc = querySnapshot.docs[0];
          const labRoomDocId = labRoomDoc.id;

          // 3. Query items subcollection for item with matching itemId
          const itemId = data.itemId; // e.g. "DENT02"
          const itemsCollectionRef = collection(db, "labRoom", labRoomDocId, "items");
          const itemQuery = query(itemsCollectionRef, where("itemId", "==", itemId));
          const itemSnapshot = await getDocs(itemQuery);

          if (itemSnapshot.empty) {
           
            return;
          }

          // 4. Get the Firestore doc ID of the item document
          const itemDoc = itemSnapshot.docs[0];
          const itemDocId = itemDoc.id;
          const labRoomItemRef = doc(db, "labRoom", labRoomDocId, "items", itemDocId);
          const labData = itemDoc.data();

          const currentLabQty = Number(labData.quantity || 0);
          const newLabQty = Math.max(currentLabQty - requestedQty, 0);
          await updateDoc(labRoomItemRef, { quantity: newLabQty });
         

          // Update condition breakdown
          let labGood = labData.condition?.Good ?? 0;
          let labDamage = labData.condition?.Damage ?? 0;
          let labDefect = labData.condition?.Defect ?? 0;

          let remainingLab = requestedQty;

          if (remainingLab > 0) {
            const deductFromLabGood = Math.min(labGood, remainingLab);
            labGood -= deductFromLabGood;
            remainingLab -= deductFromLabGood;
          }

          if (remainingLab > 0) {
            const deductFromLabDamage = Math.min(labDamage, remainingLab);
            labDamage -= deductFromLabDamage;
            remainingLab -= deductFromLabDamage;
          }

          if (remainingLab > 0) {
            const deductFromLabDefect = Math.min(labDefect, remainingLab);
            labDefect -= deductFromLabDefect;
            remainingLab -= deductFromLabDefect;
          }

          await updateDoc(labRoomItemRef, {
            'condition.Good': labGood,
            'condition.Damage': labDamage,
            'condition.Defect': labDefect
          });

          
        }
        
      } catch (err) {
       
      }  

      // await addDoc(collection(db, "requestlog"), requestLogEntry);
  
      if (rejectedItems.length > 0) {
        await addDoc(collection(db, "requestlog"), rejectLogEntry);
      }
  
   
      // Process Borrow Catalog
      const fixedItems = enrichedItems.filter(item => item.itemType === "Fixed");
  
      if (fixedItems.length > 0) {
        const formattedItems = fixedItems.map(item => ({
          category: item.category || "N/A",
          condition: item.condition || "N/A",
          department: item.department || "N/A",
          itemName: item.itemName || "N/A",
          itemDetails: item.itemDetails || "N/A",
          itemId: item.itemIdFromInventory,
          quantity: item.quantity || "1",
          selectedItemId: item.selectedItemId || "N/A",
          status: item.status || "Available",
          program: item.program || "N/A",
          course: item.course || "N/A",
          courseDescription: item.courseDescription || "N/A",
          reason: item.reason || "No reason provided",
          labRoom: item.labRoom || "N/A",
          timeFrom: item.timeFrom || "N/A",
          timeTo: item.timeTo || "N/A",
          usageType: item.usageType || "N/A",
          scannedCount: 0,
        }));
  
        const borrowCatalogEntry = {
          accountId: selectedRequest.accountId || "N/A",
          userName: selectedRequest.userName || "N/A",
          room: selectedRequest.room || "N/A",
          course: selectedRequest.course || "N/A",
          courseDescription: selectedRequest.courseDescription || "N/A",
          dateRequired: selectedRequest.dateRequired || "N/A",
          timeFrom: selectedRequest.timeFrom || "N/A",
          timeTo: selectedRequest.timeTo || "N/A",
          timestamp: selectedRequest.timestamp || "N/A",
          rawTimestamp: new Date(),
          requestList: formattedItems,
          status: "Borrowed",
          approvedBy: userName,
          reason: selectedRequest.reason || "No reason provided",
          program: selectedRequest.program,
        };
  
        const userRequestLogEntry = {
          ...requestLogEntry,
          status: "Approved",
          approvedBy: userName,
          timestamp: selectedRequest.timestamp || "N/A",
          rawTimestamp: new Date(),
        };
  
        await addDoc(collection(db, "borrowcatalog"), borrowCatalogEntry);
  
        await addDoc(collection(db, "accounts", selectedRequest.accountId, "userrequestlog"), userRequestLogEntry);
      }
  
      await deleteDoc(doc(db, "userrequests", selectedRequest.id));
  
      // Delete matching user request subcollection doc
      const subCollectionRef = collection(db, "accounts", selectedRequest.accountId, "userRequests");
      const subDocsSnap = await getDocs(subCollectionRef);
  
      subDocsSnap.forEach(async (docSnap) => {
        const data = docSnap.data();
        const match = (
          data.timestamp?.seconds === selectedRequest.timestamp?.seconds &&
          data.filteredMergedData?.[0]?.selectedItemId === selectedRequest.filteredMergedData?.[0]?.selectedItemId
        );
  
        if (match) {
      
          await deleteDoc(doc(db, "accounts", selectedRequest.accountId, "userRequests", docSnap.id));
        }
      });
  
      setApprovedRequests(prev => [...prev, requestLogEntry]);
      setRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
      setCheckedItems({});
      setIsModalVisible(false);
      setSelectedRequest(null);
      setIsFinalizeModalVisible(false)
  
      notification.success({
        message: "Request Processed",
        description: "Approval and rejection have been logged successfully.",
      });
  
    } catch (error) {
    
      notification.error({
        message: "Error",
        description: "Failed to process the request after rejection confirmation.",
      });
    }
  };
  
 

  const handleApprove = async () => {  
  const isChecked = Object.values(checkedItems).some((checked) => checked);

  if (!isChecked) {
    setNotificationMessage("No Items selected");
    setIsNotificationVisible(true);
    return;
  }

  if (selectedRequest) {

    try {
      const accountRef = doc(db, "accounts", selectedRequest.accountId);
      const accountSnap = await getDoc(accountRef);

      if (accountSnap.exists()) {
        const accountData = accountSnap.data();
        const isDisabled = accountData.disabled || false; // Adjust field name if different

        if (isDisabled) {
          setNotificationMessage("Cannot approve: The user's account is disabled.");
          setIsNotificationVisible(true);
          return;
        }
        
      } else {
      
      }

    } catch (error) {
     
      setNotificationMessage("Error verifying account status. Please try again.");
      setIsNotificationVisible(true);
      return;
    }

    // Filter checked items and prepare for approval
    const filteredItems = selectedRequest.requestList.filter((item, index) => {
      const key = `${selectedRequest.id}-${index}`;
      return checkedItems[key];
    });

    if (filteredItems.length === 0) {
      setNotificationMessage("No Items selected");
      setIsNotificationVisible(true);
      return;
    }
    


    const enrichedItems = await Promise.all(
      filteredItems.map(async (item) => {
        const selectedItemId = item.selectedItemId || item.selectedItem?.value;
        let itemType = "Unknown";

        if (selectedItemId) {
          try {
            const inventoryDoc = await getDoc(doc(db, "inventory", selectedItemId));

            if (inventoryDoc.exists()) {
              itemType = inventoryDoc.data().type || "Unknown";
            }

          } catch (err) {
          
          }
        }

        const enriched = {
          ...item,
          selectedItemId,
          itemType,
          // volume: item.volume ?? "N/A", // <-- add this
        };
    
      
        return enriched;
      })
    );

    // Filter out unchecked items (for rejection)
    const uncheckedItems = selectedRequest.requestList.filter((item, index) => {
      const key = `${selectedRequest.id}-${index}`;
      return !checkedItems[key]; // This will get the unchecked items
    });

    // Define rejectionReason variable outside of the condition
    let rejectionReason = null;


    if (uncheckedItems.length > 0) {
     
      setPendingApprovalData({
        enrichedItems,
        uncheckedItems,
        selectedRequest,
      });
      setIsMultiRejectModalVisible(true); // ✅ Show new modal for multiple items
      return;
    }

    // Process rejected items
    const rejectedItems = await Promise.all(
      uncheckedItems.map(async (item) => {
        const selectedItemId = item.selectedItemId || item.selectedItem?.value;
        let itemType = "Unknown";

        if (selectedItemId) {
          try {
            const inventoryDoc = await getDoc(doc(db, "inventory", selectedItemId));
            if (inventoryDoc.exists()) {
              itemType = inventoryDoc.data().type || "Unknown";
            }

          } catch (err) {
        
          }
        }

        return {
          ...item,
          selectedItemId,
          itemType, 
          volume: item.volume ?? "N/A", // <-- add this
        };
      })
    );

    const auth = getAuth();
    const currentUser = auth.currentUser;
    const userEmail = currentUser.email;

    // Fetch the user name from Firestore
    let userName = "Unknown";
    try {
      const userQuery = query(collection(db, "accounts"), where("email", "==", userEmail));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        userName = userData.name || "Unknown";
      }

    } catch (error) {

    }

    const requestLogEntry = {
      accountId: selectedRequest.accountId || "N/A",
      userName: selectedRequest.userName || "N/A",
      room: selectedRequest.room || "N/A",
      course: selectedRequest.course || "N/A",
      courseDescription: selectedRequest.courseDescription || "N/A",
      dateRequired: selectedRequest.dateRequired || "N/A",
      timeFrom: selectedRequest.timeFrom || "N/A",  
      timeTo: selectedRequest.timeTo || "N/A",  
      timestamp: selectedRequest.timestamp || "N/A",
      rawTimestamp: new Date(),
      requestList: enrichedItems, 
      status: "Approved", 
      approvedBy: userName, 
      reason: selectedRequest.reason || "No reason provided",
      program: selectedRequest.program,
    };

    const rejectLogEntry = {
      accountId: selectedRequest.accountId || "N/A",
      userName: selectedRequest.userName || "N/A",
      room: selectedRequest.room || "N/A",
      course: selectedRequest.couse || "N/A",
      courseDescription: selectedRequest.courseDescription || "N/A",
      dateRequired: selectedRequest.dateRequired || "N/A",
      timeFrom: selectedRequest.timeFrom || "N/A",  
      timeTo: selectedRequest.timeTo || "N/A",  
      timestamp: selectedRequest.timestamp || "N/A",
      rawTimestamp: new Date(),
      requestList: rejectedItems, 
      status: "Rejected", 
      rejectedBy: userName, 
      reason: rejectionReason || "No reason provided",  // Use the rejection reason from the input prompt
      program: selectedRequest.program,
    };

    // Log approved items in historylog subcollection
    const logRequestOrReturn = async (
      userId,
      userName,
      action,
      requestDetails,
      extraInfo = {} // for fields like dateRequired, approvedBy, etc.
    ) => {
      await addDoc(collection(db, `accounts/${userId}/historylog`), {
        action,
        userName,
        timestamp: serverTimestamp(),
        requestList: requestDetails,
        ...extraInfo, // merge additional data like dateRequired, reason, etc.
      });
    };

    // Log approved items
    await logRequestOrReturn(
      selectedRequest.accountId,     // user ID
      selectedRequest.userName,      // user name
      "Request Approved",            // action
      enrichedItems,                 // request list
      {
        approvedBy: userName, // whoever approved
        course: selectedRequest.course || "N/A",
        courseDescription: selectedRequest.courseDescription || "N/A",
        dateRequired: selectedRequest.dateRequired,
        reason: selectedRequest.reason,
        room: selectedRequest.room,
        program: selectedRequest.program,
        timeFrom: selectedRequest.timeFrom || "N/A",  // Include timeFrom
        timeTo: selectedRequest.timeTo || "N/A",  
        timestamp: selectedRequest.timestamp || "N/A",
        rawTimestamp: new Date(),
      }
    );

    // Log rejected items
    if (rejectedItems.length > 0) {
      await logRequestOrReturn(
        selectedRequest.accountId,     // user ID
        selectedRequest.userName,      // user name
        "Request Rejected",            // action
        rejectedItems,                 // request list
        {
          rejectedBy: userName, // whoever rejected
          course: selectedRequest.course || "N/A",
          courseDescription: selectedRequest.courseDescription || "N/A",
          dateRequired: selectedRequest.dateRequired,
          reason: rejectionReason || "No reason provided",  // Reason for rejection
          room: selectedRequest.room,
          program: selectedRequest.program,
          timeFrom: selectedRequest.timeFrom || "N/A",  // Include timeFrom
          timeTo: selectedRequest.timeTo || "N/A",  
          timestamp: selectedRequest.timestamp || "N/A",
          rawTimestamp: new Date(),
        }
      );
    }


try {
        for (const item of enrichedItems) {
          const inventoryId = item.selectedItemId;
          const requestedQty = Number(item.quantity);
          const labRoomId = item.labRoom;

          if (!inventoryId || isNaN(requestedQty) || requestedQty <= 0) {
        
            continue;
          }

          if (!labRoomId) {

            continue;
          }

          const inventoryRef = doc(db, "inventory", inventoryId);
          const inventorySnap = await getDoc(inventoryRef);
          if (!inventorySnap.exists()) {
      
            continue;
          }

          const data = inventorySnap.data();
          const currentQty = Number(data.quantity || 0);
          const newQty = Math.max(currentQty - requestedQty, 0);
          await updateDoc(inventoryRef, { quantity: newQty });
        

          // ⚙️ Update inventory condition breakdown
          let remaining = requestedQty;
          const good = data.condition?.Good ?? 0;
          const damage = data.condition?.Damage ?? 0;
          const defect = data.condition?.Defect ?? 0;

          let newGood = good;
          let newDamage = damage;
          let newDefect = defect;

          if (remaining > 0) {
            const deductFromGood = Math.min(newGood, remaining);
            newGood -= deductFromGood;
            remaining -= deductFromGood;
          }

          if (remaining > 0) {
            const deductFromDamage = Math.min(newDamage, remaining);
            newDamage -= deductFromDamage;
            remaining -= deductFromDamage;
          }

          if (remaining > 0) {
            const deductFromDefect = Math.min(newDefect, remaining);
            newDefect -= deductFromDefect;
            remaining -= deductFromDefect;
          }

          await updateDoc(inventoryRef, {
            'condition.Good': newGood,
            'condition.Damage': newDamage,
            'condition.Defect': newDefect
          });

         
           

          // 🔁 Update labRoom item quantity
          const roomNumber = item.labRoom; // e.g. "0930"
          const labRoomCollectionRef = collection(db, "labRoom");
          const q = query(labRoomCollectionRef, where("roomNumber", "==", roomNumber));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
          

            return;
          }

          // 2. Get Firestore doc ID of the labRoom
          const labRoomDoc = querySnapshot.docs[0];
          const labRoomDocId = labRoomDoc.id;

          // 3. Query items subcollection for item with matching itemId
          const itemId = data.itemId; // e.g. "DENT02"
          const itemsCollectionRef = collection(db, "labRoom", labRoomDocId, "items");
          const itemQuery = query(itemsCollectionRef, where("itemId", "==", itemId));
          const itemSnapshot = await getDocs(itemQuery);

          if (itemSnapshot.empty) {
       
            return;
          }

          // 4. Get the Firestore doc ID of the item document
          const itemDoc = itemSnapshot.docs[0];
          const itemDocId = itemDoc.id;
          const labRoomItemRef = doc(db, "labRoom", labRoomDocId, "items", itemDocId);
          const labData = itemDoc.data();

          const currentLabQty = Number(labData.quantity || 0);
          const newLabQty = Math.max(currentLabQty - requestedQty, 0);
          await updateDoc(labRoomItemRef, { quantity: newLabQty });
         

          // Update condition breakdown
          let labGood = labData.condition?.Good ?? 0;
          let labDamage = labData.condition?.Damage ?? 0;
          let labDefect = labData.condition?.Defect ?? 0;

          let remainingLab = requestedQty;

          if (remainingLab > 0) {
            const deductFromLabGood = Math.min(labGood, remainingLab);
            labGood -= deductFromLabGood;
            remainingLab -= deductFromLabGood;
          }

          if (remainingLab > 0) {
            const deductFromLabDamage = Math.min(labDamage, remainingLab);
            labDamage -= deductFromLabDamage;
            remainingLab -= deductFromLabDamage;
          }

          if (remainingLab > 0) {
            const deductFromLabDefect = Math.min(labDefect, remainingLab);
            labDefect -= deductFromLabDefect;
            remainingLab -= deductFromLabDefect;
          }

          await updateDoc(labRoomItemRef, {
            'condition.Good': labGood,
            'condition.Damage': labDamage,
            'condition.Defect': labDefect
          });

          
        }
        
      } catch (err) {

      }
    

    try {
      // Add to requestlog for approval
      await addDoc(collection(db, "requestlog"), requestLogEntry);

      // Add to requestlog for rejection
      if (rejectedItems.length > 0) {
        await addDoc(collection(db, "requestlog"), rejectLogEntry);
      }

      // Proceed with borrow catalog logic for approved items
      // Filter to get all "Fixed" items
      // Process Borrow Catalog
      const fixedItems = enrichedItems.filter(item => item.itemType === "Fixed");
  
      if (fixedItems.length > 0) {
        const formattedItems = fixedItems.map(item => ({
          category: item.category || "N/A",
          condition: item.condition || "N/A",
          department: item.department || "N/A",
          itemName: item.itemName || "N/A",
          itemDetails: item.itemDetails || "N/A",
          itemId: item.itemIdFromInventory,
          quantity: item.quantity || "1",
          selectedItemId: item.selectedItemId || "N/A",
          status: item.status || "Available",
          program: item.program || "N/A",
          course: item.course || "N/A",
          courseDescription: item.courseDescription || "N/A",
          reason: item.reason || "No reason provided",
          labRoom: item.labRoom || "N/A",
          timeFrom: item.timeFrom || "N/A",
          timeTo: item.timeTo || "N/A",
          usageType: item.usageType || "N/A",
          scannedCount: 0,
        }));
  
        const borrowCatalogEntry = {
          accountId: selectedRequest.accountId || "N/A",
          userName: selectedRequest.userName || "N/A",
          room: selectedRequest.room || "N/A",
          course: selectedRequest.course || "N/A",
          courseDescription: selectedRequest.courseDescription || "N/A",
          dateRequired: selectedRequest.dateRequired || "N/A",
          timeFrom: selectedRequest.timeFrom || "N/A",
          timeTo: selectedRequest.timeTo || "N/A",
          timestamp: selectedRequest.timestamp || "N/A",
          rawTimestamp: new Date(),
          requestList: formattedItems,
          status: "Borrowed",
          approvedBy: userName,
          reason: selectedRequest.reason || "No reason provided",
          program: selectedRequest.program,
        };
  
        const userRequestLogEntry = {
          ...requestLogEntry,
          status: "Approved",
          approvedBy: userName,
          timestamp: selectedRequest.timestamp || "N/A",
          rawTimestamp: new Date(),
        };
  
        await addDoc(collection(db, "borrowcatalog"), borrowCatalogEntry);
  
        await addDoc(collection(db, "accounts", selectedRequest.accountId, "userrequestlog"), userRequestLogEntry);
      }

        await deleteDoc(doc(db, "userrequests", selectedRequest.id));

        // Cleanup the user requests subcollection
        const subCollectionRef = collection(db, "accounts", selectedRequest.accountId, "userRequests");
        const subDocsSnap = await getDocs(subCollectionRef);

        subDocsSnap.forEach(async (docSnap) => {
          const data = docSnap.data();
          const match = (
            data.timestamp?.seconds === selectedRequest.timestamp?.seconds &&
            data.filteredMergedData?.[0]?.selectedItemId === selectedRequest.filteredMergedData?.[0]?.selectedItemId
          );

          if (match) {
       
            await deleteDoc(doc(db, "accounts", selectedRequest.accountId, "userRequests", docSnap.id));
          }
        });

        setApprovedRequests([...approvedRequests, requestLogEntry]);
        setRequests(requests.filter((req) => req.id !== selectedRequest.id));
        setCheckedItems({});
        setIsModalVisible(false);
        setSelectedRequest(null);
        setIsFinalizeModalVisible(false)

        notification.success({
          message: "Request Approved",
          description: "Request has been approved and logged.",
        });

      } catch (error) {
     
        notification.error({
          message: "Approval Failed",
          description: "There was an error logging the approved request.",
        });
      }
    }
  };

  const handleReject = () => { 
    if (!selectedRequest) return;

    const uncheckedItems = selectedRequest.requestList.filter((item, index) => {
      const key = `${selectedRequest.id}-${index}`;
      return !checkedItems[key]; // Get items that are NOT checked
    });

    const enrichedItems = selectedRequest.requestList.filter((item, index) => {
      const key = `${selectedRequest.id}-${index}`;
      return checkedItems[key]; // Get items that ARE checked
    });

    // Set full data into pendingApprovalData
    setPendingApprovalData({
      uncheckedItems,
      enrichedItems,
      selectedRequest,
    });

    // Show the rejection reason modal
    setIsMultiRejectModalVisible(true);
  };

  const handleRejectSubmit = async () => {
    const isChecked = Object.values(checkedItems).some((checked) => checked);
  
    if (!isChecked) {
      setNotificationMessage("No Items selected");
      setIsNotificationVisible(true);
      return;
    }
  
    if (selectedRequest) {
      const filteredItems = selectedRequest.requestList.filter((item, index) => {
        const key = `${selectedRequest.id}-${index}`;
        return checkedItems[key];
      });
  
      if (filteredItems.length === 0) {
        setNotificationMessage("No Items selected");
        setIsNotificationVisible(true);
        return;
      }
  
      const enrichedItems = await Promise.all(
        filteredItems.map(async (item) => {
          const selectedItemId = item.selectedItemId || item.selectedItem?.value;
          let itemType = "Unknown";
  
          if (selectedItemId) {
            try {
              const inventoryDoc = await getDoc(doc(db, "inventory", selectedItemId));
              if (inventoryDoc.exists()) {
                itemType = inventoryDoc.data().type || "Unknown";
              }
            } catch (err) {
            
            }
          }
  
          return {
            ...item,
            selectedItemId,
            itemType,
          };
        })
      );
  
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const userEmail = currentUser.email;
  
      // Fetch the user name from Firestore
      let userName = "Unknown";
      try {
        const userQuery = query(collection(db, "accounts"), where("email", "==", userEmail));
        const userSnapshot = await getDocs(userQuery);
  
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          userName = userData.name || "Unknown";
        }
      } catch (error) {

      }
  
      const rejectLogEntry = {
        accountId: selectedRequest.accountId || "N/A",
        userName: selectedRequest.userName || "N/A",
        room: selectedRequest.room || "N/A",
        course: selectedRequest.course || "N/A",
        courseDescription: selectedRequest.courseDescription || "N/A",
        dateRequired: selectedRequest.dateRequired || "N/A",
        timeFrom: selectedRequest.timeFrom || "N/A",  
        timeTo: selectedRequest.timeTo || "N/A",  
        timestamp: new Date(),
        requestList: enrichedItems, 
        status: "Rejected", 
        rejectedBy: userName, 
        reason: rejectReason || "No reason provided",
        program: selectedRequest.program,
      };
  
      try {
        // Add to rejection log (requestlog collection)
        await addDoc(collection(db, "requestlog"), rejectLogEntry);

        // Add to historylog subcollection for the user
        await addDoc(
          collection(db, "accounts", selectedRequest.accountId, "historylog"), 
          {
            ...rejectLogEntry, 
            action: "Request Rejected", 
            timestamp: serverTimestamp(),
          }
        );        
  
        // Delete rejected request from userrequests
        await deleteDoc(doc(db, "userrequests", selectedRequest.id));
  
        // Delete from subcollection with matching timestamp and selectedItemId
        const subCollectionRef = collection(db, "accounts", selectedRequest.accountId, "userRequests");
        const subDocsSnap = await getDocs(subCollectionRef);

        subDocsSnap.forEach(async (docSnap) => {
          const data = docSnap.data();
          const match = (
            data.timestamp?.seconds === selectedRequest.timestamp?.seconds &&
            data.filteredMergedData?.[0]?.selectedItemId === selectedRequest.filteredMergedData?.[0]?.selectedItemId
          );

          if (match) {
            
            await deleteDoc(doc(db, "accounts", selectedRequest.accountId, "userRequests", docSnap.id));
          }
        });
  
        // Update state
        setRequests(requests.filter((req) => req.id !== selectedRequest.id));
        setCheckedItems({});
        setIsRejectModalVisible(false);
        setRejectReason(""); 
        setIsModalVisible(false);
  
        notification.success({
          message: "Request Rejected",
          description: "Request has been rejected and logged.",
        });

      } catch (error) {

        notification.error({
          message: "Rejection Failed",
          description: "There was an error logging the rejected request.",
        });
      }
    }
  };

  const allItemsChecked = selectedRequest?.requestList?.length > 0 &&
  selectedRequest.requestList.every((_, index) => 
    checkedItems[`${selectedRequest.id}-${index}`]
  );

  const columnsRejection = [
    {
      title: "Item Name",
      dataIndex: "itemName",
      key: "itemName",
    },
    {
      title: "Item Description",
      dataIndex: "itemDetails",
      key: "itemDetails",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "Reason for Rejection",
      key: "reason",
      render: (_, record, index) => {
        const itemKey = `${record.selectedItemId}-${index}`;
        return (
          <Select
            style={{ width: 200 }}
            placeholder="Select reason"
            value={rejectionReasons[itemKey]}
            onChange={(value) => {
              setRejectionReasons((prev) => ({
                ...prev,
                [itemKey]: value,
              }));
            }}
          >
            <Option value="Out of stock">Out of stock</Option>
            <Option value="Not allowed">Not allowed</Option>
            <Option value="Duplicate request">Duplicate request</Option>
            <Option value="Invalid usage">Invalid usage</Option>
          </Select>
        );
      },
    },
  ];  

  const columns = [
    {
      title: "Check",
      dataIndex: "check",
      render: (_, record, index) => (
        <input
          type="checkbox"
          checked={checkedItems[`${selectedRequest?.id}-${index}`] || false}
          onChange={(e) =>
            setCheckedItems({
              ...checkedItems,
              [`${selectedRequest?.id}-${index}`]: e.target.checked,
            })
          }         
        />
      ),
      width: 50,
    },
    {
      title: "Item ID",
      dataIndex: "itemIdFromInventory", 
      render: (text) => text || "N/A",  
    },   
    {
      title: "Item Name",
      dataIndex: "itemName",
    },
    {
      title: "Item Description",
      dataIndex: "itemDetails",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
    },
     {
      title: "Unit",
      dataIndex: "unit",
    },
    {
      title: "Category",
      dataIndex: "category",
    },
  ];

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    const date = timestamp.toDate(); 
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };


const groupByDueDateCategory = (requests) => {
  const now = new Date();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfNextWeek = new Date(endOfWeek);
  startOfNextWeek.setDate(endOfWeek.getDate() + 1);
  startOfNextWeek.setHours(0, 0, 0, 0);

  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
  endOfNextWeek.setHours(23, 59, 59, 999);

  const pastDue = [];
  const thisWeek = [];
  const nextWeek = [];
  const later = [];

  requests.forEach((item) => {
    const dueDate = new Date(item.dateRequired);

    if (dueDate < startOfWeek) {
      pastDue.push(item)
    } else if (dueDate >= startOfWeek && dueDate <= endOfWeek) {
      thisWeek.push(item);
    } else if (dueDate >= startOfNextWeek && dueDate <= endOfNextWeek) {
      nextWeek.push(item);
    } else if (dueDate > endOfNextWeek) {
      later.push(item);
    }
  });

  return {
    'Past Due': pastDue,
    'Required This Week': thisWeek,
    'Next Week': nextWeek,
    'Further Ahead': later,
  };
};

  const groupedRequests = groupByDueDateCategory(requests);

const getInitials = (usage) => {
  if (!usage) return '';

  const officialUsages = ['Laboratory Experiment', 'Research', 'Community Extension'];

  // If it's not one of the official usage types, treat it as "Others"
  const normalized = officialUsages.includes(usage) ? usage : 'Others';

  const words = normalized.trim().split(' ');
  return words.length === 1
    ? (words[0][0].toUpperCase() + words[0][1])?.toUpperCase()
    : (words[0][0] + words[1][0]).toUpperCase();
};


  const usageBG = (item) => {
    if(item === 'Laboratory Experiment') return 'orange'
    if(item === 'Research') return '#70c247'
    if(item === 'Community Extension') return '#6e9fc1'
    else{return '#b66ee8'}
  }
  

const capitalizeName = (name) => {
  return name.replace(/\b\w/g, char => char.toUpperCase());
};  

const [collapsedGroups, setCollapsedGroups] = useState({});
const contentRefs = useRef({});

const toggleGroup = (label) => {
  setCollapsedGroups(prev => ({
    ...prev,
    [label]: !prev[label],
  }));
};

  useEffect(() => {
    // Ensure refs are reset when groupedRequests change
    Object.keys(groupedRequests).forEach(label => {
      
      if (!contentRefs.current[label]) {
        contentRefs.current[label] = null;
      }
    });
  }, [groupedRequests]);



const getFilteredRequests = () => {
  

  if (selectedFilter.trim().toLowerCase() === 'all') return requests;


  return requests.filter((item) => {
    const usage = item.usageType?.trim().toLowerCase();
    if (!usage) return false;

    const normalized = usage.replace(/\s+/g, ' ');
    const knownTypes = ['laboratory experiment', 'research', 'community extension'];
    const selected = selectedFilter.trim().toLowerCase();

    if (knownTypes.includes(normalized)) {
      return normalized === selected;
    } else {
      return selected === 'others';
    }
  });
};

// const filteredRequests = getFilteredRequests();
// Filter requests based on search term

const categorizedRequests = groupByDueDateCategory(filteredRequests);

useEffect(() => {
  // Timeout ensures layout finishes rendering before measuring scrollHeight
  const timeout = setTimeout(() => {
    Object.entries(categorizedRequests).forEach(([label, group]) => {
      const ref = contentRefs.current[label];
      if (ref && ref.current) {
        // Force re-measure height after new content is shown
        ref.current.style.maxHeight = collapsedGroups[label]
          ? '0px'
          : `${ref.current.scrollHeight}px`;
      }
    });
  }, 50); // Adjust timeout if needed (50ms usually works well)

  return () => clearTimeout(timeout);
}, [categorizedRequests, collapsedGroups]);


  const usageTypes = ['All','Laboratory Experiment', 'Research', 'Community Extension', 'Others'];
  

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout style={{padding: 20}}>

            <div style={{ display: 'flex', gap: 10, padding: 30, borderRadius: 10, backgroundColor: 'white', marginBottom: 20 }}>
              {usageTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedFilter(type)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #ccc',
                    backgroundColor: selectedFilter === type ? '#395a7f' : 'white',
                    color: selectedFilter === type ? 'white' : '#395a7f',
                    fontWeight: selectedFilter === type ? 'normal' : 'normal',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    fontSize: 15
                  }}
                >
                  {type}
                </button>
              ))}

              <input placeholder="Search" className="search-input" value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>

        
<Spin spinning={loading} tip="Loading requests...">
  <div>
    {Object.entries(categorizedRequests).map(([label, group]) => {
      if (group.length === 0) return null;
        
      const isCollapsed = collapsedGroups[label];
      const contentRef = contentRefs.current[label] || (contentRefs.current[label] = React.createRef());

      return (
        <div key={label} style={{ marginBottom: "2rem", justifyItems: 'flex-start' }}>
          {/* Group Header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: 10 }}>
            <button
              onClick={() => toggleGroup(label)}
              style={{
                cursor: 'pointer',
                color: "#395a7f",
                backgroundColor: 'white',
                border: '1px solid #acacac',
                padding: 10,
                borderRadius: 5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ margin: 0, color: '#395a7f', fontWeight: 500 }}>{label}</h2>
              <div style={{ fontSize: 20, marginLeft: 10 }}>
                {isCollapsed ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
              </div>
            </button>
            <h3 style={{ margin: 0 }}>({group.length})</h3>
          </div>

          {/* Collapsible Content */}
          <div
            ref={contentRef}
            style={{
              overflow: 'hidden',
              transition: 'max-height 0.3s ease, opacity 0.3s ease',
              maxHeight: isCollapsed ? '0px' : `${contentRef.current?.scrollHeight}px`,
              opacity: isCollapsed ? 0 : 1,
              width: '100%',
            }}
          >
{/* {group.map((request) => {
  const isPastDue = new Date(request.dateRequired) < new Date();

  return (
    <div
      key={request.id}
      onClick={() => handleViewDetails(request)}
      className="request-card"
      style={{border: isPastDue ? '1px solidrgb(209, 168, 255)' : '1px solid #ccc'}}
    >
      <div style={{ width: '4%', padding: 10, paddingTop: 0, justifyItems: 'center' }}>
        <p
          style={{
            fontSize: 20,
            padding: 15,
            backgroundColor: usageBG(request.usageType),
            borderRadius: 5,
            color: 'white',
            maxWidth: '60px',
            textAlign: 'center',
            whiteSpace: 'nowrap'
          }}
        >
          {getInitials(request.usageType)}
        </p>
      </div>

      <div style={{ paddingLeft: 10, width: '100%', paddingTop: 0, paddingBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 23, fontWeight: 500, marginBottom: 5 }}>{capitalizeName(request.userName)}</p>
            <p style={{ fontSize: 18, color: '#707070' }}>{request.program}</p>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 15,
              padding: 10,
              backgroundColor: isPastDue ? '#ffb1a8' : '#e9ecee',
              borderRadius: 5,
              color: isPastDue ? 'black' : 'black',
            }}
          >
            <strong>Required Date:</strong> {request.dateRequired}
          </p>
        </div>

        <div style={{ margin: 0 }}>
          <p style={{ color: '#707070', fontSize: 15, marginBottom: 5 }}>Room: {request.room}</p>
          <p style={{ color: '#707070', fontSize: 15, marginBottom: 5 }}>{request.usageType}</p>
          <p style={{ color: '#707070', fontSize: 15, marginBottom: 5 }}>{request.course}{request.courseDescription}</p>
        </div>
      </div>
    </div>
  );
})}
          </div>
        </div>
      );
    })}
  </div>
</Spin> */}

      {group.map((request) => {
        const isPastDue = new Date(request.dateRequired) < new Date();

        // Check if this request is the first for any of its items on this date
      // Disabled if ANY item in this request is not the first request for that item+date
      const isDisabled = (request.requestList || []).some(item => {
        const key = `${item.selectedItemId}_${request.dateRequired}`;
        return firstRequestMap[key] !== request.id;  // different request owns that item+date first
      });


        return (
          <div
            key={request.id}
            onClick={() => !isDisabled && handleViewDetails(request)}
            className="request-card"
            style={{
              opacity: isDisabled ? 0.5 : 1,
              pointerEvents: isDisabled ? 'none' : 'auto',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              border: isPastDue ? '1px solid rgb(209, 168, 255)' : '1px solid #ccc',
              backgroundColor: isDisabled ? '#f8f8f8' : 'white',
            }}
          >
            {/* Existing UI content */}
            <div style={{ width: '4%', padding: 10, paddingTop: 0, justifyItems: 'center' }}>
              <p
                style={{
                  fontSize: 20,
                  padding: 15,
                  backgroundColor: usageBG(request.usageType),
                  borderRadius: 5,
                  color: 'white',
                  maxWidth: '60px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}
              >
                {getInitials(request.usageType)}
              </p>
            </div>

            <div style={{ paddingLeft: 10, width: '100%', paddingTop: 0, paddingBottom: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 23, fontWeight: 500, marginBottom: 5 }}>{capitalizeName(request.userName)}</p>
                  <p style={{ fontSize: 18, color: '#707070' }}>{request.program}</p>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    padding: 10,
                    backgroundColor: isPastDue ? '#ffb1a8' : '#e9ecee',
                    borderRadius: 5,
                    color: 'black',
                  }}
                >
                  <strong>Required Date:</strong> {request.dateRequired}
                </p>
              </div>

              <div style={{ margin: 0 }}>
                <p style={{ color: '#707070', fontSize: 15, marginBottom: 5 }}>Room: {request.room}</p>
                <p style={{ color: '#707070', fontSize: 15, marginBottom: 5 }}>{request.usageType}</p>
                <p style={{ color: '#707070', fontSize: 15, marginBottom: 5 }}>{request.course}{request.courseDescription}</p>
              </div>

              {isDisabled && (
                <div style={{ color: 'red', fontSize: 14, marginTop: 5 }}>
                  Request blocked (already requested by someone else for this date and item)
                </div>
              )}
            </div>
          </div>
        );
      })}

                </div>
              </div>
            );
          })}
        </div>
      </Spin>

        <Modal
          title="Reject Reason"
          visible={isRejectModalVisible}
          onCancel={() => setIsRejectModalVisible(false)}
          onOk={handleRejectSubmit}
          zIndex={1030}
        >
          <Input.TextArea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Please provide a reason for rejection"
          />
        </Modal>



        {isMultiRejectModalVisible && (
          <Modal
            title="Provide Reasons for Unchecked Items"
            open={isMultiRejectModalVisible}
            zIndex={1023}
            width={'40%'}
            onCancel={() => setIsMultiRejectModalVisible(false)}
            footer={[
              <Button key="cancel" onClick={() => setIsMultiRejectModalVisible(false)}>
                Cancel
              </Button>,

              <Button key="confirm" type="primary" onClick={handleOpenFinalizeModal}>
                Confirm
              </Button>,
            ]}
          >
            <Table
              dataSource={pendingApprovalData?.uncheckedItems || []}
              columns={columnsRejection}
              rowKey={(record, index) => `${record.selectedItemId}-${index}`}
              pagination={false}
            />
          </Modal>
        )}

        {isFinalizeModalVisible && (
          <Modal
            title="Finalize Order"
            open={isFinalizeModalVisible}
            zIndex={1024}
            width={'50%'}
            onCancel={() => setIsFinalizeModalVisible(false)}
            footer={[
              <Button key="back" onClick={() => setIsFinalizeModalVisible(false)}>
                Cancel
              </Button>,
              <Button key="submit" type="primary" onClick={handleRejectConfirm}>
                Finalize
              </Button>,
            ]}
          >
            <p>Please review your selections below before finalizing your order:</p>

            <h3>✅ Approved Items</h3>
            <Table
              dataSource={pendingApprovalData?.enrichedItems || []}
              columns={[
                {
                  title: 'Item Name',
                  dataIndex: 'itemName',
                  key: 'itemName',
                },
                {
                  title: 'Item Description',
                  dataIndex: 'itemDetails',
                  key: 'itemDetails',
                },
                {
                  title: 'Quantity',
                  dataIndex: 'quantity',
                  key: 'quantity',
                },
                
              ]}
              rowKey={(record, index) => `${record.selectedItemId}-${index}`}
              pagination={false}
            />

            <h3 style={{ marginTop: 24 }}>❌ Rejected Items</h3>
            <Table
              dataSource={pendingApprovalData?.uncheckedItems || []}
              columns={columnsRejection} 
              rowKey={(record, index) => `${record.selectedItemId}-${index}`}
              pagination={false}
            />
          </Modal>
        )}

        <RequisitionRequestModal
        
          isModalVisible={isModalVisible}
          handleCancel={handleCancel}
          handleApprove={handleApprove}
          handleReturn={handleReject}
          selectedRequest={selectedRequest}
          columns={columns}
          formatDate={formatDate}
          allItemsChecked={allItemsChecked} 
        />

        <ApprovedRequestModal
          isApprovedModalVisible={isApprovedModalVisible}
          setIsApprovedModalVisible={setIsApprovedModalVisible}
          selectedApprovedRequest={selectedApprovedRequest}
          setSelectedApprovedRequest={setSelectedApprovedRequest}
          columns={columns}
          formatDate={formatDate}
        />

        <NotificationModal
          isVisible={isNotificationVisible}
          onClose={() => setIsNotificationVisible(false)}
          message={notificationMessage}
        />
      </Layout>
    </Layout>
  );
};

export default PendingRequest;

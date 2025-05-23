// VERSION 1
// import React, { useEffect, useState, useRef } from "react";
// import { QRCodeCanvas } from "qrcode.react";
// import { collection, getDocs, onSnapshot } from "firebase/firestore";
// import { db } from "../../backend/firebase/FirebaseConfig";
// import "../styles/adminStyle/LabRoomQR.css";

// const LabRoomQR = () => {
//   const [labRooms, setLabRooms] = useState([]);
//   const qrRefs = useRef({});

//   useEffect(() => {
//     const unsubscribeFunctions = [];

//     const fetchLabRoomsWithItems = async () => {
//       try {
//         const labRoomUnsub = onSnapshot(collection(db, "labRoom"), (labRoomSnapshot) => {
//           const initialRooms = labRoomSnapshot.docs.map(doc => ({
//             id: doc.id,
//             name: doc.data().name || "N/A",
//             qrCode: doc.data().qrCode || "",
//             items: [],
//           }));

//           setLabRooms(initialRooms);

//           labRoomSnapshot.docs.forEach((roomDoc) => {
//             const roomId = roomDoc.id;
//             const itemsCollectionRef = collection(db, `labRoom/${roomId}/items`);

//             const unsub = onSnapshot(itemsCollectionRef, (itemsSnapshot) => {
//               const updatedItems = itemsSnapshot.docs.map(itemDoc => {
//                 const itemData = itemDoc.data();
//                 return {
//                   id: itemDoc.id,
//                   category: itemData.category || "N/A",
//                   condition: itemData.condition
//                   ? `Good: ${itemData.condition.Good ?? 0}, Defect: ${itemData.condition.Defect ?? 0}, Damage: ${itemData.condition.Damage ?? 0}`
//                   : "N/A",
//                   department: itemData.department || "N/A",
//                   entryCurrentDate: itemData.entryCurrentDate || "N/A",
//                   expiryDate: itemData.expiryDate || null,
//                   itemId: itemData.itemId || "N/A",
//                   itemName: itemData.itemName || "N/A",
//                   labRoom: itemData.labRoom || "N/A",
//                   quantity: itemData.quantity || 0,
//                   status: itemData.status || "N/A",
//                   type: itemData.type || "N/A",
//                   rawTimestamp: itemData.rawTimestamp || "N/A",
//                   timestamp: itemData.timestamp || "N/A",
//                   unit: itemData.unit || "N/A",
//                 };
//               });

//               setLabRooms(prevRooms => prevRooms.map(room =>
//                 room.id === roomId ? { ...room, items: updatedItems } : room
//               ));
//             });

//             unsubscribeFunctions.push(unsub);
//           });
//         });

//         unsubscribeFunctions.push(labRoomUnsub);

//       } catch (error) {
//         console.error("Error setting up real-time listeners:", error);
//       }
//     };

//     fetchLabRoomsWithItems();

//     return () => {
//       unsubscribeFunctions.forEach(unsub => unsub());
//     };
//   }, []);

//   const downloadQRCode = (id) => {
//     const canvas = qrRefs.current[id]?.querySelector("canvas");
//     if (!canvas) return;
//     const pngUrl = canvas
//       .toDataURL("image/png")
//       .replace("image/png", "image/octet-stream");

//     const downloadLink = document.createElement("a");
//     downloadLink.href = pngUrl;
//     downloadLink.download = `${id}-QR.png`;
//     document.body.appendChild(downloadLink);
//     downloadLink.click();
//     document.body.removeChild(downloadLink);
//   };

//   return (
//     <div className="labroom-container">
//       <h2 className="labroom-header">Lab Room QR Codes</h2>

//       {labRooms.length === 0 ? (
//         <p>Loading lab rooms and items...</p>
//       ) : (
//         labRooms.map(room => (
//           <div key={room.id} className="labroom-table-wrapper">
//             <h3 className="labroom-title">
//               Room: {room.name} ({room.id})
//             </h3>
//             <table className="labroom-table">
//               <thead>
//                 <tr>
//                   <th>QR Code</th>
//                   <th>Item Name</th>
//                   <th>Item ID</th>
//                   <th>Category</th>
//                   <th>Condition</th>
//                   <th>Department</th>
//                   <th>Quantity</th>
//                   <th>Status</th>
//                   <th>Type</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {room.items && room.items.length > 0 ? (
//                   room.items.map((item, index) => (
//                     <tr key={item.id}>
//                       {index === 0 ? (
//                         <td
//                           rowSpan={room.items.length}
//                           className="labroom-qr-cell"
//                         >
//                           <div
//                             ref={(el) => (qrRefs.current[room.id] = el)}
//                             className="labroom-qr"
//                           >
//                             <QRCodeCanvas
//                               value={room.qrCode || "No QR code available"}
//                               size={128}
//                             />
//                             <button
//                               onClick={() => downloadQRCode(room.id)}
//                               className="labroom-download-button"
//                             >
//                               Download QR
//                             </button>
//                           </div>
//                         </td>
//                       ) : null}
//                       <td>{item.itemName}</td>
//                       <td>{item.itemId}</td>
//                       <td>{item.category}</td>
//                       <td>{item.condition}</td>
//                       <td>{item.department}</td>
//                       <td>
//                         {item.quantity}
//                         {["Chemical", "Reagent"].includes(item.category) && item.unit ? ` ${item.unit}` : ""}
//                       </td>
//                       <td>{item.status}</td>
//                       <td>{item.type}</td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan="9">No items found in this room.</td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         ))
//       )}
//     </div>
//   );
// };

// export default LabRoomQR;


// VERSION 2
// import React, { useEffect, useState, useRef } from "react";
// import { QRCodeCanvas } from "qrcode.react";
// import { collection, getDocs } from "firebase/firestore";
// import { db } from "../../backend/firebase/FirebaseConfig";
// import "../styles/adminStyle/LabRoomQR.css";

// const LabRoomQR = () => {
//   const [labRooms, setLabRooms] = useState([]);
//   const qrRefs = useRef({});

//   useEffect(() => {
//     const fetchLabRoomsWithItems = async () => {
//       try {
//         const labRoomSnapshot = await getDocs(collection(db, "labRoom"));
//         const roomsWithItems = [];

//         for (const roomDoc of labRoomSnapshot.docs) {
//           const roomData = roomDoc.data();
//           const roomId = roomDoc.id;

//           // Fetch items subcollection for this room
//           const itemsSnapshot = await getDocs(collection(db, `labRoom/${roomId}/items`));
//           const items = itemsSnapshot.docs.map(itemDoc => {
//             const itemData = itemDoc.data();
//             return {
//               id: itemDoc.id,
//               category: itemData.category || "N/A",
//               condition: itemData.condition || "N/A",
//               department: itemData.department || "N/A",
//               entryCurrentDate: itemData.entryCurrentDate || "N/A",
//               expiryDate: itemData.expiryDate || null,
//               itemId: itemData.itemId || "N/A",
//               itemName: itemData.itemName || "N/A",
//               labRoom: itemData.labRoom || "N/A",
//               qrCode: itemData.qrCode || "",
//               quantity: itemData.quantity || 0,
//               status: itemData.status || "N/A",
//               type: itemData.type || "N/A",
//               rawTimestamp: itemData.rawTimestamp || "N/A",
//               timestamp: itemData.timestamp || "N/A",
//             };
//           });

//           roomsWithItems.push({
//             id: roomId,
//             name: roomData.name || "N/A",
//             items,
//           });
//         }

//         setLabRooms(roomsWithItems);
//       } catch (error) {
//         console.error("Error fetching lab rooms and items:", error);
//       }
//     };

//     fetchLabRoomsWithItems();
//   }, []);

//   const downloadQRCode = (id) => {
//     const canvas = qrRefs.current[id].querySelector("canvas");
//     if (!canvas) return;
//     const pngUrl = canvas
//       .toDataURL("image/png")
//       .replace("image/png", "image/octet-stream");

//     const downloadLink = document.createElement("a");
//     downloadLink.href = pngUrl;
//     downloadLink.download = `${id}-QR.png`;
//     document.body.appendChild(downloadLink);
//     downloadLink.click();
//     document.body.removeChild(downloadLink);
//   };

//   return (
//     <div className="labroom-container">
//       <h2 className="labroom-header">Lab Room and Items QR Codes</h2>

//       {labRooms.length === 0 ? (
//         <p>Loading lab rooms and items...</p>
//       ) : (
//         labRooms.map(room => (
//           <div key={room.id} className="labroom-card">
//             <h3 className="labroom-title">
//               Room: {room.name} ({room.id})
//             </h3>

//             {(!room.items || room.items.length === 0) ? (
//             <p>No items found in this room.</p>
//             ) : (
//             room.items.map(item => {
//                 const qrValue = item.qrCode || "No QR code available";
//                 return (
//                   <div key={item.id} className="labroom-item-card">
//                     <h4>{item.itemName} ({item.itemId})</h4>
//                     <p><strong>Category:</strong> {item.category}</p>
//                     <p><strong>Condition:</strong> {item.condition}</p>
//                     <p><strong>Department:</strong> {item.department}</p>
//                     <p><strong>Quantity:</strong> {item.quantity}</p>
//                     <p><strong>Status:</strong> {item.status}</p>
//                     <p><strong>Type:</strong> {item.type}</p>

//                     <div
//                       ref={el => (qrRefs.current[item.id] = el)}
//                       className="labroom-qr"
//                     >
//                       <QRCodeCanvas value={qrValue} size={150} />
//                     </div>

//                     <button
//                       onClick={() => downloadQRCode(item.id)}
//                       className="labroom-download-button"
//                     >
//                       Download QR Code
//                     </button>
//                   </div>
//                 );
//               })
//             )}
//           </div>
//         ))
//       )}
//     </div>
//   );
// };

// export default LabRoomQR;

// VERSION 3
import React, { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../../backend/firebase/FirebaseConfig";
import "../styles/adminStyle/LabRoomQR.css";

const LabRoomQR = () => {
  const [labRooms, setLabRooms] = useState([]);
  const qrRefs = useRef({});

  useEffect(() => {
  const unsubscribeFunctions = [];

  const fetchLabRoomsWithItems = async () => {
    try {
      const labRoomUnsub = onSnapshot(collection(db, "labRoom"), (labRoomSnapshot) => {
        const rooms = labRoomSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || "N/A",
          qrCode: doc.data().qrCode || "",
          items: [],
        }));

        // Set initial rooms (empty items for now)
        setLabRooms(rooms);

        // Set up item listeners per room
        labRoomSnapshot.docs.forEach((roomDoc) => {
          const roomId = roomDoc.id;
          const itemsCollectionRef = collection(db, `labRoom/${roomId}/items`);

          const unsub = onSnapshot(itemsCollectionRef, (itemsSnapshot) => {
            const updatedItems = itemsSnapshot.docs.map(itemDoc => {
              const itemData = itemDoc.data();
              return {
                id: itemDoc.id,
                category: itemData.category || "N/A",
                condition: itemData.condition
                  ? `Good: ${itemData.condition.Good ?? 0}, Defect: ${itemData.condition.Defect ?? 0}, Damage: ${itemData.condition.Damage ?? 0}`
                  : "N/A",
                department: itemData.department || "N/A",
                entryCurrentDate: itemData.entryCurrentDate || "N/A",
                expiryDate: itemData.expiryDate || null,
                itemId: itemData.itemId || "N/A",
                itemName: itemData.itemName || "N/A",
                labRoom: itemData.labRoom || "N/A",
                quantity: itemData.quantity || 0,
                status: itemData.status || "N/A",
                type: itemData.type || "N/A",
                rawTimestamp: itemData.rawTimestamp || "N/A",
                timestamp: itemData.timestamp || "N/A",
                unit: itemData.unit || "N/A",
                volume: itemData.volume || "N/A",
              };
            });

            setLabRooms(prevRooms =>
              prevRooms.map(room =>
                room.id === roomId ? { ...room, items: updatedItems } : room
              )
            );
          });

          unsubscribeFunctions.push(unsub);
        });
      });

      unsubscribeFunctions.push(labRoomUnsub);
    } catch (error) {
      console.error("Error setting up real-time listeners:", error);
    }
  };

  fetchLabRoomsWithItems();

  return () => {
    unsubscribeFunctions.forEach(unsub => unsub());
  };
}, []);


  const downloadQRCode = (id) => {
    const canvas = qrRefs.current[id]?.querySelector("canvas");
    if (!canvas) return;
    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");

    const downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `${id}-QR.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="labroom-container">
      <h2 className="labroom-header">Lab Room QR Codes</h2>

      {labRooms.length === 0 ? (
        <p>Loading lab rooms and items...</p>
      ) : (
        labRooms
          .filter(room => room.items && room.items.length > 0)
          .map(room => (
            <div key={room.id} className="labroom-table-wrapper">
              <h3 className="labroom-title">
                Room: {room.name} ({room.id})
              </h3>
              <table className="labroom-table">
                <thead>
                  <tr>
                    <th>QR Code</th>
                    <th>Item Name</th>
                    <th>Item ID</th>
                    <th>Category</th>
                    <th>Condition</th>
                    <th>Department</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Type</th>
                  </tr>
                </thead>

                <tbody>
                  {room.items.map((item, index) => (
                    <tr key={item.id}>
                      {index === 0 ? (
                        <td
                          rowSpan={room.items.length}
                          className="labroom-qr-cell"
                        >
                          <div
                            ref={(el) => (qrRefs.current[room.id] = el)}
                            className="labroom-qr"
                          >
                            <QRCodeCanvas
                              value={room.qrCode || "No QR code available"}
                              size={128}
                            />
                            <button
                              onClick={() => downloadQRCode(room.id)}
                              className="labroom-download-button"
                            >
                              Download QR
                            </button>
                          </div>
                        </td>
                      ) : null}
                      <td>{item.itemName}</td>
                      <td>{item.itemId}</td>
                      <td>{item.category}</td>
                      {/* <td>{item.condition}</td> */}
                      <td>{["Chemical", "Reagent"].includes(item.category) ? "N/A" : item.condition}</td>
                      <td>{item.department}</td>
                      <td>
                        {item.quantity}
                        {item.category === "Glasswares" ? " pcs" : ""}
                        {item.category === "Glasswares" && item.volume ? ` / ${item.volume} ML` : ""}
                        {["Chemical", "Reagent"].includes(item.category) && item.unit ? ` ${item.unit}` : ""}
                      </td>
                      <td>{item.status}</td>
                      <td>{item.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
      )}
    </div>
  );
};

export default LabRoomQR;

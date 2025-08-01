import React from "react";
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";

const RowDetailsModal = ({ visible, rowId, items, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Row: {rowId}</Text>

          <FlatList
            data={items}
            keyExtractor={(item, index) => item.itemId || index.toString()}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text style={styles.text}>• {item.itemName || "Unknown"}</Text>
                <Text style={styles.subText}>
                  ID: {item.itemId || "N/A"}, Qty: {item.quantity ?? "?"}
                </Text>
                <Text style={styles.subText}>
                  Condition: {
                    typeof item.condition === "object"
                      ? Object.entries(item.condition)
                          .map(([key, val]) => `${key}: ${val}`)
                          .join(", ")
                      : item.condition || "N/A"
                  }
                  , Status: {item.status || "N/A"}
                </Text>
              </View>
            )}
          />

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default RowDetailsModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000099",
    justifyContent: "center",
    alignItems: "center",
  },
  
  modal: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },

  item: {
    marginBottom: 10,
  },

  text: {
    fontSize: 16,
    fontWeight: "600",
  },

  subText: {
    fontSize: 14,
    color: "#666",
  },

  closeBtn: {
    marginTop: 20,
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  closeText: {
    color: "white",
    fontWeight: "bold",
  },
});

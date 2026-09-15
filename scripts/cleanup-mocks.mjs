// Cleanup script to delete mock user and status documents from Firestore
import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB0zUqPZQJHhqLq2fBJpLNMt8KBgODkRaA",
  authDomain: "studio-6639048179-3b66d.firebaseapp.com",
  projectId: "studio-6639048179-3b66d",
  storageBucket: "studio-6639048179-3b66d.firebasestorage.app",
  messagingSenderId: "302138724412",
  appId: "1:302138724412:web:b0a9a3e1c2d3f4e5a6b7c8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MOCK_USER_IDS = ["1", "2", "3", "4", "5", "6"];
const MOCK_STATUS_IDS = ["status_1", "status_2", "status_3", "status_4", "status_5"];

async function cleanup() {
  console.log("Deleting mock user documents...");
  for (const id of MOCK_USER_IDS) {
    try {
      await deleteDoc(doc(db, "users", id));
      console.log(`  Deleted user ${id}`);
    } catch (err) {
      console.log(`  User ${id} not found or already deleted`);
    }
  }

  console.log("\nDeleting mock status documents...");
  for (const id of MOCK_STATUS_IDS) {
    try {
      await deleteDoc(doc(db, "statuses", id));
      console.log(`  Deleted status ${id}`);
    } catch (err) {
      console.log(`  Status ${id} not found or already deleted`);
    }
  }

  console.log("\nCleanup complete!");
  process.exit(0);
}

cleanup();

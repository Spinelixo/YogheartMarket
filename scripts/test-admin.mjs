import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

try {
  initializeApp({
    projectId: "studio-6639048179-3b66d"
  });
  
  const auth = getAuth();
  const listUsersResult = await auth.listUsers(10);
  console.log("SUCCESS: Listed users successfully!");
  console.log("Users count:", listUsersResult.users.length);
} catch (err) {
  console.error("FAILED to initialize or list users:", err);
}

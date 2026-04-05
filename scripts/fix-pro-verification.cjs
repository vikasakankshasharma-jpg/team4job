const { getAdminDb } = require('./src/infrastructure/firebase/admin');
require('dotenv').config();

async function fixUserVerification() {
  const db = getAdminDb();
  const email = "installer_pro_v3@team4job.com";
  
  try {
    const userSnapshot = await db.collection("users").where("email", "==", email).get();
    if (userSnapshot.empty) {
      console.log("User not found");
      return;
    }

    const userId = userSnapshot.docs[0].id;
    await db.collection("users").doc(userId).update({
      isMobileVerified: true,
      isEmailVerified: true,
      "professionalProfile.verified": true,
      status: 'active'
    });

    console.log(`Successfully verified ${email} (ID: ${userId})`);
  } catch (error) {
    console.error("Error fixing user:", error);
  }
}

fixUserVerification();

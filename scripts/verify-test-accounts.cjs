const { getAdminDb } = require('./src/infrastructure/firebase/admin');
require('dotenv').config();

async function fixUserVerification() {
  const db = getAdminDb();
  const emails = ["installer_pro_v3@team4job.com", "giver_vip_v3@team4job.com"];
  
  for (const email of emails) {
    try {
      const userSnapshot = await db.collection("users").where("email", "==", email).get();
      if (userSnapshot.empty) {
        console.log(`User not found: ${email}`);
        continue;
      }

      const userId = userSnapshot.docs[0].id;
      const docRef = db.collection("users").doc(userId);
      
      await docRef.update({
        isMobileVerified: true,
        isEmailVerified: true,
        status: 'active',
        roles: email.includes('pro') ? ['Professional'] : ['Client'],
        "professionalProfile.verified": true,
        updatedAt: new Date()
      });

      console.log(`Successfully verified ${email} (ID: ${userId})`);
      
      // Verification check
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();
      console.log(`Verified ${email} Status:`, {
          isMobileVerified: data.isMobileVerified,
          isEmailVerified: data.isEmailVerified,
          status: data.status
      });
    } catch (error) {
      console.error(`Error fixing user ${email}:`, error);
    }
  }
}

fixUserVerification();

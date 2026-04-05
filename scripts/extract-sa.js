const fs = require('fs');
const envProd = fs.readFileSync('.env.production', 'utf8');
const keyMatch = envProd.match(/DO_FIREBASE_PRIVATE_KEY=\"(.*?)\"/);
if (keyMatch) {
  const account = {
    projectId: 'team4job-live',
    clientEmail: 'firebase-adminsdk-fbsvc@team4job-live.iam.gserviceaccount.com',
    privateKey: keyMatch[1].replace(/\\n/g, '\n'),
  };
  fs.writeFileSync('service-account-live.json', JSON.stringify(account, null, 2));
  console.log('Saved service-account-live.json successfully');
} else {
  console.log('Could not find DO_FIREBASE_PRIVATE_KEY');
}

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'apps/server/.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const eventsCollection = mongoose.connection.collection('events');
  const latestEvent = await eventsCollection.find().sort({ createdAt: -1 }).limit(1).toArray();
  console.log(JSON.stringify(latestEvent, null, 2));
  process.exit(0);
}
run();

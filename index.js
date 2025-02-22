const express = require('express');
const mongoose = require('mongoose');
const rootRouter = require('./routes/index');

const app = express();
app.use(express.json());
const isLive = 0
const MongoUrl = isLive ? 'mongodb+srv://kishanhirani79:Omen1234@cluster0.ip2jaux.mongodb.net/test?retryWrites=true' : "mongodb://localhost:27017/"
mongoose.connect("mongodb://localhost:27017/")
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));


app.use('/api', rootRouter);

app.listen(8080, () => {
    console.log('Server is running on http://localhost:8080');
});

const express = require('express');
const mongoose = require('mongoose');
const rootRouter = require('./routes/index');

const app = express();
app.use(express.json());

mongoose.connect('mongodb+srv://devkishanhirani:Omen1234@nemeton.hmyoo.mongodb.net/')
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('Error connecting to MongoDB:', err));


app.use('/api', rootRouter);

app.listen(8080, () => {
    console.log('Server is running on http://localhost:8080');
});

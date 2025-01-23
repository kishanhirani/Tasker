const express = require('express');
const router = express.Router();

router.get('/get-tasks', (req, res) => {
    res.send('Here is a list of tasks!');
});

router.post('/add-tasks', (req, res) => {
    res.send('New task created!');
});

module.exports = router;

const express = require('express');

const userRouter = require('./user.js')
const tasksRouter = require('./tasks.js')
const router = express.Router()

router.use('/user', userRouter)
router.use('/tasks', tasksRouter)

module.exports = router 
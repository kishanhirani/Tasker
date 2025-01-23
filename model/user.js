const mongoose = require('mongoose')
const { number } = require('zod')

const userSchema = new mongoose.Schema({
    name: String,
    password: String,
    email: {
        type: String,
        unique: true,
    },
})
const user = mongoose.model('user', userSchema)
module.exports = user
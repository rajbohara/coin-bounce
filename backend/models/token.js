const mongoose = require("mongoose");

const { Schema } = mongoose;

const refreshTokenSchema = new Schema({
    token: { type: String, required: true },
    username: { type: Schema.Types.ObjectId, ref: 'User' } // Corrected line
}, { timestamps: true });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema, 'tokens');

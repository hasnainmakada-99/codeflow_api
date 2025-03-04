const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    description: String,
    thumbnail: String,
    publishedDate: String,
    channelName: String,
    toolRelatedTo: String,
    isPaid: {
      type: Boolean,
      default: false,
    },
    price: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Resource", resourceSchema);

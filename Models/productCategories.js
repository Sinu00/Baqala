const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  categoryImage: [
    {
      secure_url: { type: String },
      cloudinary_id: { type: String }
    }
  ]
},
{
    collection: 'Categories' // Custom collection name
}
);

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
       
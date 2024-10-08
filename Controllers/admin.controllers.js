const Category = require("../Models/productCategories");
const Product = require("../Models/products.schema");
const User = require("../Models/users.schema");
const cloudinary = require("../services/cloudinary")
const Order = require("../Models/orders.schema");
const OrderReturn = require("../Models/return.schema");
const Coupon = require("../Models/coupon.schema");
const Banner = require("../Models/banner.schema");
const PDFDocument = require('pdfkit');
const Wallet = require("../Models/wallet.schema");

const dashboard = async (req,res) => {
  const itemsPerPage = 6;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * itemsPerPage;
    try {
      const banner = await Banner.findOne();

      const products = await Product.find({ status: 'active' });
      const totalProducts = await Product.countDocuments({ status: 'active' });
      
      const users = await User.find().skip(skip).limit(itemsPerPage);
      const totalUsers = await User.countDocuments();
      const totalPages = Math.ceil(totalUsers / itemsPerPage);
      
      const categories = await Category.find();

      const orders = await Order.find().sort({ createdOn: -1 }).skip(skip).limit(itemsPerPage); 
      const totalOrders = await Order.countDocuments();
      const totalOrderPages = Math.ceil(totalOrders / itemsPerPage);

    const totalSales = await Order.aggregate([
      { $group: { _id: null, totalAmount: { $sum: '$totalAmount' } } }
    ]);
    // Today's Orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysOrders = await Order.countDocuments({ createdOn: { $gte: today } });

    // const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0); // Set the time to the start of the day (midnight)
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7); // Set the end date one week ahead

    const weeklySalesData = await Order.aggregate([
      {
        $match: {
          createdOn: {
            $gte: startOfWeek, 
            $lt: endOfWeek,  
          },
        },
      },
      {
        $project: {
          dayOfWeek: { $dayOfWeek: "$createdOn" }, // Get the day of the week (1 = Sunday, 2 = Monday, ..., 7 = Saturday)
          totalAmount: "$totalAmount",
        },
      },
      {
        $group: {
          _id: "$dayOfWeek",
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);
    // Create an array to represent sales data for each day (0 for Sunday, 1 for Monday, ..., 6 for Saturday)
    const weeklySales = Array(7).fill(0);
    // Iterate over the weeklySalesData and populate the weeklySales array
    weeklySalesData.forEach((data) => {
      const dayOfWeek = data._id - 1; // Subtract 1 to adjust for JavaScript's 0-based index
      weeklySales[dayOfWeek] = data.totalAmount;
    });
  // // Create an array for the entire week (Monday to Sunday)
  // const weeklySalesData = await Order.aggregate([
  //   {
  //     $project: {
  //       dayOfWeek: { $dayOfWeek: "$createdOn" }, // Get the day of the week (1 = Sunday, 2 = Monday, ..., 7 = Saturday)
  //       totalAmount: "$totalAmount"
  //     }
  //   },
  //   {
  //     $group: {
  //       _id: "$dayOfWeek",
  //       totalAmount: { $sum: "$totalAmount" }
  //     }
  //   }
  // ]);
  
  // // Create an array to represent sales data for each day (0 for Sunday, 1 for Monday, ..., 6 for Saturday)
  // const weeklySales = Array(7).fill(0);
  
  // // Iterate over the weeklySalesData and populate the weeklySales array
  // weeklySalesData.forEach(data => {
  //   const dayOfWeek = data._id - 1; // Subtract 1 to adjust for JavaScript's 0-based index
  //   weeklySales[dayOfWeek] = data.totalAmount;
  // });

    const totalQuantity = await Product.aggregate([
  {
    $group: {
      _id: null,
      totalQuantity: { $sum: '$totalQuantity' }
    }
  }
    ]);

    const returnData = await OrderReturn.find();

    const coupons = await Coupon.find();

      const salesReportData = {
        totalSales: totalSales[0].totalAmount,
        totalOrders,
        todaysOrders,
        weeklySales
      };
    req.session.salesReportData = salesReportData;
    res.render('pages/dashboard', {
      banner,
      products ,
      users ,
      categories, 
      orders,
      totalProducts, totalOrders, totalSales: totalSales[0].totalAmount,totalQuantity: totalQuantity[0].totalQuantity, todaysOrders,weeklySales ,
      returnData,
      coupons,
      currentPage: page,
      totalPages,
      totalOrderPages,
    });
    } catch (err) {
      console.log(err);
    }
}

const addproductGet = (req,res) => {
 res.redirect('/admin/dashboard');  
}

const addProduct =  async (req, res) => {
  try {
    // Upload image to cloudinary
    const files = req.files; // Access the uploaded files
    const { productTitle , productDescription , productPrice , totalQuantity , category, additionalInformation } = req.body;
    // Upload images to Cloudinary and collect their secure URLs and IDs
    const uploadedImages = await Promise.all(files.map(async (file) => {
      const result = await cloudinary.uploader.upload(file.path);
      return {
        secure_url: result.secure_url,
        cloudinary_id: result.public_id
      };
    }));
    let product = new Product({
      productTitle: productTitle[1],
      productDescription : productDescription[1],
      productPrice:productPrice[1],
      totalQuantity:totalQuantity[1],
      category:category,
      additionalInformation: additionalInformation[1],
      productImages: uploadedImages ,
      status : "active"
    });
    await product.save();
    res.json(product);
    console.log('successsfully added product data');
  } catch (err) {
    console.log(err);
}}; 

const editProduct = async (req,res) => {
    const productId = req.params.productId;
    try {
      const product = await Product.findById(productId);
      res.json(product); // Respond with JSON containing the product data
    } catch (err) {
      console.error(err , '****** this is error ********');
      res.status(500).json({ error: 'Error fetching product data.' });
    }  
}

const editProductPost = async (req, res) => {
  const { currentImage1 } = req.body;

  let result;
  if (req.file && req.file.path !== undefined) {
    result = await cloudinary.uploader.upload(req.file.path);

    if (currentImage1) {
      await cloudinary.uploader.destroy(currentImage1);
    }
  }

  const {
    productTitle,
    productPrice,
    productDescription,
    productCategory,
    additionalInformation,
    totalQuantity,
    currentProduct
  } = req.body;

  try {
    const updateFields = {
      productTitle: productTitle,
      productPrice: productPrice,
      productDescription: productDescription,
      productCategory: productCategory,
      additionalInformation: additionalInformation,
      totalQuantity: totalQuantity,
    };

    // Fetch the existing product document
    const existingProduct = await Product.findOne({ _id: currentProduct });

    if (result && existingProduct.productImages.length > 0) {
      // Update the secure_url of the first item in the productImages array
      existingProduct.productImages[0].secure_url = result.secure_url;
      
      // Update the entire productImages array in the updateFields object
      updateFields.productImages = existingProduct.productImages;
    }

    // Update the document in the database
    await Product.updateOne({ _id: currentProduct }, updateFields);
    console.log('Data updated successfully.');
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.log('Error while updating:', error);
  }
};

const deleteProduct = async (req, res) => { 
  const productId = req.params.productId;
  
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { status: 'deleted' },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).send('Product not found');
    }

    res.send('Product has been marked as deleted');

  } catch (error) {
    console.log('Error while marking product as deleted:', error);
    res.status(500).send('Error while marking product as deleted');
  } 
};

const blockAndUnblockUser = async (req, res) => {
  const userId = req.params.userId;

  console.log(userId, 'block user');

  try {
    const user = await User.findById(userId);
    let blockStatus = user.status;

    console.log(!blockStatus , 'block statusss');

    await User.findByIdAndUpdate(
      { _id: userId },
      { status: !blockStatus}
    );
    res.json({blockStatus : !blockStatus});
  } catch (error) {
    console.log(error, 'error while updating user');
  }
};

const addCategory = async (req, res) => {
  try {
    const file = req.file; // Access the uploaded file via multer
    const query = req.body.categoryName;

    // Check if file is provided
    if (!file) {
      console.error('No file provided');
      return res.status(400).json({ message: 'No file provided' });
    }

    // Check if category name is provided
    if (!query) {
      console.error('No category name provided');
      return res.status(400).json({ message: 'No category name provided' });
    }

    console.log('Checking for category uniqueness');
    const uniqueness = await Category.findOne({ name: { $regex: new RegExp(`^${query}$`, 'i') } });
    if (uniqueness) {
      return res.status(400).json({ message: 'Category exists' });
    }

    console.log('Uploading file to Cloudinary');
    const result = await cloudinary.uploader.upload(file.path); // Upload file to Cloudinary
    const uploadedCategoryImage = {
      secure_url: result.secure_url,
      cloudinary_id: result.public_id
    };

    // Create and save new category
    const newCategory = new Category({
      name: query,
      categoryImage: uploadedCategoryImage // Save image details in the category
    });

    await newCategory.save();
    
    return res.status(201).json({ message: 'Category created successfully', category: newCategory });

  } catch (error) {
    console.error('Error while adding category:', error);
    return res.status(500).json({ message: 'Internal server error', error });
  }
};


const deleteCategory = async (req, res) => {
  const { categoryName, categoryId } = req.body;

  try {
    // Update all products with the given category name to set their status to "deleted"
    const productData = await Product.updateMany({
      category: { $in: [categoryName] },
    }, {
      status: 'deleted',
    });
    const deletedCategory = await Category.findByIdAndDelete(categoryId);
    console.log('success' , productData);
    if (!deletedCategory) {
      return res.status(404).send('Category not found'); // Return an error if the category is not found
    }
    res.send('successsssss');
  } catch (error) {
    console.log('Error while deleting category and updating products:', error);
    res.status(500).send('Error while deleting category and updating products');
  }
}

const adminOrderStaus = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const newStatus = req.body.status;

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: newStatus } },
      { new: true } // Return the updated order
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({ message: 'Order status updated', order: updatedOrder });
    console.log('status updated');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}

const updateReturnStatus = async (req, res) => {
  try {
    const { returnId, status } = req.body;

    // Check if returnId is provided and status is valid
    if (!returnId || (status !== 'Approved' && status !== 'Denied')) {
      console.log('no returnid or status provided');
      // return res.status(400).json({ message: 'Invalid input data' });
    }

    // Find the updated return and populate orderId field
    const updatedReturn = await OrderReturn.findById(returnId).populate('orderId');

    if (!updatedReturn) {
      return res.status(404).json({ message: 'Return not found' });
    }

    // Update the return status
    updatedReturn.status = status;
    await updatedReturn.save();

    // Update the user's wallet balance if the status is 'Approved'
    if (status === 'Approved') {
      const user = updatedReturn.orderId.user;
      const totalAmount = updatedReturn.orderId.totalAmount;

      // Update the orderId's status directly
      updatedReturn.orderId.status = 'Returned';
      await updatedReturn.orderId.save();

      const wallet = await Wallet.findOne({ userId: user });

      if (!wallet) {
        console.log('no wallet');
        // return res.status(404).json({ message: 'Wallet not found for the user' });
      }

      wallet.balance += totalAmount;
      await wallet.save();


      if (updatedReturn.returnReason === 'Not fit for space') {
        const order =  await Order.findById(updatedReturn.orderId);
        console.log(order , 'this is orderr');
        if (!order) {
         console.log('order not found , order return request  line : 792');
         // return res.status(404).json({ message: 'Order not found.' });
       }
   
       // Update the inventory for each product
       for (const item of order.items) {
         const { productId, quantity } = item;
   
         const product = await Product.findById(productId);
   
         if (!product) {
           return res.status(404).json({ message: `Product with ID ${productId} not found.` });
         }
   
         // Update the inventory quantity by adding the item's quantity
         product.totalQuantity += quantity;
         await product.save();
       
     }
    }
    }
    // Log the update and send a response
    console.log(`Return status updated to ${status}`);
    res.status(200).json({ message: `Return status updated to ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while updating return status' });
  }
};

const couponManagement = async (req, res) => {
  try {
    const { couponCode, discountAmount, minPurchase, maxPurchase ,usageLimit ,expiryDate } = req.body;

    // Create a new coupon instance using the Mongoose schema
    const newCoupon = new Coupon({
      couponCode,
      discountAmount,
      minPurchase,
      maxPurchase,
      usageLimit,
      expiryDate: new Date(expiryDate),
    });

    // Save the coupon to the database
    const savedCoupon = await newCoupon.save();

    res.status(201).json(savedCoupon); // Return the saved coupon as JSON
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ message: 'Error creating coupon' });
  }

}

const bannerManagement = async (req, res) => {
  const files = req.files; // Access the uploaded files
  const { bannerTitle, bannerFeaturedTitle } = req.body;
  try {
    // Upload images to Cloudinary and collect their secure URLs and IDs
    const uploadedImages = await Promise.all(files.map(async (file) => {
      const result = await cloudinary.uploader.upload(file.path);
      return {
        secure_url: result.secure_url,
        cloudinary_id: result.public_id
      };
    }));

    // Delete the existing banners (if any)
    await Banner.deleteMany();

    const newBanner = new Banner({
      bannerTitle,
      bannerFeaturedTitle,
      bannerImages: uploadedImages,
    });

    await newBanner.save();
    res.status(201).json(newBanner); // Return the saved banner as JSON
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ message: 'Error creating banner' });
  }
};

const editBanner = async (req, res) => {
  const files = req.files; // Access the uploaded files
  const { editBannerTitle, editFeaturedTitle } = req.body;

  try {
    const existingBanner = await Banner.findOne();

    if (!existingBanner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    // Upload images to Cloudinary and collect their secure URLs and IDs
    const uploadedImages = await Promise.all(files.map(async (file) => {
      const result = await cloudinary.uploader.upload(file.path);
      return {
        secure_url: result.secure_url,
        cloudinary_id: result.public_id
      };
    }));

    // Update the banner data with the new information
    existingBanner.bannerTitle = editBannerTitle;
    existingBanner.bannerFeaturedTitle = editFeaturedTitle;
    existingBanner.bannerImages = uploadedImages;

    // Save the updated banner data
    await existingBanner.save();

    console.log('Banner edited successfully');
    res.status(200).json({ message: 'Banner edited successfully' });
  } catch (error) {
    console.error('Error editing banner:', error);
    res.status(500).json({ message: 'Error editing banner' });
  }
}

const adminLogout = async (req, res) => {
  res.clearCookie('adminJwt');
  res.redirect('/admin/admin-login');
}

const salesReportManagement = async (req, res) => {

try {
  const { startDate, endDate } = req.body;

  // Validate the selected dates (e.g., ensure endDate is after startDate)
  if (startDate > endDate) {
    return res.status(400).json({ error: 'Invalid date range' });
  }

  // Query your sales data for the specified date range
  const salesDataInRange = await querySalesData(startDate, endDate);

    // Calculate total sales, total orders, and other metrics based on the filtered data
  const  totalSales  = calculateSalesMetrics(salesDataInRange);

  req.session.totalSales = totalSales;
  // Log a success message
  console.log('PDF report generated and sent for download.');
  res.status(200).json({success: true});
} catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
}
}

const downloadSalesReportManagement = async (req , res) => {

// Check if totalSales is defined in req.session
if (!req.session.totalSales) {
  return res.status(400).json({ error: 'Total sales data not found' });
}

// Destructure totalSales with a default value of 0
  const { totalSales = 0 } = req.session.totalSales;
  const doc = new PDFDocument();
  doc.info.Title = 'Sales Report';
  doc.info.Author = 'Baqala Pvt. Ltd';

  // Add content to the PDF
  doc.fontSize(18).text('Sales Report', { align: 'center' });
  doc.fontSize(14).text('Baqala Pvt. Ltd', { align: 'center' });
  doc.moveDown();

  // Add the selected start and end dates
  // doc.fontSize(12).text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, { align: 'center' });

  doc.moveDown();
  doc.moveDown();
  // Add a sentence
  doc.fontSize(12).text('This report provides a summary of our sales data for the given period.', { align: 'center' });

  doc.moveDown();
  doc.fontSize(16).text('Total Sales: $' + totalSales?.toFixed(2));
  // doc.fontSize(16).text('Total Orders: ' + totalOrders);
  // doc.fontSize(16).text("Today's Orders: " + todaysOrders);

  doc.moveDown();
  // Add more content as needed

  // Stream the PDF to the response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
  doc.pipe(res);

  // Finalize the PDF
  doc.end();

}

// Function to calculate sales metrics based on the filtered data
function calculateSalesMetrics(salesData) {
  try {
    // Calculate total sales and total orders
    let totalSales = 0;

    salesData.forEach((order) => {
      totalSales += order.totalAmount;
    });

    return {
      totalSales,
    };
  } catch (error) {
    throw error;
  }
}

async function querySalesData(startDate, endDate) {
  try {
    const salesData = await Order.find({
      createdOn: {
        $gte: startDate, // Filter orders created on or after the start date
        $lte: endDate,   // Filter orders created on or before the end date
      },
    });

    return salesData;
  } catch (error) {
    throw error;
  }
}

const offerManagement = async (req, res) => {
  const { offerData, offerProductId } = req.body;
  try {
    const product = await Product.findById(offerProductId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if the offer with the same name, start date, and end date already exists
    const existingOffer = product.offers.find(
      (existingOffer) =>
        existingOffer.offerName === offerData.offerName &&
        existingOffer.startDate === offerData.startDate &&
        existingOffer.endDate === offerData.endDate
    );

    if (existingOffer) {
      console.log('offer already exists');
      return res.status(400).json({ error: 'Offer already exists for this product' });
    }

    // Create the offer object
    const offer = {
      offerName: offerData.offerName,
      discountPercentage: offerData.discountPercentage,
      startDate: offerData.startDate,
      endDate: offerData.endDate,
    };

    product.offers.push(offer);
    product.productHasDiscount = true; // Set the productHasDiscount to true
    await product.save();

    console.log('Offer added successfully');
    return res.status(200).json({ message: 'Offer added successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const categoryOfferManagement = async (req, res) => {
  const { offerData, offerCategory } = req.body;
  console.log(req.body);
  try {
    // Find all products with the matching category name
    const products = await Product.find({ category: offerCategory });

    if (!products || products.length === 0) {
      return res.status(404).json({ error: 'No products found in the specified category' });
    }

    // Create the offer object
    const offer = {
      offerName: offerData.offerName,
      discountPercentage: offerData.discountPercentage,
      startDate: offerData.startDate,
      endDate: offerData.endDate,
    };

    // Iterate through products and add the offer if it doesn't already exist
    for (const product of products) {
      const existingOffer = product.offers.find(
        (existingOffer) =>
          existingOffer.offerName === offer.offerName &&
          existingOffer.startDate === offer.startDate &&
          existingOffer.endDate === offer.endDate
      );

      if (!existingOffer) {
        product.offers.push(offer);
        product.productHasDiscount = true; // Set the productHasDiscount to true
        await product.save();
      }else{
      console.log('offer already exists');
      }
    }
    console.log('Offer added successfully to eligible products in the category');
    return res.status(200).json({ message: 'Offer added successfully to eligible products in the category' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getFullOrderData = async (req, res) => {
  const orderId = req.params.orderId;
  try {
    const order = await Order.findById(orderId);
    const productsPromises = order.items.map( async (item) => {
    const products = await Product.findById(item.productId);
    return products;
  });
  const productData = await Promise.all(productsPromises);

  const resData = {
    order:order,
    product:productData
  }
  return res.json(resData);

  } catch (error) {
    console.log(error, 'this is error on get full order data view order');
  }
}

const searchOrders = async (req, res) => {
      const orders = await Order.find().sort({ createdOn: -1 });
      const searchQuery = req.query.searchInput;
      const sort = req.query.sort === 'totalAmount';

      const page = parseInt(req.query.page) || 1; // Get the page number from the query parameters
      const itemsPerPage = 6; // Define the number of items per page
    

      try {
        let filteredOrders = orders;
        
        if (searchQuery) {
          // Filter orders by search term in-memory
          filteredOrders = filteredOrders.filter(order =>
            order._id.toString().includes(searchQuery)
          );
        }else if(sort){
          filteredOrders = await Order.find().sort({ totalAmount: -1 });
        }
        
          
        // Calculate the total number of pages based on filtered orders
        const totalOrderPages = Math.ceil(filteredOrders.length / itemsPerPage);
    
        // Apply pagination to the filtered orders
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const finalFilteredOrders = filteredOrders.slice(startIndex, endIndex);
    
        // Return the paginated filtered orders as JSON response
        return res.json({ results: finalFilteredOrders, totalOrderPages });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
};
    
module.exports = {
    dashboard ,
    addproductGet,
    addProduct,
    editProduct,
    editProductPost,
    deleteProduct,
    blockAndUnblockUser,
    addCategory,
    deleteCategory,
    adminOrderStaus,
    updateReturnStatus,
    couponManagement,
    bannerManagement,
    adminLogout,
    salesReportManagement,
    downloadSalesReportManagement,
    offerManagement,
    categoryOfferManagement,
    getFullOrderData,
    searchOrders,
    editBanner
};
const addToCartBtns  = document.querySelectorAll('.newArrivalsAddToCartBtn');

addToCartBtns.forEach(item => {
  item.addEventListener('click', () => {
    const productId = item.getAttribute('data-product-id');
    addToCartFunction(productId);
    console.log('clickedd add to cart button');
})
})

//this function is called inside the products partial , onclick
function addToCart(productId){
    addToCartFunction(productId);
}

function addToCartFunction(productId) {
  let quantity = 1;
  fetch('/add-to-cart', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId, quantity }),
  })
  .then(response => {
      if (!response.ok) {
          throw new Error('Network response was not ok'); // Handle non-200 responses
      }
      return response.json(); // Parse JSON from response
  })
  .then(data => {
      console.log('Added to cart');
      showToast("ADDED TO CART SUCCESSFULLY"); // Show success message
  })
  .catch(error => {
      console.error('Error adding to cart:', error);
      showToast("PLEASE LOGIN TO ADD");
  });
}


function showToast( message) {
var x = document.getElementById("snackbar");
x.textContent =  message; // Set the toast message
x.classList.add("show");

// Hide the toast after 3 seconds
setTimeout(function() {
x.classList.remove("show");
}, 3000);
}

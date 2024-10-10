// order.js

const orderData = {
    userId : null,
    items: [], 
    shippingAddress: {}, 
    paymentMethod: "",
    shippingCharge: 0,
    subtotal: 0, 
    totalAmount: 0, 
    createdOn: new Date(), 
    status: "Pending", //default status
    deliveredOn: null,
  };
  
  // Get references to the HTML elements
  const shippingRadios = document.querySelectorAll('.shipping');
  const subtotalElement = document.getElementById('checkoutSubTotal');
  const totalElement = document.getElementById('checkoutTotal');
  const checkoutProductData = document.querySelectorAll('.checkoutProductData');
  const addressCards = selectedRadio.closest('.addressCard');
  const confirmPaymentButtons = document.querySelectorAll('.confrimPayementBtn');
  
  // Define shipping charges
  const FREE_SHIPPING_CHARGE = 0;
  const EXPRESS_SHIPPING_CHARGE = 15;
  
  var options = {
    "key":"rzp_test_VMpJagMb9qPo7c" , // Enter the Key ID generated from the Dashboard
    "amount":"",                
    "currency": "INR",
    "name": "Planet ecommerce Pvt.Ltd",
    "description": "Test Transaction",
    "image": "https://example.com/your_logo",
    "order_id": "", //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
    "handler": function (response){
        //alert(response.razorpay_payment_id);
        //alert(response.razorpay_order_id);
        //alert(response.razorpay_signature)
        // console.log(response);
        paymentVerificationFunc(response)
        window.location.href = '/';
    },
    "prefill": {
        "name": "Gaurav Kumar",
        "email": "gaurav.kumar@example.com",
        "contact": "9000090000"
    },
    "notes": {
        "address": "Razorpay Corporate Office"
    },
    "theme": {
        "color": "#000000"
    }
  };
  
  confirmPaymentButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      console.log("button clicked")
      if (handleConfirmPayment()) {
        sendOrderData() 
          .then(orderData => {
            if (orderData.flag === true) {
              console.log('Cod payment success');
              window.location.href = '/order-placed';
             
              // Handle COD success, like redirecting to a success page
            }
            else if (orderData.flag === false) {
              console.log('wallet payment success');
            }
            else {
              // console.log(orderData.amount);
  
              options.amount = String(orderData.amount);
              options.order_id = String(orderData.id);
  
              // Open the Razorpay payment window
              rzp1 = new Razorpay(options);
              rzp1.open();
              
            }
          })
          .catch(error => {
            console.error(error);
          });
        e.preventDefault();
      }
    });
  });
  
  function handleConfirmPayment(event) {
  
    const isAddressSelected = validateAddress();
   
    if (isAddressSelected) {
      console.log('Payment confirmed');
      updateOrderSummary();
      getCheckoutProductSummary();
      getCheckoutAddressSummary();
      getPaymentDetails();
      return true;
    } else {
      const selectAddressModal = new bootstrap.Modal(document.getElementById('selectAddress'));
      selectAddressModal.show();
      setTimeout(() => {
        selectAddressModal.hide();
      }, 1000);
      // alert('Please select an address');
      console.log('Please make sure all data is selected');
      return false;
  
    }
  }
  
  function validateAddress() {
    // the !! is used to convert data into boolean value
    const selectedAddressCard = document.querySelector('.addressCard.selected');
    return !!selectedAddressCard; 
  }
  
  // Attach event listeners to shipping radios
  shippingRadios.forEach(shippingRadio => {
    shippingRadio.addEventListener('change', updateOrderSummary);
  });
  
  // Attach event listener to the wallet radio buttons
  const useWalletRadios = document.querySelectorAll('input[name="useWallet"]');
  useWalletRadios.forEach(useWalletRadio => {
    useWalletRadio.addEventListener('change', () => {
      // Add or remove the walletAdded flag based on the selected radio button
      orderData.walletAdded = useWalletRadio.value === "yes" && useWalletRadio.checked ? true : false;
    });
  });
  
  function updateOrderSummary() {
    const selectedShipping = document.querySelector('.shipping:checked');
    const shippingCharge = selectedShipping && selectedShipping.value === 'express' ? EXPRESS_SHIPPING_CHARGE : FREE_SHIPPING_CHARGE;
  
    const subtotal = parseFloat(subtotalElement.textContent.replace('₹', ''));
    const total = parseFloat(totalElement.textContent.replace('₹', ''));
    // const total = subtotal + shippingCharge; // Calculate total based on subtotal and shipping charge
    
    orderData.shippingCharge = shippingCharge;
    orderData.subtotal = subtotal;
    orderData.totalAmount = total;
  }
  
  function getCheckoutProductSummary(){
    checkoutProductData.forEach(hiddenElement => {
      // Retrieve data attributes
      const productId = hiddenElement.getAttribute('data-product-id');
      const productPrice = parseFloat(hiddenElement.getAttribute('data-product-price'));
      const quantity = parseInt(hiddenElement.getAttribute('data-quantity'));
   
        const newItem = {
          productId,
          productPrice,
          quantity
        }
       orderData.items.push(newItem);
    
     
    });
  }
  
  function getCheckoutAddressSummary(){
    addressCards.forEach(addressCard => {
      if (selectedRadio) {
        // Retrieve the data attributes
        const addressId = addressCard.getAttribute('data-address-id');
        const userId = addressCard.getAttribute('data-user-id');
        const name = addressCard.querySelector('.user-name').textContent;
        const country = addressCard.querySelector('.country').textContent;
        const streetAddress = addressCard.querySelector('.street-address').textContent;
        const city = addressCard.querySelector('.city').textContent;
        const state = addressCard.querySelector('.state').textContent;
        const pincode = addressCard.querySelector('.pincode').textContent;
        console.log(userId , 'this is user id ');
        orderData.userId = userId;
  
        orderData.shippingAddress={
          addressId:addressId,
          name:name,
          country:country,
          streetAddress:streetAddress,
          city:city,
          state:state,
          pincode:pincode,
        }
      }
    });
    
  }
  
  function getPaymentDetails(){
      const activeTabPane = document.querySelector('.tab-pane.active');
      const paymentMode = activeTabPane.id; // Get the ID of the active tab pane
      
      // console.log('Selected Payment Mode:', paymentMode);
      orderData.paymentMethod = paymentMode;
  
  }
  
  async function sendOrderData() {
    try {
      console.log("orderDATA:hhhhhhhh" + orderData);
      const response = await fetch('/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderData })
      });
  
      const responseData = await response.json();
      console.log("ResponseData:hhhhhhhhhhhhhh"+responseData)
      return responseData;
    } catch (error) {
      throw error;
    }
  }
  //sending the payment data to the server for payment confirmation 
  function paymentVerificationFunc (paymentData){
    fetch('/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({paymentData})
    })
      .then(response => {
        if (response.ok) {
         console.log('payment data send successfylly');
        }
      })
      .catch(error => {
        console.error('Error verifying payment:', error);
        // Handle the error
      });
  }
  
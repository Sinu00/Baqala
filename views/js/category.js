const categoryForm = document.getElementById('categoryForm');

categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault(); // Prevent the default form submission

  try {
    const formData = new FormData(); // Create a new FormData object
    const categoryName = document.getElementById('categoryName').value;
    const categoryImage = document.getElementById('categoryImage').files[0]; // Retrieve the file object

    // Append category name and image to the FormData object
    formData.append('categoryName', categoryName); 
    formData.append('categoryImage', categoryImage); 

    const response = await fetch('/admin/add-category', {
      method: 'POST',
      body: formData // No need to set 'Content-Type'; fetch will set it to 'multipart/form-data'
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    const data = await response.json();
    document.getElementById('categoryError').innerHTML = data.message; 

    if (data.message === 'success') {
      const modal = document.getElementById('addUserModal');
      const categoryNameField = document.getElementById('catId');
      categoryNameField.style.display = 'none';

      const successId = document.getElementById('succesId');
      successId.style.display = 'block';
    }
  } catch (error) {
    console.error('Error:', error);
  }
});

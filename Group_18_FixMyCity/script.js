document.addEventListener("DOMContentLoaded", function () {
    // Dropdown Toggle
    const dropdown = document.querySelector(".dropdown");
    const submenu = dropdown.querySelector(".sub-menu");

    dropdown.addEventListener("click", function () {
        this.classList.toggle("active");
        submenu.style.maxHeight = this.classList.contains("active") ? submenu.scrollHeight + "px" : "0";
    });

    // Help Button Alert
    document.querySelector(".help-btn").addEventListener("click", function () {
        alert("Need help? Contact support at support@fixmycity.com");
    });

    // Toggle Create Post Form
    const createPostBtn = document.querySelector(".create-post button");
    const postForm = document.createElement("div");
    postForm.innerHTML = `
        <textarea placeholder="Describe your issue..."></textarea>
        <input type="file" id="imageUpload" accept="image/*">
        <img id="imagePreview" src="" alt="Image Preview" style="display: none; max-width: 100px; margin-top: 10px;">
        <button class="submit-post">Post</button>
    `;
    postForm.style.display = "none"; 
    postForm.classList.add("post-form");
    createPostBtn.parentNode.appendChild(postForm);

    createPostBtn.addEventListener("click", function () {
        postForm.style.display = postForm.style.display === "none" ? "block" : "none";
    });

    // Image Upload Preview
    const imageUpload = postForm.querySelector("#imageUpload");
    const imagePreview = postForm.querySelector("#imagePreview");

    imageUpload.addEventListener("change", function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = "block";
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = "none";
        }
    });

    // Like Button Counter
    document.querySelectorAll(".post-footer button").forEach(button => {
        if (button.innerHTML.includes("thumbs-up")) {
            button.addEventListener("click", function () {
                let currentLikes = parseInt(button.textContent.trim()) || 0;
                button.innerHTML = `<i class="fas fa-thumbs-up"></i> ${currentLikes + 1}`;
            });
        }
    });
});

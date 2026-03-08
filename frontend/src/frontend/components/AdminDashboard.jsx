import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FaUpload,
  FaPlus,
  FaTrash,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";

const AdminDashboard = () => {
  // ✅ FIXED: Changed 'title' to 'name' to match backend schema
  const [formData, setFormData] = useState({
    name: "", // Changed from 'title'
    description: "",
    category: "shirts",
    gender: "mens",
    price: "", // Changed from 'priceRange' - will store numeric value
    priceRange: "", // Keep for display purposes
    colors: ["#000000", "#FFFFFF"],
    sizes: ["S", "M", "L"],
    image: "",
  });

  const [products, setProducts] = useState([]);
  const [imagePreview, setImagePreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

  // Fetch existing products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // ✅ CORRECTED: Fetch products from backend with error handling
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrors({});
      console.log("🔄 Fetching products from backend...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch("http://localhost:3000/api/products", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      if (response.ok) {
        const result = await response.json();
        console.log("📦 Products fetched:", result);

        // ✅ FIXED: Backend returns products in the 'data' property
        const productsData =
          result.data || (Array.isArray(result) ? result : []);

        // ✅ Filter out invalid products
        const validProducts = productsData.filter((p) => p && p._id && p.name);

        setProducts(validProducts);
        console.log(`✅ Loaded ${validProducts.length} valid products`);
      } else if (response.status === 404) {
        console.warn("⚠️ Products endpoint not found");
        setProducts([]);
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      // ✅ Distinguish between error types
      let errorMessage = "Failed to fetch products";

      if (error.name === "AbortError") {
        errorMessage = "Request timeout - server took too long to respond";
        console.error("❌ Request timeout");
      } else if (error instanceof TypeError) {
        errorMessage = "Network error - unable to connect to server";
        console.error("❌ Network error:", error.message);
      } else {
        errorMessage = error.message || "Unknown error occurred";
        console.error("❌ Error fetching products:", error);
      }

      setErrors({ fetch: errorMessage });
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (e) => {
      try {
        const { name, value } = e.target;

        // ✅ Validate input
        if (!name) {
          console.warn("⚠️ Invalid input field");
          return;
        }

        setFormData({
          ...formData,
          [name]: value,
        });

        // Clear field error when user starts typing
        if (errors[name]) {
          setErrors({ ...errors, [name]: "" });
        }
        console.log(`✅ Field updated: ${name}`);
      } catch (error) {
        console.error("❌ Error in handleChange:", error);
      }
    },
    [formData, errors],
  );

  const handleColorChange = useCallback(
    (index, value) => {
      try {
        // ✅ Validate index and value
        if (index < 0 || index >= formData.colors.length || !value) {
          console.warn("⚠️ Invalid color change parameters");
          return;
        }

        const newColors = [...formData.colors];
        newColors[index] = value;
        setFormData({ ...formData, colors: newColors });
        console.log(`✅ Color ${index} changed to ${value}`);
      } catch (error) {
        console.error("❌ Error changing color:", error);
      }
    },
    [formData],
  );

  const addColorInput = useCallback(() => {
    try {
      if (formData.colors.length >= 10) {
        console.warn("⚠️ Maximum 10 colors allowed");
        return;
      }

      setFormData({
        ...formData,
        colors: [...formData.colors, "#000000"],
      });
      console.log("✅ Color input added");
    } catch (error) {
      console.error("❌ Error adding color input:", error);
    }
  }, [formData]);

  const removeColorInput = useCallback(
    (index) => {
      try {
        // ✅ Validate index and ensure at least one color remains
        if (index < 0 || index >= formData.colors.length) {
          console.warn("⚠️ Invalid color index");
          return;
        }

        const newColors = formData.colors.filter((_, i) => i !== index);

        if (newColors.length === 0) {
          console.warn("⚠️ At least one color is required");
          return;
        }

        setFormData({ ...formData, colors: newColors });
        console.log(`✅ Color ${index} removed`);
      } catch (error) {
        console.error("❌ Error removing color:", error);
      }
    },
    [formData],
  );

  const toggleSize = useCallback(
    (size) => {
      try {
        // ✅ Validate size
        if (!size || typeof size !== "string") {
          console.warn("⚠️ Invalid size value");
          return;
        }

        const newSizes = formData.sizes.includes(size)
          ? formData.sizes.filter((s) => s !== size)
          : [...formData.sizes, size];

        // Ensure at least one size is selected
        if (newSizes.length === 0) {
          console.warn("⚠️ At least one size is required");
          return;
        }

        setFormData({ ...formData, sizes: newSizes });

        if (errors.sizes) {
          setErrors({ ...errors, sizes: "" });
        }
        console.log(`✅ Size ${size} toggled`);
      } catch (error) {
        console.error("❌ Error toggling size:", error);
      }
    },
    [formData, errors],
  );

  const handleImageUpload = useCallback(
    (e) => {
      try {
        const file = e.target.files?.[0];

        if (!file) {
          console.warn("⚠️ No file selected");
          return;
        }

        // ✅ Validate file size
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_FILE_SIZE) {
          const errorMsg = `Image size should be less than 5MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`;
          setErrors({ ...errors, image: errorMsg });
          console.error("❌ File too large:", errorMsg);
          return;
        }

        // ✅ Validate file type
        const validImageTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ];
        if (!validImageTypes.includes(file.type)) {
          const errorMsg = `Invalid image type. Allowed: ${validImageTypes.join(", ")}`;
          setErrors({ ...errors, image: errorMsg });
          console.error("❌ Invalid file type:", errorMsg);
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            setImagePreview(reader.result);
            setFormData({ ...formData, image: reader.result });
            setErrors({ ...errors, image: "" });
            console.log("✅ Image uploaded successfully");
          } catch (error) {
            console.error("❌ Error processing image:", error);
            setErrors({ ...errors, image: "Error processing image" });
          }
        };

        reader.onerror = () => {
          console.error("❌ FileReader error");
          setErrors({ ...errors, image: "Error reading file" });
        };

        reader.readAsDataURL(file);
      } catch (error) {
        console.error("❌ Error in handleImageUpload:", error);
        setErrors({ ...errors, image: "Error uploading image" });
      }
    },
    [formData, errors],
  );

  const removeImage = useCallback(() => {
    try {
      setImagePreview("");
      setFormData({ ...formData, image: "" });
      setErrors({ ...errors, image: "" });
      console.log("✅ Image removed");
    } catch (error) {
      console.error("❌ Error removing image:", error);
    }
  }, [formData, errors]);

  const validateForm = () => {
    const newErrors = {};

    // ✅ FIXED: Validate 'name' instead of 'title'
    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    } else if (formData.name.length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    // ✅ FIXED: Validate 'price' field
    if (!formData.price) {
      newErrors.price = "Price is required";
    } else if (isNaN(formData.price) || Number(formData.price) <= 0) {
      newErrors.price = "Price must be a valid positive number";
    }

    if (formData.colors.length === 0) {
      newErrors.colors = "At least one color is required";
    }

    if (formData.sizes.length === 0) {
      newErrors.sizes = "At least one size must be selected";
    }

    if (!formData.image) {
      newErrors.image = "Product image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ CORRECTED: Handle form submission with proper data formatting
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("➕ Adding new product...");

      // ✅ FIXED: Prepare data with correct field names and types
      const productData = {
        name: formData.name, // Changed from 'title'
        description: formData.description,
        category: formData.category.toLowerCase(), // Ensure lowercase
        gender: formData.gender,
        price: Number(formData.price), // Convert to number
        priceRange: formData.priceRange || `$${formData.price}`, // Optional display string
        colors: formData.colors,
        sizes: formData.sizes,
        image: formData.image,
        stock: 10, // Default stock value
      };

      console.log("📝 Product data:", productData);

      const response = await fetch("http://localhost:3000/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();
      console.log("📦 Backend response:", result);
      console.log("📡 Response OK:", response.ok);
      console.log("📡 Response status:", response.status);

      // ✅ FIXED: Check response.ok instead of result.success
      if (response.ok) {
        console.log("✅ Product added successfully!", result);

        // Add new product to the list (result.data IS the product object)
        const newProduct = result.data || result;
        setProducts([newProduct, ...products]);

        // ✅ FIXED: Reset form with 'name' instead of 'title'
        setFormData({
          name: "", // Changed from 'title'
          description: "",
          category: "shirts",
          gender: "mens",
          price: "", // Changed from 'priceRange'
          priceRange: "",
          colors: ["#000000", "#FFFFFF"],
          sizes: ["S", "M", "L"],
          image: "",
        });
        setImagePreview("");
        setErrors({});

        // Show success message
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Refresh products list to ensure sync
        fetchProducts();
      } else {
        console.error("❌ Backend returned error:", result);
        setErrors({
          submit:
            result.message ||
            result.error ||
            "Failed to add product. Please try again.",
        });
      }
    } catch (error) {
      console.error("❌ Error adding product:", error);
      setErrors({
        submit:
          "Error connecting to backend. Make sure the server is running on port 3000.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    page: {
      fontFamily: "'Cormorant Garamond', 'Georgia', serif",
      backgroundColor: "#F5F5F5",
      minHeight: "100vh",
      padding: "40px 20px",
    },
    container: {
      maxWidth: "1000px",
      margin: "0 auto",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "40px",
      paddingBottom: "25px",
      borderBottom: "1px solid #E0E0E0",
      flexWrap: "wrap",
      gap: "15px",
    },
    title: {
      fontSize: "36px",
      fontWeight: "300",
      color: "#000000",
      letterSpacing: "-0.5px",
      margin: 0,
    },
    backBtn: {
      padding: "12px 24px",
      backgroundColor: "#000000",
      color: "#FFFFFF",
      border: "none",
      fontSize: "11px",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      cursor: "pointer",
      textDecoration: "none",
      display: "inline-block",
      transition: "all 0.3s ease",
    },
    successMessage: {
      backgroundColor: "#4CAF50",
      color: "#FFFFFF",
      padding: "15px 20px",
      borderRadius: "4px",
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      fontSize: "14px",
      animation: "slideIn 0.3s ease",
    },
    formContainer: {
      backgroundColor: "#FFFFFF",
      padding: "40px",
      borderRadius: "2px",
      boxShadow: "0 1px 10px rgba(0,0,0,0.05)",
      marginBottom: "50px",
    },
    formTitle: {
      fontSize: "24px",
      fontWeight: "400",
      marginBottom: "30px",
      color: "#2C2C2C",
      paddingBottom: "15px",
      borderBottom: "1px solid #F0F0F0",
    },
    formGroup: {
      marginBottom: "25px",
    },
    label: {
      display: "block",
      fontSize: "11px",
      fontWeight: "600",
      letterSpacing: "1.5px",
      textTransform: "uppercase",
      color: "#4A4A4A",
      marginBottom: "10px",
    },
    requiredStar: {
      color: "#FF4444",
      marginLeft: "3px",
    },
    input: {
      width: "100%",
      padding: "12px 15px",
      border: "1px solid #D8D8D8",
      fontSize: "14px",
      outline: "none",
      transition: "all 0.3s ease",
      fontFamily: "'Inter', sans-serif",
      boxSizing: "border-box",
      borderRadius: "2px",
    },
    inputError: {
      borderColor: "#FF4444",
    },
    textarea: {
      width: "100%",
      padding: "12px 15px",
      border: "1px solid #D8D8D8",
      fontSize: "14px",
      outline: "none",
      minHeight: "100px",
      resize: "vertical",
      fontFamily: "'Inter', sans-serif",
      boxSizing: "border-box",
      borderRadius: "2px",
      lineHeight: "1.6",
    },
    errorMessage: {
      color: "#FF4444",
      fontSize: "12px",
      marginTop: "6px",
      display: "flex",
      alignItems: "center",
      gap: "5px",
    },
    select: {
      width: "100%",
      padding: "12px 15px",
      border: "1px solid #D8D8D8",
      fontSize: "12px",
      letterSpacing: "1px",
      textTransform: "uppercase",
      outline: "none",
      cursor: "pointer",
      boxSizing: "border-box",
      borderRadius: "2px",
      backgroundColor: "#FFFFFF",
    },
    gridRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "20px",
    },
    colorInputContainer: {
      display: "flex",
      gap: "10px",
      alignItems: "center",
      marginBottom: "10px",
      padding: "8px",
      backgroundColor: "#FAFAFA",
      borderRadius: "2px",
    },
    colorInput: {
      width: "50px",
      height: "50px",
      border: "2px solid #D8D8D8",
      cursor: "pointer",
      borderRadius: "2px",
    },
    colorCode: {
      flex: 1,
      padding: "10px 12px",
      border: "1px solid #D8D8D8",
      fontSize: "13px",
      fontFamily: "monospace",
      borderRadius: "2px",
    },
    addColorBtn: {
      padding: "10px 18px",
      backgroundColor: "#FFFFFF",
      color: "#000000",
      border: "2px solid #000000",
      fontSize: "11px",
      letterSpacing: "1px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.3s ease",
      marginTop: "10px",
      textTransform: "uppercase",
      fontWeight: "500",
    },
    removeBtn: {
      padding: "10px",
      backgroundColor: "#FF4444",
      color: "#FFFFFF",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      transition: "all 0.3s ease",
      borderRadius: "2px",
      minWidth: "40px",
    },
    sizeSelector: {
      display: "flex",
      flexWrap: "wrap",
      gap: "10px",
      marginTop: "10px",
    },
    sizeButton: {
      padding: "10px 20px",
      border: "2px solid #D8D8D8",
      backgroundColor: "#FFFFFF",
      color: "#4A4A4A",
      fontSize: "13px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.3s ease",
      minWidth: "60px",
      textAlign: "center",
      letterSpacing: "1px",
    },
    sizeButtonSelected: {
      border: "2px solid #000000",
      backgroundColor: "#000000",
      color: "#FFFFFF",
    },
    imageUploadArea: {
      border: "2px dashed #D8D8D8",
      padding: "40px",
      textAlign: "center",
      cursor: "pointer",
      transition: "all 0.3s ease",
      backgroundColor: "#FAFAFA",
      borderRadius: "2px",
      position: "relative",
    },
    imagePreviewContainer: {
      position: "relative",
      marginTop: "20px",
      display: "inline-block",
    },
    imagePreview: {
      width: "100%",
      maxWidth: "400px",
      height: "auto",
      maxHeight: "400px",
      objectFit: "cover",
      border: "1px solid #E8E8E8",
      display: "block",
      marginLeft: "auto",
      marginRight: "auto",
      borderRadius: "2px",
    },
    removeImageBtn: {
      position: "absolute",
      top: "10px",
      right: "10px",
      backgroundColor: "#FF4444",
      color: "#FFFFFF",
      border: "none",
      borderRadius: "50%",
      width: "35px",
      height: "35px",
      cursor: "pointer",
      fontSize: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.3s ease",
    },
    submitBtn: {
      width: "100%",
      padding: "16px",
      backgroundColor: "#000000",
      color: "#FFFFFF",
      border: "none",
      fontSize: "12px",
      letterSpacing: "2px",
      textTransform: "uppercase",
      fontWeight: "600",
      cursor: "pointer",
      marginTop: "30px",
      transition: "all 0.3s ease",
      borderRadius: "2px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
    },
    submitBtnDisabled: {
      backgroundColor: "#CCCCCC",
      cursor: "not-allowed",
    },
    productGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
      gap: "25px",
    },
    productCard: {
      backgroundColor: "#FFFFFF",
      padding: "0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      transition: "all 0.3s ease",
      cursor: "pointer",
      overflow: "hidden",
      borderRadius: "2px",
    },
    productImage: {
      width: "100%",
      height: "300px",
      objectFit: "cover",
    },
    productInfo: {
      padding: "20px",
    },
    productTitle: {
      fontSize: "16px",
      fontWeight: "500",
      marginBottom: "8px",
      color: "#2C2C2C",
    },
    productMeta: {
      display: "flex",
      gap: "10px",
      marginTop: "10px",
      flexWrap: "wrap",
    },
    badge: {
      padding: "4px 10px",
      backgroundColor: "#F5F5F5",
      fontSize: "10px",
      letterSpacing: "1px",
      textTransform: "uppercase",
      borderRadius: "2px",
    },
    helpText: {
      fontSize: "12px",
      color: "#888888",
      marginTop: "6px",
      fontStyle: "italic",
    },
    loadingContainer: {
      textAlign: "center",
      padding: "40px",
      color: "#666",
    },
  };

  return (
    <div style={styles.page}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@400;500;600&display=swap');
          
          @keyframes slideIn {
            from {
              transform: translateY(-20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          input:focus, textarea:focus, select:focus {
            border-color: #000000 !important;
          }

          button:hover:not(:disabled) {
            transform: translateY(-1px);
          }
        `}
      </style>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <Link to="/collections" style={styles.backBtn}>
            View Collections
          </Link>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div style={styles.successMessage}>
            <FaCheckCircle size={18} />
            <span>
              Product added successfully! It will now appear in Collections.
            </span>
          </div>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div style={{ ...styles.successMessage, backgroundColor: "#FF4444" }}>
            <FaTimes size={18} />
            <span>{errors.submit}</span>
          </div>
        )}

        {/* Add Product Form */}
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Add New Product</h2>

          <form onSubmit={handleSubmit}>
            {/* Product Name - CHANGED FROM 'TITLE' */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Product Name<span style={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                style={{
                  ...styles.input,
                  border: errors.name
                    ? "1px solid #FF4444"
                    : styles.input.border,
                }}
                placeholder="e.g., Classic White Shirt"
              />
              {errors.name && (
                <div style={styles.errorMessage}>
                  <FaTimes size={12} /> {errors.name}
                </div>
              )}
              <p style={styles.helpText}>
                Enter a clear, descriptive product name
              </p>
            </div>

            {/* Description */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Description<span style={styles.requiredStar}>*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                style={{
                  ...styles.textarea,
                  border: errors.description
                    ? "1px solid #FF4444"
                    : styles.textarea.border,
                }}
                placeholder="Describe your product in detail..."
              />
              {errors.description && (
                <div style={styles.errorMessage}>
                  <FaTimes size={12} /> {errors.description}
                </div>
              )}
              <p style={styles.helpText}>
                Character count: {formData.description.length} (Minimum 10
                characters)
              </p>
            </div>

            {/* Category & Gender Row */}
            <div style={styles.gridRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="shirts">Shirts</option>
                  <option value="tshirts">T-Shirts</option>
                  <option value="bottom">Pants</option>
                  <option value="jackets">Jackets</option>
                  <option value="dresses">Dresses</option>
                  <option value="kids-shirts">Kids Shirts</option>
                  <option value="kids-pants">Kids Pants</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  style={styles.select}
                >
                  <option value="mens">Men's</option>
                  <option value="womens">Women's</option>
                  <option value="all">Unisex</option>
                </select>
              </div>
            </div>

            {/* Price - CHANGED TO NUMERIC INPUT */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Price<span style={styles.requiredStar}>*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                style={{
                  ...styles.input,
                  border: errors.price
                    ? "1px solid #FF4444"
                    : styles.input.border,
                }}
                placeholder="e.g., 499"
                min="0"
                step="0.01"
              />
              {errors.price && (
                <div style={styles.errorMessage}>
                  <FaTimes size={12} /> {errors.price}
                </div>
              )}
              <p style={styles.helpText}>Enter numeric price value</p>
            </div>

            {/* Optional Price Range Display */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Price Range Display (Optional)</label>
              <input
                type="text"
                name="priceRange"
                value={formData.priceRange}
                onChange={handleChange}
                style={styles.input}
                placeholder="e.g., $99 or $99-$199"
              />
              <p style={styles.helpText}>
                Optional: For displaying price ranges like "$99-$199"
              </p>
            </div>

            {/* Available Sizes */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Available Sizes<span style={styles.requiredStar}>*</span>
              </label>
              <div style={styles.sizeSelector}>
                {sizeOptions.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    style={{
                      ...styles.sizeButton,
                      ...(formData.sizes.includes(size) &&
                        styles.sizeButtonSelected),
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {errors.sizes && (
                <div style={styles.errorMessage}>
                  <FaTimes size={12} /> {errors.sizes}
                </div>
              )}
              <p style={styles.helpText}>
                Selected:{" "}
                {formData.sizes.length > 0 ? formData.sizes.join(", ") : "None"}
              </p>
            </div>

            {/* Colors */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Available Colors<span style={styles.requiredStar}>*</span>
              </label>
              {formData.colors.map((color, index) => (
                <div key={index} style={styles.colorInputContainer}>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    style={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    style={styles.colorCode}
                    placeholder="#000000"
                  />
                  {formData.colors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeColorInput(index)}
                      style={styles.removeBtn}
                      onMouseEnter={(e) =>
                        (e.target.style.backgroundColor = "#CC0000")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.backgroundColor = "#FF4444")
                      }
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
              {formData.colors.length < 10 && (
                <button
                  type="button"
                  onClick={addColorInput}
                  style={styles.addColorBtn}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#000000";
                    e.target.style.color = "#FFFFFF";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#FFFFFF";
                    e.target.style.color = "#000000";
                  }}
                >
                  <FaPlus /> Add Color
                </button>
              )}
              {errors.colors && (
                <div style={styles.errorMessage}>
                  <FaTimes size={12} /> {errors.colors}
                </div>
              )}
            </div>

            {/* Image Upload */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Product Image<span style={styles.requiredStar}>*</span>
              </label>
              {!imagePreview ? (
                <label
                  htmlFor="imageUpload"
                  style={{
                    ...styles.imageUploadArea,
                    borderColor: errors.image ? "#FF4444" : "#D8D8D8",
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = "#000000";
                    e.currentTarget.style.backgroundColor = "#F0F0F0";
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = "#D8D8D8";
                    e.currentTarget.style.backgroundColor = "#FAFAFA";
                  }}
                >
                  <FaUpload
                    style={{
                      fontSize: "40px",
                      color: "#4A4A4A",
                      marginBottom: "15px",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#666666",
                      margin: "10px 0 5px 0",
                    }}
                  >
                    Click to upload or drag and drop
                  </p>
                  <p style={{ fontSize: "12px", color: "#999999", margin: 0 }}>
                    PNG, JPG up to 5MB
                  </p>
                  <input
                    id="imageUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                </label>
              ) : (
                <div style={styles.imagePreviewContainer}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={styles.imagePreview}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    style={styles.removeImageBtn}
                    onMouseEnter={(e) =>
                      (e.target.style.backgroundColor = "#CC0000")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.backgroundColor = "#FF4444")
                    }
                  >
                    <FaTimes />
                  </button>
                </div>
              )}
              {errors.image && (
                <div style={styles.errorMessage}>
                  <FaTimes size={12} /> {errors.image}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                ...(isSubmitting && styles.submitBtnDisabled),
              }}
              disabled={isSubmitting}
              onMouseEnter={(e) =>
                !isSubmitting && (e.target.style.backgroundColor = "#2C2C2C")
              }
              onMouseLeave={(e) =>
                !isSubmitting && (e.target.style.backgroundColor = "#000000")
              }
            >
              {isSubmitting ? (
                <>
                  <span>Adding Product...</span>
                </>
              ) : (
                <>
                  <FaPlus /> Add Product to Collections
                </>
              )}
            </button>
          </form>
        </div>

        {/* Products List */}
        {isLoading ? (
          <div style={styles.loadingContainer}>
            <p>Loading products...</p>
          </div>
        ) : products.length > 0 ? (
          <>
            <h2
              style={{
                fontSize: "28px",
                fontWeight: "300",
                marginBottom: "25px",
                color: "#2C2C2C",
              }}
            >
              All Products ({products.length})
            </h2>
            <div style={styles.productGrid}>
              {products.map((product, index) => (
                <div
                  key={product._id || index}
                  style={styles.productCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-5px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 20px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0,0,0,0.08)";
                  }}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    style={styles.productImage}
                  />
                  <div style={styles.productInfo}>
                    <h3 style={styles.productTitle}>{product.name}</h3>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        marginBottom: "10px",
                        lineHeight: "1.5",
                      }}
                    >
                      {product.description.substring(0, 80)}
                      {product.description.length > 80 ? "..." : ""}
                    </p>
                    <div style={styles.productMeta}>
                      <span style={styles.badge}>{product.category}</span>
                      <span style={styles.badge}>{product.gender}</span>
                    </div>
                    <p
                      style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        marginTop: "15px",
                        color: "#000",
                      }}
                    >
                      {product.priceRange || `$${product.price}`}
                    </p>
                    {product.sizes && product.sizes.length > 0 && (
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#888",
                          marginTop: "8px",
                        }}
                      >
                        Sizes: {product.sizes.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={styles.loadingContainer}>
            <p>No products yet. Add your first product above!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

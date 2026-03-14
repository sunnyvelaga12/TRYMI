import React, { createContext, useState, useEffect, useContext } from "react";
import { useToast } from "@chakra-ui/react";

const ProductsContext = createContext();

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000); // 15 second timeout

    try {
      const response = await fetch("https://trymi-backend.onrender.com/api/collections", {
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      // ✅ Validate data is an array
      if (!Array.isArray(data)) {
        console.warn("⚠️ API returned non-array data, converting to array");
        const arrayData = Array.isArray(data.products) ? data.products : [data];
        setProducts(arrayData);
        console.log("✅ Products loaded from context:", arrayData.length);
      } else {
        setProducts(data);
        console.log("✅ Products loaded from context:", data.length);
      }
    } catch (err) {
      // ✅ Distinguish between different error types
      let errorMessage = "Failed to load products";

      if (err.name === "AbortError") {
        errorMessage = "Request timeout - server took too long to respond";
        console.error("❌ Request timeout");
      } else if (err instanceof TypeError) {
        errorMessage = "Network error - unable to connect to server";
        console.error("❌ Network error:", err.message);
      } else {
        errorMessage = err.message || "Unknown error occurred";
        console.error("❌ Fetch error:", err);
      }

      setError(errorMessage);
      toast({
        title: "Failed to load products",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const refetchProducts = () => {
    fetchProducts();
  };

  const getProductsByCategory = (category) => {
    try {
      // ✅ Validate inputs
      if (!category || typeof category !== "string") {
        console.warn("⚠️ Invalid category provided:", category);
        return products;
      }

      if (category.toLowerCase() === "all") {
        return products;
      }

      // ✅ Case-insensitive filtering with dual singular/plural matching
      const normalizedCategory = category.toLowerCase().trim();
      const filtered = products.filter((p) => {
        if (!p || !p.category) return false;
        const productCategory = p.category.toLowerCase().trim();
        return (
          productCategory === normalizedCategory ||
          productCategory === normalizedCategory + "s" ||
          productCategory === normalizedCategory.replace(/s$/, "")
        );
      });

      console.log(
        `✅ Filtered ${filtered.length} products by category: ${category}`,
      );
      return filtered;
    } catch (error) {
      console.error("❌ Error filtering products:", error);
      return products;
    }
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        error,
        refetchProducts,
        getProductsByCategory,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProducts must be used within ProductsProvider");
  }
  return context;
};



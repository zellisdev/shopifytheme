var dahPFResultPage = Vue.createApp({
  data() {
    return {
      pfresult: bpfresult || [],
      pfactive: bpfactive || false,
      pftotal: 0,
      pfmxpg: 0,
      access: zellisaccess,
      noprds: false,
      curpgnum: 1,
      totalpgnum: [],
      loading: true,
      products: [],
    };
  },
  methods: {
    // Define getCollectionHandleFromURL as a method
    getCollectionHandleFromURL() {
      var scriptContent = $("script#__st").html();
      var jsonString = scriptContent
        .replace(/^var __st=/, "")
        .replace(/;\s*$/, ""); // Remove 'var __st=' and any trailing semicolon
      var jsonData = JSON.parse(jsonString); // Now parse the valid JSON string
      var ridValue = jsonData.rid;
      return ridValue || ""; // Returns an empty string if no rid value is found
    },

    fitmentCheck() {
      if (!window.pfWrap || !window.pfWrap.items) return;

      const fittedSkus = window.pfWrap.items
        .map((e) => (e.parent_product_id ? e.parent_product_id : null))
        .filter((id) => id !== null);

      const isBpfActive = typeof bpfactive !== "undefined" && bpfactive;

      // Update all `.partfinder-status` elements
      document
        .querySelectorAll(".partfinder-status")
        .forEach((statusElement) => {
          const sku = statusElement.getAttribute("data-sku");

          if (!sku) {
            console.log("No SKU, hiding element");
            statusElement.classList.add("hidden");
            return;
          }

          const isFitted = fittedSkus.includes(sku);

          // Dynamically build and replace content inside the status element
          statusElement.innerHTML = this.createStatusHtml(isFitted);
          statusElement.classList.remove("hidden"); // Ensure it's visible when there's content

          // If the vehicle is not fitted and `bpfactive` is false, hide the element
          if (!isBpfActive) {
            console.log("Hiding element due to bpfactive or fitment check");
            statusElement.classList.add("hidden");
          }
        });
    },

    createStatusHtml(isFitted) {
      if (isFitted) {
        return `
          <div class="status dahfitted">Fits your selected vehicle</div>
        `;
      } else {
        return `
          <div class="status dahnotfitted">May not fit your vehicle</div>
        `;
      }
    },

    async cngpgnum(u) {
      $(window).scrollTop(0);
      this.loading = true;
      this.curpgnum = u;
      try {
        var data =
          "type=" +
          this.access.type +
          "&user_id=" +
          this.access.id +
          "&limit=24&page=" +
          u;
        this.pfresult.forEach(function (e, i) {
          data += "&selected_item[" + i + "]=" + encodeURIComponent(e);
        });
        const res = await axios.post(
          `https://staging.zellisauto.com/api/v1/get_parts`,
          data,
          {
            headers: {
              "X-TOKEN": this.access.token,
            },
          }
        );
        if (res.data.status) {
          if (res.data.data.items && res.data.data.items.length > 0) {
            this.products = res.data.data.items.map((e) => {
              return e.parent_product_id || null;
            });
            this.fitmentCheck(); // Now accessible in this context
          } else {
            this.noprds = true;
            this.loading = false;
          }
        }
      } catch (error) {
        console.log(error);
      }
    },
    async setPages() {
      var totalprds = this.pftotal;
      let numberOfPages = Math.ceil(totalprds / 24);
      this.totalpgnum = [];
      for (let index = 1; index <= numberOfPages; index++) {
        this.totalpgnum.push(index);
      }
      this.curpgnum = 1;
    },
    async fetchAll() {
      const collectionName = this.getCollectionHandleFromURL();
      const searchTerm =
        new URLSearchParams(window.location.search).get("q") || ""; // Get search query from URL
      const url = `https://demozellis.myshopify.com/admin/api/2024-10/products.json?&collection_id=${collectionName}&limit=50`;
      const accessToken = "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";

      let allProducts = [];
      let nextPageUrl = url;

      try {
        // Loop to fetch all pages of products
        while (nextPageUrl) {
          const response = await axios.get(nextPageUrl, {
            headers: {
              "X-Shopify-Access-Token": accessToken,
            },
          });

          // Add the fetched products to the allProducts array
          allProducts = allProducts.concat(response.data.products);

          // Get the next page URL from the 'link' header
          const linkHeader = response.headers["link"];
          if (linkHeader && linkHeader.includes('rel="next"')) {
            const nextLink = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
            nextPageUrl = nextLink ? nextLink[1] : null;
          } else {
            nextPageUrl = null; // No next page, stop the loop
          }
        }

        // Filter the products based on the search term
        const filteredProducts = searchTerm.trim()
          ? allProducts.filter((product) =>
              product.title.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : allProducts;

        return { products: filteredProducts }; // Return filtered products
      } catch (error) {
        console.error(error);
        this.noprds = true;
        this.loading = false;
        throw error; // Throw error so it can be handled by the calling code
      }
    },
  },
  created() {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("all") === "yes") {
      const searchTerm =
        new URLSearchParams(window.location.search).get("q") || "";
      this.fetchAll()
        .then((res_data) => {
          setTimeout(() => {
            if (res_data.products && res_data.products.length > 0) {
              let productIDs = window.pfWrap.items
                .map((e) => (e.parent_product_id ? e.parent_product_id : null))
                .filter((id) => id != null);

              // Ensure that both `product.id` and `productIDs` are strings or numbers, as necessary
              productIDs = productIDs.map((id) => String(id)); // Convert all IDs to strings

              // Filter the products based on the search term
              this.products = searchTerm.trim()
                ? res_data.products.filter((product) =>
                    product.title
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  )
                : res_data.products;

              // Debugging: Log products and productIDs to verify data
              console.log("productIDs:", productIDs);
              console.log("Products:", this.products);

              // Identify matching products based on their IDs
              let matchingProducts = this.products.filter(
                (product) => productIDs.includes(String(product.id)) // Convert product.id to string for comparison
              );

              // Identify non-matching products
              let nonMatchingProducts = this.products.filter(
                (product) => !productIDs.includes(String(product.id))
              );

              // Rearrange products so that matching products come first
              this.products = [...matchingProducts, ...nonMatchingProducts];

              // Debugging: Log the matching product IDs
              let matchingProductIDs = matchingProducts.map(
                (product) => product.id
              );
              console.log("Matching Product IDs:", matchingProductIDs);

              this.loading = false;

              setTimeout(() => {
                this.fitmentCheck();
              }, 500);
            } else {
              this.noprds = true; // No products found
              this.loading = false;
            }
          }, 500); // 500ms timeout
        })
        .catch((error) => {
          console.error(error);
          this.noprds = true; // Handle error scenario
          this.loading = false;
        });
    } else {
      if (this.pfactive) {
        this.loading = true;
        let intervalId = setInterval(() => {
          if (window.pfWrap !== null && window.pfWrap !== undefined) {
            if (parseInt(window.pfWrap.total_records) > 0) {
              clearInterval(intervalId);
              this.pftotal = window.pfWrap.total_records;
              this.pfmxpg = window.pfWrap.max_page;
              this.setPages();

              // Fetch product IDs from pfWrap
              let productIDs = window.pfWrap.items
                .map((e) => (e.parent_product_id ? e.parent_product_id : null))
                .filter((id) => id != null);

              const collectionName = this.getCollectionHandleFromURL();
              const searchTerm =
                new URLSearchParams(window.location.search).get("q") || ""; // Default to empty string if no search term
              let url = `https://demozellis.myshopify.com/admin/api/2024-10/products.json?ids=${productIDs.join(
                ","
              )}`;

              const isCollectionPage =
                window.location.pathname.includes("/collections");

              if (isCollectionPage && collectionName) {
                url += `&collection_id=${collectionName}`;
              }
              const accessToken = "";

              axios
                .get(url, {
                  headers: {
                    "X-Shopify-Access-Token": accessToken,
                  },
                })
                .then((response) => {
                  if (
                    response.data.products &&
                    response.data.products.length > 0
                  ) {
                    // Filter products by title using the search term
                    const filteredProducts = response.data.products.filter(
                      (product) =>
                        product.title
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                    );

                    if (filteredProducts.length > 0) {
                      this.products = filteredProducts;
                      this.loading = false;
                      setTimeout(() => {
                        this.fitmentCheck();
                      }, 500); // Call fitmentCheck after setting products
                    } else {
                      const searchTerm =
                        new URLSearchParams(window.location.search).get("q") ||
                        "";
                      this.fetchAll()
                        .then((res_data) => {
                          setTimeout(() => {
                            if (
                              res_data.products &&
                              res_data.products.length > 0
                            ) {
                              this.products = searchTerm.trim()
                                ? res_data.products.filter((product) =>
                                    product.title
                                      .toLowerCase()
                                      .includes(searchTerm.toLowerCase())
                                  )
                                : res_data.products;
                              this.loading = false;
                              setTimeout(() => {
                                this.fitmentCheck();
                              }, 500);
                            } else {
                              this.noprds = true; // No products found
                              this.loading = false;
                            }
                          }, 500); // 500ms timeout
                        })
                        .catch((error) => {
                          console.error(error);
                          this.noprds = true; // Handle error scenario
                          this.loading = false;
                        });
                    }
                  } else {
                    const searchTerm =
                      new URLSearchParams(window.location.search).get("q") ||
                      "";
                    this.fetchAll()
                      .then((res_data) => {
                        setTimeout(() => {
                          if (
                            res_data.products &&
                            res_data.products.length > 0
                          ) {
                            this.products = searchTerm.trim()
                              ? res_data.products.filter((product) =>
                                  product.title
                                    .toLowerCase()
                                    .includes(searchTerm.toLowerCase())
                                )
                              : res_data.products;
                            this.loading = false;
                            setTimeout(() => {
                              this.fitmentCheck();
                            }, 500);
                          } else {
                            this.noprds = true; // No products found
                            this.loading = false;
                          }
                        }, 500); // 500ms timeout
                      })
                      .catch((error) => {
                        console.error(error);
                        this.noprds = true; // Handle error scenario
                        this.loading = false;
                      });
                  }
                })
                .catch((error) => {
                  console.error(error); // Handle the error
                });
            } else {
              this.noprds = true;
              this.loading = false;
              clearInterval(intervalId);
            }
          }
        }, 500);
      } else {
        const searchTerm =
          new URLSearchParams(window.location.search).get("q") || "";
        this.fetchAll()
          .then((res_data) => {
            setTimeout(() => {
              if (res_data.products && res_data.products.length > 0) {
                this.products = searchTerm.trim()
                  ? res_data.products.filter((product) =>
                      product.title
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    )
                  : res_data.products;
                this.loading = false;
                setTimeout(() => {
                  this.fitmentCheck();
                }, 500); // Call fitmentCheck after fetching and filtering
              } else {
                this.noprds = true; // No products found
                this.loading = false;
              }
            }, 500); // 500ms timeout
          })
          .catch((error) => {
            console.error(error);
            this.noprds = true; // Handle error scenario
            this.loading = false;
          });
      }
    }
  },
}).mount("#partfinderresult");

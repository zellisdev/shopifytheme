var zellisaccess = {
  type: "tecdoc_vehicle",
  token: "Z-46067627165c50e9",
  id: "Qzcxc0RIQnNMS1RnUUgvUmFWNGt5QT09",
};
if (localStorage.getItem("partFinderData")) {
  var d = JSON.parse(localStorage.getItem("partFinderData"));
  if (d.active == "y" && d.et && d.et > new Date().getTime()) {
    var bpfresult = JSON.parse(d.value);
    var bpfactive = true;
    document.cookie = `pf_active=${bpfactive}; path=/;`;
  }
}

var app = Vue.createApp({
  template: `
        <div class="wrapper-product-finder">
            <div class="partfinder-searched" v-if="this.pfactive">
                <resultPartFinder :pfwrapvi="this.pfwrapvi" :pfresult="pfresult.join(' ')" @refreshAll="parentrefreshAll" :smg="this.savedingarage"/>
            </div>
            <div class="partfinder-fields d-flex align-items-stretch" v-else>
                <defaultPartFinder />
            </div>
        </div>`,
  data() {
    return {
      pfactive: bpfactive || false,
      pfresult: bpfresult || [],
      savedingarage: false,
      pfwrapvi: "",
    };
  },
  components: {
    defaultPartFinder: {
      template: ` <div id="parts_finder" :class="pflvldata.length==0?'loading':''">
                            <div class="parts-finder-content">
                                <div :id="'compat_list_'+pfwrap.data?.levels.length" class="pfdropdowns">
                                    <p class="pflable">Select your vehicle</p>
                                    <div class="wrap-select">
                                        <div
                                            class="wrap-select-inline"
                                            v-for="lvl in pfwrap.data?.levels"
                                            :key="lvl.level"
                                        >
                                            <div
                                            class="part-select"
                                            :class="'dah_partfinder_opt_' + lvl.level + '_main'"
                                            >
                                                <select
                                                    :name="'clist_pf_' + lvl.level"
                                                    class="compatibility_list field select"
                                                    v-on:change="handleChange($event, lvl.level)"
                                                    :disabled="!Array.isArray(pflvldata[parseInt(lvl.level)])"
                                                    >
                                                    <option :value="emptyTxt">
                                                        Select {{ lvl.name?.toString().replaceAll(" ||", "") }}
                                                    </option>
                                                    <option :value="opt.value" v-for="opt in pflvldata[lvl.level]" :key="opt.value" :selected="pflvldata[lvl.level].length == 1">
                                                        {{ opt.value?.toString().replaceAll(" ||", "") }}
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>                                        
                                    <button type="submit" class="button button--primary dah_compat-btn" @click="dahsmg" :disabled="btnstatus">GO</button>
                                </div>
                            </div>
                        </div>`,
      data() {
        return {
          pfwrap: "",
          pflvl1: "",
          pflvldata: [],
          pflvlsavedata: [],
          btnstatus: true,
          emptyTxt: (Math.random() + 1).toString(36).substring(7),
          access: zellisaccess,
        };
      },
      methods: {
        dahautoselect: function (nextnum) {
          if (this.pflvldata[nextnum].length == 1) {
            this.dahoc(nextnum, this.pflvldata[nextnum][0].value);
          }
        },
        dahoc: async function (num, val) {
          var nextnum = parseInt(num) + 1;
          for (var i = nextnum; i < this.pflvldata.length; i++) {
            this.pflvldata[i] = "";
            this.pflvlsavedata[i] = "";
          }
          if (val != this.emptyTxt) {
            this.pflvlsavedata[num] = val;
            this.btnstatus = nextnum === this.pfwrap.data.count ? false : true;
          } else {
            this.pflvlsavedata[num] = "";
            this.btnstatus = true;
          }
          if (val != this.emptyTxt && nextnum < this.pfwrap.data.count) {
            // Fetch next level data
            try {
              var data1 = `level=${nextnum}&type=${this.access.type}&user_id=${this.access.id}`;
              for (var j = 0; j < this.pflvlsavedata.length; j++) {
                if (j < num) {
                  data1 += `&selected_item[${j}]=${this.pflvlsavedata[j]}`;
                }
                if (j === parseInt(num)) {
                  data1 += `&selected_item[${j}]=${val}`;
                }
              }

              const res1 = await axios.post(
                `https://staging.zellisauto.com/api/v1/get_part_finder_items`,
                data1,
                {
                  headers: {
                    "X-TOKEN": this.access.token,
                  },
                }
              );

              var isyeardata = false;
              if (
                nextnum ===
                parseInt(
                  this.pfwrap.data.levels.filter(function (e) {
                    return e.name === "Year";
                  })[0]?.level
                )
              ) {
                isyeardata = true;
              }
              if (!isyeardata) {
                this.pflvldata[nextnum] = res1.data.data.sort((a, b) =>
                  a.value > b.value ? 1 : b.value > a.value ? -1 : 0
                );
              } else {
                this.pflvldata[nextnum] = res1.data.data.sort((a, b) =>
                  a.value < b.value ? 1 : b.value < a.value ? -1 : 0
                );
              }
              if (
                this.pflvldata[nextnum].length === 1 &&
                nextnum < this.pfwrap.data.count
              ) {
                this.dahautoselect(nextnum);
              }
            } catch (error) {
              console.error(error);
            }
          }
          this.$forceUpdate();
        },
        handleChange(event, level) {
          const loadingIcon = document.createElement("div");
          loadingIcon.classList.add("loading-icon");
          loadingIcon.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
          var nextDropdown =
            event.target.parentNode.parentNode.nextElementSibling;
          if (
            nextDropdown &&
            nextDropdown.classList.contains("wrap-select-inline")
          ) {
            nextDropdown
              .querySelectorAll(".part-select")[0]
              .appendChild(loadingIcon);
          }
          this.dahoc(level, event.target.value)
            .then(() => {
              nextDropdown.querySelectorAll(".loading-icon")[0]?.remove();
            })
            .catch((error) => {
              // Handle error if necessary
              console.error(error);
              nextDropdown.querySelectorAll(".loading-icon")[0]?.remove();
            });
        },
        dahsmg: function () {
          var savedata = JSON.stringify(this.pflvlsavedata);
          var ndata = {};
          ndata.value = savedata;
          ndata.active = "y";
          ndata.et = new Date().getTime() + 30 * 60 * 1000;
          localStorage.setItem("partFinderData", JSON.stringify(ndata));
          window.location.href = "/pages/part-finder-result/";
        },
      },
      async created() {
        try {
          var data = "type=" + this.access.type + "&user_id=" + this.access.id;
          const res = await axios.post(
            "https://staging.zellisauto.com/api/v1/get_part_finder_levels",
            data,
            {
              headers: {
                "X-TOKEN": this.access.token,
              },
            }
          );
          this.pfwrap = res.data;
          // Fetch First level data
          try {
            var data1 =
              "level=0&type=" + this.access.type + "&user_id=" + this.access.id;
            const res1 = await axios.post(
              "https://staging.zellisauto.com/api/v1/get_part_finder_items",
              data1,
              {
                headers: {
                  "X-TOKEN": this.access.token,
                },
              }
            );
            var lvl1 = res1.data.data;
            this.pflvldata.push(lvl1);

            let count = res.data.data.count - 1;
            this.pflvldata = this.pflvldata.concat(Array(count).fill(""));
            this.pflvlsavedata = Array(count + 1).fill("");

            if (lvl1.length === 1) {
              this.pflvlsavedata.push(lvl1[0]);
              this.dahautoselect(1);
            }
          } catch (error) {
            console.error(error);
          }
        } catch (error) {
          console.error(error);
        }
      },
    },
    resultPartFinder: {
      template: ` <div id="parts_finder">
                <p class="pflable">Your selected vehicle:</p>
                <h4 class="pfresult_text">{{pfresult.toString().replaceAll(" ||", "")}}</h4>
                <p class="pfresult_links">
                  <a href="/pages/part-finder-result/" class="button button--primary">View Products</a>
                  <a href="javascript:;" class="button button--secondary" @click="clearPFResult()">Clear</a>
                </p>
            </div>`,
      props: {
        pfresult: String,
        smg: Boolean,
        pfwrapvi: String,
      },
      methods: {
        clearPFResult() {
          if (localStorage.getItem("partFinderData")) {
            localStorage.removeItem("partFinderData");
            bpfactive = false;
            d.active = "n";
            bpfresult = "";
            pfwrap = {};
            this.$emit("refreshAll");
            fitmentcheck();
          }
        },
      },
    },
  },
  methods: {
    parentrefreshAll() {
      this.pfactive = false;
      this.pfresult = {};
    },
    pfVehicleImage(s) {
      this.pfwrapvi = s;
    },
    clearPFResult() {
      if (localStorage.getItem("partFinderData")) {
        localStorage.removeItem("partFinderData");
        bpfactive = false;
        d.active = "n";
        bpfresult = "";
        pfwrap = {};
        this.parentrefreshAll();
        fitmentcheck();
      }
    },
  },
}).mount("#part-finder-app");

// Fitment status code
(async function () {
  window.pfWrap = null;

  /**
   * Check fitment status and update DOM elements accordingly.
   */
  function fitmentCheck() {
    if (!window.pfWrap || !window.pfWrap.items) return;

    const fittedSkus = window.pfWrap.items
      .map((e) => (e.parent_product_id ? e.parent_product_id : null))
      .filter((id) => id !== null);
    const isBpfActive = typeof bpfactive !== "undefined" && bpfactive;

    // Update all `.partfinder-status` elements
     if (isBpfActive) {
      document.querySelectorAll(".partfinder-status").forEach((statusElement) => {
        const sku = statusElement.getAttribute("data-sku");
        if (!sku) return;
  
        const isFitted = fittedSkus.includes(sku);
      
        // Dynamically build and replace content inside the status element
        statusElement.innerHTML = createStatusHtml(isFitted);
        statusElement.classList.remove("hidden");
      });
     }

    // Hide elements if `bpfactive` is not set or false
    if (!isBpfActive) {
      document
        .querySelectorAll(".partfinder-status")
        .forEach((statusElement) => {
          statusElement.classList.add("hidden");
        });
    }
  }

  /**
   * Create dynamic HTML for status based on fitment.
   * @param {boolean} isFitted - Fitment status.
   * @returns {string} - HTML content.
   */
  function createStatusHtml(isFitted) {
    if (isFitted) {
      return `
                <div class="status dahfitted">Fits your selected vehicle</div>
            `;
    } else {
      return `
                <div class="status dahnotfitted">May not fit your vehicle</div>
            `;
    }
  }

  /**
   * Fetch fitment data from the server and process it.
   */
  async function fetchFitmentData() {
    if (window.pfWrap == null || window.pfWrap == undefined) {
      try {
        const params = new URLSearchParams({
          type: zellisaccess.type,
          user_id: zellisaccess.id,
        });

        bpfresult.forEach((item, index) => {
          params.append(`selected_item[${index}]`, item);
        });

        const response = await axios.post(
          `https://staging.zellisauto.com/api/v1/get_parts`,
          params,
          {
            headers: {
              "X-TOKEN": zellisaccess.token,
            },
          }
        );

        if (response.data?.status) {
          window.pfWrap = response.data.data;
          let productIDs = response.data.data.items
            .map((e) => (e.parent_product_id ? e.parent_product_id : null))
            .filter((id) => id != null);
          document.cookie = `compatible_products=${productIDs.join(
            ","
          )}; path=/;`;
          fitmentCheck();
        } else {
          console.warn("Fitment data not available:", response.data);
        }
      } catch (error) {
        console.error("Error fetching fitment data:", error);
      }
    }
  }

  // Trigger the process if active
  if (typeof bpfactive !== "undefined" && bpfactive) {
    await fetchFitmentData();
  }
})();

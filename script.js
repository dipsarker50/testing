// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBvTnByQhzYZS0TCx8cDCTrHpgj-rRTBZA",
    authDomain: "evento-f60bc.firebaseapp.com",
    databaseURL: "https://evento-f60bc-default-rtdb.firebaseio.com/",
    projectId: "evento-f60bc",
    storageBucket: "evento-f60bc.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref("/DustbinList");

let selectedDustbinId = null;
let map, marker, geocoder;

// Load Google Charts
google.charts.load("current", { packages: ["gauge"] });

// Function to Draw Gauge
function drawGauge(elementId, value, maxValue, label) {
    const data = google.visualization.arrayToDataTable([
        ["Label", "Value"],
        [label, value],
    ]);

    const options = {
        width: 150,
        height: 150,
        redFrom: 90,
        redTo: 100,
        yellowFrom: 70,
        yellowTo: 90,
        greenFrom: 0,
        greenTo: 70,
        minorTicks: 5,
        max: maxValue,
    };

    const chart = new google.visualization.Gauge(document.getElementById(elementId));
    chart.draw(data, options);
}

// Initialize Google Maps and Autocomplete
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 23.773184, lng: -73.98633 },
        zoom: 13,
    });

    geocoder = new google.maps.Geocoder();

    // Initialize Marker
    marker = new google.maps.Marker({
        map: map,
        draggable: true,
        title: "Drag to Set Location",
    });

    const input = document.getElementById("place-input");
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo("bounds", map);

    // Handle place selection from autocomplete
    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
            alert("No details available for the selected location.");
            return;
        }

        map.panTo(place.geometry.location);
        map.setZoom(15);
        marker.setPosition(place.geometry.location);
        updateLocationInput(place.geometry.location);
    });

    // Update location input when marker is dragged
    marker.addListener("dragend", () => {
        const position = marker.getPosition();
        updateLocationInput(position);
    });
}

// Detect and Set Current Location
// Detect and Set Current Location
function detectCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Get the latitude and longitude from Geolocation API
                const currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                // Update Map and Marker
                map.panTo(currentLocation);
                map.setZoom(15);
                marker.setPosition(currentLocation);
                updateLocationInput(currentLocation);

                console.log("Current Location:", currentLocation);
            },
            (error) => {
                let errorMessage = "";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "User denied the request for Geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "The request to get user location timed out.";
                        break;
                    case error.UNKNOWN_ERROR:
                        errorMessage = "An unknown error occurred.";
                        break;
                }
                alert("Error fetching location: " + errorMessage);
            },
            {
                enableHighAccuracy: true, // Enable high accuracy for better precision
                timeout: 10000, // Timeout after 10 seconds
                maximumAge: 0, // Prevent caching of location
            }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

// Update the location input box with marker position
function updateLocationInput(position) {
    geocoder.geocode({ location: position }, (results, status) => {
        if (status === "OK" && results[0]) {
            document.getElementById("place-input").value = results[0].formatted_address;
        } else {
            document.getElementById("place-input").value = `Lat: ${position.lat.toFixed(6)}, Lng: ${position.lng.toFixed(6)}`;
        }
    });
}


// Open Map Modal
function openMapModal(dustbinId) {
    selectedDustbinId = dustbinId;
    const modal = document.getElementById("mapModal");
    modal.style.display = "flex";

    setTimeout(() => {
        google.maps.event.trigger(map, "resize");
        map.setCenter({ lat: 40.749933, lng: -73.98633 });
        marker.setPosition(null);
        document.getElementById("place-input").value = "";
    }, 300);
}

// Close Map Modal
function closeMapModal() {
    const modal = document.getElementById("mapModal");
    modal.style.display = "none";
    document.getElementById("place-input").value = "";
    marker.setPosition(null);
}

// Save Selected Location
function saveLocation() {
    if (!marker.getPosition()) {
        alert("Please select or drag the marker to a valid location.");
        return;
    }

    const position = marker.getPosition();
    const location = {
        lat: position.lat(),
        lng: position.lng(),
        address: document.getElementById("place-input").value || "Unknown Address",
    };

    dbRef.child(selectedDustbinId).update(
        { Location: location },
        (error) => {
            if (error) {
                alert(`Error saving location: ${error.message}`);
            } else {
                alert(`Location updated successfully for Dustbin ${selectedDustbinId}.`);
                closeMapModal();
                populateAllDustbins();
            }
        }
    );
}

function populatePriorityList() {
    dbRef.on("value", (snapshot) => {
        const data = snapshot.val();
        const container = document.getElementById("dustbins");
        container.innerHTML = "";

        if (data) {
            const sortedDustbins = Object.entries(data)
                .map(([id, values]) => ({
                    id,
                    priority: calculatePriority(values),
                    ...values
                }))
                .sort((a, b) => b.priority - a.priority);

            sortedDustbins.forEach((dustbin, index) => {
                const fillGaugeId = `fill-gauge-${index}`;
                const gasGaugeId = `gas-gauge-${index}`;

                container.innerHTML += `
                    <div class="dustbin">
                        <h2>${dustbin.id}</h2>
                        <p>Priority Index: <span class="priority">${dustbin.priority}</span>/100</p>
                        <div class="gauge-container">
                            <div id="${fillGaugeId}" class="gauge"></div>
                            <div id="${gasGaugeId}" class="gauge"></div>
                        </div>
                        <p>Hazardous: ${dustbin.IsHazardous ? "Yes" : "No"}</p>
                        <p>Darkness Detected: ${dustbin.IsDark ? "Yes" : "No"}</p>
                    </div>
                `;

                google.charts.setOnLoadCallback(() => {
                    const fillPercentage =
                        dustbin.Distance && dustbin.DustbinMaxHeight
                            ? ((dustbin.DustbinMaxHeight - dustbin.Distance) / dustbin.DustbinMaxHeight) * 100
                            : 0;

                    drawGauge(fillGaugeId, fillPercentage, 100, "Fill (%)");

                    const gasValue = dustbin.GasConcentration || 0;
                    drawGauge(gasGaugeId, gasValue, 1000, "Gas");
                });
            });
        } else {
            container.innerHTML = "<p>No dustbins found in the database.</p>";
        }
    });
}

// Populate All Dustbins
function populateAllDustbins() {
    dbRef.on("value", (snapshot) => {
        const data = snapshot.val();
        const container = document.getElementById("dustbins");
        container.innerHTML = "";

        if (data) {
            Object.entries(data).forEach(([id, values], index) => {
                const fillGaugeId = `fill-gauge-${index}`;
                const gasGaugeId = `gas-gauge-${index}`;

                container.innerHTML += `
                    <div class="dustbin">
                        <h2>${id}</h2>
                        <!-- <div id="${fillGaugeId}" class="gauge-container"></div> -->
                           
                         <div id="${gasGaugeId}" class="gauge-container"></div>
                        <p>Distance: ${values.Distance || "--"} cm</p>
                        <p>Temperature: ${values.Temperature || "--"} °C</p>
                        <p>Humidity: ${values.Humidity || "--"}%</p>
                        <p>Gas Concentration: ${values.GasConcentration || "--"}</p>
                        <p>Max Height: ${values.DustbinMaxHeight || "--"} cm</p>
                        <p>Hazardous: ${values.IsHazardous ? "Yes" : "No"}</p>
                        <p>Darkness Detected: ${values.IsDark ? "Yes" : "No"}</p>
                        <p>Location: ${values.Location ? values.Location.address : "Not Set"}</p>
                        <button class="map-btn" onclick="openMapModal('${id}')">📍 Set Location</button>
                    </div>
                `;

                google.charts.setOnLoadCallback(() => {
                    const fillPercentage =
                        values.Distance && values.DustbinMaxHeight
                            ? ((values.DustbinMaxHeight - values.Distance) / values.DustbinMaxHeight) * 100
                            : 0;

                    drawGauge(fillGaugeId, fillPercentage, 100, "Fill (%)");
                    const gasValue = values.GasConcentration || 0;
                    drawGauge(gasGaugeId, gasValue, 1000, "Gas");
                });
            });
        } else {
            container.innerHTML = "<p>No dustbins found in the database.</p>";
        }
    });
}

// Detect Page and Populate Data
document.addEventListener("DOMContentLoaded", () => {
    initMap();

    const currentPage = window.location.pathname;
    if (currentPage.includes("priority.html")) {
        populatePriorityList();
    } else if (currentPage.includes("all-dustbins.html")) {
        populateAllDustbins();
    }

    document.getElementById("closeModal").addEventListener("click", closeMapModal);
    document.getElementById("saveLocationBtn").addEventListener("click", saveLocation);
    document.getElementById("currentLocationBtn").addEventListener("click", detectCurrentLocation);
});

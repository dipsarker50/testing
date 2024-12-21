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

// Calculate Priority Index
function calculatePriority(data) {
    let score = 0;
    
    // Fetch DustbinMaxHeight to calculate fill percentage
    const maxHeight = data.DustbinMaxHeight || 100; // Default to 100 if not available

    if (data.Distance && maxHeight) {
        const fillPercentage = ((maxHeight - data.Distance) / maxHeight) * 100;
        const fullnessIndex = Math.min(50, fillPercentage / 100 * 50);
        score += fullnessIndex;
    }

    if (data.GasConcentration) {
        const gasIndex = Math.min(data.GasConcentration / 1024 * 30, 30);
        score += gasIndex;
    }

    if (data.Temperature && data.Humidity) {
        const tempIndex = data.Temperature > 35 ? 10 : 0;
        const humidityIndex = data.Humidity > 70 ? 10 : 0;
        score += tempIndex + humidityIndex;
    }

    return Math.min(Math.round(score), 100);
}

// Populate Priority List
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

            sortedDustbins.forEach(dustbin => {
                container.innerHTML += `
                    <div class="dustbin">
                        <h2>${dustbin.id}</h2>
                        <p>Priority Index: <span class="priority">${dustbin.priority}</span>/100</p>
                        <p>Fill Level: ${(dustbin.Distance && dustbin.DustbinMaxHeight) ? ((dustbin.DustbinMaxHeight - dustbin.Distance) / dustbin.DustbinMaxHeight * 100).toFixed(1) : '--'}%</p>
                        <p>Hazardous: ${dustbin.IsHazardous ? "Yes" : "No"}</p>
                        <p>Darkness Detected: ${dustbin.IsDark ? "Yes" : "No"}</p>
                    </div>
                `;
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
            Object.entries(data).forEach(([id, values]) => {
                container.innerHTML += `
                    <div class="dustbin">
                        <h2>${id}</h2>
                        <p>Distance: ${values.Distance || "--"} cm</p>
                        <p>Temperature: ${values.Temperature || "--"} °C</p>
                        <p>Humidity: ${values.Humidity || "--"}%</p>
                        <p>Gas Concentration: ${values.GasConcentration || "--"}</p>
                        <p>Max Height: ${values.DustbinMaxHeight || "--"} cm</p>
                        <p>Hazardous: ${values.IsHazardous ? "Yes" : "No"}</p>
                        <p>Darkness Detected: ${values.IsDark ? "Yes" : "No"}</p>
                    </div>
                `;
            });
        } else {
            container.innerHTML = "<p>No dustbins found in the database.</p>";
        }
    });
}

// Detect Page and Populate Data
const currentPage = window.location.pathname;

if (currentPage.includes("priority.html")) {
    populatePriorityList();
} else if (currentPage.includes("all-dustbins.html")) {
    populateAllDustbins();
}

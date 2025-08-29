let map;
let defaultCenter = { lat: 20.5937, lng: 78.9629 }; // Default (India)
let service;
let markers = [];
let nextPage = null;

function initMap() {
    // Initialize map
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultCenter,
        zoom: 5,
    });

    // Google Places service
    service = new google.maps.places.PlacesService(map);

    // Add default marker
    new google.maps.Marker({
        position: defaultCenter,
        map: map,
        title: "Default Center",
    });

    // Update badge with center
    updateCenterBadge();
    google.maps.event.addListener(map, "center_changed", updateCenterBadge);

    // Button events
    document.getElementById("searchBtn").addEventListener("click", searchPlaces);
    document.getElementById("clearBtn").addEventListener("click", clearMarkers);

    document.querySelectorAll("[data-type]").forEach(btn => {
        btn.addEventListener("click", () => {
            searchByType(btn.dataset.type);
        });
    });

    document.getElementById("useMyLocation").addEventListener("click", useMyLocation);
    document.getElementById("recenterDefault").addEventListener("click", () => {
        map.setCenter(defaultCenter);
        map.setZoom(5);
    });

    document.getElementById("loadMore").addEventListener("click", () => {
        if (nextPage) {
            nextPage();
        }
    });
}

// ✅ Update the "Center:" badge
function updateCenterBadge() {
    const center = map.getCenter();
    document.getElementById("locationBadge").innerText =
        `Center: ${center.lat().toFixed(4)}, ${center.lng().toFixed(4)}`;
}

// ✅ Clear old markers
function clearMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
    document.getElementById("loadMore").classList.add("d-none");
}

// ✅ Search by keyword (from search bar)
function searchPlaces() {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return;

    clearMarkers();

    const center = map.getCenter();
    saveSearch(query, null, center.lat(), center.lng());  // ✅ Save to DB

    const request = {
        location: center,
        radius: 5000,
        keyword: query,
    };

    service.nearbySearch(request, handleResults);
}

function searchByType(type) {
    clearMarkers();

    const center = map.getCenter();
    saveSearch(null, type, center.lat(), center.lng());  // ✅ Save to DB

    const request = {
        location: center,
        radius: 5000,
        type: type,
    };

    service.nearbySearch(request, handleResults);
}


// ✅ Handle results from Places API
function handleResults(results, status, pagination) {
    if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        alert("No results found.");
        return;
    }

    results.forEach(place => {
        if (!place.geometry || !place.geometry.location) return;

        const marker = new google.maps.Marker({
            map,
            position: place.geometry.location,
            title: place.name,
        });

        const infowindow = new google.maps.InfoWindow({
            content: `<strong>${place.name}</strong><br>${place.vicinity || ""}`,
        });

        marker.addListener("click", () => {
            infowindow.open(map, marker);
        });

        markers.push(marker);
    });

    // Handle pagination
    if (pagination && pagination.hasNextPage) {
        nextPage = pagination.nextPage;
        document.getElementById("loadMore").classList.remove("d-none");
    } else {
        document.getElementById("loadMore").classList.add("d-none");
    }
}

// ✅ Use My Location (Geolocation API)
function useMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                map.setCenter(userLocation);
                map.setZoom(14);

                new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "You are here",
                    icon: {
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                    }
                });
            },
            () => {
                alert("Could not get your location.");
            }
        );
    } else {
        alert("Geolocation not supported by this browser.");
    }
}

function saveSearch(query, type, lat, lng) {
    fetch("/save-search/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken")  // needed if CSRF is enabled
        },
        body: JSON.stringify({
            query: query,
            place_type: type,
            lat: lat,
            lng: lng
        })
    });
}

// Small helper to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.substring(0, name.length + 1) === (name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


// ✅ Initialize once page loads
window.onload = initMap;

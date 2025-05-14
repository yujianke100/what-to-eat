let map, userMarker, searchMarker, googleApiKey, amapApiKey, mapProvider;

function loadGoogleMapsAPI() {
    const loader = new google.maps.plugins.loader.Loader({
        apiKey: googleApiKey,
        version: 'weekly',
        libraries: ['marker']
    });

    loader
        .load()
        .then(() => {
            console.log("Google Maps API loaded successfully.");
            onGoogleMapsLoaded(); // Call the initialization function after loading
        })
        .catch(e => {
            console.error("Error loading Google Maps API", e);
        });
}

function loadAmapAPI() {
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapApiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
        console.log("Amap API loaded successfully.");
        onAmapLoaded(); // Call the initialization function after loading
    };
    document.head.appendChild(script);
}

function onGoogleMapsLoaded() {
    navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: latitude, lng: longitude },
            zoom: 15,
            mapId: 'YOUR_MAP_ID', // Replace with a valid Map ID from Google Cloud Console
            mapTypeControl: false, // Disable Map and Satellite options
        });

        userMarker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: latitude, lng: longitude },
            map,
            title: "You are here"
        });

        map.addListener('click', event => {
            const { latLng } = event;
            if (searchMarker) searchMarker.map = null; // Remove previous marker
            searchMarker = new google.maps.marker.AdvancedMarkerElement({
                position: latLng,
                map,
                title: "Search Location"
            });
        });
    }, () => alert("Unable to fetch location"));
}

function onAmapLoaded() {
    map = new AMap.Map('map', {
        zoom: 15,
        center: [116.397428, 39.90923], // Default to Beijing
    });

    map.on('click', event => {
        const { lng, lat } = event.lnglat;
        if (searchMarker) map.remove(searchMarker); // Remove previous marker
        searchMarker = new AMap.Marker({
            position: [lng, lat],
            map,
            title: "Search Location"
        });
    });
}

function initializeRestaurantList() {
    const list = document.getElementById('restaurant-list');
    list.innerHTML = '';

    // Add the "+" button for custom input
    const addCustomLi = document.createElement('li');
    addCustomLi.textContent = '+ Add Custom Option';
    addCustomLi.style.cursor = 'pointer';
    addCustomLi.style.color = '#4CAF50';
    addCustomLi.style.fontWeight = 'bold';
    addCustomLi.addEventListener('click', () => addCustomOption(list));
    list.appendChild(addCustomLi);
}

function searchRestaurants() {
    initializeRestaurantList(); // Ensure the "+" option is always present

    const range = parseFloat(document.getElementById('range').value) * 1000; // Convert km to meters
    const keyword = document.getElementById('keyword').value || 'restaurant';
    const location = mapProvider === 'google'
        ? map.getCenter().toJSON() // Google Maps uses lat/lng object
        : map.getCenter(); // Amap uses [lng, lat] array

    const latLng = mapProvider === 'google'
        ? `${location.lat},${location.lng}`
        : `${location.lng},${location.lat}`;

    const backendProxy = '/proxy';
    const url = mapProvider === 'google'
        ? `${backendProxy}?mapProvider=google&location=${latLng}&radius=${range}&type=restaurant&keyword=${encodeURIComponent(keyword)}&key=${googleApiKey}`
        : `${backendProxy}?mapProvider=amap&location=${latLng}&radius=${range}&types=050000&keywords=${encodeURIComponent(keyword)}&key=${amapApiKey}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const list = document.getElementById('restaurant-list');

            // Populate the list with search results
            const results = mapProvider === 'google' ? data.results : data.pois;
            results.forEach((place) => {
                const li = document.createElement('li');
                li.textContent = mapProvider === 'google' ? place.name : place.name;
                li.dataset.lat = mapProvider === 'google' ? place.geometry.location.lat : place.location.split(',')[1];
                li.dataset.lng = mapProvider === 'google' ? place.geometry.location.lng : place.location.split(',')[0];
                li.classList.add('selected'); // Default to selected
                li.addEventListener('click', () => toggleSelection(li));
                list.appendChild(li);
            });
        })
        .catch(error => {
            console.error("Error fetching data from proxy:", error);
            alert("Failed to fetch restaurants. Please check your API key and parameters.");
        });
}

function addCustomOption(list) {
    const customName = prompt("Enter a custom option:");
    if (customName) {
        const li = document.createElement('li');
        li.textContent = customName;
        li.classList.add('selected'); // Default to selected
        li.dataset.custom = "true"; // Mark as custom option
        li.addEventListener('click', () => toggleSelection(li));
        list.appendChild(li);
    }
}

function toggleSelection(li) {
    if (li.classList.contains('selected')) {
        li.classList.remove('selected');
        li.classList.add('unselected');
    } else {
        li.classList.remove('unselected');
        li.classList.add('selected');
    }
}

function pickRandom() {
    const selectedItems = document.querySelectorAll('#restaurant-list .selected');
    const resultElement = document.getElementById('result');

    if (selectedItems.length === 0) {
        alert("No restaurants selected.");
        resultElement.classList.remove('visible'); // Ensure result is hidden
        resultElement.textContent = ''; // Clear any previous result
        return;
    }

    const randomIndex = Math.floor(Math.random() * selectedItems.length);
    const randomItem = selectedItems[randomIndex];
    const result = randomItem.textContent.trim();

    resultElement.textContent = `You should eat at:\n${result}`; // Add line break for restaurant name
    resultElement.classList.add('visible'); // Add class to show border and background

    // Pan the map to the selected restaurant only if it has location data
    if (!randomItem.dataset.custom) {
        const lat = parseFloat(randomItem.dataset.lat);
        const lng = parseFloat(randomItem.dataset.lng);

        if (mapProvider === 'google') {
            map.setCenter({ lat, lng });
            if (searchMarker) searchMarker.setMap(null);
            searchMarker = new google.maps.marker.AdvancedMarkerElement({
                position: { lat, lng },
                map,
                title: result
            });
        } else if (mapProvider === 'amap') {
            map.setCenter([lng, lat]); // Amap uses [lng, lat] format
            if (searchMarker) map.remove(searchMarker); // Remove previous marker
            searchMarker = new AMap.Marker({
                position: [lng, lat],
                map,
                title: result
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    function initializeUI() {
        document.getElementById('api-key-section').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
        initializeRestaurantList(); // Ensure the "+" option is always present
    }

    function setApiKey() {
        mapProvider = document.getElementById('map-provider').value;
        googleApiKey = document.getElementById('google-api-key').value;
        amapApiKey = document.getElementById('amap-api-key').value;

        if (mapProvider === 'google' && !googleApiKey) {
            alert("Please enter a valid Google Maps API key");
            return;
        }

        if (mapProvider === 'amap' && !amapApiKey) {
            alert("Please enter a valid Amap API key");
            return;
        }

        document.getElementById('api-key-section').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';

        if (mapProvider === 'google') {
            loadGoogleMapsAPI();
        } else if (mapProvider === 'amap') {
            loadAmapAPI();
        }
    }

    const setApiKeyButton = document.getElementById('set-api-key');
    const searchButton = document.getElementById('search');
    const randomSelectButton = document.getElementById('random-select');

    if (setApiKeyButton) {
        setApiKeyButton.addEventListener('click', setApiKey);
    } else {
        console.error("Element with id 'set-api-key' not found.");
    }

    if (searchButton) {
        searchButton.addEventListener('click', searchRestaurants);
    } else {
        console.error("Element with id 'search' not found.");
    }

    if (randomSelectButton) {
        randomSelectButton.addEventListener('click', pickRandom);
    } else {
        console.error("Element with id 'random-select' not found.");
    }

    initializeUI();
});

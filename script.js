let map, userMarker, searchMarker, googleApiKey;

function loadGoogleMapsAPI() {
    if (!googleApiKey) {
        console.error("Google API key is not set.");
        return;
    }

    const loader = new google.maps.plugins.loader.Loader({
        apiKey: googleApiKey,
        version: 'weekly',
        libraries: ['marker', 'places']
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

function onGoogleMapsLoaded() {
    navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: latitude, lng: longitude },
            zoom: 15,
            mapId: 'YOUR_MAP_ID', // Replace with a valid Map ID from Google Cloud Console
            mapTypeControl: false, // Disable Map and Satellite options
            fullscreenControl: true, // 启用全屏按钮
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

async function searchRestaurants() {
    initializeRestaurantList(); // Ensure the "+" option is always present

    const range = parseFloat(document.getElementById('range').value) * 1000; // Convert km to meters
    const center = map.getCenter(); // Use map center as search location

    try {
        // 使用动态导入加载 Place 类
        const { Place } = await google.maps.importLibrary("places");

        // 定义搜索区域，使用 CircleLiteral 格式
        const locationRestriction = {
            center: center.toJSON(), // 使用 toJSON() 方法获取 { lat, lng } 对象
            radius: range
        };

        // 调用 searchNearby 方法，传递正确的参数
        const response = await Place.searchNearby({
            locationRestriction,
            includedPrimaryTypes: ['restaurant'], // 确保仅包含餐馆类型
            excludedPrimaryTypes: ['gas_station'], // 排除加油站类型
            fields: ['displayName', 'location'], // 请求所需字段
            language: 'zh-CN', // 设置语言为中文
            maxResultCount: 20 // 限制返回结果数量
        });

        // 提取 places 数组
        const results = response.places;

        if (Array.isArray(results)) {
            const list = document.getElementById('restaurant-list');

            // Populate the list with search results
            results.forEach((place) => {
                if (place.location && place.displayName) { // 确保数据完整
                    const li = document.createElement('li');
                    li.textContent = place.displayName; // 使用 camelCase 格式的字段
                    li.dataset.lat = place.location.lat;
                    li.dataset.lng = place.location.lng;
                    li.classList.add('selected'); // Default to selected
                    li.addEventListener('click', () => toggleSelection(li));
                    list.appendChild(li);
                }
            });
        } else {
            console.error("Unexpected results format:", results);
            alert("Failed to fetch restaurants. Please try again.");
        }
    } catch (error) {
        console.error("Error using Place API:", error);
        alert("Failed to fetch restaurants. Please try again.");
    }
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
    const lat = parseFloat(randomItem.dataset.lat);
    const lng = parseFloat(randomItem.dataset.lng);

    if (isNaN(lat) || isNaN(lng)) {
        console.error("Invalid coordinates:", { lat, lng });
        alert("Failed to display the selected restaurant on the map.");
        return;
    }

    const result = randomItem.textContent.trim();
    resultElement.textContent = `You should eat at:\n${result}`; // Add line break for restaurant name
    resultElement.classList.add('visible'); // Add class to show border and background

    // Pan the map to the selected restaurant
    map.setCenter({ lat, lng });
    if (searchMarker) searchMarker.setMap(null);
    searchMarker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat, lng },
        map,
        title: result
    });

    // 显示信息窗口
    const infoWindow = new google.maps.InfoWindow({
        content: `<div>
                    <h3>${result}</h3>
                    <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank">Open in Google Maps</a>
                  </div>`,
    });
    infoWindow.setPosition({ lat, lng });
    infoWindow.open(map);
}

document.addEventListener('DOMContentLoaded', () => {
    function initializeUI() {
        document.getElementById('api-key-section').style.display = 'block';
        document.getElementById('main-content').style.display = 'none';
        initializeRestaurantList(); // Ensure the "+" option is always present
    }

    function setApiKey() {
        googleApiKey = document.getElementById('api-key').value;
        if (!googleApiKey) {
            alert("Please enter a valid API key");
            return;
        }

        document.getElementById('api-key-section').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        loadGoogleMapsAPI(); // Load Google Maps API after setting the key
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

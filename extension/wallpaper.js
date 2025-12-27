
// --- Wallpaper Logic ---
const wallpapers = [
    'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop', // Nature
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1948&auto=format&fit=crop', // Foggy mountains
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop', // Yosemite
    'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=2070&auto=format&fit=crop', // Green forest
    'https://images.unsplash.com/photo-1533035353717-3f6a98939e39?q=80&w=2070&auto=format&fit=crop', // Abstract Blue
    'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=1990&auto=format&fit=crop', // City abstract
    'https://images.unsplash.com/photo-1511300636408-a63a89df3482?q=80&w=2070&auto=format&fit=crop', // Stars
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop', // Earth from space
    'https://images.unsplash.com/photo-1506260408121-e353d10b87c7?q=80&w=2128&auto=format&fit=crop', // Sunrise
    'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2074&auto=format&fit=crop'  // Forest path
];

function setRandomWallpaper() {
    const bgEl = document.getElementById('bg-image');
    if (!bgEl) return;

    // Simple random
    const randomIndex = Math.floor(Math.random() * wallpapers.length);
    const selected = wallpapers[randomIndex];

    console.log('[Wallpaper] Selected:', selected);
    bgEl.style.backgroundImage = `url("${selected}")`;
}

// Call on load
setRandomWallpaper();

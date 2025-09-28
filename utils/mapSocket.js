const Alumni = require("../models/alumni-model"); // Adjust path if needed

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function initializeSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('A user connected to the socket.');

        socket.on('getAlumniLocations', async () => {
            try {
                const alumniWithLocation = await Alumni.find({ 
                    location: { $ne: "", $exists: true } 
                });

                const batchSize = 5;
                for (let i = 0; i < alumniWithLocation.length; i += batchSize) {
                    const batch = alumniWithLocation.slice(i, i + batchSize);
                    
                    const locationPromises = batch.map(alumnus => 
                        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(alumnus.location)}`, {
                            headers: { 
                                // IMPORTANT: You MUST provide a valid User-Agent with your email address.
                                // This is required by the Nominatim API's usage policy.
                                'User-Agent': 'SAMPARK-Alumni-Portal/1.0 (aashutoshsharma2905@gmail.com)' 
                            }
                        })
                        .then(async res => {
                            // Check if the response is successful
                            if (!res.ok) {
                                throw new Error(`API returned status: ${res.status}`);
                            }
                            return res.json();
                        })
                        .then(data => {
                            if (data && data.length > 0) {
                                return {
                                    lat: parseFloat(data[0].lat),
                                    lng: parseFloat(data[0].lon),
                                    name: alumnus.name,
                                    title: `${alumnus.designation || 'Alumnus'} at ${alumnus.currentCompany || 'Not specified'}`
                                };
                            }
                            return null;
                        })
                        .catch(err => {
                            console.error(`Geocoding failed for "${alumnus.location}":`, err.message);
                            return null;
                        })
                    );

                    const resolvedLocations = (await Promise.all(locationPromises)).filter(Boolean);
                    
                    if (resolvedLocations.length > 0) {
                        socket.emit('alumniLocationBatch', resolvedLocations);
                    }
                    
                    // Wait before processing the next batch to avoid being rate-limited
                    await delay(5000); 
                }
                socket.emit('locationsFinished');
            } catch (error) {
                console.error('Error fetching locations for socket:', error);
                socket.emit('locationError', { message: 'Failed to fetch locations.' });
            }
        });
        
        // --- Your other socket handlers (like chat) would go here ---

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
}

module.exports = initializeSocketHandlers;


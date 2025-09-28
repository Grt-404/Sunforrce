const Alumni = require("./models/alumni-model"); // Adjust path if needed
const axios = require("axios"); // Import axios

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function initializeSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log('A user connected to the socket.');

        socket.on('getAlumniLocations', async () => {
            try {
                const alumniWithLocation = await Alumni.find({ 
                    location: { $ne: "", $exists: true } 
                });

                const batchSize = 2; // REDUCED BATCH SIZE to send fewer requests at once
                for (let i = 0; i < alumniWithLocation.length; i += batchSize) {
                    const batch = alumniWithLocation.slice(i, i + batchSize);
                    
                    const locationPromises = batch.map(async (alumnus) => {
                        try {
                            const mapUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(alumnus.location)}`;
                            
                            const response = await axios.get(mapUrl, {
                                headers: { 
                                    'User-Agent': 'SAMPARK-Alumni-Portal/1.0 (aashutoshsharma2905@gmail.com)' 
                                }
                            });

                            const data = response.data; // With axios, data is directly on the .data property

                            if (data && data.length > 0) {
                                return {
                                    lat: parseFloat(data[0].lat),
                                    lng: parseFloat(data[0].lon),
                                    name: alumnus.name,
                                    title: `${alumnus.designation || 'Alumnus'} at ${alumnus.currentCompany || 'Not specified'}`
                                };
                            }
                            return null;
                        } catch (err) {
                            // ENHANCED ERROR LOGGING to provide more details on failure
                            if (axios.isAxiosError(err)) {
                                console.error(`Geocoding failed for "${alumnus.location}": Axios Error - ${err.message}`);
                                if (err.response) {
                                    console.error('Status:', err.response.status);
                                    console.error('Data:', err.response.data);
                                }
                            } else {
                                console.error(`Geocoding failed for "${alumnus.location}":`, err.message);
                            }
                            return null;
                        }
                    });

                    const resolvedLocations = (await Promise.all(locationPromises)).filter(Boolean);
                    
                    if (resolvedLocations.length > 0) {
                        socket.emit('alumniLocationBatch', resolvedLocations);
                    }
                    
                    await delay(2000); // INCREASED DELAY between batches to be safer
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


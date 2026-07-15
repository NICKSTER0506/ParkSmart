// AI prediction API client for parking availability
import axios from 'axios';

const API_BASE_URL = 'https://api.example.com'; // TODO: Replace with your API endpoint

export async function predictParkingAvailability(location, timeOfDay) {
  try {
    const response = await axios.get(`${API_BASE_URL}/predict`, {
      params: { location, timeOfDay },
    });
    return response.data;
  } catch (error) {
    console.error('Prediction API error:', error.message);
    return null;
  }
}

export async function getParkingHeatmap(latitude, longitude, radius = 1) {
  try {
    const response = await axios.get(`${API_BASE_URL}/heatmap`, {
      params: { latitude, longitude, radius },
    });
    return response.data;
  } catch (error) {
    console.error('Heatmap API error:', error.message);
    return [];
  }
}

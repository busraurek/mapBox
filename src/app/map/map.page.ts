import { Component, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import * as turf from '@turf/along';
@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage implements OnInit {
  map: any;
  locations: { address: string; location: [number, number] }[] = [
    { address: 'Antalya', location: [30.713323, 36.896890] },
    { address: 'Konya', location: [32.482025, 37.871422] },
    { address: 'Ankara', location: [32.859741, 39.933365] },
    { address: 'Isparta', location: [ 30.5566 ,37.7648] },
    { address: 'Eskişehir', location: [30.516667, 39.783333] },
    { address: 'Samsun', location: [35.324440, 41.286670] },
    { address: 'Erzurum', location: [41.286670,39.933365] },
    { address: 'Ordu', location: [37.878170, 40.978020] },
    { address: 'Ağrı', location: [43.0507 , 39.7214] },
    { address: 'Bakü', location: [49.8671 , 40.4093] },

  ];

  constructor(private httpClient: HttpClient) {}

  ngOnInit() {
        setTimeout(() => {
          this.showMap();
        }, 200);
      }

      showMap() {
        (mapboxgl as any).accessToken = environment.mapboxkey;
    
        this.map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/streets-v12',
          center: this.locations[0].location,
          zoom: 8,
        });
    
        this.map.on('load', () => {
          const el = document.createElement('div');
          el.className = 'marker';
    
          this.locations.forEach(markerData => {
            const marker = new mapboxgl.Marker()
              .setLngLat(markerData.location)
              .addTo(this.map);
      
            const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<h3>${markerData.address} is a very beautiful city</h3>`
            );
      
            marker.setPopup(popup);
            marker.on('click', () => {
              marker.togglePopup();
            });
          });
    
          let currentLocation = this.locations[0].location;

      const sortedLocations = [...this.locations].sort((a, b) => {
        const distanceA = this.calculateDistance(currentLocation, a.location);
        const distanceB = this.calculateDistance(currentLocation, b.location);
        return distanceA - distanceB;
      });

      const apiUrlArray: string[] = [];

      for (let i = 0; i < sortedLocations.length - 1; i++) {
        const origin = sortedLocations[i].location;
        const destination = sortedLocations[i + 1].location;
        const apiUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`;
        apiUrlArray.push(apiUrl);

        currentLocation = destination;
      }

      forkJoin(apiUrlArray.map(apiUrl => this.httpClient.get(apiUrl))).subscribe((responses: any[]) => {
        responses.forEach((response, index) => {

          const routeGeometry = response.routes[0].geometry;

          this.map.addSource(`animated-route-${index}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: routeGeometry,
            },
          });

          this.map.addLayer({
            id: `animated-route-${index}`,
            type: 'line',
            source: `animated-route-${index}`,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': 'red',
              'line-width': 8,
            },
          });
         
          let currentDistance = 0;
          const routeLength = routeGeometry.coordinates.length;
  
          const animateRoute = () => {
            if (currentDistance < routeLength) {
              this.map.getSource(`animated-route-${index}`).setData({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: routeGeometry.coordinates.slice(0, currentDistance),
                },
              });
              currentDistance += 0.1; // Adjust the speed as needed
              requestAnimationFrame(animateRoute);
            }
          };
          animateRoute();
        });
      });
    });
  }

  calculateDistance(coord1: [number, number], coord2: [number, number]) {
    const lat1 = coord1[1];
    const lon1 = coord1[0];
    const lat2 = coord2[1];
    const lon2 = coord2[0];

    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }
}